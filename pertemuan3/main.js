document.addEventListener("DOMContentLoaded", function () {
  const upload = document.getElementById("upload");
  const canvas = document.getElementById("canvas");
  const ctx = canvas.getContext("2d");
  const processButton = document.getElementById("process");
  const downloadButton = document.getElementById("download");
  const operationSelect = document.getElementById("operation");
  const channelsContainer = document.getElementById("channels");
  let originalImageData = null;

  // Load gambar dan tampilkan pada canvas
  upload.addEventListener("change", function (e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function (event) {
      const img = new Image();
      img.onload = function () {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        originalImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        channelsContainer.innerHTML = ""; // Bersihkan hasil sebelumnya
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  });

  downloadButton.addEventListener("click", function(){
    const link = document.createElement('a')
    link.download = 'oh.png'
    link.href = canvas.toDataURL()
    link.click()
  })

  // Proses gambar sesuai pilihan operasi
  processButton.addEventListener("click", function () {
    if (!originalImageData) return;
    const op = operationSelect.value;
    let resultImageData;
    channelsContainer.innerHTML = ""; // Hapus tampilan channel sebelumnya
    switch (op) {
      case "grayscale": {
        resultImageData = toGrayscale(
          new ImageData(
            new Uint8ClampedArray(originalImageData.data),
            originalImageData.width,
            originalImageData.height
          )
        );
        ctx.putImageData(resultImageData, 0, 0);
        break;
      }

      case "edgeRight": {
        let imgData = toGrayscale(
          new ImageData(
            new Uint8ClampedArray(originalImageData.data),
            originalImageData.width,
            originalImageData.height
          )
        );
        const kernelRight = [-1, 0, 1, -2, 0, 2, -1, 0, 1];
        resultImageData = convolveGrayscale(imgData, kernelRight, "right");
        ctx.putImageData(resultImageData, 0, 0);
        break;
      }

      case "edgeTop": {
        let imgData = toGrayscale(
          new ImageData(
            new Uint8ClampedArray(originalImageData.data),
            originalImageData.width,
            originalImageData.height
          )
        );
        const kernelTop = [-1, -2, -1, 0, 0, 0, 1, 2, 1];
        resultImageData = convolveGrayscale(imgData, kernelTop, "top");
        ctx.putImageData(resultImageData, 0, 0);
        break;
      }

      case "blur": {
        const kernelBlur = [
          1 / 9,
          1 / 9,
          1 / 9,
          1 / 9,
          1 / 9,
          1 / 9,
          1 / 9,
          1 / 9,
          1 / 9,
        ];
        resultImageData = convolveColor(originalImageData, kernelBlur);
        ctx.putImageData(resultImageData, 0, 0);
        break;
      }

      case "separate": {
        separateChannels(originalImageData);
        ctx.putImageData(originalImageData, 0, 0);
        break;
      }
      default:
        return;
    }
   
  });

  function toGrayscale(imageData) {
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
      const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      data[i] = data[i + 1] = data[i + 2] = gray;
    }
    return imageData;
  }

  function convolveGrayscale(imageData, kernel, directional) {
    const width = imageData.width;
    const height = imageData.height;
    const src = imageData.data;
    const output = new ImageData(width, height);
    const dst = output.data;
    const kernelSize = Math.sqrt(kernel.length);
    const half = Math.floor(kernelSize / 2);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let sum = 0;
        for (let ky = -half; ky <= half; ky++) {
          for (let kx = -half; kx <= half; kx++) {
            const posX = x + kx;
            const posY = y + ky;
            if (posX >= 0 && posX < width && posY >= 0 && posY < height) {
              const i = (posY * width + posX) * 4;
              const pixel = src[i]; // Karena sudah grayscale, R=G=B
              const k = kernel[(ky + half) * kernelSize + (kx + half)];
              sum += pixel * k;
            }
          }
        }
        const idx = (y * width + x) * 4;
        if (directional === "right") {
          sum = sum > 0 ? sum : 0;
        } else if (directional === "top") {
          sum = sum < 0 ? -sum : 0;
        } else {
          sum = Math.abs(sum);
        }
        dst[idx] = dst[idx + 1] = dst[idx + 2] = sum > 255 ? 255 : sum;
        dst[idx + 3] = 255;
      }
    }
    return output;
  }

  function convolveColor(imageData, kernel) {
    const width = imageData.width;
    const height = imageData.height;
    const src = imageData.data;
    const output = new ImageData(width, height);
    const dst = output.data;
    const kernelSize = Math.sqrt(kernel.length);
    const half = Math.floor(kernelSize / 2);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let sumR = 0,
          sumG = 0,
          sumB = 0;
        for (let ky = -half; ky <= half; ky++) {
          for (let kx = -half; kx <= half; kx++) {
            const posX = x + kx;
            const posY = y + ky;
            if (posX >= 0 && posX < width && posY >= 0 && posY < height) {
              const i = (posY * width + posX) * 4;
              const k = kernel[(ky + half) * kernelSize + (kx + half)];
              sumR += src[i] * k;
              sumG += src[i + 1] * k;
              sumB += src[i + 2] * k;
            }
          }
        }
        const idx = (y * width + x) * 4;
        dst[idx] = Math.min(Math.max(sumR, 0), 255);
        dst[idx + 1] = Math.min(Math.max(sumG, 0), 255);
        dst[idx + 2] = Math.min(Math.max(sumB, 0), 255);
        dst[idx + 3] = 255;
      }
    }
    return output;
  }
  function separateChannels(imageData) {
    const width = imageData.width;
    const height = imageData.height;
    const src = imageData.data;

    const redData = new ImageData(width, height);
    const greenData = new ImageData(width, height);
    const blueData = new ImageData(width, height);

    for (let i = 0; i < src.length; i += 4) {
      // Red channel: tampilkan komponen merah saja
      redData.data[i] = src[i];
      redData.data[i + 1] = 0;
      redData.data[i + 2] = 0;
      redData.data[i + 3] = src[i + 3];

      // Green channel: tampilkan komponen hijau saja
      greenData.data[i] = 0;
      greenData.data[i + 1] = src[i + 1];
      greenData.data[i + 2] = 0;
      greenData.data[i + 3] = src[i + 3];

      // Blue channel: tampilkan komponen biru saja
      blueData.data[i] = 0;
      blueData.data[i + 1] = 0;
      blueData.data[i + 2] = src[i + 2];
      blueData.data[i + 3] = src[i + 3];
    }

    // Fungsi untuk membuat canvas baru dan menampilkan ImageData per channel
    function createChannelCanvas(channelName, data) {
      const channelCanvas = document.createElement("canvas");
      channelCanvas.width = width;
      channelCanvas.height = height;
      channelCanvas.className = "channel-canvas";
      const context = channelCanvas.getContext("2d");
      context.putImageData(data, 0, 0);
      // Tambahkan judul untuk masing-masing channel
      const title = document.createElement("p");
      title.innerText = channelName;
      const container = document.createElement("div");
      container.style.display = "inline-block";
      container.style.textAlign = "center";
      container.style.marginRight = "10px";
      container.appendChild(title);
      container.appendChild(channelCanvas);
      return container;
    }


    // Tampilkan canvas untuk masing-masing channel di dalam container
    channelsContainer.appendChild(createChannelCanvas("Red Channel", redData));
    channelsContainer.appendChild(
      createChannelCanvas("Green Channel", greenData)
    );
    channelsContainer.appendChild(
      createChannelCanvas("Blue Channel", blueData)
    );
  }
});
