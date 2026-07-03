// js/app.js — Orquestación principal del dashboard

// Tabs
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('tab-' + btn.dataset.tab).classList.add('active');

    if (btn.dataset.tab === 'indicador') renderIndicador();
    if (btn.dataset.tab === 'catalogo')  inicializarCatalogo();
  });
});

// Render principal: orquesta todas las fases
function renderDashboard() {
  document.getElementById('dashboard').classList.remove('hidden');

  procesarDatos();   // FASE 2 — capa de procesamiento
  KPIs();            // FASE 3 — indicadores clave
  Graficas();        // FASE 5 — gráficas + tendencia
  renderTable();     // tabla de detalle
  KPIsHistoricos();  // FASE 4 — cierre mensual
  AnalisisIA();      // FASE 6 — análisis inteligente

  if (document.getElementById('tab-indicador').classList.contains('active')) {
    renderIndicador();
  }
}

window.addEventListener('DOMContentLoaded', () => {
  CargaDatos();
});
