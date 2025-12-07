import * as THREE from 'three';
import GUI from 'three/examples/jsm/libs/lil-gui.module.min.js';

let galaxyPoints = null;
let parentGroup = null;

// Default Parameters
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
        if(parentGroup) parentGroup.remove(galaxyPoints); 
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
    
    if(parentGroup) parentGroup.add(galaxyPoints);
};

export function initGalaxy(sceneGroup) {
    parentGroup = sceneGroup;
    randomizeGalaxy();
    generateGalaxy();

    // GUI
    const gui = new GUI({ title: 'Universe Control' });
    const galaxyFolder = gui.addFolder('Galaxy Settings');

    const obj = { Randomize: () => {
        randomizeGalaxy();
        currentPreset.type = 'Random';
        gui.controllersRecursive().forEach(c => c.updateDisplay());
        generateGalaxy();
    }};
    galaxyFolder.add(obj, 'Randomize');

    galaxyFolder.add(currentPreset, 'type', ['Random', ...Object.keys(galaxyPresets)]).name('Galaxy Type').onChange((value) => {
        if (value === 'Random') {
            randomizeGalaxy();
        } else {
            const preset = galaxyPresets[value];
            Object.assign(galaxyParams, preset);
        }
        gui.controllersRecursive().forEach(c => c.updateDisplay());
        generateGalaxy();
    });

    galaxyFolder.add(galaxyParams, 'count').min(1000).max(500000).step(1000).onFinishChange(generateGalaxy);
    galaxyFolder.add(galaxyParams, 'size').min(0.001).max(0.1).step(0.001).onFinishChange(generateGalaxy);
    galaxyFolder.add(galaxyParams, 'radius').min(0.1).max(20).step(0.1).onFinishChange(generateGalaxy);
    galaxyFolder.add(galaxyParams, 'branches').min(2).max(20).step(1).onFinishChange(generateGalaxy);
    galaxyFolder.add(galaxyParams, 'spin').min(-5).max(5).step(0.01).onFinishChange(generateGalaxy);
    galaxyFolder.add(galaxyParams, 'randomness').min(0).max(2).step(0.01).onFinishChange(generateGalaxy);
    galaxyFolder.add(galaxyParams, 'randomnessPower').min(1).max(10).step(0.1).onFinishChange(generateGalaxy);
    galaxyFolder.addColor(galaxyParams, 'insideColor').onFinishChange(generateGalaxy);
    galaxyFolder.addColor(galaxyParams, 'outsideColor').onFinishChange(generateGalaxy);
}

export function animateGalaxy() {
    if (galaxyPoints) {
        galaxyPoints.rotation.z += 0.0002;
    }
}
