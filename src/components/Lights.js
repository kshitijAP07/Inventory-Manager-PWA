import * as THREE from 'three'

export function setupLights(scene) {
  const ambLight = new THREE.AmbientLight(0xffffff, 0.35)
  scene.add(ambLight)

  const keyLight = new THREE.DirectionalLight(0xffffff, 2.8)
  keyLight.position.set(3, 5, 3)
  keyLight.castShadow = true
  keyLight.shadow.mapSize.set(2048, 2048)
  keyLight.shadow.camera.near = 0.1
  keyLight.shadow.camera.far = 20
  keyLight.shadow.camera.left = keyLight.shadow.camera.bottom = -5
  keyLight.shadow.camera.right = keyLight.shadow.camera.top = 5
  keyLight.shadow.bias = -0.0005
  scene.add(keyLight)

  const fillLight = new THREE.DirectionalLight(0xd4a882, 0.6)
  fillLight.position.set(-3, 2, -2)
  scene.add(fillLight)

  const backLight = new THREE.DirectionalLight(0xffe8cc, 0.45)
  backLight.position.set(0, 3, -4)
  scene.add(backLight)
}
