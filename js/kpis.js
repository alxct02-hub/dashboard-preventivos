// js/kpis.js — KPIs principales + KPIsHistoricos (Cierre Mensual) + tabla de detalle

// FASE 3: KPIs actuales y nuevos (solo muestran, no calculan)
function KPIs() {
  const m = APP.metricas;

  // Existentes
  document.getElementById('totalServicios').textContent = m.programados;
  document.getElementById('ejecutados').textContent = m.ejecutados;
  document.getElementById('pendientes').textContent = m.vencidos;   // vencidos = pendientes sin tolerancia
  document.getElementById('porcentaje').textContent =
    m.programados ? Math.round((m.ejecutados / m.programados) * 100) + '%' : '0%';

  // Nuevos — FASE 3
  document.getElementById('kpiTolerancia').textContent = m.enTolerancia;
  document.getElementById('kpiBacklog').textContent = m.heredados;   // heredados = mes > mesKPI y pendiente
  document.getElementById('kpiReprogramados').textContent = m.reprogramados;
  document.getElementById('kpiPctTolerancia').textContent = fmtPct(m.pctTolerancia);
  document.getElementById('kpiCumplimientoAcum').textContent = fmtPct(m.pctCumplimiento);
  const elIndice = document.getElementById('kpiIndiceDesempeno');
  if (elIndice) elIndice.textContent = fmtPct(m.indiceDesempeno);
}

