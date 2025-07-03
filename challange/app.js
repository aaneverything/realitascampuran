const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const loadManager = new THREE.LoadingManager();
const loader = new THREE.TextureLoader();
const texture = loader.load('download.jpg');
texture.colorSpace = THREE.SRGBColorSpace;

const geometry = new THREE.BoxGeometry(1, 1, 1);
const materials = [
    new THREE.MeshBasicMaterial({ map: loader.load('ee (1).jpg') }),
    new THREE.MeshBasicMaterial({ map: loader.load('ee (2).jpg') }),
    new THREE.MeshBasicMaterial({ map: loader.load('ee (3).jpg') }),
    new THREE.MeshBasicMaterial({ map: loader.load('ee (4).jpg') }),
    new THREE.MeshBasicMaterial({ map: loader.load('ee (5).jpg') }),
    new THREE.MeshBasicMaterial({ map: loader.load('ee (6).jpg') }),
];
const cube = new THREE.Mesh(geometry, materials);
scene.add(cube);

function loadColorTexture(path) {
    const texture = loader.load(path);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
}

const light = new THREE.DirectionalLight(0xffffff, 1);
light.position.set(5, 10, 7.5);
scene.add(light);

camera.position.z = 4;

function animate() {
    renderer.render(scene, camera);
}
renderer.setAnimationLoop(animate);

const video = document.getElementById('webcam');
const overlay = document.getElementById('overlay');
const ctx = overlay.getContext('2d');

function resizeCanvas() {
    overlay.width = video.videoWidth;
    overlay.height = video.videoHeight;
}
video.addEventListener('loadedmetadata', resizeCanvas);

const hands = new Hands({
    locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
});
hands.setOptions({
    maxNumHands: 1,
    modelComplexity: 1,
    minDetectionConfidence: 0.7,
    minTrackingConfidence: 0.5
});

hands.onResults((results) => {
    ctx.save();
    ctx.clearRect(0, 0, overlay.width, overlay.height);
    ctx.drawImage(results.image, 0, 0, overlay.width, overlay.height);

    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        const landmarks = results.multiHandLandmarks[0];
        drawConnectors(ctx, landmarks, HAND_CONNECTIONS, { color: '#00FF00', lineWidth: 0.5 });
        drawLandmarks(ctx, landmarks, { color: '#FF0000', lineWidth: 0.5 });

        const wrist = landmarks[0];
        const indexBase = landmarks[5];
        const pinkyBase = landmarks[17];
        // Vektor arah horizontal tangan
        const vX = new THREE.Vector3(indexBase.x - wrist.x, indexBase.y - wrist.y, indexBase.z - wrist.z).normalize();
        const vY = new THREE.Vector3(pinkyBase.x - wrist.x, pinkyBase.y - wrist.y, pinkyBase.z - wrist.z).normalize();
        const vZ = new THREE.Vector3().crossVectors(vX, vY).normalize();
        // Matrix rotasi
        const rotMatrix = new THREE.Matrix4();
        rotMatrix.makeBasis(vX, vY, vZ);
        cube.setRotationFromMatrix(rotMatrix);
    }
    ctx.restore();
});

const cameraMediapipe = new Camera(video, {
    onFrame: async () => {
        await hands.send({ image: video });
    },
    width: 1280,
    height: 720
});
cameraMediapipe.start();
