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

/**
 * Draw a horizontal bar chart showing confidence/spike distribution for digits 0-9.
 * values: array of 10 numbers, color: hex string, prediction: winning digit index
 */
function renderConfidenceBars(canvasId, values, color, prediction, label) {
  var canvas = document.getElementById(canvasId);
  if (!canvas) return;
  var dpr = window.devicePixelRatio || 1;
  var rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  var ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
  var W = rect.width, H = rect.height;

  ctx.fillStyle = '#12121A';
  ctx.fillRect(0, 0, W, H);

  var maxVal = 0;
  for (var i = 0; i < 10; i++) if (values[i] > maxVal) maxVal = values[i];
  maxVal = Math.max(maxVal, 0.01);

  var pad = { left: 24, right: 12, top: 6, bottom: 6 };
  var barH = (H - pad.top - pad.bottom) / 10 - 2;
  var plotW = W - pad.left - pad.right;

  for (var i = 0; i < 10; i++) {
    var y = pad.top + i * ((H - pad.top - pad.bottom) / 10);
    var barW = (values[i] / maxVal) * plotW;
    var isWinner = i === prediction;

    // Bar
    var alpha = isWinner ? 0.9 : 0.35;
    ctx.fillStyle = color.replace(')', ',' + alpha + ')').replace('rgb', 'rgba');
    if (color.charAt(0) === '#') {
      var r = parseInt(color.slice(1,3),16), g = parseInt(color.slice(3,5),16), b = parseInt(color.slice(5,7),16);
      ctx.fillStyle = 'rgba(' + r + ',' + g + ',' + b + ',' + alpha + ')';
    }
    ctx.fillRect(pad.left, y, Math.max(barW, 1), barH);

    // Winner glow
    if (isWinner) {
      ctx.save();
      ctx.shadowColor = color;
      ctx.shadowBlur = 8;
      ctx.fillRect(pad.left, y, barW, barH);
      ctx.restore();
    }

    // Digit label
    ctx.fillStyle = isWinner ? '#FFFFFF' : '#666680';
    ctx.font = (isWinner ? 'bold ' : '') + '10px JetBrains Mono, monospace';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(i), pad.left - 5, y + barH / 2);

    // Value on bar
    if (barW > 30) {
      ctx.fillStyle = isWinner ? '#000' : 'rgba(255,255,255,0.6)';
      ctx.font = '9px JetBrains Mono, monospace';
      ctx.textAlign = 'right';
      ctx.fillText(values[i].toFixed(2), pad.left + barW - 4, y + barH / 2);
    }
  }

  // Label
  ctx.fillStyle = color;
  ctx.font = 'bold 9px Inter, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
}

/**
 * Membrane potential trace — shows LIF voltage for output neurons over timesteps.
 * membraneTrace: array of T arrays of 10 values
 * spikeHistory: array of T objects with .output (10 values)
 * highlightNeurons: array of neuron indices to plot
 * currentStep: current slider position (draws vertical marker)
 */
function renderMembraneTrace(canvasId, membraneTrace, spikeHistory, highlightNeurons, currentStep) {
  var canvas = document.getElementById(canvasId);
  if (!canvas) return;
  var dpr = window.devicePixelRatio || 1;
  var rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  var ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
  var W = rect.width, H = rect.height;

  var T = membraneTrace.length;
  var pad = { left: 40, right: 12, top: 20, bottom: 28 };
  var plotW = W - pad.left - pad.right;
  var plotH = H - pad.top - pad.bottom;

  // Find max membrane value for scaling
  var maxMem = 1.2; // threshold is 1.0, show a bit above

  ctx.fillStyle = '#12121A';
  ctx.fillRect(0, 0, W, H);

  // Grid
  ctx.strokeStyle = 'rgba(255,255,255,0.04)';
  ctx.lineWidth = 1;
  for (var v = 0; v <= 1.2; v += 0.2) {
    var gy = pad.top + plotH - (v / maxMem) * plotH;
    ctx.beginPath();
    ctx.moveTo(pad.left, gy);
    ctx.lineTo(pad.left + plotW, gy);
    ctx.stroke();
  }

  // Threshold line
  var threshY = pad.top + plotH - (1.0 / maxMem) * plotH;
  ctx.strokeStyle = 'rgba(255,100,100,0.4)';
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(pad.left, threshY);
  ctx.lineTo(pad.left + plotW, threshY);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = 'rgba(255,100,100,0.5)';
  ctx.font = '9px JetBrains Mono, monospace';
  ctx.textAlign = 'left';
  ctx.fillText('threshold', pad.left + 2, threshY - 4);

  // Neuron color palette
  var colors = [
    '#00D4FF', '#FF6B35', '#34D399', '#F472B6', '#A78BFA',
    '#FBBF24', '#6EE7B7', '#F87171', '#818CF8', '#FB923C'
  ];

  // Draw traces
  for (var ni = 0; ni < highlightNeurons.length; ni++) {
    var neuron = highlightNeurons[ni];
    var col = colors[neuron % colors.length];

    ctx.strokeStyle = col;
    ctx.lineWidth = 1.5;
    ctx.globalAlpha = 0.8;
    ctx.beginPath();
    for (var t = 0; t < T; t++) {
      var x = pad.left + (t / (T - 1)) * plotW;
      var v = Math.min(membraneTrace[t][neuron], maxMem);
      var y = pad.top + plotH - (v / maxMem) * plotH;
      if (t === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.globalAlpha = 1;

    // Spike markers
    for (var t = 0; t < T; t++) {
      if (spikeHistory[t].output[neuron] > 0) {
        var x = pad.left + (t / (T - 1)) * plotW;
        ctx.fillStyle = col;
        ctx.beginPath();
        ctx.arc(x, pad.top + 2, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  // Current step marker
  if (currentStep !== undefined && currentStep >= 0) {
    var sx = pad.left + (currentStep / (T - 1)) * plotW;
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(sx, pad.top);
    ctx.lineTo(sx, pad.top + plotH);
    ctx.stroke();
  }

  // Axes labels
  ctx.fillStyle = '#8888A0';
  ctx.font = '10px Inter, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Timestep', pad.left + plotW / 2, H - 4);
  ctx.save();
  ctx.translate(10, pad.top + plotH / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText('Voltage', 0, 0);
  ctx.restore();

  // Timestep ticks
  ctx.font = '9px JetBrains Mono, monospace';
  for (var t = 0; t <= T; t += 5) {
    var tx = pad.left + (t / (T - 1)) * plotW;
    ctx.fillText(t, tx, pad.top + plotH + 14);
  }

  // Title
  ctx.fillStyle = '#00D4FF';
  ctx.font = 'bold 10px Inter, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('Membrane Potential — Output Neurons', pad.left, pad.top - 6);

  // Legend
  ctx.font = '9px JetBrains Mono, monospace';
  ctx.textAlign = 'right';
  for (var ni = 0; ni < Math.min(highlightNeurons.length, 4); ni++) {
    var n = highlightNeurons[ni];
    ctx.fillStyle = colors[n % colors.length];
    ctx.fillText('digit ' + n, W - pad.right - ni * 55, pad.top - 6);
  }
}

window.renderSpikeRaster = renderSpikeRaster;
window.animateValue = animateValue;
window.formatEnergy = formatEnergy;
window.renderConfidenceBars = renderConfidenceBars;
window.renderMembraneTrace = renderMembraneTrace;

