// app.js - Versión corregida y robusta
let allData = [];
let filteredData = [];
let charts = {};

document.getElementById('fileInput').addEventListener('change', function(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];

      // Convertir a JSON con headers automáticos (más confiable)
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
        defval: "", 
        raw: false 
      });

      allData = jsonData;
      console.log("Datos cargados:", allData.length, "filas");
      console.log("Primer fila:", allData[0]);

      filteredData = [...allData];
      initFilters();
      renderDashboard();

    } catch (error) {
      console.error("Error al leer Excel:", error);
      alert("Error al procesar el archivo Excel. Intenta de nuevo.");
    }
  };
  reader.readAsArrayBuffer(file);
});

function getValue(row, key) {
  return row[key] !== undefined && row[key] !== null ? String(row[key]).trim() : '';
}

function initFilters() {
  if (allData.length === 0) return;

  // Mes/Año
  const mesesSet = new Set();
  allData.forEach(row => {
    const mes = getValue(row, 'Mes');
    const ano = getValue(row, 'Año');
    if (mes && ano) mesesSet.add(`${mes}/${ano}`);
  });

  const mesSelect = document.getElementById('mesFilter');
  mesSelect.innerHTML = '<option value="">Todos los meses</option>';
  Array.from(mesesSet).sort().forEach(m => {
    const opt = new Option(m, m);
    mesSelect.appendChild(opt);
  });

  // Planta
  const plantas = [...new Set(allData.map(row => getValue(row, 'Ubicación ')).filter(Boolean))].sort();
  const plantaSelect = document.getElementById('plantaFilter');
  plantaSelect.innerHTML = '<option value="">Todas las plantas</option>';
  plantas.forEach(p => plantaSelect.appendChild(new Option(p, p)));

  // Tipo
  const tipos = [...new Set(allData.map(row => getValue(row, 'Tipo')).filter(Boolean))].sort();
  const tipoSelect = document.getElementById('tipoFilter');
  tipoSelect.innerHTML = '<option value="">Todos los tipos</option>';
  tipos.forEach(t => tipoSelect.appendChild(new Option(t, t)));

  // Taller
  const talleres = [...new Set(allData.map(row => getValue(row, 'Taller')).filter(Boolean))].sort();
  const tallerSelect = document.getElementById('tallerFilter');
  tallerSelect.innerHTML = '<option value="">Todos los talleres</option>';
  talleres.forEach(t => tallerSelect.appendChild(new Option(t, t)));

  // Eventos
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
    const rowMesAno = `${getValue(row, 'Mes')}/${getValue(row, 'Año')}`;
    return (!mes || rowMesAno === mes) &&
           (!planta || getValue(row, 'Ubicación ') === planta) &&
           (!tipo || getValue(row, 'Tipo') === tipo) &&
           (!taller || getValue(row, 'Taller') === taller);
  });

  renderDashboard();
}

function calculateKPIs() {
  const total = filteredData.length;
  const ejecutados = filteredData.filter(row => {
    const est = getValue(row, 'Estatus').toLowerCase();
    return est.includes('ejecutado');
  }).length;

  const pendientes = total - ejecutados;
  const porcentaje = total ? Math.round((ejecutados / total) * 100) : 0;

  document.getElementById('totalServicios').textContent = total;
  document.getElementById('ejecutados').textContent = ejecutados;
  document.getElementById('pendientes').textContent = pendientes;
  document.getElementById('porcentaje').textContent = porcentaje + '%';
}

function renderCharts() {
  Object.values(charts).forEach(c => c && c.destroy());

  // Por Tipo de Equipo
  const tipoEquipo = {};
  filteredData.forEach(row => {
    const t = getValue(row, 'Tipo') || 'Sin tipo';
    tipoEquipo[t] = (tipoEquipo[t] || 0) + 1;
  });

  charts.tipoEquipo = new Chart(document.getElementById('chartTipoEquipo'), {
    type: 'bar',
    data: { labels: Object.keys(tipoEquipo), datasets: [{ label: 'Cantidad', data: Object.values(tipoEquipo), backgroundColor: '#3b82f6' }] },
    options: { responsive: true, plugins: { legend: { display: false }}}
  });

  // Por Tipo de Mantenimiento
  const tipoMtto = {};
  filteredData.forEach(row => {
    const t = getValue(row, 'Tipo mtto') || 'N/A';
    tipoMtto[t] = (tipoMtto[t] || 0) + 1;
  });

  charts.tipoMtto = new Chart(document.getElementById('chartTipoMantenimiento'), {
    type: 'pie',
    data: {
      labels: Object.keys(tipoMtto),
      datasets: [{ data: Object.values(tipoMtto), backgroundColor: ['#ef4444','#f59e0b','#10b981','#3b82f6','#8b5cf6','#ec4899'] }]
    },
    options: { responsive: true }
  });

  // Por Taller / Proveedor
  const proveedor = {};
  filteredData.forEach(row => {
    const t = getValue(row, 'Taller') || 'Sin asignar';
    proveedor[t] = (proveedor[t] || 0) + 1;
  });

  charts.proveedor = new Chart(document.getElementById('chartProveedor'), {
    type: 'doughnut',
    data: {
      labels: Object.keys(proveedor),
      datasets: [{ data: Object.values(proveedor), backgroundColor: ['#22c55e', '#eab308', '#ef4444', '#3b82f6', '#a855f7'] }]
    }
  });

  // Por Planta
  const plantaData = {};
  filteredData.forEach(row => {
    const p = getValue(row, 'Ubicación ') || 'Sin planta';
    plantaData[p] = (plantaData[p] || 0) + 1;
  });

  charts.planta = new Chart(document.getElementById('chartPlanta'), {
    type: 'bar',
    data: {
      labels: Object.keys(plantaData),
      datasets: [{ label: 'Servicios', data: Object.values(plantaData), backgroundColor: '#6366f1' }]
    },
    options: { responsive: true, indexAxis: 'y' }
  });
}

function renderTable() {
  const tbody = document.getElementById('tableBody');
  tbody.innerHTML = '';

  filteredData.forEach(row => {
    const estatus = getValue(row, 'Estatus') || 'Pendiente';
    const isExecuted = estatus.toLowerCase().includes('ejecutado');

    const tr = document.createElement('tr');
    tr.className = "hover:bg-gray-50 border-b";
    tr.innerHTML = `
      <td class="p-4">${getValue(row, 'Mes')}/${getValue(row, 'Año')}</td>
      <td class="p-4">${getValue(row, 'Ubicación ')}</td>
      <td class="p-4 font-medium">${getValue(row, 'Economico')}</td>
      <td class="p-4">${getValue(row, 'Tipo')}</td>
      <td class="p-4">${getValue(row, 'Tipo mtto')}</td>
      <td class="p-4 text-right">${getValue(row, 'Hr/Km planificado')}</td>
      <td class="p-4 text-right">${getValue(row, 'Registro ')}</td>
      <td class="p-4 text-center">
        <span class="px-3 py-1 rounded-full text-xs font-medium ${isExecuted ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}">
          ${estatus}
        </span>
      </td>
      <td class="p-4">${getValue(row, 'Taller')}</td>
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