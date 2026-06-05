// js/app.js
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
      const sheet = workbook.Sheets[workbook.SheetNames[0]];

      allData = XLSX.utils.sheet_to_json(sheet, { defval: "" });
      
      console.log("✅ Archivo cargado:", allData.length, "filas");
      
      if (allData.length > 0) {
        filteredData = [...allData];
        initFilters();
        renderDashboard();
      }
    } catch (error) {
      console.error("❌ Error:", error);
      alert("Error al procesar el archivo Excel");
    }
  };
  reader.readAsArrayBuffer(file);
});

function getValue(row, key) {
  if (!row) return '';
  return String(row[key] || row[key.trim()] || row[key + ' '] || '').trim();
}

function initFilters() {
  const meses = [...new Set(allData.map(row => {
    const m = getValue(row, 'Mes');
    const a = getValue(row, 'Año');
    return (m && a) ? `${m}/${a}` : null;
  }).filter(Boolean))].sort();

  document.getElementById('mesFilter').innerHTML = '<option value="">Todos los meses</option>' +
    meses.map(m => `<option value="${m}">${m}</option>`).join('');

  const plantas = [...new Set(allData.map(row => getValue(row, 'Ubicación')).filter(Boolean))].sort();
  document.getElementById('plantaFilter').innerHTML = '<option value="">Todas las plantas</option>' +
    plantas.map(p => `<option value="${p}">${p}</option>`).join('');

  const tipos = [...new Set(allData.map(row => getValue(row, 'Tipo')).filter(Boolean))].sort();
  document.getElementById('tipoFilter').innerHTML = '<option value="">Todos los tipos</option>' +
    tipos.map(t => `<option value="${t}">${t}</option>`).join('');

  const talleres = [...new Set(allData.map(row => getValue(row, 'Taller')).filter(Boolean))].sort();
  document.getElementById('tallerFilter').innerHTML = '<option value="">Todos los talleres</option>' +
    talleres.map(t => `<option value="${t}">${t}</option>`).join('');

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
    const rowMes = `${getValue(row, 'Mes')}/${getValue(row, 'Año')}`;
    return (!mes || rowMes === mes) &&
           (!planta || getValue(row, 'Ubicación') === planta) &&
           (!tipo || getValue(row, 'Tipo') === tipo) &&
           (!taller || getValue(row, 'Taller') === taller);
  });

  renderDashboard();
}

function calculateKPIs() {
  const total = filteredData.length;
  const ejecutados = filteredData.filter(row => getValue(row, 'Estatus').toLowerCase().includes('ejecutado')).length;
  
  document.getElementById('totalServicios').textContent = total;
  document.getElementById('ejecutados').textContent = ejecutados;
  document.getElementById('pendientes').textContent = total - ejecutados;
  document.getElementById('porcentaje').textContent = total ? Math.round((ejecutados / total) * 100) + '%' : '0%';
}

