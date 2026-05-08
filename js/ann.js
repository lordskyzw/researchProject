/* ===== ANN Inference (MLP: 784→256→128→10) ===== */

// Shared math utilities
function matMulAdd(input, weight, bias) {
  const out = new Float32Array(weight.length);
  for (let i = 0; i < weight.length; i++) {
    let sum = bias[i];
    const w = weight[i];
    for (let j = 0; j < input.length; j++) {
      sum += w[j] * input[j];
    }
    out[i] = sum;
  }
  return out;
}

function relu(x) {
  const out = new Float32Array(x.length);
  for (let i = 0; i < x.length; i++) out[i] = x[i] > 0 ? x[i] : 0;
  return out;
}

function softmax(x) {
  let max = -Infinity;
  for (let i = 0; i < x.length; i++) if (x[i] > max) max = x[i];
  const exps = new Float32Array(x.length);
  let sum = 0;
  for (let i = 0; i < x.length; i++) { exps[i] = Math.exp(x[i] - max); sum += exps[i]; }
  for (let i = 0; i < x.length; i++) exps[i] /= sum;
  return exps;
}

function argmax(x) {
  let best = 0;
  for (let i = 1; i < x.length; i++) if (x[i] > x[best]) best = i;
  return best;
}

// ANN forward pass - returns layer activations for network visualization
function annForward(pixels, weights) {
  const t0 = performance.now();

  const a0 = Array.from(pixels);
  let x = matMulAdd(pixels, weights.fc1_weight, weights.fc1_bias);
  x = relu(x);
  const a1 = Array.from(x);
  x = matMulAdd(x, weights.fc2_weight, weights.fc2_bias);
  x = relu(x);
  const a2 = Array.from(x);
  x = matMulAdd(x, weights.fc3_weight, weights.fc3_bias);

  const elapsed = performance.now() - t0;
  const probs = softmax(x);
  const pred = argmax(probs);

  // Fixed ops: every MAC happens every time
  const ops = (784 * 256) + (256 * 128) + (128 * 10);

  return {
    prediction: pred,
    confidence: probs[pred],
    ops: ops,
    energy: ops * 4.6e-12,  // Joules (4.6 pJ per MAC)
    timeMs: elapsed,
    activations: [a0, a1, a2, Array.from(probs)],
  };
}

// Expose globally
window.annForward = annForward;
window.matMulAdd = matMulAdd;
window.relu = relu;
window.softmax = softmax;
window.argmax = argmax;
