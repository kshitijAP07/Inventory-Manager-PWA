import { scene } from './scene.js'
import { camera } from './camera.js'
import { renderer } from './renderer.js'
import { controls } from '../components/Controls.js'

/** Registered per-frame callbacks. Add via registerTick(fn). */
const tickCallbacks = []

/** Register a function to be called every animation frame. */
export function registerTick(fn) {
  tickCallbacks.push(fn)
}

function animate() {
  requestAnimationFrame(animate)
  controls.update()
  for (const fn of tickCallbacks) fn()
  renderer.render(scene, camera)
}

export { animate }

