// js/graficas.js — Graficas: gráficas existentes + FASE 5 tendencia mensual

function Graficas() {
  Object.values(APP.charts).forEach(c => c && c.destroy());
  APP.charts = {};

  _graficaTipoEquipo();
  _graficaTipoMantenimiento();
  _graficaProveedor();
  _graficaPlanta();
  _graficaTendencia(); // FASE 5
}

function _graficaTipoEquipo() {
  const data = {};
  APP.filteredData.forEach(r => {
    const t = getValue(r, 'Tipo') || 'Sin tipo';
    data[t] = (data[t] || 0) + 1;
  });
  APP.charts.tipoEquipo = new Chart(document.getElementById('chartTipoEquipo'), {
    type: 'bar',
    data: {
      labels: Object.keys(data),
      datasets: [{ label: 'Cantidad', data: Object.values(data), backgroundColor: '#3b82f6', borderRadius: 4 }]
    },
    options: { responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }
  });
}

function _graficaTipoMantenimiento() {
  const data = {};
  APP.filteredData.forEach(r => {
    const t = getValue(r, 'Tipo mtto') || 'N/A';
    data[t] = (data[t] || 0) + 1;
  });
  const total = Object.values(data).reduce((a, b) => a + b, 0);
  APP.charts.tipoMtto = new Chart(document.getElementById('chartTipoMantenimiento'), {
    type: 'pie',
    data: {
      labels: Object.keys(data).map(k => `${k} (${((data[k] / total) * 100).toFixed(1)}%)`),
      datasets: [{ data: Object.values(data), backgroundColor: ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#6366f1'] }]
    },
    options: { responsive: true, plugins: { legend: { position: 'right', labels: { font: { size: 12 } } } } }
  });
}

function _graficaProveedor() {
  const data = {};
  APP.filteredData.forEach(r => {
    const t = getValue(r, 'Taller') || 'Sin asignar';
    data[t] = (data[t] || 0) + 1;
  });
  const total = Object.values(data).reduce((a, b) => a + b, 0);
  APP.charts.proveedor = new Chart(document.getElementById('chartProveedor'), {
    type: 'doughnut',
    data: {
      labels: Object.keys(data).map(k => `${k} (${((data[k] / total) * 100).toFixed(1)}%)`),
      datasets: [{ data: Object.values(data), backgroundColor: ['#22c55e', '#eab308', '#ef4444', '#3b82f6', '#a855f7', '#6366f1'] }]
    },
    options: { responsive: true, plugins: { legend: { position: 'right', labels: { font: { size: 12 } } } } }
  });
}

function _graficaPlanta() {
  const data = {};
  APP.filteredData.forEach(r => {
    const p = getValue(r, 'Ubicación') || 'Sin planta';
    data[p] = (data[p] || 0) + 1;
  });
  APP.charts.planta = new Chart(document.getElementById('chartPlanta'), {
    type: 'bar',
    data: {
      labels: Object.keys(data),
      datasets: [{ label: 'Servicios', data: Object.values(data), backgroundColor: '#6366f1', borderRadius: 4 }]
    },
    options: { responsive: true, indexAxis: 'y', plugins: { legend: { display: false } } }
  });
}

// FASE 5: Tendencia mensual — barras apiladas + línea % cumplimiento
function _graficaTendencia() {
  const meses = Object.keys(APP.metricasPorMes).sort(sortMesAño);
  if (meses.length === 0) return;

  const ejData   = meses.map(m => APP.metricasPorMes[m].ejecutados);
  const tolData  = meses.map(m => APP.metricasPorMes[m].tolerancia);
  const vencData = meses.map(m => APP.metricasPorMes[m].pendientes);
  const cumplData = meses.map(m => {
    const d = APP.metricasPorMes[m];
    return pct(d.ejecutados + d.tolerancia, d.programados);
  });

  APP.charts.tendencia = new Chart(document.getElementById('chartTendencia'), {
    type: 'bar',
    data: {
      labels: meses,
      datasets: [
        { label: 'Ejecutados',   data: ejData,   backgroundColor: '#22c55e', stack: 's', borderRadius: 2 },
        { label: 'Tolerancia',   data: tolData,  backgroundColor: '#f59e0b', stack: 's', borderRadius: 2 },
        { label: 'Vencidos',     data: vencData, backgroundColor: '#ef4444', stack: 's', borderRadius: 2 },
        {
          label: '% Cumplimiento',
          data: cumplData,
          type: 'line',
          yAxisID: 'y2',
          borderColor: '#1e3a5f',
          backgroundColor: 'rgba(30,58,95,0.08)',
          borderWidth: 2.5,
          pointBackgroundColor: '#1e3a5f',
          pointRadius: 4,
          tension: 0.4,
          fill: false,
        }
      ]
    },
    options: {
      responsive: true,
      interaction: { mode: 'index' },
      scales: {
        y:  { stacked: true, title: { display: true, text: 'Servicios' }, beginAtZero: true },
        y2: { position: 'right', min: 0, max: 100, title: { display: true, text: '% Cumplimiento' }, grid: { drawOnChartArea: false } }
      },
      plugins: { legend: { position: 'bottom' } }
    }
  });
}
