// js/app.js
const STORAGE_KEY = 'mant_preventivo_data';

let allData = [];
let filteredData = [];
let charts = {};
let indMesValue = '';

// ─── Tabs ───────────────────────────────────────────────────────────────────
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
    if (btn.dataset.tab === 'indicador') renderIndicador();
  });
});

// ─── Carga de archivo ────────────────────────────────────────────────────────
document.getElementById('fileInput').addEventListener('change', function (e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function (e) {
    try {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: 'array' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const parsed = XLSX.utils.sheet_to_json(sheet, { defval: '' });

      if (parsed.length === 0) {
        alert('El archivo no contiene datos.');
        return;
      }

      allData = parsed;
      saveToStorage(allData, file.name);
      filteredData = [...allData];
      initFilters();
      renderDashboard();
    } catch (err) {
      console.error('Error al procesar Excel:', err);
      alert('Error al procesar el archivo Excel. Verifique que sea un .xlsx válido.');
    }
  };
  reader.readAsArrayBuffer(file);
});

// ─── localStorage ────────────────────────────────────────────────────────────
function saveToStorage(data, filename) {
  try {
    const payload = { data, filename, savedAt: new Date().toLocaleString('es-VE') };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    showStorageStatus(filename, payload.savedAt);
  } catch {
    // Si el archivo es muy grande, localStorage puede fallar; se ignora.
  }
}

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const payload = JSON.parse(raw);
    if (!payload.data || payload.data.length === 0) return false;

    allData = payload.data;
    filteredData = [...allData];
    showStorageStatus(payload.filename, payload.savedAt);
    initFilters();
    renderDashboard();
    return true;
  } catch {
    return false;
  }
}

function showStorageStatus(filename, savedAt) {
  const el = document.getElementById('dataStatus');
  el.classList.remove('hidden');
  document.getElementById('dataStatusText').textContent =
    `Datos cargados: ${filename || 'archivo'} — guardado el ${savedAt}`;
}

function clearStoredData() {
  if (!confirm('¿Deseas eliminar los datos guardados? Necesitarás cargar el archivo de nuevo.')) return;
  localStorage.removeItem(STORAGE_KEY);
  allData = [];
  filteredData = [];
  document.getElementById('dashboard').classList.add('hidden');
  document.getElementById('dataStatus').classList.add('hidden');
  document.getElementById('fileInput').value = '';
}

// Cargar datos guardados al iniciar
window.addEventListener('DOMContentLoaded', () => {
  loadFromStorage();
});

// ─── Helpers ─────────────────────────────────────────────────────────────────
function getValue(row, key) {
  if (!row) return '';
  return String(row[key] ?? row[key.trim()] ?? row[key + ' '] ?? '').trim();
}

function pct(num, den) {
  if (!den) return 0;
  return Math.round((num / den) * 1000) / 10; // un decimal
}

function pctStr(num, den) {
  const v = pct(num, den);
  return v % 1 === 0 ? v + '%' : v.toFixed(1) + '%';
}

function progressBar(value, color) {
  return `
    <div style="display:flex;align-items:center;gap:6px">
      <div class="progress-bg" style="flex:1">
        <div class="progress-fill" style="width:${Math.min(value, 100)}%;background:${color}"></div>
      </div>
      <span style="min-width:42px;font-size:0.8rem;font-weight:600;color:${color}">${value % 1 === 0 ? value : value.toFixed(1)}%</span>
    </div>`;
}

function calColor(pctAvance) {
  if (pctAvance >= 80) return '#16a34a';
  if (pctAvance >= 50) return '#d97706';
  return '#dc2626';
}

