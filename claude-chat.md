# Neuromorphic Edge Demo — Project Context for Claude

> **Research:** *"Investigating gains in the applications of Neuromorphic Computing on the edge"*
> **Author:** Tarimica Sean Chiwara (C21145989W) — Bachelor of Engineering, Computer Engineering (BECE)

---

## What This Project Is

An interactive, browser-based research demo that compares **Traditional Artificial Neural Networks (ANN)** against **Spiking Neural Networks (SNN)** on a real-time MNIST digit classification task. The user draws a digit on a canvas, and both networks classify it simultaneously — exposing the fundamental differences in computation, energy consumption, and sparsity between the two architectures.

The demo serves as both:
1. **A pedagogical tool** — for lecturers and students to understand neuromorphic computing visually
2. **A research artifact** — to demonstrate the energy efficiency argument for SNNs at the edge (IoT)

**Live deployment target:** Railway (via `railway up`)

---

## Tech Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| Frontend | Vanilla HTML/CSS/JS + HTML5 Canvas | Zero-framework, zero-dependency (except Chart.js for Panel 3) |
| Server | Node.js `http` module | Zero-dependency static file server (no Express) |
| Training | Python 3.9 + PyTorch + snntorch | Runs offline, exports weights as JSON |
| Deployment | Railway | Uses `PORT` env var, binds `0.0.0.0` |

---

## Repository Structure

```
researchProject/
├── index.html                # Single-page application — all 4 panels + intro overlay
├── server.js                 # Static file server (Node.js, zero dependencies)
├── package.json              # npm metadata, start script
├── .gitignore                # Excludes data/, training/, __pycache__, CLAUDE.md
│
├── css/
│   └── style.css             # All styling — dark theme, glassmorphism, responsive
│
├── js/
│   ├── ann.js                # ANN inference engine
│   ├── snn.js                # SNN inference engine (LIF neurons)
│   ├── app.js                # Main controller — loading, tabs, classify, pipeline orchestration
│   ├── canvas-input.js       # Drawing canvas + MNIST-style preprocessing
│   ├── event-sim.js          # DVS event camera simulation
│   ├── pipeline-anim.js      # Panel 2 pipeline animation
│   ├── network-viz.js        # Panel 1 network activity visualization (ANN layers + SNN spikes)
│   ├── visualisation.js      # Spike raster, confidence bars, membrane potential trace
│   └── charts.js             # Panel 3 Chart.js bar charts (ops & energy comparison)
│
├── weights/
│   ├── ann_weights.json      # Trained ANN weights (~5 MB) — 784→256→128→10
│   ├── snn_weights.json      # Trained SNN weights (~5 MB) — 784→256→128→10
│   └── test_samples.json     # 100 MNIST test images with labels for batch testing
│
├── training/
│   ├── train_and_export.py   # Training script (ANN + SNN) with data augmentation
│   └── requirements.txt      # Python deps: torch, torchvision, snntorch, numpy
│
├── CLAUDE.md                 # Original design document / AI assistant context
├── EBRAINS_NOTE.md           # Notes on real neuromorphic hardware access
└── README.md                 # Project README
```

---

## Module Descriptions

### `index.html` — The Single Page Application

Contains all 4 panels and the intro overlay, structured as:

- **Intro Overlay** (`#introOverlay`): Full-screen glassmorphic welcome card. Introduces the research, highlights 25× energy savings for IoT, expandable technical context (MNIST as proxy for human detection, anomaly detection, etc.), researcher credit. Dismissed via "Begin Exploring →" button.
- **Panel 0 — The Concept** (`#panel0`): Educational intro comparing traditional neurons vs spiking neurons. Two cards with ANN vs SNN characteristics, a pipeline comparison table (sensor → transmit → compute → energy), and a "Why It Matters" section.
- **Panel 1 — The Processor** (`#panel1`): Drawing canvas, classify button, result cards (with confidence bar charts), network activity visualization (ANN forward pass + SNN spike propagation with scrubbing sliders), membrane potential trace.
- **Panel 2 — The Pipeline** (`#panel2`): Frame-vs-event camera comparison. Animates the user's drawn digit translating across the field of view, showing how a DVS camera produces sparse events vs dense frames.
- **Panel 3 — The Numbers** (`#panel3`): Batch inference over 100 MNIST test samples. Displays accuracy, avg operations, avg energy, and Chart.js bar charts comparing ANN vs SNN.

### `server.js` — Static File Server

