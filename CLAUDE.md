# Neuromorphic Computing Edge Demo — Build Instructions

## Project Overview

Build an **interactive web application** (pure HTML/CSS/JS — no framework, no server) that
demonstrates the difference between a traditional ANN pipeline and a full neuromorphic
pipeline for image classification.

Research project title:
> *"Investigating gains in the applications of Neuromorphic Computing on the edge"*

The app makes **one argument across three panels**:

```
Panel 1 — The Processor:   ANN vs SNN on a digit you draw
Panel 2 — The Pipeline:    Frame camera vs Event camera on the same scene
Panel 3 — The Numbers:     Full comparison — ops, energy, data processed
```

The central insight a lecturer should leave with:
> "The gains aren't just in the chip. When the sensor is also event-driven,
>  the entire pipeline is sparse — from photon to prediction."

---

## The Key Number (Design Around This)

After Panel 2 runs, the app should prominently display:

```
Frame pipeline processed:   784 pixels
Event pipeline processed:    ~40 events   (varies by motion)

Data reduction:              ~95%
```

This is the visceral, practical demonstration. Everything else supports it.

---

## Stack

| Layer | Technology |
|-------|------------|
| App | Single HTML page + vanilla JS + CSS |
| Drawing input | HTML5 Canvas API |
| ANN inference | Manual JS — matrix multiply + ReLU (~15 lines) |
| SNN inference | Manual JS — LIF neuron dynamics (~30 lines) |
| Weights | Pre-trained in Python, exported as JSON, bundled as static files |
| Visualisation | HTML5 Canvas (spike raster, event camera) + Chart.js (bar charts) |
| Animation | `requestAnimationFrame` for smooth 60fps Panel 2 |
| Deployment | Static files — GitHub Pages, any web server, or open `index.html` |

### Why not Streamlit?

Panel 2 needs smooth frame-by-frame animation with a live slider. Streamlit reruns the
entire script on every widget interaction. `st.empty()` + `time.sleep()` is a hack.
The web gives us `requestAnimationFrame`, native Canvas, and real-time slider updates
without page reloads. Zero-install deployment (just a URL) is a bonus.

### Why manual JS inference instead of ONNX/TF.js?

We **need** access to per-spike activity — raster plots, spike counts, per-layer ops.
ONNX Runtime and TF.js are black boxes. Manual implementation exposes the internals,
which is the entire point of the demo. MNIST-scale models are trivial in JS.

---

## Offline Training Pipeline

A one-time Python script trains both models and exports weights as JSON.
This runs on the developer's machine — **not** at demo time.

### Dependencies (developer only)

```bash
pip install torch torchvision snntorch numpy
```

### Script: `training/train_and_export.py`

1. Train ANN on MNIST → save weights as `weights/ann_weights.json`
2. Train SNN on MNIST → save weights as `weights/snn_weights.json`
3. Export 100 random MNIST test samples as `weights/test_samples.json` (for Panel 3 batch metrics)

Weight JSON format (per model):

```json
{
  "fc1_weight": [[...], ...],   // shape [256, 784]
  "fc1_bias": [...],            // shape [256]
  "fc2_weight": [[...], ...],   // shape [128, 256]
  "fc2_bias": [...],            // shape [128]
  "fc3_weight": [[...], ...],   // shape [10, 128]
  "fc3_bias": [...]             // shape [10]
}
```

Test samples format:

```json
[
  { "pixels": [0.0, 0.0, ..., 0.0], "label": 7 },
  ...
]
```

Total weight file size: ~1.5MB (acceptable for static hosting).

---

## File Structure

```
neuromorphic-demo/
├── index.html
├── css/
│   └── style.css
├── js/
│   ├── app.js                 # Main app controller, panel switching
│   ├── ann.js                 # ANN forward pass (matrix ops + ReLU)
│   ├── snn.js                 # SNN forward pass (LIF dynamics, spike recording)
│   ├── canvas-input.js        # Drawing canvas (28×28 digit input)
│   ├── event-sim.js           # Event camera simulator (frame differencing)
│   ├── pipeline-anim.js       # Panel 2 animation loop
│   ├── visualisation.js       # Spike raster, event view, metric cards
│   └── charts.js              # Chart.js bar charts for Panel 3
├── weights/
│   ├── ann_weights.json
│   ├── snn_weights.json
│   └── test_samples.json
├── training/
│   ├── train_and_export.py
│   └── requirements.txt
├── README.md
└── EBRAINS_NOTE.md
```

