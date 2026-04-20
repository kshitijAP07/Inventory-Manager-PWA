import * as THREE from 'three'
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js'
import { scene } from './src/core/scene.js'
import { camera } from './src/core/camera.js'
import { renderer } from './src/core/renderer.js'
import { animate } from './src/core/loop.js'
import { setupLights } from './src/components/Lights.js'
import { setupEnvironment } from './src/components/Mesh.js'
import { setupResize } from './src/utils/resize.js'
import { loadModel, originalMats, clickableMeshes } from './src/loaders/ModelLoader.js'

// Setup core scene
setupLights(scene)
setupEnvironment(scene)
setupResize()

// Environment Map
new RGBELoader()
  .setPath('https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/')
  .load('studio_small_08_1k.hdr', (hdr) => {
    hdr.mapping = THREE.EquirectangularReflectionMapping
    scene.environment = hdr
  })

const GLB_FILE = './assets/models/model2.glb'

// Load model and set up interactions
loadModel(GLB_FILE).then(() => {
  setupInteraction()
})

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

  // Hover material — subtle tint to preview selection
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

  // Wireframe toggle logic
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
