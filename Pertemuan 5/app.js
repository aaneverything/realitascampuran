const video = document.getElementById("video");
const emojiDisplay = document.getElementById("emoji");
const expressionLabel = document.getElementById("expressionLabel");

const expressionEmojis = {
  happy: "😄",
  sad: "😢",
  angry: "😠",
  surprised: "😲",
  fearful: "😱",
  disgusted: "🤢",
  neutral: "😐",
};

// Expression labels for better user feedback
const expressionLabels = {
  happy: "Happy",
  sad: "Sad",
  angry: "Angry",
  surprised: "Surprised",
  fearful: "Fearful",
  disgusted: "Disgusted",
  neutral: "Neutral",
};

async function startVideo() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: {} });
    video.srcObject = stream;

    // Add loading indicator before video loads
    video.parentElement.classList.add("relative");
    const loader = document.createElement("div");
    loader.className =
      "absolute inset-0 flex items-center justify-center bg-gray-900 bg-opacity-50";
    loader.innerHTML =
      '<div class="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin"></div>';
    video.parentElement.appendChild(loader);

    video.onloadeddata = () => {
      loader.remove();
    };
  } catch (err) {
    console.error(
      "Failed to access webcam. Please check your camera permissions or device settings.",
      err
    );

    // Display error message to user
    const videoContainer = video.parentElement;
    videoContainer.innerHTML = `
      <div class="flex flex-col items-center justify-center h-full p-4 text-center">
        <svg class="w-12 h-12 text-red-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
        </svg>
        <p class="text-white text-lg font-medium">Camera access denied</p>
        <p class="text-white text-opacity-70 mt-2">Please check your camera permissions or device settings.</p>
      </div>
    `;
  }
}

Promise.all([
  faceapi.nets.tinyFaceDetector.loadFromUri("models"),
  faceapi.nets.faceExpressionNet.loadFromUri("models"),
]).then(startVideo);

function getTopExpression(expressions) {
  return Object.entries(expressions).sort((a, b) => b[1] - a[1])[0][0];
}

video.addEventListener("play", () => {
  const canvas = faceapi.createCanvasFromMedia(video);

  // Insert canvas into the video container with proper styling
  const videoContainer = video.parentElement.parentElement;
  videoContainer.appendChild(canvas);

  // Style the canvas for better UI
  canvas.className = "absolute top-0 left-0 w-full h-full";
  canvas.style.zIndex = "10";

  const displaySize = { width: video.clientWidth, height: video.clientHeight };
  faceapi.matchDimensions(canvas, displaySize);

  setInterval(async () => {
    try {
      const detections = await faceapi
        .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
        .withFaceExpressions();

      canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);

      const resizedDetections = faceapi.resizeResults(detections, displaySize);
      faceapi.draw.drawDetections(canvas, resizedDetections);

      if (detections.length > 0) {
        const topExp = getTopExpression(detections[0].expressions);
        emojiDisplay.textContent = expressionEmojis[topExp] || "😐";

        // Update expression label
        expressionLabel.textContent = expressionLabels[topExp] || "Neutral";

        // Add animation effect on expression change
        emojiDisplay.classList.remove("scale-110");
        void emojiDisplay.offsetWidth; // Trigger reflow
        emojiDisplay.classList.add("scale-110");

        // Update confidence colors based on detection confidence
        const confidence = detections[0].expressions[topExp];
        updateConfidenceIndicator(confidence);
      } else {
        // Reset when no face detected
        emojiDisplay.textContent = "🔍";
        expressionLabel.textContent = "No face detected";
      }
    } catch (err) {
      console.error("Error during face detection or expression analysis:", err);
    }
  }, 300);
});

// Function to update confidence indicator
function updateConfidenceIndicator(confidence) {
  const indicator = document.querySelector(".h-3.w-3");
  if (confidence > 0.8) {
    indicator.className =
      "h-3 w-3 bg-green-400 rounded-full mr-2 animate-pulse";
  } else if (confidence > 0.5) {
    indicator.className = "h-3 w-3 bg-yellow-400 rounded-full mr-2";
  } else {
    indicator.className = "h-3 w-3 bg-red-400 rounded-full mr-2";
  }
}
