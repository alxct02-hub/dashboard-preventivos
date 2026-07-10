// js/configuracion.js — Configuracion: filtros y selectores

function Configuracion() {
  const meses = [...new Set(APP.allData.map(mesAñoKey).filter(Boolean))].sort(sortMesAño);

  document.getElementById('mesFilter').innerHTML =
    '<option value="">Todos los meses</option>' +
    meses.map(m => `<option value="${m}">${m}</option>`).join('');

  const plantas = [...new Set(APP.allData.map(r => getValue(r, 'Ubicación')).filter(Boolean))].sort();
  document.getElementById('plantaFilter').innerHTML =
    '<option value="">Todas las plantas</option>' +
    plantas.map(p => `<option value="${p}">${p}</option>`).join('');

  const tipos = [...new Set(APP.allData.map(r => getValue(r, 'Tipo')).filter(Boolean))].sort();
  document.getElementById('tipoFilter').innerHTML =
    '<option value="">Todos los tipos</option>' +
    tipos.map(t => `<option value="${t}">${t}</option>`).join('');

  const talleres = [...new Set(APP.allData.map(r => getValue(r, 'Taller')).filter(Boolean))].sort();
  document.getElementById('tallerFilter').innerHTML =
    '<option value="">Todos los talleres</option>' +
    talleres.map(t => `<option value="${t}">${t}</option>`).join('');

  ['mesFilter', 'plantaFilter', 'tipoFilter', 'tallerFilter'].forEach(id => {
    const el = document.getElementById(id);
    el.removeEventListener('change', filterAndRender);
    el.addEventListener('change', filterAndRender);
  });
}

function filterAndRender() {
  const mes    = document.getElementById('mesFilter').value;
  const planta = document.getElementById('plantaFilter').value;
  const tipo   = document.getElementById('tipoFilter').value;
  const taller = document.getElementById('tallerFilter').value;

  APP.filteredData = APP.allData.filter(row =>
    (!mes    || mesAñoKey(row) === mes) &&
    (!planta || getValue(row, 'Ubicación') === planta) &&
    (!tipo   || getValue(row, 'Tipo') === tipo) &&
    (!taller || getValue(row, 'Taller') === taller)
  );
  renderDashboard();
}

function resetFilters() {
  ['mesFilter', 'plantaFilter', 'tipoFilter', 'tallerFilter'].forEach(id => {
    document.getElementById(id).value = '';
  });
  APP.filteredData = [...APP.allData];
  renderDashboard();
}
