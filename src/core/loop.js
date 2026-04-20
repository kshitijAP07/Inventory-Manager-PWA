import { scene } from './scene.js'
import { camera } from './camera.js'
import { renderer } from './renderer.js'
import { controls } from '../components/Controls.js'

function animate() {
  requestAnimationFrame(animate)
  controls.update()
  renderer.render(scene, camera)
}

export { animate }