// ─── Filtros ─────────────────────────────────────────────────────────────────
function initFilters() {
  const meses = [...new Set(allData.map(row => {
    const m = getValue(row, 'Mes');
    const a = getValue(row, 'Año');
    return (m && a) ? `${m}/${a}` : null;
  }).filter(Boolean))].sort();

  document.getElementById('mesFilter').innerHTML =
    '<option value="">Todos los meses</option>' +
    meses.map(m => `<option value="${m}">${m}</option>`).join('');

  const plantas = [...new Set(allData.map(r => getValue(r, 'Ubicación')).filter(Boolean))].sort();
  document.getElementById('plantaFilter').innerHTML =
    '<option value="">Todas las plantas</option>' +
    plantas.map(p => `<option value="${p}">${p}</option>`).join('');

  const tipos = [...new Set(allData.map(r => getValue(r, 'Tipo')).filter(Boolean))].sort();
  document.getElementById('tipoFilter').innerHTML =
    '<option value="">Todos los tipos</option>' +
    tipos.map(t => `<option value="${t}">${t}</option>`).join('');

  const talleres = [...new Set(allData.map(r => getValue(r, 'Taller')).filter(Boolean))].sort();
  document.getElementById('tallerFilter').innerHTML =
    '<option value="">Todos los talleres</option>' +
    talleres.map(t => `<option value="${t}">${t}</option>`).join('');

  ['mesFilter', 'plantaFilter', 'tipoFilter', 'tallerFilter'].forEach(id => {
    document.getElementById(id).removeEventListener('change', filterAndRender);
    document.getElementById(id).addEventListener('change', filterAndRender);
  });

  // Filtro mes del indicador (usa las mismas opciones)
  const indSel = document.getElementById('indMesFilter');
  indSel.innerHTML = '<option value="">Todos los meses</option>' +
    meses.map(m => `<option value="${m}">${m}</option>`).join('');
  indSel.removeEventListener('change', onIndMesChange);
  indSel.addEventListener('change', onIndMesChange);
}

function filterAndRender() {
  const mes = document.getElementById('mesFilter').value;
  const planta = document.getElementById('plantaFilter').value;
  const tipo = document.getElementById('tipoFilter').value;
  const taller = document.getElementById('tallerFilter').value;

  filteredData = allData.filter(row => {
    const rowMes = `${getValue(row, 'Mes')}/${getValue(row, 'Año')}`;
    return (!mes || rowMes === mes) &&
      (!planta || getValue(row, 'Ubicación') === planta) &&
      (!tipo || getValue(row, 'Tipo') === tipo) &&
      (!taller || getValue(row, 'Taller') === taller);
  });

  renderDashboard();
}

function resetFilters() {
  ['mesFilter', 'plantaFilter', 'tipoFilter', 'tallerFilter'].forEach(id => {
    document.getElementById(id).value = '';
  });
  filteredData = [...allData];
  renderDashboard();
}

function onIndMesChange() {
  indMesValue = document.getElementById('indMesFilter').value;
  renderIndicador();
}

function resetIndFilter() {
  indMesValue = '';
  document.getElementById('indMesFilter').value = '';
  renderIndicador();
}

// ─── KPIs Resumen ────────────────────────────────────────────────────────────
function calculateKPIs() {
  const total = filteredData.length;
  const ejecutados = filteredData.filter(r => getValue(r, 'Estatus').toLowerCase().includes('ejecutado')).length;

  document.getElementById('totalServicios').textContent = total;
  document.getElementById('ejecutados').textContent = ejecutados;
  document.getElementById('pendientes').textContent = total - ejecutados;
  document.getElementById('porcentaje').textContent = total ? Math.round((ejecutados / total) * 100) + '%' : '0%';
}

