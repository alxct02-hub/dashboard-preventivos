// app.js
let allData = [];
let filteredData = [];
let charts = {};

// Column indices based on your Excel
const COL = {
  MES: 0,
  ANO: 1,
  UBICACION: 2,
  ECONOMICO: 3,
  TIPO: 4,
  TIPO_MTTO: 5,
  PLANIFICADO: 6,
  REGISTRO: 7,
  ESTATUS: 8,
  TALLER: 9
};

document.getElementById('fileInput').addEventListener('change', function(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    const data = new Uint8Array(e.target.result);
    const workbook = XLSX.read(data, { type: 'array' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    
    // Convert to array of arrays
    const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
    
    // Remove header row and filter empty rows
    allData = jsonData.slice(1).filter(row => row[COL.MES] !== "");
    
    filteredData = [...allData];
    initFilters();
    renderDashboard();
  };
  reader.readAsArrayBuffer(file);
});

function initFilters() {
  // Mes filter
  const meses = [...new Set(allData.map(row => `${row[COL.MES]}/${row[COL.ANO]}`))].sort();
  const mesSelect = document.getElementById('mesFilter');
  mesSelect.innerHTML = '<option value="">Todos los meses</option>';
  meses.forEach(m => {
    const opt = document.createElement('option');
    opt.value = m;
    opt.textContent = m;
    mesSelect.appendChild(opt);
  });

  // Planta filter
  const plantas = [...new Set(allData.map(row => row[COL.UBICACION]))].sort();
  const plantaSelect = document.getElementById('plantaFilter');
  plantaSelect.innerHTML = '<option value="">Todas las plantas</option>';
  plantas.forEach(p => {
    const opt = document.createElement('option');
    opt.value = p;
    opt.textContent = p;
    plantaSelect.appendChild(opt);
  });

  // Tipo filter
  const tipos = [...new Set(allData.map(row => row[COL.TIPO]))].sort();
  const tipoSelect = document.getElementById('tipoFilter');
  tipoSelect.innerHTML = '<option value="">Todos los tipos</option>';
  tipos.forEach(t => {
    const opt = document.createElement('option');
    opt.value = t;
    opt.textContent = t;
    tipoSelect.appendChild(opt);
  });

  // Taller filter
  const talleres = [...new Set(allData.map(row => row[COL.TALLER]).filter(Boolean))].sort();
  const tallerSelect = document.getElementById('tallerFilter');
  tallerSelect.innerHTML = '<option value="">Todos los talleres</option>';
  talleres.forEach(t => {
    const opt = document.createElement('option');
    opt.value = t;
    opt.textContent = t;
    tallerSelect.appendChild(opt);
  });

  // Add event listeners
  ['mesFilter', 'plantaFilter', 'tipoFilter', 'tallerFilter'].forEach(id => {
    document.getElementById(id).addEventListener('change', filterAndRender);
  });
}

function filterAndRender() {
  const mes = document.getElementById('mesFilter').value;
  const planta = document.getElementById('plantaFilter').value;
  const tipo = document.getElementById('tipoFilter').value;
  const taller = document.getElementById('tallerFilter').value;

  filteredData = allData.filter(row => {
    const rowMes = `${row[COL.MES]}/${row[COL.ANO]}`;
    return (!mes || rowMes === mes) &&
           (!planta || row[COL.UBICACION] === planta) &&
           (!tipo || row[COL.TIPO] === tipo) &&
           (!taller || row[COL.TALLER] === taller);
  });

  renderDashboard();
}

function calculateKPIs() {
  const total = filteredData.length;
  const ejecutados = filteredData.filter(row => row[COL.ESTATUS] && 
    (row[COL.ESTATUS].toLowerCase().includes('ejecutado') || row[COL.ESTATUS].toLowerCase().includes('ejecutado'))).length;
  
  const pendientes = total - ejecutados;
  const porcentaje = total ? Math.round((ejecutados / total) * 100) : 0;

  document.getElementById('totalServicios').textContent = total;
  document.getElementById('ejecutados').textContent = ejecutados;
  document.getElementById('pendientes').textContent = pendientes;
  document.getElementById('porcentaje').textContent = porcentaje + '%';
}

function renderCharts() {
  // Destroy existing charts
  Object.values(charts).forEach(chart => chart && chart.destroy());

  // 1. Distribución por Tipo de Equipo
  const tipoEquipo = {};
  filteredData.forEach(row => {
    const t = row[COL.TIPO] || 'Sin tipo';
    tipoEquipo[t] = (tipoEquipo[t] || 0) + 1;
  });

  charts.tipoEquipo = new Chart(document.getElementById('chartTipoEquipo'), {
    type: 'bar',
    data: {
      labels: Object.keys(tipoEquipo),
      datasets: [{
        label: 'Cantidad',
        data: Object.values(tipoEquipo),
        backgroundColor: '#3b82f6'
      }]
    },
    options: { responsive: true, plugins: { legend: { display: false } } }
  });

  // 2. Distribución por Tipo de Mantenimiento
  const tipoMtto = {};
  filteredData.forEach(row => {
    const t = row[COL.TIPO_MTTO] || 'N/A';
    tipoMtto[t] = (tipoMtto[t] || 0) + 1;
  });

  const colors = ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899'];
  charts.tipoMtto = new Chart(document.getElementById('chartTipoMantenimiento'), {
    type: 'pie',
    data: {
      labels: Object.keys(tipoMtto),
      datasets: [{
        data: Object.values(tipoMtto),
        backgroundColor: colors
      }]
    },
    options: { responsive: true }
  });

  // 3. Distribución por Proveedor (Taller)
  const proveedor = {};
  filteredData.forEach(row => {
    const t = row[COL.TALLER] || 'Sin asignar';
    proveedor[t] = (proveedor[t] || 0) + 1;
  });

  charts.proveedor = new Chart(document.getElementById('chartProveedor'), {
    type: 'doughnut',
    data: {
      labels: Object.keys(proveedor),
      datasets: [{
        data: Object.values(proveedor),
        backgroundColor: ['#22c55e', '#eab308', '#ef4444', '#3b82f6', '#a855f7']
      }]
    },
    options: { responsive: true }
  });

  // 4. Distribución por Planta
  const plantaData = {};
  filteredData.forEach(row => {
    const p = row[COL.UBICACION] || 'Sin planta';
    plantaData[p] = (plantaData[p] || 0) + 1;
  });

  charts.planta = new Chart(document.getElementById('chartPlanta'), {
    type: 'bar',
    data: {
      labels: Object.keys(plantaData),
      datasets: [{
        label: 'Servicios',
        data: Object.values(plantaData),
        backgroundColor: '#6366f1'
      }]
    },
    options: { responsive: true, indexAxis: 'y' }
  });
}

function renderTable() {
  const tbody = document.getElementById('tableBody');
  tbody.innerHTML = '';

  filteredData.forEach(row => {
    const tr = document.createElement('tr');
    tr.className = "hover:bg-gray-50";
    tr.innerHTML = `
      <td class="p-4">${row[COL.MES]}/${row[COL.ANO]}</td>
      <td class="p-4">${row[COL.UBICACION]}</td>
      <td class="p-4 font-medium">${row[COL.ECONOMICO]}</td>
      <td class="p-4">${row[COL.TIPO]}</td>
      <td class="p-4">${row[COL.TIPO_MTTO]}</td>
      <td class="p-4 text-right">${row[COL.PLANIFICADO] || '-'}</td>
      <td class="p-4 text-right">${row[COL.REGISTRO] || '-'}</td>
      <td class="p-4 text-center">
        <span class="px-3 py-1 rounded-full text-xs font-medium ${row[COL.ESTATUS] && row[COL.ESTATUS].toLowerCase().includes('ejecutado') ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}">
          ${row[COL.ESTATUS] || 'Pendiente'}
        </span>
      </td>
      <td class="p-4">${row[COL.TALLER] || '-'}</td>
    `;
    tbody.appendChild(tr);
  });
}

function renderDashboard() {
  document.getElementById('dashboard').classList.remove('hidden');
  calculateKPIs();
  renderCharts();
  renderTable();
}

function resetFilters() {
  document.getElementById('mesFilter').value = '';
  document.getElementById('plantaFilter').value = '';
  document.getElementById('tipoFilter').value = '';
  document.getElementById('tallerFilter').value = '';
  filteredData = [...allData];
  renderDashboard();
}