A zero-dependency Node.js HTTP server. Key details:
- Serves static files from the project root
- MIME type map for `.html`, `.css`, `.js`, `.json`, `.png`, `.svg`, `.woff2`
- Strips query strings from URLs (for cache-busting)
- JSON files served with `Cache-Control: no-cache` (weights update during development)
- Listens on `process.env.PORT || 3000`, bound to `0.0.0.0` (required for Railway)

### `js/ann.js` — ANN Inference Engine

Pure JavaScript implementation of forward propagation through a 3-layer MLP:

- **Architecture:** 784 → 256 (ReLU) → 128 (ReLU) → 10 (softmax)
- **Functions exposed globally:**
  - `annForward(pixels, weights)` → `{ prediction, confidence, ops, energy, timeMs, activations }`
  - `matMulAdd(input, weight, bias)` — matrix multiply + bias (used by both ANN and SNN)
  - `relu(x)`, `softmax(x)`, `argmax(x)` — shared math utilities
- **Energy model:** 4.6 pJ per MAC (Horowitz 2014, 45nm process)
- **Activations array:** Returns per-layer activations `[a0, a1, a2, probs]` for network visualization

### `js/snn.js` — SNN Inference Engine (Leaky Integrate-and-Fire)

Pure JavaScript LIF spiking neural network:

- **Architecture:** 784 → 256 → 128 → 10, same weight dimensions as ANN
- **Parameters:** β = 0.95 (membrane decay), threshold = 1.0, T = 25 timesteps
- **Input encoding:** Rate coding via Bernoulli sampling from pixel intensities
- **Spike mechanism:** `mem = β * mem + current; if (mem ≥ threshold) { spike; mem -= threshold; }`
- **Output decision:** `argmax(cumulative_spike_counts)` over all timesteps
- **Returns:** `{ prediction, confidence, ops, energy, sparsity, timeMs, rasterData, spikeHistory, membraneTrace, outSpikeCounts, timesteps }`
  - `spikeHistory`: Per-timestep, per-layer spike binary arrays (for network viz slider)
  - `membraneTrace`: Per-timestep membrane potential of all 10 output neurons (for LIF trace plot)
  - `outSpikeCounts`: Cumulative spike counts for digits 0-9 (for confidence bars)
  - `rasterData`: Sampled spike events `{t, neuron}` for raster plot
- **Energy model:** 0.9 pJ per AC (accumulate, no multiply — Horowitz 2014)
- **Ops counting:** Only counts operations proportional to neurons that actually fired (sparse)

### `js/canvas-input.js` — Drawing Canvas + MNIST Preprocessing

Handles the 280×280 drawing canvas with mouse and touch support:

- **Drawing:** White strokes (14px, round cap/join) on black background
- **MNIST-style preprocessing** (`getCanvasPixels()`):
  1. Finds bounding box of non-black pixels (threshold > 20)
  2. Adds 5% margin around the bounding box
  3. Resizes cropped region to fit within **20×20** pixels (MNIST convention), preserving aspect ratio
  4. Computes **center of mass** of the scaled digit
  5. Places the digit in a **28×28** frame, centered at (14,14) using the center-of-mass offset
  6. Returns `Float32Array(784)` normalized to [0, 1]
- **Clear button handler:** Resets canvas, hides all result/visualization sections
- **`isCanvasBlank()`:** Checks if anything has been drawn

### `js/app.js` — Main Application Controller

Orchestrates the entire application lifecycle:

- **`init()`:** Loads all 3 JSON weight files in parallel, shows intro overlay after loading
- **Intro overlay dismiss:** Fade-out animation on "Begin Exploring" click
- **`setupTabs()`:** Panel switching with active tab highlighting
- **`setupClassify()`:** On classify click:
  1. Gets preprocessed pixels from canvas
  2. Runs `annForward()` and `snnForward()` in sequence
  3. Updates result cards with predictions, confidence, ops, energy, sparsity
  4. Renders confidence bar charts for both networks
  5. Renders network activity visualizations (ANN layers + SNN spike propagation)
  6. Renders membrane potential trace for SNN output neurons
  7. Stores drawn pixels for use in Panel 2
- **`setupPipeline()`:** Wires Panel 2's "Run Pipeline" button to use the drawn digit
- **ANN/SNN slider event handlers:** Scrubbing through network layers (ANN) or timesteps (SNN)
- **Autoplay buttons:** Animate through all slider positions with setInterval
- **Panel 3 batch inference:** Runs both networks on 100 test samples, computes accuracy/avg metrics

### `js/event-sim.js` — DVS Event Camera Simulation

Simulates a Dynamic Vision Sensor:

