import * as THREE from 'three';
import { controlState } from './state.js';

export const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x000000, 0.02);

export const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.z = 5;

export const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.outputColorSpace = THREE.SRGBColorSpace;

export const mainGroup = new THREE.Group();
scene.add(mainGroup);

// Lighting
const ambientLight = new THREE.AmbientLight(0x404040, 2);
scene.add(ambientLight);

const sunLight = new THREE.DirectionalLight(0xffffff, 3);
sunLight.position.set(5, 3, 5);
scene.add(sunLight);

const backLight = new THREE.SpotLight(0x64ffda, 5);
backLight.position.set(-5, 5, -5);
backLight.lookAt(0, 0, 0);
scene.add(backLight);

// Star Field
const starGeometry = new THREE.BufferGeometry();
const starCount = 3000;
const starPos = new Float32Array(starCount * 3);
for(let i=0; i<starCount*3; i++) {
    starPos[i] = (Math.random() - 0.5) * 200;
}
starGeometry.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
const starMaterial = new THREE.PointsMaterial({
    size: 0.1, color: 0xffffff, transparent: true, opacity: 0.8, sizeAttenuation: true
});
export const stars = new THREE.Points(starGeometry, starMaterial);
scene.add(stars);

// Resize Handler
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Init Function to append canvas
export function initScene(container) {
    if (container) {
        container.appendChild(renderer.domElement);
    }
}
