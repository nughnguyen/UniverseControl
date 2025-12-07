import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';
import { controlState } from './state.js';

let handLandmarker = undefined;
let video = undefined;
let lastVideoTime = -1;

export const initHandTracking = async (videoElement, uiElements) => {
    video = videoElement;
    try {
        const vision = await FilesetResolver.forVisionTasks(
            "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm"
        );
        
        handLandmarker = await HandLandmarker.createFromOptions(vision, {
            baseOptions: {
                modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`,
                delegate: "GPU"
            },
            runningMode: "VIDEO",
            numHands: 1
        });
        
        startCamera(uiElements);
    } catch (error) {
        console.error("Hand Tracking Init Error:", error);
    }
};

const startCamera = (uiElements) => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.warn("Browser API navigator.mediaDevices.getUserMedia not available");
        return;
    }

    const constraints = { video: { width: 640, height: 480, frameRate: { ideal: 30 } } };
    navigator.mediaDevices.getUserMedia(constraints)
    .then((stream) => {
        video.srcObject = stream;
        video.addEventListener('loadeddata', () => {
            if(uiElements.badge) uiElements.badge.style.display = 'flex';
            video.play(); 
            predictWebcam(uiElements);
        });
    }).catch((err) => {
        console.error("Camera denied:", err);
    });
};

const predictWebcam = (uiElements) => {
    if (!video || !handLandmarker) return;

    let startTimeMs = performance.now();
    if (lastVideoTime !== video.currentTime) {
        lastVideoTime = video.currentTime;
        try {
            const result = handLandmarker.detectForVideo(video, startTimeMs);
            
            if (result.landmarks && result.landmarks.length > 0) {
                // Hand Detected
                if(uiElements.badge && !uiElements.badge.classList.contains('active')) {
                    uiElements.badge.classList.add('active');
                    if(uiElements.text) uiElements.text.innerText = "Connected";
                }
                
                const landmarks = result.landmarks[0];
                const indexTip = landmarks[8]; 
                const thumbTip = landmarks[4]; 

                // Interaction Logic
                const targetY = (1 - indexTip.x - 0.5) * 5;
                const targetX = (indexTip.y - 0.5) * 5;
                
                controlState.targetRotY = targetY;
                controlState.targetRotX = targetX;

                // Zoom (Pinch)
                const dist = Math.sqrt(Math.pow(indexTip.x - thumbTip.x, 2) + Math.pow(indexTip.y - thumbTip.y, 2));
                const zoomFactor = Math.max(0.01, Math.min(dist, 0.2));
                controlState.targetZoom = 10 - (zoomFactor / 0.2) * 7; 

            } else {
                // No Hand
                if(uiElements.badge && uiElements.badge.classList.contains('active')) {
                    uiElements.badge.classList.remove('active');
                    if(uiElements.text) uiElements.text.innerText = "Searching...";
                }
                // Idle Rotation
                controlState.targetRotY += 0.001; 
            }
        } catch(e) { console.warn(e); }
    }
    window.requestAnimationFrame(() => predictWebcam(uiElements));
};
