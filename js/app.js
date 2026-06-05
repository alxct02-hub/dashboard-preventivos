// app.js - Versión DEBUG (mejorada)
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

      // Convertir a JSON usando headers del Excel
      allData = XLSX.utils.sheet_to_json(sheet, { defval: "" });
      
      console.log("✅ Archivo cargado correctamente!");
      console.log("Total de filas:", allData.length);
      console.log("Columnas disponibles:", Object.keys(allData[0] || {}));

      if (allData.length > 0) {
        filteredData = [...allData];
        initFilters();
        renderDashboard();
      } else {
        alert("El archivo está vacío o no se pudo leer.");
      }
    } catch (error) {
      console.error("❌ Error:", error);
      alert("Error al leer el Excel: " + error.message);
    }
  };
  reader.readAsArrayBuffer(file);
});

function getValue(row, key) {
  if (!row) return '';
  // Intentar con y sin espacios
  return (row[key] || row[key.trim()] || row[key + ' '] || '').toString().trim();
}

function initFilters() {
  if (allData.length === 0) return;

  // Mes
  const meses = [...new Set(allData.map(row => {
    const m = getValue(row, 'Mes');
    const a = getValue(row, 'Año');
    return m && a ? `${m}/${a}` : null;
  }).filter(Boolean))].sort();

  const mesSelect = document.getElementById('mesFilter');
  mesSelect.innerHTML = '<option value="">Todos los meses</option>';
  meses.forEach(m => mesSelect.appendChild(new Option(m, m)));

  // Resto de filtros
  const plantas = [...new Set(allData.map(row => getValue(row, 'Ubicación')).filter(Boolean))].sort();
  const plantaSelect = document.getElementById('plantaFilter');
  plantaSelect.innerHTML = '<option value="">Todas las plantas</option>';
  plantas.forEach(p => plantaSelect.appendChild(new Option(p, p)));

  const tipos = [...new Set(allData.map(row => getValue(row, 'Tipo')).filter(Boolean))].sort();
  const tipoSelect = document.getElementById('tipoFilter');
  tipoSelect.innerHTML = '<option value="">Todos los tipos</option>';
  tipos.forEach(t => tipoSelect.appendChild(new Option(t, t)));

  const talleres = [...new Set(allData.map(row => getValue(row, 'Taller')).filter(Boolean))].sort();
  const tallerSelect = document.getElementById('tallerFilter');
  tallerSelect.innerHTML = '<option value="">Todos los talleres</option>';
  talleres.forEach(t => tallerSelect.appendChild(new Option(t, t)));

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

// ... (el resto de funciones calculateKPIs, renderCharts, renderTable y renderDashboard se mantienen iguales a la versión anterior)

function calculateKPIs() {
  const total = filteredData.length;
  const ejecutados = filteredData.filter(row => {
    const est = getValue(row, 'Estatus').toLowerCase();
    return est.includes('ejecutado');
  }).length;

  document.getElementById('totalServicios').textContent = total;
  document.getElementById('ejecutados').textContent = ejecutados;
  document.getElementById('pendientes').textContent = total - ejecutados;
  document.getElementById('porcentaje').textContent = total ? Math.round((ejecutados / total) * 100) + '%' : '0%';
}

function renderCharts() {
  Object.values(charts).forEach(c => c && c.destroy());

  const tipoEquipo = {};
  filteredData.forEach(row => {
    const t = getValue(row, 'Tipo') || 'Sin tipo';
    tipoEquipo[t] = (tipoEquipo[t] || 0) + 1;
  });

  charts.tipoEquipo = new Chart(document.getElementById('chartTipoEquipo'), {
    type: 'bar', data: { labels: Object.keys(tipoEquipo), datasets: [{ label: 'Cantidad', data: Object.values(tipoEquipo), backgroundColor: '#3b82f6' }] },
    options: { responsive: true, plugins: { legend: { display: false } } }
  });

  // (Mantén las otras 3 funciones de gráficos igual que antes)
  // ... copia las demás de la versión anterior
}

function renderTable() {
  const tbody = document.getElementById('tableBody');
  tbody.innerHTML = '';

  filteredData.forEach(row => {
    const estatus = getValue(row, 'Estatus') || 'Pendiente';
    const isExecuted = estatus.toLowerCase().includes('ejecutado');

    const tr = document.createElement('tr');
    tr.className = "hover:bg-gray-50";
    tr.innerHTML = `
      <td class="p-4">${getValue(row, 'Mes')}/${getValue(row, 'Año')}</td>
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