// Wait for the DOM to be fully loaded
document.addEventListener("DOMContentLoaded", () => {
  const video = document.getElementById("video");
  const overlay = document.getElementById("overlay");
  const ctx = overlay.getContext("2d");
  const glassesStyleButton = document.getElementById("glasses-style");
  const takePhotoButton = document.getElementById("take-photo");
  const loadingIndicator = document.getElementById("loading"); // Get the loading element

  // Multiple glasses options
  const glassesOptions = [
    { src: "fff.png", scale: 3.2, heightRatio: 0.6 },
    { src: "glasses.png", scale: 3.5, heightRatio: 0.5 },
    { src: "dd.png", scale: 3.8, heightRatio: 1.5 },
  ];

  let currentGlassesIndex = 0;
  let glasses = new Image();
  loadCurrentGlasses();

  function loadCurrentGlasses() {
    glasses.src = glassesOptions[currentGlassesIndex].src;
    glasses.onerror = () => {
      console.error(`Failed to load image: ${glasses.src}`);
      glasses.src = "fff.png";
    };
  }

  // Button to change glasses style
  glassesStyleButton.addEventListener("click", () => {
    currentGlassesIndex = (currentGlassesIndex + 1) % glassesOptions.length;
    loadCurrentGlasses();

    // Add button press animation
    glassesStyleButton.classList.add("bg-green-700");
    setTimeout(() => {
      glassesStyleButton.classList.remove("bg-green-700");
    }, 200);
  });

  // Button to take a photo
  takePhotoButton.addEventListener("click", () => {
    // Create a temporary canvas with both video and overlay
    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = overlay.width;
    tempCanvas.height = overlay.height;
    const tempCtx = tempCanvas.getContext("2d");

    // Draw video first
    tempCtx.drawImage(video, 0, 0, overlay.width, overlay.height);

    // Draw overlay (glasses) on top
    tempCtx.drawImage(overlay, 0, 0);

    // Add minecraft-style border and timestamp
    tempCtx.fillStyle = "rgba(0, 0, 0, 0.7)";
    tempCtx.fillRect(10, overlay.height - 50, 250, 40);
    tempCtx.strokeStyle = "#ffffff";
    tempCtx.lineWidth = 2;
    tempCtx.strokeRect(10, overlay.height - 50, 250, 40);
    tempCtx.fillStyle = "#ffffff";
    tempCtx.font = "12px 'Press Start 2P'";

    const now = new Date();
    const timestamp = `${now.toLocaleDateString()} ${now.toLocaleTimeString()}`;
    tempCtx.fillText(timestamp, 20, overlay.height - 20);

    // Convert to image and trigger download
    const link = document.createElement("a");
    link.download = `minecraft-glasses-${Date.now()}.png`;
    link.href = tempCanvas.toDataURL("image/png");
    link.click();

    // Add button press animation
    takePhotoButton.classList.add("bg-blue-700");
    setTimeout(() => {
      takePhotoButton.classList.remove("bg-blue-700");
    }, 200);
  });

  // Initialize models
  Promise.all([
    faceapi.nets.tinyFaceDetector.loadFromUri("/models"),
    faceapi.nets.faceLandmark68Net.loadFromUri("/models"),
  ])
    .then(() => {
      // Hide loading indicator after models are loaded
      loadingIndicator.style.display = "none";
      startVideo();
    })
    .catch((error) => {
      console.error("Error loading face detection models:", error);
      // Hide loading and show error message if models failed to load
      loadingIndicator.style.display = "none";
      alert(
        "Failed to load face detection models. Please check your internet connection and refresh the page."
      );
    });

  // Access webcam
  async function startVideo() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      video.srcObject = stream;
      video.addEventListener("play", () => {
        // Set canvas dimensions same as video
        overlay.width = video.videoWidth;
        overlay.height = video.videoHeight;
        // Start detection loop
        detectFaces();
      });
    } catch (err) {
      console.error("Error accessing the camera:", err);
    }
  }

  // Detect faces and landmarks in real-time
  async function detectFaces() {
    if (video.paused || video.ended) return;

    // Detect faces with landmarks
    const detections = await faceapi
      .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
      .withFaceLandmarks();

    // Clear canvas before drawing
    ctx.clearRect(0, 0, overlay.width, overlay.height);

    // Process each detected face
    if (detections.length > 0) {
      detections.forEach((detection) => {
        const landmarks = detection.landmarks;
        const leftEye = landmarks.getLeftEye();
        const rightEye = landmarks.getRightEye();

        // Calculate glasses position and size
        const eyeDistance = Math.sqrt(
          Math.pow(rightEye[0].x - leftEye[3].x, 2) +
            Math.pow(rightEye[0].y - leftEye[3].y, 2)
        );

        const currentGlasses = glassesOptions[currentGlassesIndex];
        const glassesWidth = eyeDistance * currentGlasses.scale;
        const glassesHeight = glassesWidth * currentGlasses.heightRatio;

        const centerX = (leftEye[3].x + rightEye[0].x) / 2;
        const centerY = (leftEye[3].y + rightEye[0].y) / 2;

        // Draw glasses
        ctx.drawImage(
          glasses,
          centerX - glassesWidth / 2,
          centerY - glassesHeight / 2,
          glassesWidth,
          glassesHeight
        );
      });
    }

    // Continue detection loop
    requestAnimationFrame(detectFaces);
  }

  // Handle ESC key to exit fullscreen
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      }
    }
  });
});
