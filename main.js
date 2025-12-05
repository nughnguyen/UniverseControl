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
let planetPoints;
let satellites = [];
const earthGroup = new THREE.Group();

const createEarth = () => {
    // 1. Planet Points (Sphere) - Textured Particles
    const earthTexture = new THREE.TextureLoader().load(
        'https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_atmos_2048.jpg'
    );

    const planetGeometry = new THREE.SphereGeometry(1, 128, 128); // Higher res for better particle density
    
    const planetMaterial = new THREE.ShaderMaterial({
        uniforms: {
            earthTexture: { value: earthTexture }
        },
        vertexShader: `
            varying vec2 vUv;
            void main() {
                vUv = uv;
                vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                gl_PointSize = 2.5 * (10.0 / -mvPosition.z);
                gl_Position = projectionMatrix * mvPosition;
            }
        `,
        fragmentShader: `
            uniform sampler2D earthTexture;
            varying vec2 vUv;
            void main() {
                vec4 color = texture2D(earthTexture, vUv);
                // if (length(color.rgb) < 0.2) discard; // Show ocean
                gl_FragColor = vec4(color.rgb, 1.0);
            }
        `,
        transparent: true
    });

    planetPoints = new THREE.Points(planetGeometry, planetMaterial);
    
    // Black inner sphere to block particles behind
    const blackSphere = new THREE.Mesh(
        new THREE.SphereGeometry(0.99, 64, 64),
        new THREE.MeshBasicMaterial({ color: 0x000000 })
    );
    planetPoints.add(blackSphere);

    earthGroup.add(planetPoints);

    // 2. Satellites (Random Orbits)
    // Clear previous satellites
    satellites.forEach(s => {
        if (s.mesh) {
            s.mesh.geometry.dispose();
            s.mesh.material.dispose();
        }
        earthGroup.remove(s.pivot);
    });
    satellites = [];

    const satelliteCount = 40; 
    const satGeometry = new THREE.BoxGeometry(0.05, 0.05, 0.05);
    const satMaterial = new THREE.MeshBasicMaterial({ color: 0x00ffff });

    for(let i=0; i<satelliteCount; i++) {
        const pivot = new THREE.Object3D();
        // Random orientation for the orbit
        pivot.rotation.set(
            Math.random() * Math.PI * 2,
            Math.random() * Math.PI * 2,
            Math.random() * Math.PI * 2
        );

        const sat = new THREE.Mesh(satGeometry, satMaterial);
        // Random distance from center
        const distance = 1.3 + Math.random() * 0.7;
        sat.position.set(distance, 0, 0);

        pivot.add(sat);
        earthGroup.add(pivot);

        satellites.push({
            pivot: pivot,
            mesh: sat,
            speed: 0.002 + Math.random() * 0.005 // Random orbital speed
        });
    }
};

// --- GALAXY GENERATION ---
let galaxyPoints = null;

// Default Parameters (will be overwritten by presets)
const galaxyParams = { 
    count: 150000, 
    size: 0.01, 
    radius: 7, 
    branches: 3, 
    spin: 1, 
    randomness: 0.2, 
    randomnessPower: 3, 
    insideColor: '#ff6030', 
    outsideColor: '#1b3984' 
};

// Galaxy Presets
const galaxyPresets = {
    'Milky Way': { count: 150000, size: 0.01, radius: 7, branches: 3, spin: 1, randomness: 0.2, randomnessPower: 3, insideColor: '#ff6030', outsideColor: '#1b3984' },
    'Andromeda': { count: 180000, size: 0.01, radius: 8, branches: 4, spin: 1.2, randomness: 0.3, randomnessPower: 3, insideColor: '#aaddff', outsideColor: '#3355aa' },
    'Sombrero': { count: 120000, size: 0.015, radius: 6, branches: 12, spin: 0.5, randomness: 0.5, randomnessPower: 2, insideColor: '#ffffaa', outsideColor: '#aa8844' },
    'Nebula Cloud': { count: 200000, size: 0.02, radius: 5, branches: 3, spin: 0.2, randomness: 1.5, randomnessPower: 1.5, insideColor: '#ff00aa', outsideColor: '#00ffff' },
    'Black Hole Accretion': { count: 150000, size: 0.01, radius: 4, branches: 8, spin: 3, randomness: 0.1, randomnessPower: 5, insideColor: '#ffffff', outsideColor: '#ff4400' },
    'Cosmic Web': { count: 100000, size: 0.01, radius: 10, branches: 6, spin: 0, randomness: 2, randomnessPower: 1, insideColor: '#444444', outsideColor: '#aaaaaa' },
    'Red Giant': { count: 100000, size: 0.03, radius: 3, branches: 5, spin: 0.8, randomness: 0.6, randomnessPower: 2, insideColor: '#ff2200', outsideColor: '#660000' },
    'Ice Galaxy': { count: 140000, size: 0.01, radius: 7, branches: 4, spin: 1, randomness: 0.3, randomnessPower: 3, insideColor: '#ccffff', outsideColor: '#004488' },
    'Golden Ring': { count: 100000, size: 0.015, radius: 6, branches: 20, spin: 2, randomness: 0.1, randomnessPower: 4, insideColor: '#ffcc00', outsideColor: '#664400' },
    'Chaos Region': { count: 150000, size: 0.015, radius: 6, branches: 2, spin: 0.1, randomness: 2, randomnessPower: 1, insideColor: '#00ff00', outsideColor: '#ff00ff' }
};

