import './style.css';
import { initScene, scene, camera, renderer, mainGroup, stars } from './core/scene.js';
import { initHandTracking } from './core/hand-tracking.js';
import { initGalaxy, animateGalaxy, galaxyParams, regenerateGalaxy, randomizeGalaxy } from './features/galaxy.js';
import { controlState } from './core/state.js';
import GUI from 'three/examples/jsm/libs/lil-gui.module.min.js';

// Elements
const canvasContainer = document.getElementById('canvas-container');
const videoElement = document.getElementById('webcam');
const statusBadge = document.getElementById('status-badge');
const statusText = document.getElementById('status-text');

// Init
initScene(canvasContainer);
initGalaxy(mainGroup);
initHandTracking(videoElement, { badge: statusBadge, text: statusText });

// GUI Setup
const gui = new GUI({ title: 'Galaxy Control' });
// const folder = gui.addFolder('Settings'); // Removed nesting

const params = {
    Randomize: () => {
        randomizeGalaxy();
        gui.controllersRecursive().forEach(c => c.updateDisplay());
    }
};

gui.add(params, 'Randomize');
gui.add(galaxyParams, 'count', 1000, 500000, 1000).onFinishChange(regenerateGalaxy);
gui.add(galaxyParams, 'size', 0.001, 0.1, 0.001).onFinishChange(regenerateGalaxy);
gui.add(galaxyParams, 'radius', 0.1, 20, 0.1).onFinishChange(regenerateGalaxy);
gui.add(galaxyParams, 'branches', 2, 20, 1).onFinishChange(regenerateGalaxy);
gui.add(galaxyParams, 'spin', -5, 5, 0.01).onFinishChange(regenerateGalaxy);
gui.add(galaxyParams, 'randomness', 0, 2, 0.01).onFinishChange(regenerateGalaxy);
gui.add(galaxyParams, 'randomnessPower', 1, 10, 0.1).onFinishChange(regenerateGalaxy);
gui.add(galaxyParams, 'asymmetry', 0, 1, 0.01).name('Asymmetry').onFinishChange(regenerateGalaxy); // New Control
gui.addColor(galaxyParams, 'insideColor').onFinishChange(regenerateGalaxy);
gui.addColor(galaxyParams, 'outsideColor').onFinishChange(regenerateGalaxy);
// gui.close(); // Implicitly closed or we can leave it default. User said "when open galaxy control... no setting part".
// I'll leave default state (Open) or Closed? User said "mặc định đóng" before.
// But now says "khi mở ... hiện menu luôn".
// I will keep it closed by default but flat structure.
gui.close();

gui.close(); // Close by default


// Navigation Logic
document.querySelectorAll('.dock-item').forEach(btn => {
    btn.addEventListener('click', (e) => {
        const mode = btn.dataset.mode;
        document.querySelectorAll('.dock-item').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        if(mode === 'Planet') {
             // Basic routing
             window.location.href = '/planet.html'; 
        } else {
             // Galaxy is default here
             gui.show();
        }
    }); 
});


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
    animateGalaxy();

    // Background
    stars.rotation.y -= 0.0001;

    renderer.render(scene, camera);
    window.requestAnimationFrame(tick);
};

tick();