---

## Design System

### Theme

```css
:root {
  --bg-primary: #0A0A0F;
  --bg-secondary: #12121A;
  --bg-card: rgba(255, 255, 255, 0.03);
  --text-primary: #E8E8F0;
  --text-muted: #8888A0;
  --accent-ann: #FF6B35;         /* Orange — traditional pipeline */
  --accent-snn: #00D4FF;         /* Electric blue — neuromorphic pipeline */
  --accent-snn-glow: rgba(0, 212, 255, 0.15);
  --border-subtle: rgba(255, 255, 255, 0.06);
  --font-main: 'Inter', system-ui, sans-serif;
  --font-mono: 'JetBrains Mono', 'Fira Code', monospace;
  --radius: 12px;
  --transition: 0.2s ease;
}
```

### Visual Rules

- Dark mode only — no light mode toggle needed
- Glassmorphism cards: `backdrop-filter: blur(12px)` + semi-transparent backgrounds
- ANN/traditional elements always use `--accent-ann` (orange)
- SNN/neuromorphic elements always use `--accent-snn` (electric blue)
- Subtle glow effect on SNN metrics: `box-shadow: 0 0 20px var(--accent-snn-glow)`
- Google Fonts: Inter for body, JetBrains Mono for numbers/metrics
- Smooth transitions on all interactive elements
- Metric cards with large numbers (48px+), small labels (12px)
- Minimal text — numbers and visuals carry the argument

### Navigation

Tab-style navigation at the top: three tabs for three panels.
Active tab has a glowing underline in `--accent-snn`.
Panels switch with a subtle fade transition (CSS `opacity` + `transform`).

---

## Panel 1 — Draw & Classify

The user draws a digit. Both networks classify it simultaneously.

### Drawing Canvas (`js/canvas-input.js`)

- HTML5 `<canvas>`, displayed at 280×280px
- Internal resolution: 28×28 (scale drawing coordinates by 0.1)
- White stroke on black background (matches MNIST)
- Line width: 18px (at display scale), round line cap/join
- "Clear" button below canvas
- On mouse-up / touch-end: trigger classification on both models

### Preprocessing

```javascript
// Get 28×28 grayscale from canvas
const ctx = canvas.getContext('2d');
const small = document.createElement('canvas');
small.width = small.height = 28;
const sctx = small.getContext('2d');
sctx.drawImage(canvas, 0, 0, 28, 28);
const imageData = sctx.getImageData(0, 0, 28, 28);
// Extract grayscale, normalise to [0, 1]
const pixels = new Float32Array(784);
for (let i = 0; i < 784; i++) {
  pixels[i] = imageData.data[i * 4] / 255.0;  // Already white-on-black
}
```

### Two-Column Results

```
┌─────────────────────────────┬─────────────────────────────┐
│  TRADITIONAL (ANN)          │  NEUROMORPHIC (SNN)         │
│                             │                             │
│  Predicted: 7     98.2%     │  Predicted: 7     96.8%     │
│                             │                             │
│  Synaptic Ops    234,752    │  Synaptic Ops    18,304     │
│  Energy          ~1.08 µJ   │  Energy          ~0.02 µJ   │
│                             │  Spike Sparsity  92.1%      │
│                             │                             │
│                             │  ▼ 92% fewer ops            │
│                             │  ▼ 98% less energy          │
└─────────────────────────────┴─────────────────────────────┘
```

Delta indicators (▼ with percentage) on the SNN side, coloured green.
Use CSS counter-animation (count up from 0 to final value over ~400ms) for metrics.

### Spike Raster Plot (below columns)

Rendered on an HTML5 `<canvas>`, not a chart library.

- X axis: timestep (0 to T=25)
- Y axis: neuron index in hidden layer (sample ~64 neurons for clarity)
- Each dot = a spike fired, coloured `--accent-snn` with slight opacity variation
- Background: `--bg-secondary`
- Caption below: *"Each dot is a neuron firing. The white space is energy saved."*
- Animate dots appearing left-to-right over ~500ms after classification

---

## Panel 2 — The Pipeline (Event Camera Simulation)

