/* ===== Panel 2 — Pipeline Animation ===== */

(function() {
  let animating = false;
  let animFrameId = null;

  window.runPipelineAnimation = function(drawnPixels, annWeights, snnWeights) {
    if (animating) return;
    if (!drawnPixels) {
      alert('Draw a digit in Panel 1 first, then come back here.');
      return;
    }
    animating = true;

    const btn = document.getElementById('runPipelineBtn');
    btn.disabled = true;
    btn.textContent = '⏳ Running…';
    document.getElementById('punchline').classList.add('hidden');

    const threshold = parseFloat(document.getElementById('thresholdSlider').value);
    const frames = generateTranslationSequence(drawnPixels, 30);

    const frameCanvas = document.getElementById('frameCanvas');
    const eventCanvas = document.getElementById('eventCanvas');
    const fCtx = frameCanvas.getContext('2d');
    const eCtx = eventCanvas.getContext('2d');

    // Ensure canvas internal size
    frameCanvas.width = 280; frameCanvas.height = 280;
    eventCanvas.width = 280; eventCanvas.height = 280;

    let frameIdx = 0;
    let cumPixels = 0;
    let cumEvents = 0;
    const FRAME_INTERVAL = 100; // ms per frame
    let lastTime = 0;

    function renderFrame28(ctx, pixels, color) {
      const scale = 10;
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, 280, 280);
      for (let r = 0; r < 28; r++) {
        for (let c = 0; c < 28; c++) {
          const v = pixels[r * 28 + c];
          if (v > 0.01) {
            ctx.fillStyle = color === 'ann'
              ? `rgba(255,107,53,${v})`
              : `rgba(0,212,255,${v})`;
            ctx.fillRect(c * scale, r * scale, scale, scale);
          }
        }
      }
    }

    function renderEvents28(ctx, events) {
      const scale = 10;
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, 280, 280);
      for (let r = 0; r < 28; r++) {
        for (let c = 0; c < 28; c++) {
          if (events[r * 28 + c]) {
            ctx.fillStyle = '#00D4FF';
            ctx.shadowColor = '#00D4FF';
            ctx.shadowBlur = 6;
            ctx.fillRect(c * scale, r * scale, scale, scale);
          }
        }
      }
      ctx.shadowBlur = 0;
    }

    function step(timestamp) {
      if (!lastTime) lastTime = timestamp;
      if (timestamp - lastTime < FRAME_INTERVAL) {
        animFrameId = requestAnimationFrame(step);
        return;
      }
      lastTime = timestamp;

      if (frameIdx >= frames.length) {
        // Animation complete — show punchline
        finishAnimation(cumPixels, cumEvents, frames.length);
        return;
      }

      // Get current threshold (may have changed via slider)
      const th = parseFloat(document.getElementById('thresholdSlider').value);

      const currFrame = frames[frameIdx];
      renderFrame28(fCtx, currFrame, 'ann');

      if (frameIdx > 0) {
        const prevFrame = frames[frameIdx - 1];
        const result = simulateEvents(prevFrame, currFrame, th);
        renderEvents28(eCtx, result.events);
        cumEvents += result.eventCount;
        document.getElementById('eventCount').textContent = result.eventCount.toLocaleString();
      } else {
        eCtx.fillStyle = '#000';
        eCtx.fillRect(0, 0, 280, 280);
        document.getElementById('eventCount').textContent = '0';
      }

      cumPixels += 784;
      document.getElementById('framePixels').textContent = '784';
      document.getElementById('frameCum').textContent = cumPixels.toLocaleString();
      document.getElementById('eventCum').textContent = cumEvents.toLocaleString();

      frameIdx++;
      animFrameId = requestAnimationFrame(step);
    }

    animFrameId = requestAnimationFrame(step);
  };

  function finishAnimation(cumPixels, cumEvents, numFrames) {
    animating = false;
    const btn = document.getElementById('runPipelineBtn');
    btn.disabled = false;
    btn.textContent = '▶ Run Pipeline Comparison';

    const avgEvents = Math.round(cumEvents / Math.max(1, numFrames - 1));
    const reduction = ((1 - avgEvents / 784) * 100).toFixed(0);

    document.getElementById('punchFrame').textContent = '784';
    document.getElementById('punchEvent').textContent = '~' + avgEvents;
    document.getElementById('punchReduction').textContent = reduction + '%';
    document.getElementById('punchline').classList.remove('hidden');
  }

  // Threshold slider live readout
  const slider = document.getElementById('thresholdSlider');
  if (slider) {
    slider.addEventListener('input', function() {
      document.getElementById('thresholdVal').textContent = parseFloat(this.value).toFixed(2);
    });
  }
})();
