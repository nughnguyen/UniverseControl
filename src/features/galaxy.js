import * as THREE from 'three';

let galaxyPoints = null;


export const galaxyParams = { 
    count: 100000, 
    size: 0.01, 
    radius: 7, 
    branches: 3, 
    spin: 1, 
    randomness: 0.2, 
    randomnessPower: 3, 
    insideColor: '#ff6030', 
    outsideColor: '#1b3984',
    asymmetry: 0 // New parameter 0-1
};

let mainGroupRef = null;

const galaxyPresets = {
    'Milky Way': { count: 100000, size: 0.01, radius: 7, branches: 3, spin: 1, randomness: 0.2, randomnessPower: 3 },
    'Andromeda': { count: 120000, size: 0.01, radius: 8, branches: 4, spin: 1.2, randomness: 0.3, randomnessPower: 3 },
    'Sombrero': { count: 80000, size: 0.015, radius: 6, branches: 12, spin: 0.5, randomness: 0.5, randomnessPower: 2 },
    'Nebula Cloud': { count: 150000, size: 0.02, radius: 5, branches: 3, spin: 0.2, randomness: 1.5, randomnessPower: 1.5 },
    'Black Hole': { count: 100000, size: 0.01, radius: 4, branches: 8, spin: 3, randomness: 0.1, randomnessPower: 5 },
    'Cosmic Web': { count: 70000, size: 0.01, radius: 10, branches: 6, spin: 0, randomness: 2, randomnessPower: 1 }
};

export const randomizeGalaxy = () => {
    galaxyParams.count = Math.floor(Math.random() * 100000) + 50000;
    galaxyParams.size = Math.random() * 0.02 + 0.005;
    galaxyParams.radius = Math.random() * 10 + 3;
    galaxyParams.branches = Math.floor(Math.random() * 7) + 2;
    galaxyParams.spin = (Math.random() - 0.5) * 4;
    galaxyParams.randomness = Math.random() * 1.5;
    galaxyParams.randomnessPower = Math.random() * 4 + 1;
    galaxyParams.asymmetry = Math.random() * 0.5; // Random asymmetry (0.0 to 0.5)
    
    // Random Colors
    const randomColor = () => '#' + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0');
    galaxyParams.insideColor = randomColor();
    galaxyParams.outsideColor = randomColor();

    if(mainGroupRef) generateGalaxy();
};

export const initGalaxy = (parentGroup) => {
    mainGroupRef = parentGroup;
    randomizeGalaxy();
};

export const regenerateGalaxy = () => {
    if(mainGroupRef) generateGalaxy();
}


export const animateGalaxy = () => {
    if(galaxyPoints) {
        galaxyPoints.rotation.z += 0.0002;
    }
};

const generateGalaxy = () => {
    if(!mainGroupRef) return;
    
    if(galaxyPoints) { 
        galaxyPoints.geometry.dispose(); 
        galaxyPoints.material.dispose(); 
        mainGroupRef.remove(galaxyPoints); 
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
        let branchAngle = (i % galaxyParams.branches) / galaxyParams.branches * Math.PI * 2;
        
        // Asymmetry: Randomly offset this specific point's branch angle based on asymmetry param
        if(galaxyParams.asymmetry > 0) {
             branchAngle += (Math.random() - 0.5) * galaxyParams.asymmetry * 2; // chaos factor
        }

        const randomX = Math.pow(Math.random(), galaxyParams.randomnessPower) * (Math.random()<0.5?1:-1) * galaxyParams.randomness * r;
        const randomY = Math.pow(Math.random(), galaxyParams.randomnessPower) * (Math.random()<0.5?1:-1) * galaxyParams.randomness * r;
        const randomZ = Math.pow(Math.random(), galaxyParams.randomnessPower) * (Math.random()<0.5?1:-1) * galaxyParams.randomness * r;

        positions[i3] = Math.cos(branchAngle + spin) * r + randomX;
        positions[i3+1] = randomY;
        positions[i3+2] = Math.sin(branchAngle + spin) * r + randomZ;

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
    mainGroupRef.add(galaxyPoints);
};