This panel is the **conceptual heart** of the project.

### What It Shows

An MNIST digit animates across the frame (slides left to right over ~30 frames).
Two pipelines process it side by side in real time:

```
LEFT  — Traditional Pipeline:   frame camera → all pixels → ANN
RIGHT — Neuromorphic Pipeline:  event camera → changed pixels only → SNN
```

### Event Camera Simulation (`js/event-sim.js`)

```javascript
function simulateEvents(prevFrame, currFrame, threshold = 0.1) {
  // DVS approximation: fire where pixel intensity change exceeds threshold
  const events = new Uint8Array(784);
  let eventCount = 0;
  for (let i = 0; i < 784; i++) {
    if (Math.abs(currFrame[i] - prevFrame[i]) > threshold) {
      events[i] = 1;
      eventCount++;
    }
  }
  return { events, eventCount, pixelCount: 784 };
}
```

### Animation Sequence (`js/pipeline-anim.js`)

1. Pick a random MNIST digit from `test_samples.json`
2. Generate 30-frame sequence: translate digit 1px right per frame on a 28×28 canvas
3. For each consecutive frame pair, compute events via `simulateEvents()`
4. Use `requestAnimationFrame` with frame timing (~80ms per step, adjustable)

### Live Layout (updates per frame)

```
┌───────────────────────────────┬───────────────────────────────┐
│  FRAME PIPELINE               │  EVENT PIPELINE               │
│  ┌─────────────────────────┐  │  ┌─────────────────────────┐  │
│  │  Full frame (28×28)     │  │  │  Event dots only        │  │
│  │  [all pixels rendered]  │  │  │  [sparse bright dots]   │  │
│  └─────────────────────────┘  │  └─────────────────────────┘  │
│                               │                               │
│  Pixels processed: 784        │  Events fired: 42             │
│  ANN energy: 1.08 µJ          │  SNN energy: 0.02 µJ          │
│  Cumulative pixels: 12,544    │  Cumulative events: 628       │
└───────────────────────────────┴───────────────────────────────┘
```

Both canvases rendered at 280×280px (10x upscale from 28×28).
- Left canvas: render full frame, every pixel, coloured `--accent-ann`
- Right canvas: render only event pixels as bright dots, coloured `--accent-snn` with glow
- Cumulative counters animate continuously

### Threshold Slider

Above the animation:
```html
<input type="range" min="0.05" max="0.5" step="0.01" value="0.1">
```
Label: **Event Sensitivity Threshold**
When adjusted, the event count changes in real time during the animation.
No page reload — just update the threshold variable read by the animation loop.

### Punchline (after animation completes)

Fade-in a prominent card with glassmorphism styling:

```
╔══════════════════════════════════════════════════════════════╗
║  Frame pipeline processed 784 pixels per frame.             ║
║  Event pipeline processed ~40 events per frame.             ║
║                                                             ║
║  The neuromorphic pipeline handled 95% less data —          ║
║  at the sensor, in transmission, and at the processor.      ║
╚══════════════════════════════════════════════════════════════╝
```

Animated border glow in `--accent-snn`. Numbers pulled from actual animation data.

---

## Panel 3 — Full Comparison Numbers

Pre-computed at page load by running both models on 100 test samples from `test_samples.json`.
Show a loading spinner during computation (~2–3 seconds).

### Summary Table

| Metric | Traditional Pipeline | Neuromorphic Pipeline |
|--------|---------------------|----------------------|
| Sensor data per frame | 784 pixels | ~40 events |
| Synaptic operations | ~234,752 | ~18,000 |
| Energy per inference | ~1.08 µJ | ~0.02 µJ |
| Spike sparsity | — | ~92% |
| Accuracy (100 samples) | ~98% | ~97% |

Styled as a dark glassmorphism table. ANN column header in orange, SNN in blue.

### Two Bar Charts (Chart.js)

1. **Synaptic Ops**: ANN vs SNN (averaged over 100 samples)
2. **Energy Estimate**: Traditional pipeline vs Neuromorphic pipeline

Chart.js config: dark background, no gridlines, orange vs blue bars,
large value labels above bars, subtle hover animation.

One-line insight under each chart:
- Ops chart: *"SNNs use accumulate-only ops. No multiply. That is the difference."*
- Energy chart: *"Event-driven sensing + spike-based compute = end-to-end efficiency."*