// FASE 4: Cierre mensual histórico (usa allData completo)
function KPIsHistoricos() {
  const tbody = document.getElementById('cierreMensualBody');
  tbody.innerHTML = '';

  const isAdmin = typeof _esAdmin === 'function' ? _esAdmin() : false;

  const meses = Object.keys(APP.metricasPorMes).sort(sortMesAño);
  if (meses.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="p-6 text-center text-gray-400">Sin datos históricos disponibles</td></tr>`;
    return;
  }

  let tProg = 0, tEjec = 0, tTol = 0, tPend = 0;

  meses.forEach(mes => {
    const d = APP.metricasPorMes[mes];
    tProg += d.programados; tEjec += d.ejecutados; tTol += d.tolerancia; tPend += d.pendientes;

    const cumpl = d.esHistorico && d.cumplFijo !== undefined
      ? d.cumplFijo
      : pct(d.ejecutados + d.tolerancia, d.programados);

    const estaCerrado = APP.estadosMeses?.[mes]?.estado === 'cerrado';
    const lockBadge = estaCerrado
      ? `<span style="font-size:0.7rem;background:#dbeafe;color:#1d4ed8;padding:2px 6px;border-radius:999px;margin-left:6px">cerrado</span>`
      : `<span style="font-size:0.7rem;background:#dcfce7;color:#15803d;padding:2px 6px;border-radius:999px;margin-left:6px">abierto</span>`;

    const btnReabrir = (isAdmin && estaCerrado)
      ? `<button onclick="reabrirMes('${mes}')" class="text-xs px-2 py-1 rounded bg-amber-50 text-amber-600 hover:bg-amber-100 ml-2"><i class="ti ti-lock-open"></i> Reabrir</button>`
      : '';

    const tr = document.createElement('tr');
    tr.className = `border-b transition-colors ${estaCerrado ? 'bg-blue-50/50 hover:bg-blue-50' : 'hover:bg-gray-50'}`;
    tr.innerHTML = `
      <td class="p-4 font-medium text-gray-800">${mes}${lockBadge}${btnReabrir}</td>
      <td class="p-4 text-center text-gray-700">${d.programados}</td>
      <td class="p-4 text-center font-semibold text-green-700">${d.ejecutados}</td>
      <td class="p-4 text-center font-semibold text-amber-600">${d.tolerancia}</td>
      <td class="p-4 text-center font-semibold text-red-600">${d.pendientes}</td>
      <td class="p-4 text-center">
        <span class="font-bold text-base" style="color:${calColor(cumpl)}">${fmtPct(cumpl)}</span>
      </td>`;
    tbody.appendChild(tr);
  });

  // Fila total
  const cumplTotal = pct(tEjec + tTol, tProg);
  const tr = document.createElement('tr');
  tr.className = 'font-bold';
  tr.style.background = '#1e3a5f';
  tr.style.color = 'white';
  tr.innerHTML = `
    <td class="p-4">Total acumulado</td>
    <td class="p-4 text-center">${tProg}</td>
    <td class="p-4 text-center">${tEjec}</td>
    <td class="p-4 text-center">${tTol}</td>
    <td class="p-4 text-center">${tPend}</td>
    <td class="p-4 text-center">${fmtPct(cumplTotal)}</td>`;
  tbody.appendChild(tr);
}

// Tabla de detalle de servicios
function renderTable() {
  const tbody = document.getElementById('tableBody');
  tbody.innerHTML = '';

  const isAdmin = typeof _esAdmin === 'function' ? _esAdmin() : false;
  const mesCerrado = (row) => {
    const mesKey = mesAñoKey(row);
    return APP.estadosMeses?.[mesKey]?.estado === 'cerrado';
  };

  const grouped = {};
  APP.filteredData.forEach((r, idx) => {
    r._idx = idx;
    const g = getValue(r, 'Tipo mtto') || 'Sin tipo mtto';
    if (!grouped[g]) grouped[g] = [];
    grouped[g].push(r);
  });

  const claves = Object.keys(grouped).sort();
  if (claves.length === 0) {
    tbody.innerHTML = `<tr><td colspan="10" class="p-8 text-center text-gray-400">No hay datos para mostrar</td></tr>`;
    return;
  }

  let totalCosto = 0;

  claves.forEach(tipoMtto => {
    const rows = grouped[tipoMtto];

    const groupRow = document.createElement('tr');
    groupRow.className = 'bg-indigo-50 font-semibold';
    groupRow.innerHTML = `<td colspan="10" class="p-4 text-base">Tipo Mtto: ${tipoMtto} <span class="text-sm font-normal text-gray-500">(${rows.length} servicios)</span></td>`;
    tbody.appendChild(groupRow);

    rows.forEach(row => {
      const estatus = getValue(row, 'Estatus') || 'Pendiente';
      const costo = getValue(row, 'Costo');
      totalCosto += parseCosto(row);

      const cls = row._cls || clasificarServicio(row);
      let badgeCls = 'bg-red-100 text-red-700';
      if (cls.ejecutado)     badgeCls = 'bg-green-100 text-green-700';
      else if (cls.tolerancia) badgeCls = 'bg-amber-100 text-amber-700';

      const puedeEditar = isAdmin && !mesCerrado(row);
      const acciones = puedeEditar
        ? `<button onclick="abrirModalEdicion(${row._idx})" class="text-xs px-2 py-1 rounded bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"><i class="ti ti-edit"></i></button>`
        : '';

      const tr = document.createElement('tr');
      tr.className = 'hover:bg-gray-50 border-b transition-colors';
      tr.innerHTML = `
        <td class="p-4 pl-8">${getValue(row, 'Mes')}/${getValue(row, 'Año')}</td>
        <td class="p-4">${getValue(row, 'Ubicación')}</td>
        <td class="p-4 font-medium">${getValue(row, 'Economico')}</td>
        <td class="p-4">${getValue(row, 'Tipo')}</td>
        <td class="p-4">${getValue(row, 'Tipo mtto')}</td>
        <td class="p-4 text-right">${getValue(row, 'Hr/Km planificado')}</td>
        <td class="p-4 text-right font-medium">${formatCosto(costo)}</td>
        <td class="p-4 text-center">
          <span class="px-3 py-1 rounded-full text-xs font-medium ${badgeCls}">${estatus}</span>
        </td>
        <td class="p-4">${getValue(row, 'Taller')}</td>
        <td class="p-4 text-center">${acciones}</td>`;
      tbody.appendChild(tr);
    });
  });

  // Fila inversión total
  const totalRow = document.createElement('tr');
  totalRow.style.background = '#1e3a5f';
  totalRow.style.color = 'white';
  totalRow.className = 'font-bold';
  totalRow.innerHTML = `
    <td colspan="6" class="p-4 text-right text-sm tracking-wide">INVERSIÓN TOTAL DEL PERIODO</td>
    <td class="p-4 text-right text-lg">${formatCosto(totalCosto)}</td>
    <td colspan="3" class="p-4"></td>`;
  tbody.appendChild(totalRow);
}
