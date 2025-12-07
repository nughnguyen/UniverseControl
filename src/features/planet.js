import * as THREE from 'three';

let planetPoints;
let satellites = [];
const earthGroup = new THREE.Group();

export const initPlanet = (parentGroup) => {
    if(!planetPoints) createEarth();
    parentGroup.add(earthGroup);
};

export const animatePlanet = () => {
    if(planetPoints) planetPoints.rotation.y += 0.0005; 
    satellites.forEach(s => s.pivot.rotation.z += s.speed);
};

const createEarth = () => {
    // 1. Planet Points (Sphere) - Textured Particles
    const earthTexture = new THREE.TextureLoader().load(
        'https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_atmos_2048.jpg'
    );

    const planetGeometry = new THREE.SphereGeometry(1, 256, 256); 
    
    const planetMaterial = new THREE.ShaderMaterial({
        uniforms: {
            earthTexture: { value: earthTexture }
        },
        vertexShader: `
            varying vec2 vUv;
            void main() {
                vUv = uv;
                vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                gl_PointSize = 4.0 * (10.0 / -mvPosition.z);
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
    // Clear previous
    satellites = [];

    const satelliteCount = 40; 
    const satGeometry = new THREE.BoxGeometry(0.05, 0.05, 0.05);
    const satMaterial = new THREE.MeshBasicMaterial({ color: 0x00ffff });

    for(let i=0; i<satelliteCount; i++) {
        const pivot = new THREE.Object3D();
        pivot.rotation.set(
            Math.random() * Math.PI * 2,
            Math.random() * Math.PI * 2,
            Math.random() * Math.PI * 2
        );

        const sat = new THREE.Mesh(satGeometry, satMaterial);
        const distance = 1.3 + Math.random() * 0.7;
        sat.position.set(distance, 0, 0);

        pivot.add(sat);
        earthGroup.add(pivot);

        satellites.push({
            pivot: pivot,
            mesh: sat,
            speed: 0.002 + Math.random() * 0.005 
        });
    }
};
