/* ===== Event Camera Simulator (DVS approximation via frame differencing) ===== */

/**
 * Simulate DVS events between two consecutive frames.
 * A real DVS fires when a pixel crosses a log-intensity threshold.
 * We approximate with absolute difference thresholding.
 */
function simulateEvents(prevFrame, currFrame, threshold) {
  threshold = threshold || 0.1;
  const events = new Uint8Array(784);
  let eventCount = 0;
  for (let i = 0; i < 784; i++) {
    if (Math.abs(currFrame[i] - prevFrame[i]) > threshold) {
      events[i] = 1;
      eventCount++;
    }
  }
  return { events: events, eventCount: eventCount, pixelCount: 784 };
}

/**
 * Generate a sequence of frames by translating a 28×28 digit image horizontally.
 * Returns an array of Float32Array frames, each 784 elements.
 */
function generateTranslationSequence(basePixels, numFrames) {
  numFrames = numFrames || 30;
  const frames = [];

  // Parse base image into a 28×28 grid
  const img = [];
  for (let r = 0; r < 28; r++) {
    img.push(new Float32Array(basePixels.slice(r * 28, (r + 1) * 28)));
  }

  for (let f = 0; f < numFrames; f++) {
    const frame = new Float32Array(784);
    const dx = f - Math.floor(numFrames / 3);  // Start with digit partially visible
    for (let r = 0; r < 28; r++) {
      for (let c = 0; c < 28; c++) {
        const srcC = c - dx;
        if (srcC >= 0 && srcC < 28) {
          frame[r * 28 + c] = img[r][srcC];
        }
      }
    }
    frames.push(frame);
  }
  return frames;
}

window.simulateEvents = simulateEvents;
window.generateTranslationSequence = generateTranslationSequence;
