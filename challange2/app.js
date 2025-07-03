// Setup Three.js
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Fire Material
const fireMaterial = new THREE.SpriteMaterial({
  map: new THREE.TextureLoader().load('fire.jpg'), // Gunakan PNG transparan
  transparent: true,
  blending: THREE.AdditiveBlending,
});

const fireSprites = [];
for (let i = 0; i < 5; i++) {
  const sprite = new THREE.Sprite(fireMaterial.clone());
  sprite.scale.set(0.5, 0.5, 0.5);
  sprite.visible = false;
  fireSprites.push(sprite);
  scene.add(sprite);
}

// Lighting
const light = new THREE.DirectionalLight(0xffffff, 1);
light.position.set(5, 10, 7.5);
scene.add(light);

camera.position.z = 5;

// Animate
function animate() {
  fireSprites.forEach(sprite => {
    sprite.material.rotation += 0.01;
  });
  renderer.render(scene, camera);
}
renderer.setAnimationLoop(animate);

// Video & Canvas
const video = document.getElementById('webcam');
const overlay = document.getElementById('overlay');
const ctx = overlay.getContext('2d');

function resizeCanvas() {
  overlay.width = video.videoWidth;
  overlay.height = video.videoHeight;
  renderer.setSize(video.videoWidth, video.videoHeight);
  camera.aspect = video.videoWidth / video.videoHeight;
  camera.updateProjectionMatrix();
}
video.addEventListener('loadedmetadata', resizeCanvas);

// MediaPipe Hands
const hands = new Hands({
  locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
});

hands.setOptions({
  maxNumHands: 1,
  modelComplexity: 1,
  minDetectionConfidence: 0.7,
  minTrackingConfidence: 0.6,
});

hands.onResults((results) => {
  ctx.save();
  ctx.clearRect(0, 0, overlay.width, overlay.height);
  ctx.drawImage(results.image, 0, 0, overlay.width, overlay.height);

  if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
    const landmarks = results.multiHandLandmarks[0];
    if (landmarks.length >= 21) {
      drawConnectors(ctx, landmarks, HAND_CONNECTIONS, { color: '#00FF00', lineWidth: 1 });
      drawLandmarks(ctx, landmarks, { color: '#FF0000', lineWidth: 1 });

      const fingerTips = [4, 8, 12, 16, 20];
      const fingerBases = [3, 7, 11, 15, 19];

      const isClenched = fingerTips.every((tipIndex, i) => {
        const tip = landmarks[tipIndex];
        const base = landmarks[fingerBases[i]];
        return Math.abs(tip.y - base.y) < 0.05;
      });

      if (isClenched) {
        fingerTips.forEach((tipIndex, i) => {
          const tip = landmarks[tipIndex];
          const x = (tip.x - 0.5) * 10;
          const y = -(tip.y - 0.5) * 10;
          const z = (tip.z || 0) * 5;

          fireSprites[i].position.set(x, y, z);
          fireSprites[i].visible = true;
        });
      } else {
        fireSprites.forEach(sprite => (sprite.visible = false));
      }
    }
  } else {
    fireSprites.forEach(sprite => (sprite.visible = false));
  }
  ctx.restore();
});

const cameraMediapipe = new Camera(video, {
  onFrame: async () => {
    await hands.send({ image: video });
  },
  width: 1280,
  height: 720,
});
cameraMediapipe.start();