const currentPreset = { type: 'Random' };

const randomizeGalaxy = () => {
    galaxyParams.count = Math.floor(Math.random() * 100000) + 50000;
    galaxyParams.size = Math.random() * 0.02 + 0.005;
    galaxyParams.radius = Math.random() * 10 + 3;
    galaxyParams.branches = Math.floor(Math.random() * 7) + 2;
    galaxyParams.spin = (Math.random() - 0.5) * 4;
    galaxyParams.randomness = Math.random() * 1.5;
    galaxyParams.randomnessPower = Math.random() * 4 + 1;
    
    const randomColor = () => '#' + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0');
    galaxyParams.insideColor = randomColor();
    galaxyParams.outsideColor = randomColor();
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

// Randomize Initial State
randomizeGalaxy();

// Mode Switching
const displayParams = { mode: 'Galaxy' };
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
const gui = new GUI({ title: 'Universe Control' });
gui.add(displayParams, 'mode', ['Planet', 'Galaxy']).onChange(switchMode);

const galaxyFolder = gui.addFolder('Galaxy Settings');

// Randomize Button
const obj = { Randomize: () => {
    randomizeGalaxy();
    currentPreset.type = 'Random';
    // Update GUI
    gui.controllersRecursive().forEach(c => c.updateDisplay());
    generateGalaxy();
}};
galaxyFolder.add(obj, 'Randomize');

// Preset Selector
galaxyFolder.add(currentPreset, 'type', ['Random', ...Object.keys(galaxyPresets)]).name('Galaxy Type').onChange((value) => {
    if (value === 'Random') {
        randomizeGalaxy();
    } else {
        const preset = galaxyPresets[value];
        Object.assign(galaxyParams, preset);
    }
    // Update GUI controllers to match new preset
    gui.controllersRecursive().forEach(c => c.updateDisplay());
    generateGalaxy();
});

// Advanced Galaxy Controls
galaxyFolder.add(galaxyParams, 'count').min(1000).max(500000).step(1000).onFinishChange(generateGalaxy);
galaxyFolder.add(galaxyParams, 'size').min(0.001).max(0.1).step(0.001).onFinishChange(generateGalaxy);
galaxyFolder.add(galaxyParams, 'radius').min(0.1).max(20).step(0.1).onFinishChange(generateGalaxy);
galaxyFolder.add(galaxyParams, 'branches').min(2).max(20).step(1).onFinishChange(generateGalaxy);
galaxyFolder.add(galaxyParams, 'spin').min(-5).max(5).step(0.01).onFinishChange(generateGalaxy);
galaxyFolder.add(galaxyParams, 'randomness').min(0).max(2).step(0.01).onFinishChange(generateGalaxy);
galaxyFolder.add(galaxyParams, 'randomnessPower').min(1).max(10).step(0.1).onFinishChange(generateGalaxy);
galaxyFolder.addColor(galaxyParams, 'insideColor').onFinishChange(generateGalaxy);
galaxyFolder.addColor(galaxyParams, 'outsideColor').onFinishChange(generateGalaxy);
galaxyFolder.close();

// ==========================================================================
// PART 2: AI HAND TRACKING (MediaPipe)
// ==========================================================================
async function initHandLandmarker() {
    try {
        if(UI.loadingText) UI.loadingText.innerText = "Loading Vision Models...";
        const vision = await FilesetResolver.forVisionTasks(
            "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm"
        );
        
        if(UI.loadingText) UI.loadingText.innerText = "Initializing AI...";
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
        
        // Auto-start camera after models are ready
        startCamera();
    } catch (error) {
        console.error(error);
    }
}

// Start Camera Function
function startCamera() {
    if (!handLandmarker) return;
    
    // Show Dev Credit
    const devCredit = document.getElementById('dev-credit');
    if(devCredit) devCredit.classList.remove('hidden');

    if (location.protocol !== 'https:' && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') {
        console.warn("Security Warning: Camera requires HTTPS or Localhost.");
    }
    
    const constraints = { video: { width: 640, height: 480, frameRate: { ideal: 30 } } };
    navigator.mediaDevices.getUserMedia(constraints)
    .then((stream) => {
        UI.video.srcObject = stream;
        UI.video.addEventListener('loadeddata', () => {
            console.log("Camera Active");
            // UI.overlay.classList.add('hidden'); // Overlay is already hidden/removed
            UI.statusBadge.style.display = 'flex';
            // Ensure video is playing
            UI.video.play(); 
            predictWebcam();
        });
    }).catch((err) => {
        console.error("Camera Error:", err);
    });
}

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
        // Animate Satellites
        satellites.forEach(s => {
            s.pivot.rotation.z += s.speed; // Rotate around local Z axis (since we set random rotation on pivot)
        });
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