// ─── Gráficos Resumen ─────────────────────────────────────────────────────────
function renderCharts() {
  Object.values(charts).forEach(c => c && c.destroy());
  charts = {};

  const tipoEquipo = {};
  filteredData.forEach(r => {
    const t = getValue(r, 'Tipo') || 'Sin tipo';
    tipoEquipo[t] = (tipoEquipo[t] || 0) + 1;
  });
  charts.tipoEquipo = new Chart(document.getElementById('chartTipoEquipo'), {
    type: 'bar',
    data: { labels: Object.keys(tipoEquipo), datasets: [{ label: 'Cantidad', data: Object.values(tipoEquipo), backgroundColor: '#3b82f6' }] },
    options: { responsive: true, plugins: { legend: { display: false } } }
  });

  const tipoMttoData = {};
  filteredData.forEach(r => {
    const t = getValue(r, 'Tipo mtto') || 'N/A';
    tipoMttoData[t] = (tipoMttoData[t] || 0) + 1;
  });
  const totalMtto = Object.values(tipoMttoData).reduce((a, b) => a + b, 0);
  charts.tipoMtto = new Chart(document.getElementById('chartTipoMantenimiento'), {
    type: 'pie',
    data: {
      labels: Object.keys(tipoMttoData).map(k => `${k} (${((tipoMttoData[k] / totalMtto) * 100).toFixed(1)}%)`),
      datasets: [{ data: Object.values(tipoMttoData), backgroundColor: ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#6366f1'] }]
    },
    options: { responsive: true, plugins: { legend: { position: 'right', labels: { font: { size: 12 } } } } }
  });

  const proveedorData = {};
  filteredData.forEach(r => {
    const t = getValue(r, 'Taller') || 'Sin asignar';
    proveedorData[t] = (proveedorData[t] || 0) + 1;
  });
  const totalProv = Object.values(proveedorData).reduce((a, b) => a + b, 0);
  charts.proveedor = new Chart(document.getElementById('chartProveedor'), {
    type: 'doughnut',
    data: {
      labels: Object.keys(proveedorData).map(k => `${k} (${((proveedorData[k] / totalProv) * 100).toFixed(1)}%)`),
      datasets: [{ data: Object.values(proveedorData), backgroundColor: ['#22c55e', '#eab308', '#ef4444', '#3b82f6', '#a855f7', '#6366f1'] }]
    },
    options: { responsive: true, plugins: { legend: { position: 'right', labels: { font: { size: 12 } } } } }
  });

  const plantaData = {};
  filteredData.forEach(r => {
    const p = getValue(r, 'Ubicación') || 'Sin planta';
    plantaData[p] = (plantaData[p] || 0) + 1;
  });
  charts.planta = new Chart(document.getElementById('chartPlanta'), {
    type: 'bar',
    data: { labels: Object.keys(plantaData), datasets: [{ label: 'Servicios', data: Object.values(plantaData), backgroundColor: '#6366f1' }] },
    options: { responsive: true, indexAxis: 'y' }
  });
}

function formatCosto(val) {
  const n = parseFloat(String(val).replace(/[^0-9.-]/g, ''));
  if (isNaN(n) || n === 0) return '—';
  return n.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ─── Tabla Resumen ────────────────────────────────────────────────────────────
function renderTable() {
  const tbody = document.getElementById('tableBody');
  tbody.innerHTML = '';

  const grouped = {};
  filteredData.forEach(r => {
    const g = getValue(r, 'Tipo mtto') || 'Sin tipo mtto';
    if (!grouped[g]) grouped[g] = [];
    grouped[g].push(r);
  });

  let totalCosto = 0;

  if (Object.keys(grouped).length === 0) {
    tbody.innerHTML = `<tr><td colspan="9" class="p-8 text-center text-gray-500">No hay datos para mostrar</td></tr>`;
    return;
  }

  Object.keys(grouped).sort().forEach(tipoMtto => {
    const rows = grouped[tipoMtto];
    const groupRow = document.createElement('tr');
    groupRow.className = 'bg-indigo-50 font-semibold';
    groupRow.innerHTML = `<td colspan="9" class="p-4 text-lg">Tipo Mtto: ${tipoMtto} <span class="text-sm font-normal text-gray-500">(${rows.length} servicios)</span></td>`;
    tbody.appendChild(groupRow);

    rows.forEach(row => {
      const estatus = getValue(row, 'Estatus') || 'Pendiente';
      const isExecuted = estatus.toLowerCase().includes('ejecutado');
      const costoRaw = getValue(row, 'Costo');
      const costoNum = parseFloat(String(costoRaw).replace(/[^0-9.-]/g, '')) || 0;
      totalCosto += costoNum;

      const tr = document.createElement('tr');
      tr.className = 'hover:bg-gray-50 border-b';
      tr.innerHTML = `
        <td class="p-4 pl-8">${getValue(row, 'Mes')}/${getValue(row, 'Año')}</td>
        <td class="p-4">${getValue(row, 'Ubicación')}</td>
        <td class="p-4 font-medium">${getValue(row, 'Economico')}</td>
        <td class="p-4">${getValue(row, 'Tipo')}</td>
        <td class="p-4">${getValue(row, 'Tipo mtto')}</td>
        <td class="p-4 text-right">${getValue(row, 'Hr/Km planificado')}</td>
        <td class="p-4 text-right font-medium">${formatCosto(costoRaw)}</td>
        <td class="p-4 text-center">
          <span class="px-3 py-1 rounded-full text-xs font-medium ${isExecuted ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}">
            ${estatus}
          </span>
        </td>
        <td class="p-4">${getValue(row, 'Taller')}</td>`;
      tbody.appendChild(tr);
    });
  });

  // Fila de total inversión
  const totalRow = document.createElement('tr');
  totalRow.className = 'bg-blue-700 text-white font-bold';
  totalRow.innerHTML = `
    <td colspan="6" class="p-4 text-right text-sm tracking-wide">INVERSIÓN TOTAL DEL PERIODO</td>
    <td class="p-4 text-right text-lg">${totalCosto.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
    <td colspan="2" class="p-4"></td>`;
  tbody.appendChild(totalRow);
}

// ─── Indicador de Cumplimiento por Tipo de Equipo ────────────────────────────

const TIPO_CONFIG = [
  { label: 'Plantas',          badge: 'P', prefixes: ['P'],        badgeColor: '#2563eb', badgeBg: '#dbeafe' },
  { label: 'Ollas',            badge: 'R', prefixes: ['R'],        badgeColor: '#16a34a', badgeBg: '#dcfce7' },
  { label: 'Bombas',           badge: 'B', prefixes: ['B'],        badgeColor: '#ea580c', badgeBg: '#ffedd5' },
  { label: 'Trascabos/retro',  badge: 'T', prefixes: ['T'],        badgeColor: '#7c3aed', badgeBg: '#ede9fe' },
  { label: 'Eq. Auxiliares\n(PG / BG)', badge: 'A', prefixes: ['PG', 'BG'], badgeColor: '#475569', badgeBg: '#e2e8f0' },
];

function classifyTipo(tipoVal) {
  const upper = tipoVal.toUpperCase().trim();
  for (const cfg of TIPO_CONFIG) {
    for (const prefix of cfg.prefixes) {
      if (upper.startsWith(prefix)) return cfg;
    }
  }
  return null;
}

function isExcluded(row) {
  const fields = [getValue(row, 'Tipo mtto'), getValue(row, 'Servicio'), getValue(row, 'Descripcion'), getValue(row, 'Tipo')];
  return fields.some(f => f.toUpperCase().includes('MODULO') || f.toUpperCase().includes('MOTOR'));
}

function classifyStatus(row) {
  const costo = getValue(row, 'Costo');
  const estatus = getValue(row, 'Estatus').toLowerCase();

  if (costo && costo !== '' && costo !== '0') return 'ejecutado';
  if (estatus.includes('tolerancia')) return 'tolerancia';
  return 'vencido';
}

function renderIndicador() {
  const rows = allData.filter(r => {
    if (isExcluded(r)) return false;
    if (indMesValue) {
      const rowMes = `${getValue(r, 'Mes')}/${getValue(r, 'Año')}`;
      if (rowMes !== indMesValue) return false;
    }
    return true;
  });

  // Agrupar por tipo
  const grupos = {};
  TIPO_CONFIG.forEach(cfg => { grupos[cfg.label] = { cfg, plan: 0, ejec: 0, tol: 0, venc: 0 }; });

  rows.forEach(row => {
    const tipo = getValue(row, 'Tipo');
    const cfg = classifyTipo(tipo);
    if (!cfg) return;
    const g = grupos[cfg.label];
    g.plan++;
    const st = classifyStatus(row);
    if (st === 'ejecutado') g.ejec++;
    else if (st === 'tolerancia') g.tol++;
    else g.venc++;
  });

  // Totales globales
  let tPlan = 0, tEjec = 0, tTol = 0, tVenc = 0;
  Object.values(grupos).forEach(g => { tPlan += g.plan; tEjec += g.ejec; tTol += g.tol; tVenc += g.venc; });

  document.getElementById('indTotalPlan').textContent = tPlan;
  document.getElementById('indTotalEjec').textContent = tEjec;
  document.getElementById('indTotalTol').textContent = tTol;
  document.getElementById('indTotalVenc').textContent = tVenc;

  // Cuerpo de tabla
  const tbody = document.getElementById('indicadorBody');
  tbody.innerHTML = '';

  TIPO_CONFIG.forEach(cfg => {
    const g = grupos[cfg.label];
    const pAvance = pct(g.ejec, g.plan);
    const pTol = pct(g.tol, g.plan);
    const pVenc = pct(g.venc, g.plan);
    const calScore = pct(g.ejec + g.tol, g.plan);
    const color = calColor(pAvance);

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td style="padding:14px">
        <div style="display:flex;align-items:center;gap:10px">
          <span class="badge-circle" style="background:${cfg.badgeBg};color:${cfg.badgeColor}">${cfg.badge}</span>
          <span style="font-weight:500;white-space:pre-line">${cfg.label}</span>
        </div>
      </td>
      <td>${g.plan}</td>
      <td>${g.ejec}</td>
      <td>${g.tol}</td>
      <td>${g.venc}</td>
      <td>${progressBar(pAvance, '#16a34a')}</td>
      <td>${progressBar(pTol, '#d97706')}</td>
      <td>${progressBar(pVenc, '#dc2626')}</td>
      <td style="font-weight:700;font-size:1rem;color:${calColor(calScore)}">${calScore % 1 === 0 ? calScore : calScore.toFixed(1)}%</td>`;
    tbody.appendChild(tr);
  });

  // Fila totales
  const tAvance = pct(tEjec, tPlan);
  const tTolPct = pct(tTol, tPlan);
  const tVencPct = pct(tVenc, tPlan);
  const tCal = pct(tEjec + tTol, tPlan);

  const tfoot = document.getElementById('indicadorFoot');
  tfoot.innerHTML = `
    <tr>
      <td style="text-align:left;padding:14px">Total</td>
      <td>${tPlan}</td>
      <td>${tEjec}</td>
      <td>${tTol}</td>
      <td>${tVenc}</td>
      <td>${tAvance % 1 === 0 ? tAvance : tAvance.toFixed(1)}%</td>
      <td>${tTolPct % 1 === 0 ? tTolPct : tTolPct.toFixed(1)}%</td>
      <td>${tVencPct % 1 === 0 ? tVencPct : tVencPct.toFixed(1)}%</td>
      <td>${tCal % 1 === 0 ? tCal : tCal.toFixed(1)}%</td>
    </tr>`;
}

// ─── Render principal ─────────────────────────────────────────────────────────
function renderDashboard() {
  document.getElementById('dashboard').classList.remove('hidden');
  calculateKPIs();
  renderCharts();
  renderTable();

  // Si la pestaña indicador está activa, refrescarla también
  if (document.getElementById('tab-indicador').classList.contains('active')) {
    renderIndicador();
  }
}
