import * as THREE from 'three'

const scene = new THREE.Scene()
scene.background = new THREE.Color('#1a1714')
scene.fog = new THREE.FogExp2('#1a1714', 0.08)

export { scene }