---

## Model Specifications

### ANN

```
Architecture: MLP
Input: 784 → Hidden: 256 (ReLU) → Hidden: 128 (ReLU) → Output: 10 (softmax)
Training: CrossEntropyLoss, Adam lr=1e-3, 5 epochs
Target accuracy: ~98%
```

### SNN

```
Architecture: Leaky Integrate-and-Fire MLP via snntorch
Input: 784 (rate-coded) → Hidden: 256 (LIF) → Hidden: 128 (LIF) → Output: 10 (LIF)
Timesteps T: 25, beta: 0.95, threshold: 1.0
Training: CE on summed output spikes, Adam lr=1e-3, 10 epochs
Target accuracy: ~97%
```

### JS Inference — ANN (`js/ann.js`)

```javascript
function annForward(pixels, weights) {
  let x = matMulAdd(pixels, weights.fc1_weight, weights.fc1_bias);
  x = relu(x);
  x = matMulAdd(x, weights.fc2_weight, weights.fc2_bias);
  x = relu(x);
  x = matMulAdd(x, weights.fc3_weight, weights.fc3_bias);
  const ops = (784*256) + (256*128) + (128*10);  // Fixed MAC count
  return { prediction: argmax(x), confidence: softmax(x), ops, energy: ops * 4.6e-12 };
}
```

### JS Inference — SNN (`js/snn.js`)

```javascript
function snnForward(pixels, weights, T = 25) {
  const spikes = { layer1: [], layer2: [], output: [] };
  let mem1 = new Float32Array(256);
  let mem2 = new Float32Array(128);
  let mem3 = new Float32Array(10);
  const outputSpikes = new Float32Array(10);
  let totalOps = 0;

  for (let t = 0; t < T; t++) {
    // Rate coding: Bernoulli sample from pixel intensities
    const input = pixels.map(p => Math.random() < p ? 1.0 : 0.0);

    // Layer 1
    const cur1 = matMulAdd(input, weights.fc1_weight, weights.fc1_bias);
    const spk1 = new Float32Array(256);
    for (let i = 0; i < 256; i++) {
      mem1[i] = 0.95 * mem1[i] + cur1[i];
      if (mem1[i] > 1.0) { spk1[i] = 1.0; mem1[i] = 0.0; }
    }
    spikes.layer1.push(Array.from(spk1));

    // Layer 2
    const cur2 = matMulAdd(spk1, weights.fc2_weight, weights.fc2_bias);
    const spk2 = new Float32Array(128);
    for (let i = 0; i < 128; i++) {
      mem2[i] = 0.95 * mem2[i] + cur2[i];
      if (mem2[i] > 1.0) { spk2[i] = 1.0; mem2[i] = 0.0; }
    }
    spikes.layer2.push(Array.from(spk2));

    // Output layer
    const cur3 = matMulAdd(spk2, weights.fc3_weight, weights.fc3_bias);
    for (let i = 0; i < 10; i++) {
      mem3[i] = 0.95 * mem3[i] + cur3[i];
      if (mem3[i] > 1.0) { outputSpikes[i]++; mem3[i] = 0.0; }
    }

    // SNN ops: only count where input spikes fired
    totalOps += spk1.reduce((a, b) => a + b) * 128;  // spikes into layer 2
    totalOps += spk2.reduce((a, b) => a + b) * 10;   // spikes into output
    // Input spikes into layer 1
    totalOps += input.reduce((a, b) => a + b) * 256;
  }

  const prediction = argmax(Array.from(outputSpikes));
  const totalPossible = (256 + 128 + 10) * T;
  const totalFired = spikes.layer1.flat().reduce((a,b) => a+b, 0)
                   + spikes.layer2.flat().reduce((a,b) => a+b, 0);
  const sparsity = 1 - (totalFired / totalPossible);

  return {
    prediction,
    confidence: outputSpikes[prediction] / T,
    ops: totalOps,
    energy: totalOps * 0.9e-12,
    sparsity,
    spikes
  };
}
```

### Metric Calculations

