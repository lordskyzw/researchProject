/* ===== Drawing Canvas with Touch Support ===== */

(function() {
  const canvas = document.getElementById('drawCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let drawing = false;

  // Init black background
  function clearCanvas() {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  clearCanvas();

  // Stroke style
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 14;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  function getPos(e) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if (e.touches) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY,
      };
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  }

  function onStart(e) {
    e.preventDefault();
    drawing = true;
    const p = getPos(e);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
  }

  function onMove(e) {
    if (!drawing) return;
    e.preventDefault();
    const p = getPos(e);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
  }

  function onEnd(e) {
    if (!drawing) return;
    drawing = false;
    ctx.closePath();
  }

  // Mouse events
  canvas.addEventListener('mousedown', onStart);
  canvas.addEventListener('mousemove', onMove);
  canvas.addEventListener('mouseup', onEnd);
  canvas.addEventListener('mouseleave', onEnd);

  // Touch events
  canvas.addEventListener('touchstart', onStart, { passive: false });
  canvas.addEventListener('touchmove', onMove, { passive: false });
  canvas.addEventListener('touchend', onEnd);

  // Clear button
  document.getElementById('clearBtn').addEventListener('click', () => {
    clearCanvas();
    // Reset stroke style after clear
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 14;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    // Hide results
    document.getElementById('resultsGrid').classList.add('hidden');
    document.getElementById('rasterSection').classList.add('hidden');
    var vizSection = document.getElementById('networkVizSection');
    if (vizSection) vizSection.classList.add('hidden');
    var memSection = document.getElementById('membraneSection');
    if (memSection) memSection.classList.add('hidden');
  });

  // Extract 28×28 pixel array with MNIST-style preprocessing:
  // 1. Find bounding box of drawn content
  // 2. Crop and resize to fit in 20×20 (preserving aspect ratio)
  // 3. Center in 28×28 frame using center-of-mass
  window.getCanvasPixels = function() {
    const W = canvas.width, H = canvas.height;
    const imgData = ctx.getImageData(0, 0, W, H);
    const raw = imgData.data;

    // Step 1: Find bounding box of non-black pixels
    var minX = W, minY = H, maxX = 0, maxY = 0;
    for (var y = 0; y < H; y++) {
      for (var x = 0; x < W; x++) {
        var idx = (y * W + x) * 4;
        if (raw[idx] > 20) { // threshold to ignore noise
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }

    // If nothing drawn, return zeros
    if (maxX <= minX || maxY <= minY) {
      return new Float32Array(784);
    }

    // Add a small margin around the bounding box
    var margin = Math.max(Math.round((maxX - minX) * 0.05), 4);
    minX = Math.max(0, minX - margin);
    minY = Math.max(0, minY - margin);
    maxX = Math.min(W - 1, maxX + margin);
    maxY = Math.min(H - 1, maxY + margin);

    var cropW = maxX - minX + 1;
    var cropH = maxY - minY + 1;

    // Step 2: Resize cropped region to fit in 20×20 (MNIST convention)
    var targetSize = 20;
    var scale = targetSize / Math.max(cropW, cropH);
    var scaledW = Math.round(cropW * scale);
    var scaledH = Math.round(cropH * scale);

    // Draw cropped region scaled into a temp canvas
    var tmp = document.createElement('canvas');
    tmp.width = scaledW;
    tmp.height = scaledH;
    var tmpCtx = tmp.getContext('2d');
    tmpCtx.fillStyle = '#000';
    tmpCtx.fillRect(0, 0, scaledW, scaledH);
    // Use better interpolation
    tmpCtx.imageSmoothingEnabled = true;
    tmpCtx.imageSmoothingQuality = 'high';
    tmpCtx.drawImage(canvas, minX, minY, cropW, cropH, 0, 0, scaledW, scaledH);

    // Read the scaled image
    var scaledData = tmpCtx.getImageData(0, 0, scaledW, scaledH).data;

    // Step 3: Compute center of mass of the scaled digit
    var totalMass = 0, comX = 0, comY = 0;
    for (var y = 0; y < scaledH; y++) {
      for (var x = 0; x < scaledW; x++) {
        var val = scaledData[(y * scaledW + x) * 4] / 255.0;
        totalMass += val;
        comX += x * val;
        comY += y * val;
      }
    }
    if (totalMass > 0) {
      comX /= totalMass;
      comY /= totalMass;
    } else {
      comX = scaledW / 2;
      comY = scaledH / 2;
    }

    // Step 4: Place in 28×28 frame, centered at (14, 14) using center-of-mass offset
    var out = document.createElement('canvas');
    out.width = 28;
    out.height = 28;
    var outCtx = out.getContext('2d');
    outCtx.fillStyle = '#000';
    outCtx.fillRect(0, 0, 28, 28);
    outCtx.imageSmoothingEnabled = true;
    outCtx.imageSmoothingQuality = 'high';

    var offsetX = Math.round(14 - comX);
    var offsetY = Math.round(14 - comY);
    outCtx.drawImage(tmp, offsetX, offsetY);

    // Read final 28×28
    var finalData = outCtx.getImageData(0, 0, 28, 28).data;
    var pixels = new Float32Array(784);
    for (var i = 0; i < 784; i++) {
      pixels[i] = finalData[i * 4] / 255.0;
    }
    return pixels;
  };

  // Check if canvas has any drawing
  window.isCanvasBlank = function() {
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    for (let i = 0; i < data.length; i += 4) {
      if (data[i] > 10) return false;  // Any non-black pixel
    }
    return true;
  };
})();
