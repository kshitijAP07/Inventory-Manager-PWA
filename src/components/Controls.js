import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { camera } from '../core/camera.js'
import { renderer } from '../core/renderer.js'

const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true
controls.dampingFactor = 0.07
controls.autoRotate = false
controls.enableZoom = false // zoom disabled; scroll rotates instead
controls.minDistance = 0.5
controls.maxDistance = 10
controls.maxPolarAngle = Math.PI / 1.8
controls.target.set(0, 0.5, 0)

// Scroll → rotate  |  Ctrl+Scroll → zoom
const scrollRotateSpeed = 0.003
const scrollZoomSpeed = 0.001
const minDist = controls.minDistance
const maxDist = controls.maxDistance

renderer.domElement.addEventListener('wheel', (e) => {
  e.preventDefault()
  const delta = e.deltaY
  const spherical = new THREE.Spherical()
  const offset = camera.position.clone().sub(controls.target)
  spherical.setFromVector3(offset)

  if (e.ctrlKey) {
    // Ctrl + Scroll → zoom
    spherical.radius *= 1 + delta * scrollZoomSpeed
    spherical.radius = Math.max(minDist, Math.min(maxDist, spherical.radius))
  } else {
    // Scroll → rotate vertically (deltaY) + horizontally (deltaX)
    spherical.phi += e.deltaY * scrollRotateSpeed
    spherical.phi = Math.max(0.1, Math.min(controls.maxPolarAngle, spherical.phi))
    spherical.theta -= e.deltaX * scrollRotateSpeed
  }

  offset.setFromSpherical(spherical)
  camera.position.copy(controls.target).add(offset)
  camera.lookAt(controls.target)
}, { passive: false })

export { controls }
