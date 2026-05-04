import * as THREE from 'three'
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js'
import { scene } from './src/core/scene.js'
import { camera } from './src/core/camera.js'
import { renderer } from './src/core/renderer.js'
import { animate, registerTick } from './src/core/loop.js'
import { setupLights } from './src/components/Lights.js'
import { setupEnvironment } from './src/components/Mesh.js'
import { setupResize } from './src/utils/resize.js'
import { loadModel, loadGLB, originalMats, clickableMeshes } from './src/loaders/ModelLoader.js'
import { getWorldPosition } from './src/twin/grid-map.js'

// _supabase is loaded globally from twin-viewer.html via:
//   <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
//   <script src="./js/supabase-config.js"></script>
// This ensures we share the exact same auth session as the PWA pages.

// ─── Core scene setup ────────────────────────────────────────────────────────
setupLights(scene)
setupEnvironment(scene)
setupResize()

new RGBELoader()
  .setPath('https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/')
  .load('studio_small_08_1k.hdr', (hdr) => {
    hdr.mapping = THREE.EquirectangularReflectionMapping
    scene.environment = hdr
  })

const GLB_FILE    = './assets/models/digital_twin_inventory_management.glb'
const CRATE_FILE  = './assets/models/blueCret.glb'

// ─── blueCret state ───────────────────────────────────────────────────────────
// Per Q3: a NEW crate instance is placed and remains at each position permanently.
// Per Q2: crateRoot is parked at a default "staging" position above the scene center.
const STAGING = new THREE.Vector3(0, 1.2, 0)   // above the warehouse, out of the way
const CRATE_SCALE = 0.018                       // scaled to fit inside rack shelf slots

/** @type {THREE.Group | null} */
let crateTemplate = null          // The original loaded crate (parked at staging)

/** @type {{ mesh: THREE.Group, target: THREE.Vector3, phase: string, t: number }[]} */
const activeAnimations = []       // Queue of in-flight crate animations

// ─── 3-phase animation constants ─────────────────────────────────────────────
const FLY_HEIGHT  = 0.6           // How high the crate lifts above its start Y
const LIFT_DUR    = 0.5           // seconds
const FLY_DUR     = 1.0           // seconds
const DROP_DUR    = 0.5           // seconds

// ─── WebSocket (persistent listener) ─────────────────────────────────────────
let wsConnected = false
let wsRetryTimer = null

function setWsIndicator(connected) {
  wsConnected = connected
  const dot = document.getElementById('ws-dot')
  const label = document.getElementById('ws-label')
  if (!dot || !label) return
  dot.className   = connected ? 'ws-dot ws-connected' : 'ws-dot ws-disconnected'
  label.textContent = connected ? 'Twin Live' : 'Twin Offline'
}

function connectWS() {
  if (wsRetryTimer) clearTimeout(wsRetryTimer)

  let ws
  try {
    ws = new WebSocket('ws://localhost:8080')
  } catch {
    setWsIndicator(false)
    wsRetryTimer = setTimeout(connectWS, 5000)
    return
  }

  ws.onopen = () => {
    setWsIndicator(true)
    console.log('[TwinViewer] 🟢 WebSocket connected')
  }

  ws.onmessage = (event) => {
    let msg
    try { msg = JSON.parse(event.data) } catch { return }

    console.log('[TwinViewer] 📩 WS message received:', JSON.stringify(msg))

    if (msg.type === 'PRODUCT_ADDED') {
      const { rack, shelf, position, itemName, locationCode } = msg.payload
      console.log(`[TwinViewer] 📦 PRODUCT_ADDED → rack=${rack} shelf=${shelf} pos=${position} name="${itemName}" loc="${locationCode}"`)
      handleProductAdded({ rack, shelf, position, itemName, locationCode })
    }
  }

  ws.onclose = () => {
    setWsIndicator(false)
    console.log('[TwinViewer] 🔴 WebSocket disconnected. Retrying in 5s…')
    wsRetryTimer = setTimeout(connectWS, 5000)
  }

  ws.onerror = () => {
    setWsIndicator(false)
  }
}

