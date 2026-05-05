/* ===== Spike Raster & Metric Display ===== */

/**
 * Render spike raster plot on a canvas element.
 * rasterData: array of {t, neuron} objects
 * timesteps: total timesteps (T)
 */
function renderSpikeRaster(canvasId, rasterData, timesteps) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;

  // Set internal resolution
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);

  const W = rect.width;
  const H = rect.height;
  const pad = { left: 40, right: 10, top: 10, bottom: 30 };
  const plotW = W - pad.left - pad.right;
  const plotH = H - pad.top - pad.bottom;

  // Background
  ctx.fillStyle = '#12121A';
  ctx.fillRect(0, 0, W, H);

  // Find max neuron index
  let maxNeuron = 0;
  for (const s of rasterData) {
    if (s.neuron > maxNeuron) maxNeuron = s.neuron;
  }
  maxNeuron = Math.max(maxNeuron, 1);

  // Axes
  ctx.strokeStyle = 'rgba(255,255,255,0.1)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(pad.left, pad.top);
  ctx.lineTo(pad.left, pad.top + plotH);
  ctx.lineTo(pad.left + plotW, pad.top + plotH);
  ctx.stroke();

  // Labels
  ctx.fillStyle = '#8888A0';
  ctx.font = '10px Inter, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Timestep', pad.left + plotW / 2, H - 4);
  ctx.save();
  ctx.translate(12, pad.top + plotH / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText('Neuron', 0, 0);
  ctx.restore();

  // Tick marks
  for (let t = 0; t <= timesteps; t += 5) {
    const x = pad.left + (t / timesteps) * plotW;
    ctx.fillStyle = '#8888A0';
    ctx.font = '9px JetBrains Mono, monospace';
    ctx.textAlign = 'center';
    ctx.fillText(t, x, pad.top + plotH + 14);
  }

  // Draw spikes with animated opacity
  rasterData.forEach(function(s, i) {
    const x = pad.left + (s.t / timesteps) * plotW;
    const y = pad.top + plotH - (s.neuron / maxNeuron) * plotH;
    const alpha = 0.5 + Math.random() * 0.5;
    ctx.fillStyle = `rgba(0,212,255,${alpha})`;
    ctx.beginPath();
    ctx.arc(x, y, 2, 0, Math.PI * 2);
    ctx.fill();
  });
}

/**
 * Update metric display with animated counting.
 */
function animateValue(elementId, endVal, suffix, duration) {
  suffix = suffix || '';
  duration = duration || 400;
  const el = document.getElementById(elementId);
  if (!el) return;

  const startVal = 0;
  const startTime = performance.now();

  function tick(now) {
    const progress = Math.min((now - startTime) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);  // ease-out cubic
    const current = Math.round(startVal + (endVal - startVal) * eased);
    el.textContent = current.toLocaleString() + suffix;
    if (progress < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

function formatEnergy(joules) {
  if (joules < 1e-9) return (joules * 1e12).toFixed(1) + ' pJ';
  if (joules < 1e-6) return (joules * 1e9).toFixed(2) + ' nJ';
  return (joules * 1e6).toFixed(2) + ' µJ';
}

window.renderSpikeRaster = renderSpikeRaster;
window.animateValue = animateValue;
window.formatEnergy = formatEnergy;