- **`simulateEvents(prevFrame, currFrame, threshold)`:** Compares two 784-element frames pixel-by-pixel. Outputs a binary event array where pixels that changed more than `threshold` are 1.
- **`generateTranslationSequence(basePixels, numFrames)`:** Takes a 28×28 digit image and generates 30 frames of horizontal translation, simulating the digit moving across a camera's field of view.

### `js/pipeline-anim.js` — Pipeline Animation (Panel 2)

Runs the frame-vs-event comparison animation:

- Animates through 30 translation frames at 100ms intervals
- Left canvas: Shows the full frame (all 784 pixels, orange-tinted — ANN pipeline)
- Right canvas: Shows only changed pixels (events, cyan-tinted — SNN pipeline)
- Tracks cumulative pixel count vs cumulative event count
- At completion, displays the "punchline" — data reduction percentage (typically 80-95%)
- Threshold slider lets users adjust DVS sensitivity in real-time

### `js/network-viz.js` — Network Activity Visualization

Renders the ANN and SNN network architectures as interactive, slider-driven canvas visualizations:

- **Layer configuration:** Input (784, 28×28 grid) → Hidden 1 (256, 16×16) → Hidden 2 (128, 16×8) → Output (10, 10×1)
- **ANN visualization:** Shows activation magnitudes at each layer with orange intensity. All connections fire (dense). Slider scrubs through layers.
- **SNN visualization:** Shows which neurons spiked (cyan dots) at each timestep. Connections only drawn from spiking neurons (sparse). Slider scrubs through 25 timesteps.
- **Output layer:** Displays digit labels 0-9 with the predicted digit highlighted and an arrow marker
- **Auto-play buttons:** Animate through all slider positions automatically
- **Sparsity indicator:** Shows "X% active this timestep" for SNN

### `js/visualisation.js` — Data Visualization Library

Custom Canvas2D rendering functions:

- **`renderSpikeRaster(canvasId, rasterData, T)`:** Spike raster plot. X-axis = timestep, Y-axis = neuron index. Each spike is a cyan dot.
- **`renderConfidenceBars(canvasId, values, type)`:** Horizontal bar chart showing probability/spike distribution across digits 0-9. ANN bars are orange (softmax probabilities), SNN bars are cyan (normalized spike counts). Winning digit gets a glow effect.
- **`renderMembraneTrace(canvasId, membraneTrace, T, currentT)`:** LIF membrane potential plot for the top 3 output neurons over 25 timesteps. Shows voltage lines, red dashed threshold at 1.0, spike markers (dots at top), and a vertical slider sync marker.
- **`formatEnergy(joules)`:** Formats energy values in human-readable units (pJ, nJ, µJ, mJ).

### `js/charts.js` — Chart.js Bar Charts (Panel 3)

Uses Chart.js v4 to render two bar charts:
1. **Operations comparison:** ANN MACs vs SNN ACs (bar chart)
2. **Energy comparison:** ANN energy vs SNN energy (bar chart)

Both use the project's color scheme (orange for ANN, cyan for SNN).

### `css/style.css` — Styling

Single CSS file with:
- **Design system:** CSS custom properties for colors, fonts, radii, transitions
- **Dark theme:** `--bg: #0A0A0F` background, `--snn: #00D4FF` (cyan), `--ann: #FF6B35` (orange)
- **Typography:** Inter (body) + JetBrains Mono (code/data)
- **Loading overlay:** Full-screen spinner with fade-out animation
- **Intro overlay:** Glassmorphic card with backdrop blur, gradient title, animated entry
- **Responsive:** Breakpoints at 900px, 600px, and 400px for mobile
- **Canvas styling:** Rounded corners, subtle borders, glow effects
- **Tabs:** Horizontal nav with numbered labels and active state underline

### `training/train_and_export.py` — Model Training & Export

Python script that trains both models and exports weights as JSON:

- **ANN training:**
  - 15 epochs, Adam optimizer (lr=1e-3), CosineAnnealing LR scheduler
  - Dropout(0.2) between layers for regularization
  - Data augmentation: ±15° rotation, ±10% translation, ±15% scale
  - Best-model checkpointing based on test accuracy
  - **Final test accuracy: ~98.2%**

- **SNN training:**
  - 20 epochs, Adam optimizer (lr=2e-3), CosineAnnealing LR scheduler
  - Surrogate gradient (fast sigmoid) for differentiable spiking
  - Same data augmentation as ANN
  - Rate coding input via `torch.bernoulli(x)` at each of 25 timesteps
  - Loss: CrossEntropy on summed output spikes
  - **Final test accuracy: ~98.0%**

