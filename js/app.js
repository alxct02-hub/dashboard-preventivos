// js/app.js — Orquestación principal del dashboard

// Tabs
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
    if (btn.dataset.tab === 'indicador') renderIndicador();
  });
});

// Render principal: orquesta todas las fases
function renderDashboard() {
  document.getElementById('dashboard').classList.remove('hidden');

  procesarDatos();   // FASE 2 — capa de procesamiento
  KPIs();            // FASE 3 — indicadores clave (existentes + nuevos)
  Graficas();        // FASE 5 — gráficas + tendencia mensual
  renderTable();     // tabla de detalle de servicios
  KPIsHistoricos();  // FASE 4 — cierre mensual histórico
  AnalisisIA();      // FASE 6 — panel de análisis inteligente

  if (document.getElementById('tab-indicador').classList.contains('active')) {
    renderIndicador();
  }
}

window.addEventListener('DOMContentLoaded', () => {
  CargaDatos(); // intentar restaurar datos del localStorage
});
