"""
Train ANN and SNN on MNIST, export weights as JSON for the web demo.
Run once: python training/train_and_export.py
"""

import os
import json
import numpy as np
import torch
import torch.nn as nn
import torch.optim as optim
from torchvision import datasets, transforms

# Try snntorch import
try:
    import snntorch as snn
    from snntorch import functional as SF
    HAS_SNNTORCH = True
except ImportError:
    HAS_SNNTORCH = False
    print("WARNING: snntorch not installed. SNN will use a simple PyTorch LIF implementation.")

DEVICE = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
WEIGHTS_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'weights')
os.makedirs(WEIGHTS_DIR, exist_ok=True)


# ============================================================
# ANN Model
# ============================================================
class ANN(nn.Module):
    def __init__(self):
        super().__init__()
        self.fc1 = nn.Linear(784, 256)
        self.fc2 = nn.Linear(256, 128)
        self.fc3 = nn.Linear(128, 10)

    def forward(self, x):
        x = torch.relu(self.fc1(x))
        x = torch.relu(self.fc2(x))
        return self.fc3(x)


def train_ann(train_loader, epochs=5):
    print("\n=== Training ANN ===")
    model = ANN().to(DEVICE)
    optimizer = optim.Adam(model.parameters(), lr=1e-3)
    criterion = nn.CrossEntropyLoss()

    for epoch in range(epochs):
        model.train()
        total_loss = 0
        correct = 0
        total = 0
        for images, labels in train_loader:
            images = images.view(-1, 784).to(DEVICE)
            labels = labels.to(DEVICE)
            optimizer.zero_grad()
            outputs = model(images)
            loss = criterion(outputs, labels)
            loss.backward()
            optimizer.step()
            total_loss += loss.item()
            correct += (outputs.argmax(1) == labels).sum().item()
            total += labels.size(0)
        acc = correct / total * 100
        print(f"  Epoch {epoch+1}/{epochs} — Loss: {total_loss/len(train_loader):.4f}, Acc: {acc:.1f}%")

    return model


# ============================================================
# SNN Model (with or without snntorch)
# ============================================================
if HAS_SNNTORCH:
    class SNN(nn.Module):
        def __init__(self, beta=0.95, T=25):
            super().__init__()
            self.T = T
            self.fc1 = nn.Linear(784, 256)
            self.lif1 = snn.Leaky(beta=beta)
            self.fc2 = nn.Linear(256, 128)
            self.lif2 = snn.Leaky(beta=beta)
            self.fc3 = nn.Linear(128, 10)
            self.lif3 = snn.Leaky(beta=beta)

        def forward(self, x):
            mem1 = self.lif1.init_leaky()
            mem2 = self.lif2.init_leaky()
            mem3 = self.lif3.init_leaky()
            out_spikes = []

            for t in range(self.T):
                # Rate coding
                inp = torch.bernoulli(x)
                cur1 = self.fc1(inp)
                spk1, mem1 = self.lif1(cur1, mem1)
                cur2 = self.fc2(spk1)
                spk2, mem2 = self.lif2(cur2, mem2)
                cur3 = self.fc3(spk2)
                spk3, mem3 = self.lif3(cur3, mem3)
                out_spikes.append(spk3)

            return torch.stack(out_spikes, dim=0)  # [T, batch, 10]
else:
    class SNN(nn.Module):
        """Fallback SNN without snntorch — manual LIF."""
        def __init__(self, beta=0.95, T=25):
            super().__init__()
            self.T = T
            self.beta = beta
            self.fc1 = nn.Linear(784, 256)
            self.fc2 = nn.Linear(256, 128)
            self.fc3 = nn.Linear(128, 10)

        def forward(self, x):
            batch = x.size(0)
            mem1 = torch.zeros(batch, 256, device=x.device)
            mem2 = torch.zeros(batch, 128, device=x.device)
            mem3 = torch.zeros(batch, 10, device=x.device)
            out_spikes = []

            for t in range(self.T):
                inp = torch.bernoulli(x)
                cur1 = self.fc1(inp)
                mem1 = self.beta * mem1 + cur1
                spk1 = (mem1 >= 1.0).float()
                mem1 = mem1 - spk1  # subtract reset

                cur2 = self.fc2(spk1)
                mem2 = self.beta * mem2 + cur2
                spk2 = (mem2 >= 1.0).float()
                mem2 = mem2 - spk2

                cur3 = self.fc3(spk2)
                mem3 = self.beta * mem3 + cur3
                spk3 = (mem3 >= 1.0).float()
                mem3 = mem3 - spk3

                out_spikes.append(spk3)

            return torch.stack(out_spikes, dim=0)