- **ANN synaptic ops**: `(784×256) + (256×128) + (128×10)` = fixed per inference
- **SNN synaptic ops**: count only timesteps×connections where a pre-synaptic spike fired
- **Spike sparsity**: `1 - (total_spikes_fired / total_possible_spikes)`
- **Energy proxy**: ANN ops × 4.6pJ (MAC), SNN ops × 0.9pJ (AC) — Horowitz 2014, 45nm
- **Inference time**: `performance.now()` around forward pass

---

## Training Script (`training/train_and_export.py`)

```python
# Pseudocode structure — implement fully

import torch, snntorch, torchvision, json, numpy as np

def train_ann():
    # Standard MLP, CrossEntropyLoss, Adam, 5 epochs on MNIST
    # Return trained model

def train_snn():
    # snntorch Leaky MLP, CE on summed spikes, Adam, 10 epochs
    # Return trained model

def export_weights(model, path):
    # Convert state_dict to nested Python lists
    # json.dump to path

def export_test_samples(dataset, n=100, path='weights/test_samples.json'):
    # Pick n random test samples
    # Save as [{"pixels": [...], "label": int}, ...]

if __name__ == '__main__':
    ann = train_ann()
    snn = train_snn()
    export_weights(ann, 'weights/ann_weights.json')
    export_weights(snn, 'weights/snn_weights.json')
    export_test_samples(...)
    print("Done. Ship the weights/ folder with the web app.")
```

Run once: `python training/train_and_export.py`

---

## Utility Functions (`js/ann.js` or shared)

```javascript
function matMulAdd(input, weight, bias) {
  // weight is [outFeatures][inFeatures], input is [inFeatures]
  const out = new Float32Array(weight.length);
  for (let i = 0; i < weight.length; i++) {
    let sum = bias[i];
    for (let j = 0; j < input.length; j++) {
      sum += weight[i][j] * input[j];
    }
    out[i] = sum;
  }
  return out;
}

function relu(x) {
  return x.map(v => Math.max(0, v));
}

function softmax(x) {
  const max = Math.max(...x);
  const exps = x.map(v => Math.exp(v - max));
  const sum = exps.reduce((a, b) => a + b);
  return exps.map(v => v / sum);
}

function argmax(x) {
  return x.indexOf(Math.max(...x));
}
```

---

## README.md

Include:
1. One-paragraph summary of what the demo proves
2. Setup: `python training/train_and_export.py` (one-time), then open `index.html`
3. Panel descriptions
4. Energy proxy methodology (cite Horowitz 2014)
5. EBRAINS note for real hardware access
6. Browser compatibility (modern Chrome/Firefox/Edge)

---

## EBRAINS_NOTE.md

- EBRAINS (ebrains.eu) gives free access to SpiNNaker and BrainScaleS chips via Jupyter
- Register → Collaboratory → search "SpiNNaker" for ready-made SNN notebooks
- The event simulation here mirrors how real DVS sensors work (Prophesee, DAVIS346) —
  threshold-based, asynchronous, sparse by design
- Real hardware would show even greater gains than this simulation
- Link: https://www.ebrains.eu/tools/neuromorphic-computing

---

## Validation Checklist

- [ ] Drawing canvas accepts input and classifies digits 0–9 on both models
- [ ] Spike raster renders with animated dots after every classification
- [ ] Panel 2 animation plays smoothly at ~12fps via requestAnimationFrame
- [ ] Threshold slider changes event count in real time during animation
- [ ] Punchline card fades in after animation completes with actual data
- [ ] Panel 3 table and charts populate after page-load batch inference
- [ ] All metrics use correct energy proxy values (4.6pJ MAC, 0.9pJ AC)
- [ ] `index.html` works when opened directly in a browser (no server needed)
- [ ] Weights load correctly from JSON files
- [ ] Training script runs without errors and produces valid weight files

---

## What the Lecturer Experiences

1. Opens a URL (or `index.html`) — no install, no waiting
2. Draws "7" → both networks classify it → sees SNN used ~92% fewer ops
3. Sees animated spike raster — "the white space is energy saved"
4. Clicks Panel 2 → watches digit animate smoothly across the screen
5. Sees 784 pixels per frame on the left, ~40 events on the right — in real time
6. Moves the threshold slider → event count responds instantly → understands the tradeoff
7. Reads Panel 3 → one table, all the numbers, both panels unified
8. Leaves understanding that the efficiency is end-to-end — sensor to prediction

That is the experiment. Build it.
