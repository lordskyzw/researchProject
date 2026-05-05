# EBRAINS — Real Neuromorphic Hardware Access

This demo simulates neuromorphic behaviour in software. For real neuromorphic hardware, [EBRAINS](https://ebrains.eu) provides free access to:

## Available Hardware

- **SpiNNaker** — ARM-based many-core neuromorphic chip (University of Manchester)
- **BrainScaleS** — Analog neuromorphic system (Heidelberg University)

## How to Access

1. Register at [ebrains.eu](https://ebrains.eu)
2. Go to the **Collaboratory**
3. Search for "SpiNNaker" or "BrainScaleS"
4. Find ready-made Jupyter notebooks for running SNNs on real hardware

## Connection to This Demo

The event camera simulation in Panel 2 mirrors how real **DVS (Dynamic Vision Sensor)** cameras work:

- **Prophesee** and **DAVIS346** cameras use threshold-based, asynchronous pixel-level sensing
- Each pixel fires independently when its log-intensity changes by a set threshold
- The result is naturally sparse — only motion and edges generate data

Our simulation uses frame differencing as an approximation. Real DVS hardware achieves even greater sparsity because it operates at microsecond temporal resolution with no frame boundaries.

## Expected Gains on Real Hardware

Real neuromorphic chips would show even greater improvements than this simulation because:
- True event-driven processing eliminates clock-cycle waste
- Analog computation (BrainScaleS) or asynchronous digital (SpiNNaker) avoid synchronous overhead
- Memory and compute are co-located, eliminating von Neumann bottleneck

## Link

🔗 [https://www.ebrains.eu/tools/neuromorphic-computing](https://www.ebrains.eu/tools/neuromorphic-computing)
