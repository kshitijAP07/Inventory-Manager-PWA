import * as THREE from 'three'

export function setupEnvironment(scene) {
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(30, 30),
    new THREE.MeshStandardMaterial({
      color: '#15120f',
      roughness: 0.95,
      metalness: 0.0,
    })
  )
  ground.rotation.x = -Math.PI / 2
  ground.receiveShadow = true
  scene.add(ground)

  // Subtle grid overlay
  const grid = new THREE.GridHelper(30, 60, 0x2a2420, 0x2a2420)
  grid.material.opacity = 0.25
  grid.material.transparent = true
  grid.position.y = 0.002
  scene.add(grid)
}
