import * as THREE from 'three'

const camera = new THREE.PerspectiveCamera(
  45, window.innerWidth / window.innerHeight, 0.01, 100
)
camera.position.set(0, 1.2, 3.5)

export { camera }