// ─── Product-added handler ────────────────────────────────────────────────────
function handleProductAdded({ rack, shelf, position, itemName, locationCode }) {
  if (!crateTemplate) {
    console.warn('[TwinViewer] Crate model not yet loaded, queuing…')
    return
  }

  const worldPos = getWorldPosition(rack, shelf, position)
  if (!worldPos) {
    console.warn(`[TwinViewer] Unknown position: R${rack}S${shelf}P${position}`)
    return
  }

  // Clone the crate template for a new permanent instance
  const crateCopy = crateTemplate.clone()
  crateCopy.scale.setScalar(CRATE_SCALE)
  crateCopy.position.copy(STAGING)
  scene.add(crateCopy)

  const target = new THREE.Vector3(worldPos.x, worldPos.y, worldPos.z)
  const liftEnd = new THREE.Vector3(STAGING.x, STAGING.y + FLY_HEIGHT, STAGING.z)
  const flyEnd  = new THREE.Vector3(target.x,  liftEnd.y,              target.z)

  // Push animation descriptor
  activeAnimations.push({
    mesh:    crateCopy,
    phases:  [
      { from: crateCopy.position.clone(), to: liftEnd,  dur: LIFT_DUR },
      { from: liftEnd,                    to: flyEnd,   dur: FLY_DUR  },
      { from: flyEnd,                     to: target,   dur: DROP_DUR },
    ],
    phaseIdx: 0,
    elapsed:  0,
  })

  showHUD(itemName, locationCode)
  console.log(`[TwinViewer] 📦 Animating crate to ${locationCode}`, worldPos)
}

// ─── Per-frame animation tick (called from the render loop) ──────────────────
let lastTime = performance.now()

export function tickCrateAnimations() {
  const now = performance.now()
  const delta = Math.min((now - lastTime) / 1000, 0.1) // seconds, capped at 100ms
  lastTime = now

  for (let i = activeAnimations.length - 1; i >= 0; i--) {
    const anim = activeAnimations[i]
    const phase = anim.phases[anim.phaseIdx]

    anim.elapsed += delta
    const t = Math.min(anim.elapsed / phase.dur, 1.0)
    const eased = easeInOut(t)

    anim.mesh.position.lerpVectors(phase.from, phase.to, eased)

    if (t >= 1.0) {
      anim.phaseIdx++
      anim.elapsed = 0

      if (anim.phaseIdx >= anim.phases.length) {
        // Animation complete — crate stays permanently at target
        anim.mesh.position.copy(anim.phases[anim.phases.length - 1].to)
        activeAnimations.splice(i, 1)
      } else {
        // Snap start of next phase to exact end of last phase
        anim.phases[anim.phaseIdx].from = phase.to.clone()
      }
    }
  }
}

function easeInOut(t) {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t
}

// ─── HUD notification ─────────────────────────────────────────────────────────
let hudTimer = null
function showHUD(itemName, locationCode) {
  const hud = document.getElementById('hud-notification')
  const hudName = document.getElementById('hud-item-name')
  const hudLoc  = document.getElementById('hud-location')
  if (!hud) return

  if (hudTimer) clearTimeout(hudTimer)
  if (hudName) hudName.textContent = itemName || 'Unknown Item'
  if (hudLoc)  hudLoc.textContent  = locationCode || '—'

  hud.classList.add('visible')
  hudTimer = setTimeout(() => hud.classList.remove('visible'), 5000)
}

// ─── Load everything and wire interactions ────────────────────────────────────

/** Place a crate instantly (no animation) at a grid position. */
function placeCrateInstant(rack, shelf, position) {
  if (!crateTemplate) return

  const worldPos = getWorldPosition(rack, shelf, position)
  if (!worldPos) return

  const crateCopy = crateTemplate.clone()
  crateCopy.scale.setScalar(CRATE_SCALE)
  crateCopy.position.set(worldPos.x, worldPos.y, worldPos.z)
  scene.add(crateCopy)
}

/**
 * Fetch all inventory items from Supabase that have a valid location
 * and place crates at their positions (instant, no animation).
 * Uses the Supabase JS client which picks up the PWA's auth session
 * from localStorage (same origin = shared storage).
 */
