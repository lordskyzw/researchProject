/* ===== Panel 3 — Chart.js Bar Charts ===== */

function createComparisonCharts(avgAnnOps, avgSnnOps, avgAnnEnergy, avgSnnEnergy) {
  const commonOptions = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#1a1a2e',
        titleColor: '#E8E8F0',
        bodyColor: '#E8E8F0',
        borderColor: 'rgba(255,255,255,0.1)',
        borderWidth: 1,
      },
    },
    scales: {
      x: {
        ticks: { color: '#8888A0', font: { family: 'Inter', size: 11 } },
        grid: { display: false },
        border: { color: 'rgba(255,255,255,0.06)' },
      },
      y: {
        ticks: { color: '#8888A0', font: { family: 'JetBrains Mono', size: 10 } },
        grid: { color: 'rgba(255,255,255,0.04)' },
        border: { display: false },
        beginAtZero: true,
      },
    },
    animation: { duration: 800, easing: 'easeOutCubic' },
  };

  // Ops chart
  const opsCtx = document.getElementById('opsChart');
  if (opsCtx) {
    new Chart(opsCtx, {
      type: 'bar',
      data: {
        labels: ['Traditional (ANN)', 'Neuromorphic (SNN)'],
        datasets: [{
          data: [avgAnnOps, avgSnnOps],
          backgroundColor: ['rgba(255,107,53,0.7)', 'rgba(0,212,255,0.7)'],
          borderColor: ['#FF6B35', '#00D4FF'],
          borderWidth: 2,
          borderRadius: 6,
          barPercentage: 0.5,
        }],
      },
      options: {
        ...commonOptions,
        scales: {
          ...commonOptions.scales,
          y: {
            ...commonOptions.scales.y,
            title: { display: true, text: 'Synaptic Operations', color: '#8888A0', font: { size: 10 } },
          },
        },
      },
    });
  }

  // Energy chart
  const energyCtx = document.getElementById('energyChart');
  if (energyCtx) {
    new Chart(energyCtx, {
      type: 'bar',
      data: {
        labels: ['Traditional (ANN)', 'Neuromorphic (SNN)'],
        datasets: [{
          data: [avgAnnEnergy * 1e9, avgSnnEnergy * 1e9],  // Convert to nJ for readability
          backgroundColor: ['rgba(255,107,53,0.7)', 'rgba(0,212,255,0.7)'],
          borderColor: ['#FF6B35', '#00D4FF'],
          borderWidth: 2,
          borderRadius: 6,
          barPercentage: 0.5,
        }],
      },
      options: {
        ...commonOptions,
        scales: {
          ...commonOptions.scales,
          y: {
            ...commonOptions.scales.y,
            title: { display: true, text: 'Energy (nJ)', color: '#8888A0', font: { size: 10 } },
          },
        },
      },
    });
  }
}

window.createComparisonCharts = createComparisonCharts;
