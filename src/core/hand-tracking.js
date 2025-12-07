import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';
import { controlState } from './state.js';

let handLandmarker = undefined;
let lastVideoTime = -1;
let video = null;
let statusBadge = null;
let statusText = null;

export async function initHandTracking(videoElement, statusValues) {
    video = videoElement;
    statusBadge = statusValues.badge;
    statusText = statusValues.text;

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
            numHands: 1,
            minHandDetectionConfidence: 0.5,
            minHandPresenceConfidence: 0.5,
            minTrackingConfidence: 0.5
        });
        
        startCamera();
    } catch (error) {
        console.error(error);
    }
}

function startCamera() {
    if (!handLandmarker || !video) return;
    
    // Show Dev Credit (handled in UI setup usually, but we assume it's there)
    const devCredit = document.getElementById('dev-credit');
    if(devCredit) devCredit.classList.remove('hidden');

    const constraints = { video: { width: 640, height: 480, frameRate: { ideal: 30 } } };
    navigator.mediaDevices.getUserMedia(constraints)
    .then((stream) => {
        video.srcObject = stream;
        video.addEventListener('loadeddata', () => {
            console.log("Camera Active");
            if (statusBadge) statusBadge.style.display = 'flex';
            video.play(); 
            predictWebcam();
        });
    }).catch((err) => {
        console.error("Camera Error:", err);
    });
}

async function predictWebcam() {
    if (!video || !video.videoWidth) {
        window.requestAnimationFrame(predictWebcam);
        return;
    }

    let startTimeMs = performance.now();
    if (lastVideoTime !== video.currentTime) {
        lastVideoTime = video.currentTime;
        try {
            const result = handLandmarker.detectForVideo(video, startTimeMs);
            
            if (result.landmarks && result.landmarks.length > 0) {
                // HAND FOUND
                if(statusBadge && !statusBadge.classList.contains('active')) {
                    statusBadge.classList.add('active');
                    if(statusText) statusText.innerText = "Connected";
                }
                
                const landmarks = result.landmarks[0];
                const indexTip = landmarks[8]; 
                const thumbTip = landmarks[4]; 

                // Rotation Mapping
                const targetY = (1 - indexTip.x - 0.5) * 5;
                const targetX = (indexTip.y - 0.5) * 5;
                
                controlState.targetRotY = targetY;
                controlState.targetRotX = targetX;

                // Zoom Mapping
                const dist = Math.sqrt(Math.pow(indexTip.x - thumbTip.x, 2) + Math.pow(indexTip.y - thumbTip.y, 2));
                const zoomFactor = Math.max(0.01, Math.min(dist, 0.2));
                controlState.targetZoom = 10 - (zoomFactor / 0.2) * 7; 

            } else {
                // NO HAND
                if(statusBadge && statusBadge.classList.contains('active')) {
                    statusBadge.classList.remove('active');
                    if(statusText) statusText.innerText = "Searching for hand...";
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