async function loadExistingInventory() {
  try {
    // Debug: check if we have an active auth session
    const { data: sessionData } = await _supabase.auth.getSession()
    if (sessionData?.session) {
      console.log('[TwinViewer] 🔐 Auth session found — user:', sessionData.session.user?.email)
    } else {
      console.warn('[TwinViewer] ⚠️ No auth session found. RLS may block the query.')
      console.warn('[TwinViewer] 💡 Make sure you are logged into the PWA on this same origin.')
    }

    console.log('[TwinViewer] 🔄 Fetching inventory items from Supabase...')

    const { data, error } = await _supabase
      .from('inventory_items')
      .select('id, name, location, quantity')

    if (error) {
      console.error('[TwinViewer] Supabase query error:', error.message, error)
      return
    }

    console.log(`[TwinViewer] 📋 Received ${data?.length ?? 0} inventory item(s) from Supabase`)

    if (!data || data.length === 0) {
      console.log('[TwinViewer] No existing inventory items to place.')
      return
    }

    let placed = 0
    for (const item of data) {
      const loc = item.location
      console.log(`[TwinViewer] Checking item "${item.name}" — location:`, JSON.stringify(loc))

      if (!loc || !loc.rack || !loc.shelf || !loc.position) {
        console.log(`[TwinViewer] ⏭ Skipping "${item.name}" — no valid location data`)
        continue
      }

      placeCrateInstant(loc.rack, loc.shelf, loc.position)
      placed++
      console.log(`[TwinViewer] 📦 Restored crate for "${item.name}" at ${loc.code || `R${loc.rack}S${loc.shelf}P${loc.position}`}`)
    }

    console.log(`[TwinViewer] ✅ Placed ${placed} existing crate(s) from database.`)
  } catch (err) {
    console.error('[TwinViewer] Failed to load existing inventory:', err)
  }
}

// Load both models in parallel, then set up everything
const warehouseReady = loadModel(GLB_FILE).then(() => {
  setupInteraction()
})

const crateReady = loadGLB(CRATE_FILE)
  .then((model) => {
    crateTemplate = model
    crateTemplate.scale.setScalar(CRATE_SCALE)
    crateTemplate.position.copy(STAGING)
    // The template stays in scene as the "parked" default crate
    scene.add(crateTemplate)
    console.log('[TwinViewer] ✅ blueCret.glb loaded & parked at staging')
  })
  .catch((err) => {
    console.warn('[TwinViewer] Could not load blueCret.glb:', err)
  })

// Once both are ready → fetch existing items from Supabase and place crates
Promise.all([warehouseReady, crateReady]).then(() => {
  loadExistingInventory()
})

// Start WebSocket connection (for new real-time additions)
connectWS()

// Register crate animation tick into the RAF loop
registerTick(tickCrateAnimations)

