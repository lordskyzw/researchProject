/* ===== SNN Inference — Leaky Integrate-and-Fire (784→256→128→10) ===== */

function snnForward(pixels, weights, T) {
  T = T || 25;
  const BETA = 0.95;
  const THRESH = 1.0;

  const t0 = performance.now();

  const mem1 = new Float32Array(256);
  const mem2 = new Float32Array(128);
  const mem3 = new Float32Array(10);
  const outSpikes = new Float32Array(10);

  const rasterData = [];
  const spikeHistory = [];  // Per-timestep per-layer spike data for network viz
  const membraneTrace = []; // Per-timestep membrane potential of output neurons
  let totalOps = 0;
  let totalFired = 0;

  for (let t = 0; t < T; t++) {
    // Rate coding: Bernoulli sample from pixel intensities
    const inp = new Float32Array(784);
    let inpSpikes = 0;
    for (let i = 0; i < 784; i++) {
      if (Math.random() < pixels[i]) { inp[i] = 1.0; inpSpikes++; }
    }

    // Layer 1: input → 256
    const cur1 = matMulAdd(inp, weights.fc1_weight, weights.fc1_bias);
    const spk1 = new Float32Array(256);
    let fired1 = 0;
    for (let i = 0; i < 256; i++) {
      mem1[i] = BETA * mem1[i] + cur1[i];
      if (mem1[i] >= THRESH) {
        spk1[i] = 1.0;
        mem1[i] -= THRESH;
        fired1++;
        if (i % 4 === 0) rasterData.push({ t: t, neuron: i / 4 });
      }
    }

    // Layer 2: 256 → 128
    const cur2 = matMulAdd(spk1, weights.fc2_weight, weights.fc2_bias);
    const spk2 = new Float32Array(128);
    let fired2 = 0;
    for (let i = 0; i < 128; i++) {
      mem2[i] = BETA * mem2[i] + cur2[i];
      if (mem2[i] >= THRESH) {
        spk2[i] = 1.0;
        mem2[i] -= THRESH;
        fired2++;
      }
    }

    // Output layer: 128 → 10
    const cur3 = matMulAdd(spk2, weights.fc3_weight, weights.fc3_bias);
    const spk3 = new Float32Array(10);
    for (let i = 0; i < 10; i++) {
      mem3[i] = BETA * mem3[i] + cur3[i];
      if (mem3[i] >= THRESH) {
        spk3[i] = 1.0;
        outSpikes[i]++;
        mem3[i] -= THRESH;
      }
    }

    // Record spike snapshot for network viz
    spikeHistory.push({
      input: Array.from(inp),
      layer1: Array.from(spk1),
      layer2: Array.from(spk2),
      output: Array.from(spk3),
    });

    // Record membrane potential AFTER spike/reset for visualization
    membraneTrace.push(Array.from(mem3));

    totalOps += inpSpikes * 256;
    totalOps += fired1 * 128;
    totalOps += fired2 * 10;
    totalFired += fired1 + fired2;
  }

  const elapsed = performance.now() - t0;
  const pred = argmax(Array.from(outSpikes));
  const totalPossible = (256 + 128) * T;
  const sparsity = 1 - (totalFired / totalPossible);

  return {
    prediction: pred,
    confidence: outSpikes[pred] / T,
    ops: totalOps,
    energy: totalOps * 0.9e-12,
    sparsity: sparsity,
    timeMs: elapsed,
    rasterData: rasterData,
    spikeHistory: spikeHistory,
    membraneTrace: membraneTrace,
    outSpikeCounts: Array.from(outSpikes),
    timesteps: T,
  };
}

window.snnForward = snnForward;
