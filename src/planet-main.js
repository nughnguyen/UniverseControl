import './style.css';
import { initScene, scene, camera, renderer, mainGroup, stars } from './core/scene.js';
import { initHandTracking } from './core/hand-tracking.js';
import { initPlanet, animatePlanet } from './features/planet.js';
import { controlState } from './core/state.js';

// Elements
const canvasContainer = document.getElementById('canvas-container');
const videoElement = document.getElementById('webcam');
const statusBadge = document.getElementById('status-badge');
const statusText = document.getElementById('status-text');

// Init
initScene(canvasContainer);
initPlanet(mainGroup);
initHandTracking(videoElement, { badge: statusBadge, text: statusText });

// Init State
controlState.targetZoom = 3.5;
controlState.currentZoom = 3.5;
controlState.targetRotX = 0;
controlState.targetRotY = 0;

// Animation Loop
const tick = () => {
    // Smooth Control
    controlState.currentRotX += (controlState.targetRotX - controlState.currentRotX) * 0.05;
    controlState.currentRotY += (controlState.targetRotY - controlState.currentRotY) * 0.05;
    controlState.currentZoom += (controlState.targetZoom - controlState.currentZoom) * 0.05;

    mainGroup.rotation.x = controlState.currentRotX;
    mainGroup.rotation.y = controlState.currentRotY;
    
    camera.position.z = controlState.currentZoom;

    // Feature Animation
    animatePlanet();

    // Background
    stars.rotation.y -= 0.0001;

    renderer.render(scene, camera);
    window.requestAnimationFrame(tick);
};

tick();