// ─── Interaction setup (unchanged from original) ──────────────────────────────
function setupInteraction() {
  const raycaster = new THREE.Raycaster()
  const pointer = new THREE.Vector2()
  const canvas = renderer.domElement

  let selectedMesh = null
  let hoveredMesh = null
  let wireframeOn = false

  const highlightMat = new THREE.MeshStandardMaterial({
    color: 0xc4956a,
    emissive: 0x8b6542,
    emissiveIntensity: 0.45,
    roughness: 0.35,
    metalness: 0.2,
  })

  const hoverMat = new THREE.MeshStandardMaterial({
    color: 0xd4a882,
    emissive: 0x6b4f38,
    emissiveIntensity: 0.15,
    roughness: 0.45,
    metalness: 0.15,
  })

  const infoPanel = document.getElementById('info-panel')
  const itemIdText = document.getElementById('item-id-text')
  const itemTypeText = document.getElementById('item-type-text')

  function showPanel(mesh) {
    itemIdText.textContent = mesh.name || '(unnamed)'
    const verts = mesh.geometry?.attributes?.position?.count ?? '?'
    itemTypeText.textContent = `Mesh · ${verts.toLocaleString()} vertices`
    infoPanel.classList.add('visible')
  }

  function hidePanel() {
    infoPanel.classList.remove('visible')
  }

  function deselectCurrent() {
    if (!selectedMesh) return
    if (!wireframeOn) {
      selectedMesh.material = originalMats.get(selectedMesh)
    }
    selectedMesh = null
    hidePanel()
  }

  function setHover(mesh) {
    if (wireframeOn) return
    if (mesh === hoveredMesh) return
    clearHover()
    if (mesh && mesh !== selectedMesh) {
      hoveredMesh = mesh
      mesh.material = hoverMat
    }
  }

  function clearHover() {
    if (!hoveredMesh) return
    if (!wireframeOn && hoveredMesh !== selectedMesh) {
      hoveredMesh.material = originalMats.get(hoveredMesh)
    }
    hoveredMesh = null
  }

  function selectMesh(mesh) {
    if (selectedMesh === mesh) {
      deselectCurrent()
      return
    }
    deselectCurrent()
    clearHover()
    selectedMesh = mesh
    if (!wireframeOn) {
      mesh.material = highlightMat
    }
    showPanel(mesh)
  }

  let pointerDown = false
  canvas.addEventListener('pointerdown', () => pointerDown = true)
  canvas.addEventListener('pointerup', () => pointerDown = false)

  canvas.addEventListener('pointermove', (e) => {
    pointer.x = (e.clientX / window.innerWidth) * 2 - 1
    pointer.y = -(e.clientY / window.innerHeight) * 2 + 1
    if (pointerDown) return

    raycaster.setFromCamera(pointer, camera)
    const hits = raycaster.intersectObjects(clickableMeshes, false)
    if (hits.length > 0) {
      canvas.classList.add('hovering')
      setHover(hits[0].object)
    } else {
      canvas.classList.remove('hovering')
      clearHover()
    }
  })

  canvas.addEventListener('click', (e) => {
    pointer.x = (e.clientX / window.innerWidth) * 2 - 1
    pointer.y = -(e.clientY / window.innerHeight) * 2 + 1
    raycaster.setFromCamera(pointer, camera)
    const hits = raycaster.intersectObjects(clickableMeshes, false)

    if (hits.length > 0) {
      selectMesh(hits[0].object)
    } else {
      deselectCurrent()
    }
  })

  // Wireframe toggle
  const wireframeMat = new THREE.MeshBasicMaterial({
    color: 0x4a90d9,
    wireframe: true,
  })

  const wfTrack = document.getElementById('wireframe-track')
  if (wfTrack) {
    wfTrack.addEventListener('click', () => {
      wireframeOn = !wireframeOn
      wfTrack.classList.toggle('active', wireframeOn)

      if (wireframeOn) {
        if (hoveredMesh && hoveredMesh !== selectedMesh) {
          hoveredMesh.material = originalMats.get(hoveredMesh)
        }
        hoveredMesh = null
        clickableMeshes.forEach((m) => m.material = wireframeMat)
      } else {
        clickableMeshes.forEach((m) => m.material = originalMats.get(m))
        if (selectedMesh) {
          selectedMesh.material = highlightMat
        }
      }
    })
  }

  console.group('✅ GLB loaded — mesh/node names (from Blender)')
  clickableMeshes.forEach((m, i) =>
    console.log(`[${i}] "${m.name}"  |  verts: ${m.geometry?.attributes?.position?.count ?? '?'}`)
  )
  console.groupEnd()

  // Mesh dropdown
  const meshSelect = document.getElementById('mesh-select')
  if (meshSelect) {
    meshSelect.innerHTML = ''
    clickableMeshes.forEach((m, i) => {
      const opt = document.createElement('option')
      opt.value = i
      opt.textContent = m.name || `(unnamed #${i})`
      meshSelect.appendChild(opt)
    })

    const coordX = document.getElementById('coord-x')
    const coordY = document.getElementById('coord-y')
    const coordZ = document.getElementById('coord-z')

    function fillCoords(mesh) {
      const wp = new THREE.Vector3()
      mesh.getWorldPosition(wp)
      if (coordX) coordX.value = parseFloat(wp.x.toFixed(3))
      if (coordY) coordY.value = parseFloat(wp.y.toFixed(3))
      if (coordZ) coordZ.value = parseFloat(wp.z.toFixed(3))
    }

    if (clickableMeshes.length > 0) fillCoords(clickableMeshes[0])

    meshSelect.addEventListener('change', () => {
      const idx = parseInt(meshSelect.value, 10)
      if (!isNaN(idx) && clickableMeshes[idx]) {
        fillCoords(clickableMeshes[idx])
      }
    })

    const moveBtn = document.getElementById('move-item-btn')
    const movePanel = document.getElementById('move-panel')

    if (moveBtn && movePanel) {
      moveBtn.addEventListener('click', () => {
        const isOpen = movePanel.classList.toggle('open')
        moveBtn.classList.toggle('active', isOpen)
        if (isOpen) {
          const idx = parseInt(meshSelect.value, 10)
          if (!isNaN(idx) && clickableMeshes[idx]) {
            fillCoords(clickableMeshes[idx])
          }
        }
      })
    }

    const applyBtn = document.getElementById('move-apply-btn')
    if (applyBtn) {
      applyBtn.addEventListener('click', () => {
        const idx = parseInt(meshSelect.value, 10)
        if (isNaN(idx) || !clickableMeshes[idx]) return
        const mesh = clickableMeshes[idx]

        const x = parseFloat(coordX.value) || 0
        const y = parseFloat(coordY.value) || 0
        const z = parseFloat(coordZ.value) || 0

        const target = new THREE.Vector3(x, y, z)
        if (mesh.parent) {
          mesh.parent.worldToLocal(target)
        }
        mesh.position.copy(target)
      })
    }
  }
}

animate()