function renderCharts() {
  Object.values(charts).forEach(c => c && c.destroy());

  // 1. Tipo de Equipo
  const tipoEquipo = {};
  filteredData.forEach(row => {
    const t = getValue(row, 'Tipo') || 'Sin tipo';
    tipoEquipo[t] = (tipoEquipo[t] || 0) + 1;
  });
  charts.tipoEquipo = new Chart(document.getElementById('chartTipoEquipo'), {
    type: 'bar',
    data: { labels: Object.keys(tipoEquipo), datasets: [{ label: 'Cantidad', data: Object.values(tipoEquipo), backgroundColor: '#3b82f6' }] },
    options: { responsive: true, plugins: { legend: { display: false } } }
  });

  // 2. Tipo de Mantenimiento - Con porcentajes
  const tipoMttoData = {};
  filteredData.forEach(row => {
    const t = getValue(row, 'Tipo mtto') || 'N/A';
    tipoMttoData[t] = (tipoMttoData[t] || 0) + 1;
  });
  const totalMtto = Object.values(tipoMttoData).reduce((a, b) => a + b, 0);

  const labelsMtto = Object.keys(tipoMttoData).map(key => {
    const value = tipoMttoData[key];
    const percent = ((value / totalMtto) * 100).toFixed(1);
    return `${key} (${percent}%)`;
  });

  charts.tipoMtto = new Chart(document.getElementById('chartTipoMantenimiento'), {
    type: 'pie',
    data: {
      labels: labelsMtto,
      datasets: [{
        data: Object.values(tipoMttoData),
        backgroundColor: ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#6366f1']
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { position: 'right', labels: { font: { size: 13 } } }
      }
    }
  });

  // 3. Proveedor (Taller) - Con porcentajes en leyenda
  const proveedorData = {};
  filteredData.forEach(row => {
    const t = getValue(row, 'Taller') || 'Sin asignar';
    proveedorData[t] = (proveedorData[t] || 0) + 1;
  });
  const totalProveedor = Object.values(proveedorData).reduce((a, b) => a + b, 0);

  const labelsProveedor = Object.keys(proveedorData).map(key => {
    const value = proveedorData[key];
    const percent = ((value / totalProveedor) * 100).toFixed(1);
    return `${key} (${percent}%)`;
  });

  charts.proveedor = new Chart(document.getElementById('chartProveedor'), {
    type: 'doughnut',
    data: {
      labels: labelsProveedor,
      datasets: [{ 
        data: Object.values(proveedorData), 
        backgroundColor: ['#22c55e', '#eab308', '#ef4444', '#3b82f6', '#a855f7', '#6366f1'] 
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { 
          position: 'right',
          labels: { font: { size: 13 } }
        }
      }
    }
  });

  // 4. Por Planta
  const plantaData = {};
  filteredData.forEach(row => {
    const p = getValue(row, 'Ubicación') || 'Sin planta';
    plantaData[p] = (plantaData[p] || 0) + 1;
  });
  charts.planta = new Chart(document.getElementById('chartPlanta'), {
    type: 'bar',
    data: { labels: Object.keys(plantaData), datasets: [{ label: 'Servicios', data: Object.values(plantaData), backgroundColor: '#6366f1' }] },
    options: { responsive: true, indexAxis: 'y' }
  });
}

// Tabla agrupada por Tipo Mtto
function renderTable() {
  const tbody = document.getElementById('tableBody');
  tbody.innerHTML = '';

  const grouped = {};
  filteredData.forEach(row => {
    const tipoMtto = getValue(row, 'Tipo mtto') || 'Sin tipo mtto';
    if (!grouped[tipoMtto]) grouped[tipoMtto] = [];
    grouped[tipoMtto].push(row);
  });

  Object.keys(grouped).sort().forEach(tipoMtto => {
    const rows = grouped[tipoMtto];

    const groupRow = document.createElement('tr');
    groupRow.className = "bg-indigo-50 font-semibold";
    groupRow.innerHTML = `
      <td colspan="9" class="p-4 text-lg">
        Tipo Mtto: ${tipoMtto} <span class="text-sm font-normal text-gray-500">(${rows.length} servicios)</span>
      </td>
    `;
    tbody.appendChild(groupRow);

    rows.forEach(row => {
      const estatus = getValue(row, 'Estatus') || 'Pendiente';
      const isExecuted = estatus.toLowerCase().includes('ejecutado');

      const tr = document.createElement('tr');
      tr.className = "hover:bg-gray-50 border-b";
      tr.innerHTML = `
        <td class="p-4 pl-8">${getValue(row, 'Mes')}/${getValue(row, 'Año')}</td>
        <td class="p-4">${getValue(row, 'Ubicación')}</td>
        <td class="p-4 font-medium">${getValue(row, 'Economico')}</td>
        <td class="p-4">${getValue(row, 'Tipo')}</td>
        <td class="p-4">${getValue(row, 'Tipo mtto')}</td>
        <td class="p-4 text-right">${getValue(row, 'Hr/Km planificado')}</td>
        <td class="p-4 text-right">${getValue(row, 'Registro')}</td>
        <td class="p-4 text-center">
          <span class="px-3 py-1 rounded-full text-xs font-medium ${isExecuted ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}">
            ${estatus}
          </span>
        </td>
        <td class="p-4">${getValue(row, 'Taller')}</td>
      `;
      tbody.appendChild(tr);
    });
  });

  if (Object.keys(grouped).length === 0) {
    tbody.innerHTML = `<tr><td colspan="9" class="p-8 text-center text-gray-500">No hay datos para mostrar</td></tr>`;
  }
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