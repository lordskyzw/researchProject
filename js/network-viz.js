/* ===== Network Visualization - Slider-driven ANN layers & SNN spike propagation ===== */

(function() {
  var LAYER_CFG = [
    { name: 'Input',    n: 784, cols: 28, rows: 28 },
    { name: 'Hidden 1', n: 256, cols: 16, rows: 16 },
    { name: 'Hidden 2', n: 128, cols: 16, rows: 8  },
    { name: 'Output',   n: 10,  cols: 10, rows: 1  },
  ];

  var LAYER_LABELS = ['Input (784)', 'Hidden 1 (256)', 'Hidden 2 (128)', 'Output (10)'];

  function setupCanvas(canvasId) {
    var canvas = document.getElementById(canvasId);
    if (!canvas) return null;
    var dpr = window.devicePixelRatio || 1;
    var rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    var ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    return { ctx: ctx, W: rect.width, H: rect.height };
  }

  function getLayerPositions(W, H) {
    var pad = { top: 30, bottom: 44, left: 20, right: 20 };
    var usableW = W - pad.left - pad.right;
    var usableH = H - pad.top - pad.bottom;
    var gap = usableW / LAYER_CFG.length;
    var positions = [];

    for (var i = 0; i < LAYER_CFG.length; i++) {
      var cfg = LAYER_CFG[i];
      var cx = pad.left + gap * (i + 0.5);
      var maxCellH = usableH / cfg.rows;
      var maxCellW = (gap * 0.7) / cfg.cols;
      var cell = Math.min(maxCellH, maxCellW, 12);

      // Output layer gets bigger cells for visibility
      if (i === 3) cell = Math.min(usableH * 0.5, (gap * 0.8) / cfg.cols, 20);

      var gridW = cfg.cols * cell;
      var gridH = cfg.rows * cell;

      positions.push({
        x: cx - gridW / 2,
        y: pad.top + (usableH - gridH) / 2,
        w: gridW, h: gridH,
        cell: cell, cx: cx, cfg: cfg,
      });
    }
    return positions;
  }

  function drawLayerGrid(ctx, pos, values, r, g, b, maxVal, alpha) {
    maxVal = maxVal || 1;
    alpha = alpha !== undefined ? alpha : 1;
    var cfg = pos.cfg;
    var cell = pos.cell;
    for (var i = 0; i < Math.min(values.length, cfg.n); i++) {
      var row = Math.floor(i / cfg.cols);
      var col = i % cfg.cols;
      var v = Math.min(values[i] / maxVal, 1) * alpha;
      if (v > 0.01) {
        ctx.fillStyle = 'rgba(' + r + ',' + g + ',' + b + ',' + v + ')';
        ctx.fillRect(pos.x + col * cell, pos.y + row * cell, cell - 0.5, cell - 0.5);
      }
    }
  }

  // Draw the output layer with digit labels (0-9) and highlight the winner
  function drawOutputLayer(ctx, pos, values, r, g, b, maxVal, alpha, showLabels) {
    maxVal = maxVal || 1;
    alpha = alpha !== undefined ? alpha : 1;
    var cell = pos.cell;
    var winner = 0;
    for (var i = 1; i < values.length; i++) {
      if (values[i] > values[winner]) winner = i;
    }

    for (var i = 0; i < 10; i++) {
      var col = i;
      var x = pos.x + col * cell;
      var y = pos.y;
      var v = Math.min(values[i] / maxVal, 1) * alpha;

      // Cell background
      if (v > 0.01) {
        ctx.fillStyle = 'rgba(' + r + ',' + g + ',' + b + ',' + v + ')';
        ctx.fillRect(x, y, cell - 1, cell - 1);
      }

      // Winner highlight - glow border
      if (showLabels && i === winner && values[winner] > 0.01) {
        ctx.save();
        ctx.strokeStyle = 'rgba(' + r + ',' + g + ',' + b + ',0.9)';
        ctx.lineWidth = 2;
        ctx.shadowColor = 'rgba(' + r + ',' + g + ',' + b + ',0.6)';
        ctx.shadowBlur = 8;
        ctx.strokeRect(x - 1, y - 1, cell + 1, cell + 1);
        ctx.restore();
      }

      // Digit label below each cell
      if (showLabels) {
        ctx.fillStyle = i === winner ? '#FFFFFF' : '#666680';
        ctx.font = (i === winner ? 'bold ' : '') + '10px JetBrains Mono, monospace';
        ctx.textAlign = 'center';
        ctx.fillText(String(i), x + cell / 2, y + cell + 13);
      }
    }

    // Show predicted digit prominently if output is visible
    if (showLabels && alpha > 0.3) {
      ctx.fillStyle = 'rgba(' + r + ',' + g + ',' + b + ',0.9)';
      ctx.font = 'bold 10px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('→ ' + winner, pos.cx, pos.y - 8);
    }
  }

  function drawFlowArrow(ctx, from, to, alpha, color) {
    if (alpha < 0.02) return;
    var x1 = from.x + from.w + 4;
    var y1 = from.y + from.h / 2;
    var x2 = to.x - 4;
    var y2 = to.y + to.h / 2;
    var midX = (x1 + x2) / 2;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.bezierCurveTo(midX, y1, midX, y2, x2, y2);
    ctx.stroke();

    // Arrowhead
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - 6, y2 - 4);
    ctx.lineTo(x2 - 6, y2 + 4);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function drawBg(ctx, W, H, positions, activeIdx, highlightColor) {
    ctx.fillStyle = '#12121A';
    ctx.fillRect(0, 0, W, H);

    ctx.textAlign = 'center';
    for (var i = 0; i < positions.length; i++) {
      var pos = positions[i];
      var isActive = i <= activeIdx;

      // Border - highlight active layer
      ctx.strokeStyle = isActive
        ? (highlightColor || 'rgba(255,255,255,0.2)')
        : 'rgba(255,255,255,0.04)';
      ctx.lineWidth = i === activeIdx ? 2 : 1;
      // Skip output layer border (drawn separately with digit labels)
      if (i < 3) {
        ctx.strokeRect(pos.x - 3, pos.y - 3, pos.w + 6, pos.h + 6);
      }

      // Labels
      var labelY = i === 3 ? pos.y + pos.h + 26 : pos.y + pos.h + 16;
      ctx.fillStyle = isActive ? '#E8E8F0' : '#555570';
      ctx.font = (i === activeIdx ? 'bold ' : '') + '10px Inter, sans-serif';
      ctx.fillText(pos.cfg.name, pos.cx, labelY);
    }
  }

  // ================================================================
  // ANN - Slider-driven layer-by-layer visualization
  // ================================================================
  var annState = null;

  window.initANNViz = function(canvasId, activations) {
    var setup = setupCanvas(canvasId);
    if (!setup) return;

    var maxVals = activations.map(function(layer) {
      var m = 0;
      for (var i = 0; i < layer.length; i++) if (layer[i] > m) m = layer[i];
      return Math.max(m, 0.01);
    });

    annState = {
      setup: setup, activations: activations, maxVals: maxVals,
      positions: getLayerPositions(setup.W, setup.H),
    };

    renderANNStep(0);
  };

  window.renderANNStep = function(step) {
    if (!annState) return;
    var s = annState;
    var ctx = s.setup.ctx, W = s.setup.W, H = s.setup.H;

    drawBg(ctx, W, H, s.positions, step, 'rgba(255,107,53,0.4)');

    // Draw flow arrows for completed transitions
    for (var i = 0; i < step; i++) {
      drawFlowArrow(ctx, s.positions[i], s.positions[i + 1], 0.35, '#FF6B35');
    }

    // Draw layer grids (hidden layers)
    for (var i = 0; i <= Math.min(step, 2); i++) {
      var dimmed = i < step ? 0.5 : 1.0;
      drawLayerGrid(ctx, s.positions[i], s.activations[i], 255, 107, 53, s.maxVals[i], dimmed);
    }

    // Output layer - draw with digit labels when visible
    if (step >= 3) {
      drawOutputLayer(ctx, s.positions[3], s.activations[3], 255, 107, 53, s.maxVals[3], 1, true);
    }

    // Inactive layers - faint outline
    for (var i = step + 1; i < 4; i++) {
      var pos = s.positions[i];
      var cfg = pos.cfg;
      var cell = pos.cell;
      for (var j = 0; j < cfg.n; j++) {
        var row = Math.floor(j / cfg.cols);
        var col = j % cfg.cols;
        ctx.fillStyle = 'rgba(255,255,255,0.015)';
        ctx.fillRect(pos.x + col * cell, pos.y + row * cell, cell - 0.5, cell - 0.5);
      }
      // Show dim digit labels for inactive output
      if (i === 3) {
        for (var d = 0; d < 10; d++) {
          ctx.fillStyle = '#333345';
          ctx.font = '10px JetBrains Mono, monospace';
          ctx.textAlign = 'center';
          ctx.fillText(String(d), pos.x + d * cell + cell / 2, pos.y + cell + 13);
        }
      }
    }

    // Title
    ctx.fillStyle = '#FF6B35';
    ctx.font = 'bold 11px Inter, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('ANN Forward Pass', 8, 16);

    // Active neuron count
    var activeCount = 0;
    for (var j = 0; j < s.activations[step].length; j++) {
      if (s.activations[step][j] > 0.01) activeCount++;
    }
    var pct = (activeCount / s.activations[step].length * 100).toFixed(0);
    ctx.fillStyle = '#FF6B35';
    ctx.font = '10px JetBrains Mono, monospace';
    ctx.textAlign = 'right';
    ctx.fillText(pct + '% neurons active', W - 8, 16);

    // Update label
    var label = document.getElementById('annStepLabel');
    if (label) label.textContent = LAYER_LABELS[step];
  };

  // ================================================================
  // SNN - Slider-driven timestep-by-timestep visualization
  // ================================================================
  var snnState = null;

  window.initSNNViz = function(canvasId, spikeHistory, T) {
    var setup = setupCanvas(canvasId);
    if (!setup) return;

    // Pre-compute cumulative spike counts for output neurons
    var cumOutput = new Float32Array(10);

    snnState = {
      setup: setup, spikeHistory: spikeHistory, T: T,
      positions: getLayerPositions(setup.W, setup.H),
      cumOutput: cumOutput,
    };

    renderSNNStep(0);
  };

  window.renderSNNStep = function(step) {
    if (!snnState) return;
    var s = snnState;
    var ctx = s.setup.ctx, W = s.setup.W, H = s.setup.H;

    drawBg(ctx, W, H, s.positions, 3, 'rgba(0,212,255,0.25)');

    var snap = s.spikeHistory[step];
    var layers = [snap.input, snap.layer1, snap.layer2, snap.output];

    // Recompute cumulative output spikes up to this timestep
    var cumOut = new Float32Array(10);
    for (var t = 0; t <= step; t++) {
      for (var d = 0; d < 10; d++) {
        cumOut[d] += s.spikeHistory[t].output[d];
      }
    }

    // Dim trail: show previous timesteps' spikes faintly
    var trailStart = Math.max(0, step - 3);
    for (var t = trailStart; t < step; t++) {
      var oldSnap = s.spikeHistory[t];
      var oldLayers = [oldSnap.input, oldSnap.layer1, oldSnap.layer2, oldSnap.output];
      var fade = 0.08 + 0.07 * (t - trailStart);
      for (var i = 0; i < 3; i++) {
        drawLayerGrid(ctx, s.positions[i], oldLayers[i], 0, 150, 200, 1, fade);
      }
    }

    // Current timestep spikes - bright (hidden layers)
    for (var i = 0; i < 3; i++) {
      drawLayerGrid(ctx, s.positions[i], layers[i], 0, 212, 255, 1, 1);
    }

    // Output layer - show cumulative spikes with digit labels
    var maxCum = 1;
    for (var d = 0; d < 10; d++) if (cumOut[d] > maxCum) maxCum = cumOut[d];
    drawOutputLayer(ctx, s.positions[3], cumOut, 0, 212, 255, maxCum, 1, true);

    // Flow arrows
    for (var i = 0; i < 3; i++) {
      var srcSum = 0;
      for (var j = 0; j < layers[i].length; j++) srcSum += layers[i][j];
      var alpha = Math.min(srcSum / (layers[i].length * 0.15), 0.5);
      if (srcSum > 0) {
        drawFlowArrow(ctx, s.positions[i], s.positions[i + 1], alpha, '#00D4FF');
      }
    }

    // Title
    ctx.fillStyle = '#00D4FF';
    ctx.font = 'bold 11px Inter, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('SNN Spike Propagation', 8, 16);

    // Timestep
    ctx.font = '11px JetBrains Mono, monospace';
    ctx.textAlign = 'right';
    ctx.fillText('t=' + (step + 1) + '/' + s.T, W - 8, 16);

    // Sparsity
    var totalActive = 0, totalNeurons = 0;
    for (var i = 1; i < 3; i++) {
      for (var j = 0; j < layers[i].length; j++) {
        totalActive += layers[i][j];
        totalNeurons++;
      }
    }
    var activePct = (totalActive / totalNeurons * 100).toFixed(0);
    ctx.fillStyle = '#34D399';
    ctx.font = '10px JetBrains Mono, monospace';
    ctx.textAlign = 'right';
    ctx.fillText(activePct + '% active this timestep', W - 8, H - 6);

    // Update label
    var label = document.getElementById('snnStepLabel');
    if (label) label.textContent = 'Timestep ' + (step + 1) + ' of ' + s.T;
  };

  // ================================================================
  // Play/Pause buttons - fixed with proper state management
  // ================================================================
  var annPlayId = null;
  var snnPlayId = null;
  var annPlaying = false;
  var snnPlaying = false;

  window.playANNViz = function() {
    var btn = document.getElementById('annPlayBtn');
    var slider = document.getElementById('annLayerSlider');
    if (!slider || !annState) return;

    if (annPlaying) {
      // Pause
      clearInterval(annPlayId);
      annPlayId = null;
      annPlaying = false;
      if (btn) btn.textContent = '▶';
      return;
    }

    // Start playing
    annPlaying = true;
    if (btn) btn.textContent = '⏸';
    var step = parseInt(slider.value);

    // Reset to start if already at the end
    if (step >= 3) {
      step = -1; // will increment to 0
    }

    annPlayId = setInterval(function() {
      step++;
      if (step > 3) {
        clearInterval(annPlayId);
        annPlayId = null;
        annPlaying = false;
        if (btn) btn.textContent = '▶';
        return;
      }
      slider.value = step;
      slider.dispatchEvent(new Event('input'));
    }, 700);
  };

  window.playSNNViz = function() {
    var btn = document.getElementById('snnPlayBtn');
    var slider = document.getElementById('snnTimestepSlider');
    if (!slider || !snnState) return;

    if (snnPlaying) {
      // Pause
      clearInterval(snnPlayId);
      snnPlayId = null;
      snnPlaying = false;
      if (btn) btn.textContent = '▶';
      return;
    }

    // Start playing
    snnPlaying = true;
    if (btn) btn.textContent = '⏸';
    var step = parseInt(slider.value);

    // Reset to start if already at the end
    if (step >= snnState.T - 1) {
      step = -1;
    }

    snnPlayId = setInterval(function() {
      step++;
      if (step >= snnState.T) {
        clearInterval(snnPlayId);
        snnPlayId = null;
        snnPlaying = false;
        if (btn) btn.textContent = '▶';
        return;
      }
      slider.value = step;
      slider.dispatchEvent(new Event('input'));
    }, 150);
  };
})();
