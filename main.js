import * as THREE from 'three';
import GUI from 'three/addons/libs/lil-gui.module.min.js';
import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';

// --- UI CONFIG ---
const UI = {
    startBtn: document.getElementById('start-btn'),
    overlay: document.getElementById('overlay'),
    errorMsg: document.getElementById('error-msg'),
    loadingText: document.getElementById('loading-text'),
    statusBadge: document.getElementById('status-badge'),
    statusText: document.getElementById('status-text'),
    canvasContainer: document.getElementById('canvas-container'),
    video: document.getElementById('webcam')
};

// --- GLOBAL VARIABLES ---
let handLandmarker = undefined;
let lastVideoTime = -1;
let mainGroup = new THREE.Group();
const controlState = {
    targetRotX: 0, currentRotX: 0,
    targetRotY: 0, currentRotY: 0,
    targetZoom: 4, currentZoom: 4
};

// ==========================================================================
// PART 1: THREE.JS (PREMIUM 3D SCENE)
// ==========================================================================
const scene = new THREE.Scene();
// Add subtle fog for depth
scene.fog = new THREE.FogExp2(0x000000, 0.02);

const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.z = 5;

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.outputColorSpace = THREE.SRGBColorSpace;
UI.canvasContainer.appendChild(renderer.domElement);

scene.add(mainGroup);

// Lighting
const ambientLight = new THREE.AmbientLight(0x404040, 2); // Soft global light
scene.add(ambientLight);

const sunLight = new THREE.DirectionalLight(0xffffff, 3);
sunLight.position.set(5, 3, 5);
scene.add(sunLight);

// Backlight for dramatic effect
const backLight = new THREE.SpotLight(0x64ffda, 5);
backLight.position.set(-5, 5, -5);
backLight.lookAt(0, 0, 0);
scene.add(backLight);

// Texture Loader
const textureLoader = new THREE.TextureLoader();

// --- STAR FIELD (Background) ---
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
const stars = new THREE.Points(starGeometry, starMaterial);
scene.add(stars);

// --- PLANET CREATION (POINT CLOUD + RING) ---
let planetPoints, ringPoints;
const earthGroup = new THREE.Group();

const createEarth = () => {
    // 1. Planet Points (Sphere)
    const planetGeometry = new THREE.SphereGeometry(1, 64, 64);
    const planetMaterial = new THREE.PointsMaterial({
        color: 0x00aaff,
        size: 0.015,
        transparent: true,
        opacity: 0.8,
        sizeAttenuation: true
    });
    planetPoints = new THREE.Points(planetGeometry, planetMaterial);
    earthGroup.add(planetPoints);

    // 2. Ring Points (Saturn-like)
    // Create a ring of particles
    const ringGeometry = new THREE.BufferGeometry();
    const ringCount = 20000;
    const ringPositions = new Float32Array(ringCount * 3);
    const ringColors = new Float32Array(ringCount * 3);
    const colorInner = new THREE.Color(0xffaa00);
    const colorOuter = new THREE.Color(0x884400);

    for(let i=0; i<ringCount; i++) {
        // Random radius between 1.4 and 2.2
        const r = 1.4 + Math.random() * 0.8;
        const theta = Math.random() * Math.PI * 2;
        
        const x = r * Math.cos(theta);
        const y = (Math.random() - 0.5) * 0.05; // Thinness
        const z = r * Math.sin(theta);

        ringPositions[i*3] = x;
        ringPositions[i*3+1] = y;
        ringPositions[i*3+2] = z;

        // Color gradient based on radius
        const mixedColor = colorInner.clone().lerp(colorOuter, (r - 1.4) / 0.8);
        ringColors[i*3] = mixedColor.r;
        ringColors[i*3+1] = mixedColor.g;
        ringColors[i*3+2] = mixedColor.b;
    }

    ringGeometry.setAttribute('position', new THREE.BufferAttribute(ringPositions, 3));
    ringGeometry.setAttribute('color', new THREE.BufferAttribute(ringColors, 3));

    ringPoints = new THREE.Points(ringGeometry, new THREE.PointsMaterial({
        size: 0.015,
        vertexColors: true,
        transparent: true,
        opacity: 0.7,
        sizeAttenuation: true
    }));
    
    // Tilt the ring
    ringPoints.rotation.x = Math.PI / 6; 
    ringPoints.rotation.z = Math.PI / 8;

    earthGroup.add(ringPoints);
};

