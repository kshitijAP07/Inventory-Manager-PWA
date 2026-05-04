import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js'
import { controls } from '../components/Controls.js'
import { scene } from '../core/scene.js'

export const originalMats = new Map();
export const clickableMeshes = [];

/** Shared DRACO + GLTF loader instance */
function makeGLTFLoader() {
  const dracoLoader = new DRACOLoader()
  dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/')
  const gltfLoader = new GLTFLoader()
  gltfLoader.setDRACOLoader(dracoLoader)
  return gltfLoader
}

/**
 * loadGLB — generic, silent GLB loader. Returns a Promise<THREE.Group>.
 * Does NOT touch loader UI elements or clickableMeshes.
 * Used for secondary models (e.g. blueCret.glb).
 * @param {string} url
 * @returns {Promise<THREE.Group>}
 */
export function loadGLB(url) {
  const loader = makeGLTFLoader()
  return new Promise((resolve, reject) => {
    loader.load(url, (gltf) => resolve(gltf.scene), undefined, reject)
  })
}

/**
 * loadModel — loads the primary warehouse GLB, registers clickable meshes,
 * auto-scales + centers the model, and updates the loader progress bar UI.
 * @param {string} GLB_FILE
 * @returns {Promise<import('three/examples/jsm/loaders/GLTFLoader.js').GLTF>}
 */
export function loadModel(GLB_FILE) {
  const gltfLoader = makeGLTFLoader()

  const loaderEl = document.getElementById('loader')
  const loaderBar = document.getElementById('loader-bar')
  const loaderTxt = document.getElementById('loader-text')

  return new Promise((resolve, reject) => {
    gltfLoader.load(
      GLB_FILE,
      (gltf) => {
        const model = gltf.scene

        model.traverse((node) => {
          if (!node.isMesh) return
          node.castShadow = true
          node.receiveShadow = true
          originalMats.set(node, node.material)
          clickableMeshes.push(node)
        })

        const box = new THREE.Box3().setFromObject(model)
        const size = box.getSize(new THREE.Vector3())
        const center = box.getCenter(new THREE.Vector3())
        const scale = 2 / Math.max(size.x, size.y, size.z)
        model.scale.setScalar(scale)
        box.setFromObject(model)
        box.getCenter(center)
        model.position.sub(center)
        model.position.y += size.y * scale / 2
        scene.add(model)

        controls.target.set(0, size.y * scale / 2, 0)
        controls.update()

        // Dismiss loader
        if (loaderEl) {
          loaderEl.style.opacity = '0'
          setTimeout(() => loaderEl.style.display = 'none', 600)
        }

        resolve(gltf)
      },
      (xhr) => {
        if (xhr.total && loaderBar && loaderTxt) {
          const pct = Math.round((xhr.loaded / xhr.total) * 100)
          loaderBar.style.width = pct + '%'
          loaderTxt.textContent = `Loading model… ${pct}%`
        }
      },
      (err) => {
        if (loaderTxt && loaderBar) {
          loaderTxt.textContent = `❌ Could not load "${GLB_FILE}". Is it in the same folder?`
          loaderBar.style.background = '#e55'
        }
        console.error(err)
        reject(err)
      }
    )
  })
}

