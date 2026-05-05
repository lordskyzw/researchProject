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
  ctx.lineWidth = 18;
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
    ctx.lineWidth = 18;
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

  // Extract 28×28 pixel array normalised [0,1]
  window.getCanvasPixels = function() {
    const small = document.createElement('canvas');
    small.width = 28;
    small.height = 28;
    const sctx = small.getContext('2d');
    sctx.drawImage(canvas, 0, 0, 28, 28);
    const data = sctx.getImageData(0, 0, 28, 28).data;
    const pixels = new Float32Array(784);
    for (let i = 0; i < 784; i++) {
      // Use red channel (grayscale), normalise
      pixels[i] = data[i * 4] / 255.0;
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