- **Weight export format:** JSON with keys `fc1_weight`, `fc1_bias`, `fc2_weight`, `fc2_bias`, `fc3_weight`, `fc3_bias`. Weights are 2D arrays `[out_features][in_features]`.

- **Test sample export:** 100 random MNIST test images with labels, as `[{pixels: [...], label: N}, ...]`

- **Fallback:** If snntorch is not installed, uses a manual LIF implementation with `SurrogateSpike` autograd function.

---

## Data Flow

```
User draws digit on canvas (280×280)
        │
        ▼
canvas-input.js: MNIST preprocessing
  (bbox crop → 20×20 resize → center-of-mass → 28×28)
        │
        ▼
   Float32Array(784)  ──────────────────────────┐
        │                                        │
        ▼                                        ▼
   ann.js: annForward()                    snn.js: snnForward()
   (matmul → relu → matmul                (25 timesteps of:
    → relu → matmul → softmax)             bernoulli → matmul → LIF → spike)
        │                                        │
        ├─ prediction (0-9)                      ├─ prediction (0-9)
        ├─ softmax probabilities                 ├─ spike counts per digit
        ├─ activations per layer                 ├─ spikeHistory per timestep
        ├─ ops count (fixed: 234K MACs)          ├─ membraneTrace per timestep
        └─ energy (ops × 4.6pJ)                 ├─ ops count (sparse, varies)
                                                 └─ energy (ops × 0.9pJ)
        │                                        │
        ▼                                        ▼
   app.js: Updates DOM result cards, renders:
     • Confidence bar charts (visualisation.js)
     • Network activity canvases (network-viz.js)
     • Membrane potential trace (visualisation.js)
     • Spike raster (visualisation.js)
```

---

## Key Design Decisions

1. **Zero-dependency frontend** — No React, no Tailwind, no bundler. Pure vanilla JS + Canvas2D for maximum portability and zero build step. Only external dep is Chart.js (CDN) for Panel 3 bar charts.

2. **Shared weight format** — ANN and SNN use identical weight matrices (`fc1`, `fc2`, `fc3`). The JS `matMulAdd()` function is shared between both. The difference is only in how activations propagate (dense continuous vs sparse event-driven).

3. **MNIST-style preprocessing** — The canvas preprocessing mirrors exactly how MNIST digits are formatted: bounding box crop → fit in 20×20 → center by center-of-mass in 28×28. This is critical for hand-drawn accuracy.

4. **Surrogate gradient training** — The SNN uses a custom `SurrogateSpike` autograd function with fast sigmoid approximation to enable backpropagation through the non-differentiable spike threshold.

5. **Rate coding for SNN input** — Each of the 25 timesteps generates a Bernoulli sample from pixel intensities. Brighter pixels have a higher probability of producing a spike. This is biologically plausible and matches how real neuromorphic systems encode continuous signals.

6. **Energy model** — Uses the widely-cited Horowitz 2014 (45nm CMOS) estimates: 4.6 pJ per MAC (multiply-accumulate, ANN) vs 0.9 pJ per AC (accumulate only, SNN). The SNN additionally benefits from sparsity — only computing on neurons that actually spike.

---

## Deployment

### Railway

```bash
railway link        # Link to Railway project
railway up          # Deploy
```

The app reads `PORT` from environment and binds to `0.0.0.0`. No build step needed.

### Local Development

```bash
npm start           # or: node server.js
# Open http://localhost:3000
```

### Retraining Models

```bash
cd training
pip install -r requirements.txt
python train_and_export.py
# Outputs: weights/ann_weights.json, weights/snn_weights.json, weights/test_samples.json
```

---

## UI Panels Reference

| Panel | Name | Purpose |
|-------|------|---------|
| Intro | Welcome Overlay | Research context, energy callout, technical details, researcher credit |
| 00 | The Concept | Educational ANN vs SNN comparison, pipeline diagram |
| 01 | The Processor | Draw & classify, network visualization, membrane trace |
| 02 | The Pipeline | Frame vs event camera simulation, data reduction demo |
| 03 | The Numbers | Batch accuracy, ops & energy comparison charts |

---

## Important Invariants

- Weight matrices are `[out_features][in_features]` — matches PyTorch's convention and the JS `matMulAdd` loop structure
- The SNN uses the **same** weight files as the ANN — they are trained separately but exported in the same JSON format
- The SNN's `Math.random()` in rate coding means **results vary between runs** for the same input — this is expected and biologically accurate
- Canvas internal resolution is **280×280** (set via HTML attributes), CSS may display it larger/smaller
- The app has **no backend API** — all inference runs client-side in the browser
