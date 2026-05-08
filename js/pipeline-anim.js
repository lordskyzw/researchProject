/* ===== Panel 2 - Pipeline Animation ===== */

(function() {
  let animating = false;
  let animFrameId = null;

  window.runPipelineAnimation = function(drawnPixels, annWeights, snnWeights) {
    if (animating) return;
    if (!drawnPixels) {
      alert('Draw a digit in Panel 1 first, then come back here.');
      return;
    }
    const btn = document.getElementById('runPipelineBtn');
    
    if (animating) {
      // Stop
      cancelAnimationFrame(animFrameId);
      animating = false;
      btn.textContent = '▶ Run Pipeline Comparison';
      // Reset state for next run
      window._pipeState = { frameIdx: 0, cumPixels: 0, cumEvents: 0 };
      return;
    }

    // Play
    animating = true;
    btn.textContent = '⏹ Stop Pipeline';
    
    // Only hide punchline if we haven't shown it yet
    if (window._pipeState && window._pipeState.frameIdx === 0) {
      document.getElementById('punchline').classList.add('hidden');
    }

    const threshold = parseFloat(document.getElementById('thresholdSlider').value);
    const frames = generateTranslationSequence(drawnPixels, 30);

    const frameCanvas = document.getElementById('frameCanvas');
    const eventCanvas = document.getElementById('eventCanvas');
    const fCtx = frameCanvas.getContext('2d');
    const eCtx = eventCanvas.getContext('2d');

    // Ensure canvas internal size
    frameCanvas.width = 280; frameCanvas.height = 280;
    eventCanvas.width = 280; eventCanvas.height = 280;

    // Global so we can resume/stop
    window._pipeState = window._pipeState || { frameIdx: 0, cumPixels: 0, cumEvents: 0 };
    if (!animating) { // starting fresh after classify
       window._pipeState = { frameIdx: 0, cumPixels: 0, cumEvents: 0 };
    }
    
    let frameIdx = window._pipeState.frameIdx;
    let cumPixels = window._pipeState.cumPixels;
    let cumEvents = window._pipeState.cumEvents;
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
        // Animation complete - show punchline and loop
        updatePunchline(cumPixels, cumEvents, frames.length);
        frameIdx = 0; // Loop back
        // Don't return, keep running
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
      window._pipeState.frameIdx = frameIdx;
      window._pipeState.cumPixels = cumPixels;
      window._pipeState.cumEvents = cumEvents;
    }

    animFrameId = requestAnimationFrame(step);
  };

  function updatePunchline(cumPixels, cumEvents, numFrames) {
    // Only show average if we have looped at least once
    const avgEvents = Math.round(cumEvents / Math.max(1, window._pipeState.cumPixels / 784));
    const reduction = ((1 - avgEvents / 784) * 100).toFixed(0);

    document.getElementById('punchFrame').textContent = '784';
    document.getElementById('punchEvent').textContent = '~' + avgEvents;
    document.getElementById('punchReduction').textContent = reduction + '%';
    document.getElementById('punchline').classList.remove('hidden');
  }

  // Hook to reset pipeline state when classifying a new digit
  window.resetPipelineAnimation = function() {
    animating = false;
    cancelAnimationFrame(animFrameId);
    window._pipeState = { frameIdx: 0, cumPixels: 0, cumEvents: 0 };
    const btn = document.getElementById('runPipelineBtn');
    if (btn) btn.textContent = '▶ Run Pipeline Comparison';
    const punch = document.getElementById('punchline');
    if (punch) punch.classList.add('hidden');
  };

  // Threshold slider live readout
  const slider = document.getElementById('thresholdSlider');
  if (slider) {
    slider.addEventListener('input', function() {
      document.getElementById('thresholdVal').textContent = parseFloat(this.value).toFixed(2);
    });
  }
})();