def train_snn(train_loader, epochs=10):
    print("\n=== Training SNN ===")
    model = SNN(beta=0.95, T=25).to(DEVICE)
    optimizer = optim.Adam(model.parameters(), lr=1e-3)
    criterion = nn.CrossEntropyLoss()

    for epoch in range(epochs):
        model.train()
        total_loss = 0
        correct = 0
        total = 0
        for images, labels in train_loader:
            images = images.view(-1, 784).to(DEVICE)
            labels = labels.to(DEVICE)
            optimizer.zero_grad()
            spike_out = model(images)        # [T, batch, 10]
            summed = spike_out.sum(dim=0)    # [batch, 10]
            loss = criterion(summed, labels)
            loss.backward()
            optimizer.step()
            total_loss += loss.item()
            correct += (summed.argmax(1) == labels).sum().item()
            total += labels.size(0)
        acc = correct / total * 100
        print(f"  Epoch {epoch+1}/{epochs} — Loss: {total_loss/len(train_loader):.4f}, Acc: {acc:.1f}%")

    return model


# ============================================================
# Export
# ============================================================
def export_weights(model, filename):
    """Export model weights as JSON with nested lists."""
    state = model.state_dict()
    data = {}
    for key in ['fc1.weight', 'fc1.bias', 'fc2.weight', 'fc2.bias', 'fc3.weight', 'fc3.bias']:
        clean_key = key.replace('.', '_')  # fc1.weight -> fc1_weight
        tensor = state[key].detach().cpu()
        data[clean_key] = tensor.tolist()

    path = os.path.join(WEIGHTS_DIR, filename)
    with open(path, 'w') as f:
        json.dump(data, f)
    size_mb = os.path.getsize(path) / 1024 / 1024
    print(f"  Saved {path} ({size_mb:.1f} MB)")


def export_test_samples(test_dataset, n=100, filename='test_samples.json'):
    """Export random test samples as JSON."""
    indices = np.random.choice(len(test_dataset), n, replace=False)
    samples = []
    for idx in indices:
        img, label = test_dataset[int(idx)]
        pixels = img.view(-1).tolist()
        samples.append({'pixels': pixels, 'label': int(label)})

    path = os.path.join(WEIGHTS_DIR, filename)
    with open(path, 'w') as f:
        json.dump(samples, f)
    print(f"  Saved {path} ({n} samples)")


# ============================================================
# Main
# ============================================================
if __name__ == '__main__':
    print("Neuromorphic Demo — Model Training & Export")
    print(f"Device: {DEVICE}")
    print(f"snntorch available: {HAS_SNNTORCH}")

    transform = transforms.Compose([
        transforms.ToTensor(),
    ])

    train_data = datasets.MNIST(root='./data', train=True, download=True, transform=transform)
    test_data = datasets.MNIST(root='./data', train=False, download=True, transform=transform)

    train_loader = torch.utils.data.DataLoader(train_data, batch_size=128, shuffle=True)

    # Train & export ANN
    ann = train_ann(train_loader, epochs=5)
    export_weights(ann, 'ann_weights.json')

    # Train & export SNN
    snn_model = train_snn(train_loader, epochs=10)
    export_weights(snn_model, 'snn_weights.json')

    # Export test samples
    export_test_samples(test_data, n=100)

    print("\nDone! Weight files are in the weights/ folder.")
    print("  Start the demo: node server.js")