// --- GALAXY GENERATION ---
let galaxyPoints = null;
const galaxyParams = { 
    count: 150000, // Denser galaxy
    size: 0.01, 
    radius: 7, 
    branches: 3, 
    spin: 1, 
    randomness: 0.2, 
    randomnessPower: 3, 
    insideColor: '#ff6030', 
    outsideColor: '#1b3984' 
};

const generateGalaxy = () => {
    if(galaxyPoints) { 
        galaxyPoints.geometry.dispose(); 
        galaxyPoints.material.dispose(); 
        mainGroup.remove(galaxyPoints); 
    }

    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(galaxyParams.count * 3);
    const colors = new Float32Array(galaxyParams.count * 3);
    
    const colorIn = new THREE.Color(galaxyParams.insideColor);
    const colorOut = new THREE.Color(galaxyParams.outsideColor);

    for(let i=0; i<galaxyParams.count; i++) {
        const i3 = i*3;
        const r = Math.random() * galaxyParams.radius;
        const spin = r * galaxyParams.spin;
        const branch = (i % galaxyParams.branches) / galaxyParams.branches * Math.PI * 2;
        
        const randomX = Math.pow(Math.random(), galaxyParams.randomnessPower) * (Math.random()<0.5?1:-1) * galaxyParams.randomness * r;
        const randomY = Math.pow(Math.random(), galaxyParams.randomnessPower) * (Math.random()<0.5?1:-1) * galaxyParams.randomness * r;
        const randomZ = Math.pow(Math.random(), galaxyParams.randomnessPower) * (Math.random()<0.5?1:-1) * galaxyParams.randomness * r;

        positions[i3] = Math.cos(branch + spin) * r + randomX;
        positions[i3+1] = randomY;
        positions[i3+2] = Math.sin(branch + spin) * r + randomZ;

        const mixedColor = colorIn.clone().lerp(colorOut, r / galaxyParams.radius);
        colors[i3] = mixedColor.r;
        colors[i3+1] = mixedColor.g;
        colors[i3+2] = mixedColor.b;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    galaxyPoints = new THREE.Points(geometry, new THREE.PointsMaterial({
        size: galaxyParams.size,
        sizeAttenuation: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        vertexColors: true
    }));
    mainGroup.add(galaxyPoints);
};

// Mode Switching
const displayParams = { mode: 'Planet' };
const switchMode = () => {
    mainGroup.clear();
    if(displayParams.mode === 'Planet') {
        if(!planetPoints) createEarth();
        mainGroup.add(earthGroup);
        controlState.targetZoom = 3.5; controlState.currentZoom = 3.5;
        // Reset rotation
        controlState.targetRotX = 0; controlState.targetRotY = 0;
    } else {
        generateGalaxy();
        controlState.targetZoom = 8; controlState.currentZoom = 8;
        controlState.targetRotX = 0.5; controlState.targetRotY = 0;
    }
    camera.position.z = controlState.currentZoom;
};
switchMode();

// GUI
const gui = new GUI({ title: 'Settings' });
gui.add(displayParams, 'mode', ['Planet', 'Galaxy']).onChange(switchMode);
const galaxyFolder = gui.addFolder('Galaxy Colors').close();
galaxyFolder.addColor(galaxyParams, 'insideColor').onChange(generateGalaxy);
galaxyFolder.addColor(galaxyParams, 'outsideColor').onChange(generateGalaxy);

// ==========================================================================
// PART 2: AI HAND TRACKING (MediaPipe)
// ==========================================================================
async function initHandLandmarker() {
    try {
        UI.loadingText.innerText = "Loading Vision Models...";
        const vision = await FilesetResolver.forVisionTasks(
            "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm"
        );
        
        UI.loadingText.innerText = "Initializing AI...";
        handLandmarker = await HandLandmarker.createFromOptions(vision, {
            baseOptions: {
                modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`,
                delegate: "GPU"
            },
            runningMode: "VIDEO",
            numHands: 1,
            minHandDetectionConfidence: 0.5,
            minHandPresenceConfidence: 0.5,
            minTrackingConfidence: 0.5
        });
        
        UI.loadingText.innerText = "System Ready.";
        UI.startBtn.disabled = false;
        UI.startBtn.innerText = "START EXPERIENCE";
        UI.startBtn.style.borderColor = "#ffffff";
        UI.startBtn.style.color = "#ffffff";
    } catch (error) {
        console.error(error);
        UI.errorMsg.style.display = 'block';
        UI.errorMsg.innerText = "Error: " + error.message;
    }
}

// Start Camera
UI.startBtn.addEventListener('click', () => {
    if (!handLandmarker) return;
    
    // Show Dev Credit
    const devCredit = document.getElementById('dev-credit');
    if(devCredit) devCredit.classList.remove('hidden');

    if (location.protocol !== 'https:' && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') {
        UI.errorMsg.style.display = 'block';
        UI.errorMsg.innerText = "Security Warning: Camera requires HTTPS or Localhost.";
    }

    UI.loadingText.innerText = "Requesting Camera Access...";
    
    const constraints = { video: { width: 640, height: 480, frameRate: { ideal: 30 } } };
    navigator.mediaDevices.getUserMedia(constraints)
    .then((stream) => {
        UI.video.srcObject = stream;
        UI.video.addEventListener('loadeddata', () => {
            console.log("Camera Active");
            UI.overlay.classList.add('hidden');
            UI.statusBadge.style.display = 'flex';
            // Ensure video is playing
            UI.video.play(); 
            predictWebcam();
        });
    }).catch((err) => {
        console.error("Camera Error:", err);
        UI.errorMsg.style.display = 'block';
        UI.errorMsg.innerText = "Camera Access Denied: " + err.message;
    });
});

async function predictWebcam() {
    // Ensure video is ready
    if (!UI.video.videoWidth) {
        window.requestAnimationFrame(predictWebcam);
        return;
    }

    let startTimeMs = performance.now();
    if (lastVideoTime !== UI.video.currentTime) {
        lastVideoTime = UI.video.currentTime;
        try {
            const result = handLandmarker.detectForVideo(UI.video, startTimeMs);
            
            if (result.landmarks && result.landmarks.length > 0) {
                // HAND FOUND
                if(!UI.statusBadge.classList.contains('active')) {
                    UI.statusBadge.classList.add('active');
                    UI.statusText.innerText = "Connected";
                }
                
                const landmarks = result.landmarks[0];
                const indexTip = landmarks[8]; 
                const thumbTip = landmarks[4]; 

                // Rotation Mapping (Smoother)
                const targetY = (1 - indexTip.x - 0.5) * 5;
                const targetX = (indexTip.y - 0.5) * 5;
                
                controlState.targetRotY = targetY;
                controlState.targetRotX = targetX;

                // Zoom Mapping (Pinch)
                const dist = Math.sqrt(Math.pow(indexTip.x - thumbTip.x, 2) + Math.pow(indexTip.y - thumbTip.y, 2));
                const zoomFactor = Math.max(0.01, Math.min(dist, 0.2));
                controlState.targetZoom = 10 - (zoomFactor / 0.2) * 7; 

            } else {
                // NO HAND
                if(UI.statusBadge.classList.contains('active')) {
                    UI.statusBadge.classList.remove('active');
                    UI.statusText.innerText = "Searching for hand...";
                }
                // Auto rotate when idle
                controlState.targetRotY += 0.001; 
            }
        } catch(e) { 
            console.warn("Detection Error:", e); 
        }
    }
    window.requestAnimationFrame(predictWebcam);
}

// --- ANIMATION LOOP ---
const tick = () => {
    // Smooth Damping (Lerp)
    controlState.currentRotX += (controlState.targetRotX - controlState.currentRotX) * 0.05;
    controlState.currentRotY += (controlState.targetRotY - controlState.currentRotY) * 0.05;
    controlState.currentZoom += (controlState.targetZoom - controlState.currentZoom) * 0.05;

    // Apply to Group
    mainGroup.rotation.x = controlState.currentRotX;
    mainGroup.rotation.y = controlState.currentRotY;
    
    // Apply Zoom
    camera.position.z = controlState.currentZoom;

    // Ambient Animations
    if (displayParams.mode === 'Planet') {
        if(planetPoints) planetPoints.rotation.y += 0.0005; 
        if(ringPoints) ringPoints.rotation.z -= 0.001; // Spin the ring
    } else if (displayParams.mode === 'Galaxy' && galaxyPoints) {
        galaxyPoints.rotation.z += 0.0002;
    }
    
    // Background stars parallax or slow spin
    stars.rotation.y -= 0.0001;

    renderer.render(scene, camera);
    window.requestAnimationFrame(tick);
};

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

initHandLandmarker();
tick();