const videoScale = 1.2;

let currentHatType = 0;
let hoveredButtonId = null;
let faceLandmarks = null;
let handIndexTip = null;

const buttons = [
  { id: 0, label: "Hat 1", x: 20, y: 20, width: 100, height: 40 },
  { id: 1, label: "Hat 2", x: 140, y: 20, width: 100, height: 40 },
  { id: 2, label: "Hat 3", x: 260, y: 20, width: 100, height: 40 },
];

const hatImages = [];
for (let i = 0; i < 3; i++) {
  hatImages.push(new Image());
}
hatImages[0].src = "assets/cap1.png";
hatImages[1].src = "assets/cap2.png";
hatImages[2].src = "assets/cap3.png";

const videoElement = document.getElementById("video");
const canvasElement = document.getElementById("overlay");
const canvasCtx = canvasElement.getContext("2d");

// Center the video and canvas elements
videoElement.style.position = "absolute";
videoElement.style.top = "50%";
videoElement.style.left = "50%";
videoElement.style.transform = `translate(-50%, -50%) scale(${videoScale})`;

canvasElement.style.position = "absolute";
canvasElement.style.top = "50%";
canvasElement.style.left = "50%";
canvasElement.style.transform = `translate(-50%, -50%) scale(${videoScale})`;

// Add a border to the video element
videoElement.style.border = "8px solid #FFD700"; // Bright yellow border
videoElement.style.borderRadius = "12px"; // Rounded corners

videoElement.addEventListener("loadedmetadata", () => {
  canvasElement.width = videoElement.videoWidth;
  canvasElement.height = videoElement.videoHeight;
});

function drawOverlay() {
  canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);

  if (faceLandmarks) {
    let minX = 1,
      minY = 1,
      maxX = 0,
      maxY = 0;
    faceLandmarks.forEach((pt) => {
      if (pt.x < minX) minX = pt.x;
      if (pt.y < minY) minY = pt.y;
      if (pt.x > maxX) maxX = pt.x;
      if (pt.y > maxY) maxY = pt.y;
    });
    const headCenterX = ((minX + maxX) / 2) * canvasElement.width;
    const headTopY = minY * canvasElement.height;
    const headWidth = (maxX - minX) * canvasElement.width;

    const leftEye = faceLandmarks[33];
    const rightEye = faceLandmarks[263];
    const dx = (rightEye.x - leftEye.x) * canvasElement.width;
    const dy = (rightEye.y - leftEye.y) * canvasElement.height;
    const angle = Math.atan2(dy, dx);

    // Draw face bounding box
    canvasCtx.strokeStyle = "#00FF00";
    canvasCtx.lineWidth = 2;
    canvasCtx.strokeRect(
      minX * canvasElement.width,
      minY * canvasElement.height,
      (maxX - minX) * canvasElement.width,
      (maxY - minY) * canvasElement.height
    );

    drawHat(canvasCtx, headCenterX, headTopY, angle, currentHatType, headWidth);
  }

  buttons.forEach((button) => {
    canvasCtx.fillStyle = "#FFD700"; // Bright yellow for comic style
    canvasCtx.fillRect(button.x, button.y, button.width, button.height);
    canvasCtx.strokeStyle = "#000000"; // Black border
    canvasCtx.lineWidth = 4;
    canvasCtx.strokeRect(button.x, button.y, button.width, button.height);
    canvasCtx.fillStyle = "#000000"; // Black text
    canvasCtx.font = "bold 18px 'Comic Neue', cursive";
    canvasCtx.fillText(button.label, button.x + 10, button.y + 25);
  });

  if (handIndexTip) {
    canvasCtx.beginPath();
    canvasCtx.arc(handIndexTip.x, handIndexTip.y, 10, 0, 2 * Math.PI);
    canvasCtx.fillStyle = "rgba(255, 255, 0, 0.8)";
    canvasCtx.fill();
    canvasCtx.strokeStyle = "black";
    canvasCtx.lineWidth = 2;
    canvasCtx.stroke();
  }
}

// Function to change the current hat type
function setHatType(hatType) {
  currentHatType = hatType;
  drawOverlay(); // Redraw the overlay to reflect the change
}

function drawHat(ctx, x, y, angle, hatType, headWidth) {
  const img = hatImages[hatType];
  if (!img.complete) {
    return;
  }
  const hatWidth = headWidth;
  const aspectRatio = img.naturalHeight / img.naturalWidth;
  const hatHeight = hatWidth * aspectRatio;

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.globalAlpha = 0.9; // Add slight transparency for a stylish effect
  ctx.shadowColor = "rgba(0, 0, 0, 0.5)";
  ctx.shadowBlur = 10;
  ctx.shadowOffsetX = 5;
  ctx.shadowOffsetY = 5;
  ctx.drawImage(img, -hatWidth / 2, -hatHeight, hatWidth, hatHeight);
  ctx.restore();
}
function onFaceResults(results) {
  if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
    faceLandmarks = results.multiFaceLandmarks[0];
  } else {
    // Retain the last known face landmarks to prevent UI reset
    console.warn("Face landmarks lost, retaining last known state.");
  }
  drawOverlay();
}
function onHandsResults(results) {
  if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
    const landmarks = results.multiHandLandmarks[0];
    handIndexTip = {
      x: landmarks[8].x * canvasElement.width,
      y: landmarks[8].y * canvasElement.height,
    };

    // Check if the pointer is hovering over any button
    buttons.forEach((button) => {
      if (
        handIndexTip.x >= button.x &&
        handIndexTip.x <= button.x + button.width &&
        handIndexTip.y >= button.y &&
        handIndexTip.y <= button.y + button.height
      ) {
        if (hoveredButtonId !== button.id) {
          hoveredButtonId = button.id;
          currentHatType = button.id; // Change the hat type
        }
      } else {
        if (hoveredButtonId === button.id) {
          hoveredButtonId = null;
        }
      }
    });
  } else {
    handIndexTip = null;
    hoveredButtonId = null;
  }
  drawOverlay();
}

const faceMesh = new FaceMesh({
  locateFile: (file) =>
    `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
});
faceMesh.setOptions({
  maxNumFaces: 1,
  refineLandmarks: true,
  minDetectionConfidence: 0.5,
  minTrackingConfidence: 0.5,
});
faceMesh.onResults(onFaceResults);

const hands = new Hands({
  locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
});
hands.setOptions({
  maxNumHands: 1,
  modelComplexity: 1,
  minDetectionConfidence: 0.7,
  minTrackingConfidence: 0.7,
});
hands.onResults(onHandsResults);

const camera = new Camera(videoElement, {
  onFrame: async () => {
    await faceMesh.send({ image: videoElement });
    await hands.send({ image: videoElement });
  },
  width: 640,
  height: 480,
});
camera.start();
