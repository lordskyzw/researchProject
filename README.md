# Neuromorphic Computing on the Edge

Interactive web demo comparing a traditional ANN pipeline with a full neuromorphic SNN pipeline for image classification. The demo proves that when both the sensor and the processor are event-driven, the entire pipeline becomes sparse — from photon to prediction — achieving ~95% data reduction and ~90% energy savings.

## Quick Start

### 1. Train models (one-time, requires Python)

```bash
cd training
pip install -r requirements.txt
python train_and_export.py
```

This trains an ANN and SNN on MNIST and exports weights as JSON files to `weights/`.

### 2. Run the demo

```bash
node server.js
# Open http://localhost:3000
```

No dependencies needed — just Node.js for the static file server.

## Three Panels

| Panel | What it shows |
|-------|--------------|
| **01 — The Processor** | Draw a digit. Both ANN and SNN classify it. See the spike raster, ops count, and energy delta. |
| **02 — The Pipeline** | Watch a digit translate across the frame. Frame camera sends all 784 pixels; event camera sends only ~40 changed pixels. |
| **03 — The Numbers** | Batch comparison across 100 MNIST test samples. Tables and charts for ops, energy, accuracy. |

## Energy Proxy Methodology

Energy estimates use the Horowitz 2014 (45nm) model:
- **MAC operation** (ANN): 4.6 pJ
- **AC operation** (SNN): 0.9 pJ

These are per-operation estimates. The relative ratio (~5×) is more meaningful than absolute values and holds across process nodes.

## EBRAINS

For real neuromorphic hardware access (SpiNNaker, BrainScaleS), see [EBRAINS_NOTE.md](EBRAINS_NOTE.md).

## Deployment

Deploys as a static site on Railway (or any platform):
```bash
# Railway
railway up
```

## Browser Support

Modern Chrome, Firefox, Edge, Safari. Mobile-friendly responsive design.
