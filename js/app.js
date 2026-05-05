/* ===== Main App Controller ===== */

(function() {
  let annWeights = null;
  let snnWeights = null;
  let testSamples = null;
  let drawnPixels = null;  // Stored after classify for use in Panel 2

  // ---- Weight Loading ----
  async function loadJSON(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to load ' + url);
    return res.json();
  }

  async function init() {
    const overlay = document.getElementById('loadingOverlay');
    try {
      const [aw, sw, ts] = await Promise.all([
        loadJSON('weights/ann_weights.json'),
        loadJSON('weights/snn_weights.json'),
        loadJSON('weights/test_samples.json'),
      ]);
      annWeights = aw;
      snnWeights = sw;
      testSamples = ts;

      overlay.classList.add('fade-out');
      setTimeout(function() { overlay.style.display = 'none'; }, 500);
    } catch (e) {
      overlay.querySelector('p').textContent =
        'Could not load weights. Run: python training/train_and_export.py';
      overlay.querySelector('.spinner').style.display = 'none';
      console.error(e);
      return;
    }

    setupTabs();
    setupClassify();
    setupPipeline();
  }

  // ---- Tab Navigation ----
  function setupTabs() {
    const tabs = document.querySelectorAll('.tab');
    const panels = document.querySelectorAll('.panel');

    tabs.forEach(function(tab) {
      tab.addEventListener('click', function() {
        const target = this.getAttribute('data-panel');
        tabs.forEach(function(t) { t.classList.remove('active'); });
        panels.forEach(function(p) { p.classList.remove('active'); });
        this.classList.add('active');
        document.getElementById(target).classList.add('active');

        // Lazy-load Panel 3 batch inference
        if (target === 'panel3' && !window._panel3Loaded) {
          runBatchInference();
        }
      });
    });
  }

  // ---- Panel 1: Classify + Network Viz ----
  function setupClassify() {
    document.getElementById('classifyBtn').addEventListener('click', function() {
      if (window.isCanvasBlank()) return;

      const pixels = window.getCanvasPixels();
      drawnPixels = pixels;  // Store for Panel 2 pipeline

      const annResult = annForward(pixels, annWeights);
      const snnResult = snnForward(pixels, snnWeights);

      // Show results
      document.getElementById('resultsGrid').classList.remove('hidden');
      document.getElementById('networkVizSection').classList.remove('hidden');
      document.getElementById('rasterSection').classList.remove('hidden');

      // ANN results
      document.getElementById('annDigit').textContent = annResult.prediction;
      document.getElementById('annConf').textContent = (annResult.confidence * 100).toFixed(1) + '%';
      animateValue('annOps', annResult.ops, '');
      document.getElementById('annEnergy').textContent = formatEnergy(annResult.energy);
      document.getElementById('annTime').textContent = annResult.timeMs.toFixed(1) + ' ms';

      // SNN results
      document.getElementById('snnDigit').textContent = snnResult.prediction;
      document.getElementById('snnConf').textContent = (snnResult.confidence * 100).toFixed(1) + '%';
      animateValue('snnOps', snnResult.ops, '');
      document.getElementById('snnEnergy').textContent = formatEnergy(snnResult.energy);
      document.getElementById('snnSparsity').textContent = (snnResult.sparsity * 100).toFixed(1) + '%';

      // Deltas
      var opsReduction = ((1 - snnResult.ops / annResult.ops) * 100).toFixed(0);
      var energyReduction = ((1 - snnResult.energy / annResult.energy) * 100).toFixed(0);
      document.getElementById('deltaOps').textContent = '▼ ' + opsReduction + '% fewer';
      document.getElementById('deltaEnergy').textContent = '▼ ' + energyReduction + '% less';

      // Spike raster
      renderSpikeRaster('rasterCanvas', snnResult.rasterData, snnResult.timesteps);

      // Network visualizations — slider-driven
      setTimeout(function() {
        initANNViz('annVizCanvas', annResult.activations);
        initSNNViz('snnVizCanvas', snnResult.spikeHistory, snnResult.timesteps);

        // ANN layer slider
        var annSlider = document.getElementById('annLayerSlider');
        annSlider.value = 0;
        annSlider.oninput = function() { renderANNStep(parseInt(this.value)); };

        // SNN timestep slider
        var snnSlider = document.getElementById('snnTimestepSlider');
        snnSlider.value = 0;
        snnSlider.oninput = function() { renderSNNStep(parseInt(this.value)); };

        // Play buttons
        document.getElementById('annPlayBtn').onclick = function() { playANNViz(); };
        document.getElementById('snnPlayBtn').onclick = function() { playSNNViz(); };
      }, 100);
    });
  }

  // ---- Panel 2: Pipeline (uses drawn digit) ----
  function setupPipeline() {
    document.getElementById('runPipelineBtn').addEventListener('click', function() {
      window.runPipelineAnimation(drawnPixels, annWeights, snnWeights);
    });
  }

  // ---- Panel 3: Batch Inference ----
  function runBatchInference() {
    window._panel3Loaded = true;
    var loading = document.getElementById('panel3Loading');
    var content = document.getElementById('panel3Content');

    setTimeout(function() {
      var totalAnnOps = 0, totalSnnOps = 0;
      var totalAnnEnergy = 0, totalSnnEnergy = 0;
      var totalSparsity = 0;
      var annCorrect = 0, snnCorrect = 0;
      var n = testSamples.length;

      for (var i = 0; i < n; i++) {
        var px = new Float32Array(testSamples[i].pixels);
        var label = testSamples[i].label;

        var ar = annForward(px, annWeights);
        var sr = snnForward(px, snnWeights);

        totalAnnOps += ar.ops;
        totalSnnOps += sr.ops;
        totalAnnEnergy += ar.energy;
        totalSnnEnergy += sr.energy;
        totalSparsity += sr.sparsity;
        if (ar.prediction === label) annCorrect++;
        if (sr.prediction === label) snnCorrect++;
      }

      var avgAnnOps = Math.round(totalAnnOps / n);
      var avgSnnOps = Math.round(totalSnnOps / n);
      var avgAnnEnergy = totalAnnEnergy / n;
      var avgSnnEnergy = totalSnnEnergy / n;
      var avgSparsity = (totalSparsity / n * 100).toFixed(1);
      var annAcc = (annCorrect / n * 100).toFixed(0);
      var snnAcc = (snnCorrect / n * 100).toFixed(0);

      document.getElementById('t_sensorSnn').textContent = '~40 events';
      document.getElementById('t_opsAnn').textContent = avgAnnOps.toLocaleString();
      document.getElementById('t_opsSnn').textContent = '~' + avgSnnOps.toLocaleString();
      document.getElementById('t_energyAnn').textContent = formatEnergy(avgAnnEnergy);
      document.getElementById('t_energySnn').textContent = formatEnergy(avgSnnEnergy);
      document.getElementById('t_sparsity').textContent = avgSparsity + '%';
      document.getElementById('t_accAnn').textContent = annAcc + '%';
      document.getElementById('t_accSnn').textContent = snnAcc + '%';

      createComparisonCharts(avgAnnOps, avgSnnOps, avgAnnEnergy, avgSnnEnergy);

      loading.classList.add('hidden');
      content.classList.remove('hidden');
    }, 50);
  }

  // ---- Boot ----
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
