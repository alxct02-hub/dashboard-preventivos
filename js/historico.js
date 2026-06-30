// js/historico.js — FASE 7: Historial automático de cierres mensuales

// Lee la hoja HISTORICO del workbook si existe
function cargarHistorico(workbook) {
  APP.historico = [];
  const nombre = workbook.SheetNames.find(n => n.trim().toUpperCase() === 'HISTORICO');
  if (!nombre) return;
  const sheet = workbook.Sheets[nombre];
  const rows  = XLSX.utils.sheet_to_json(sheet, { defval: '' });
  APP.historico = rows
    .map(r => ({
      Año:          String(r['Año']          ?? r['AÑO']          ?? '').trim(),
      Mes:          String(r['Mes']          ?? r['MES']          ?? '').trim(),
      Programados:  Number(r['Programados']  ?? r['PROGRAMADOS']  ?? 0),
      Ejecutados:   Number(r['Ejecutados']   ?? r['EJECUTADOS']   ?? 0),
      Tolerancia:   Number(r['Tolerancia']   ?? r['TOLERANCIA']   ?? 0),
      Pendientes:   Number(r['Pendientes']   ?? r['PENDIENTES']   ?? 0),
      Cumplimiento: parseFloat(r['Cumplimiento'] ?? r['CUMPLIMIENTO'] ?? 0),
    }))
    .filter(r => r.Año && r.Mes);
  _actualizarBadgeHistorico();
}

// Merge HISTORICO (congelado) + meses activos de DATA (calculado en vivo)
function calcularMetricasPorMesCompleto() {
  // --- Calcular desde DATA ---
  const dataMeses = {};
  APP.allData.forEach(row => {
    const key = mesAñoKey(row);
    if (!key) return;
    if (!dataMeses[key]) dataMeses[key] = { programados: 0, ejecutados: 0, tolerancia: 0, pendientes: 0, costo: 0, esHistorico: false };
    dataMeses[key].programados++;
    if (esEjecutado(row))          dataMeses[key].ejecutados++;
    else if (esEnTolerancia(row))  dataMeses[key].tolerancia++;
    else                           dataMeses[key].pendientes++;
    dataMeses[key].costo += parseCosto(row);
  });

  // --- HISTORICO sobrescribe (datos congelados son inmutables) ---
  const merged = { ...dataMeses };
  APP.historico.forEach(r => {
    const key = `${r.Mes}/${r.Año}`;
    merged[key] = {
      programados:  r.Programados,
      ejecutados:   r.Ejecutados,
      tolerancia:   r.Tolerancia,
      pendientes:   r.Pendientes,
      cumplFijo:    r.Cumplimiento, // valor fijo del momento del cierre
      costo:        dataMeses[key] ? dataMeses[key].costo : 0,
      esHistorico:  true,
    };
  });
  return merged;
}

// ─── Modal Cerrar Mes ─────────────────────────────────────────────────────────

function abrirModalCierreMes() {
  const histKeys   = new Set(APP.historico.map(r => `${r.Mes}/${r.Año}`));
  const dataMeses  = [...new Set(APP.allData.map(mesAñoKey).filter(Boolean))].sort(sortMesAño);
  const disponibles = dataMeses.filter(m => !histKeys.has(m));

  if (disponibles.length === 0) {
    mostrarToast('Todos los meses ya tienen cierre en HISTORICO.', 'info');
    return;
  }

  const sel = document.getElementById('cerrarMesSelect');
  sel.innerHTML = disponibles.map(m => `<option value="${m}">${m}</option>`).join('');
  sel.removeEventListener('change', actualizarPreviewCierre);
  sel.addEventListener('change', actualizarPreviewCierre);
  actualizarPreviewCierre();
  document.getElementById('cerrarMesModal').classList.remove('hidden');
}

function cerrarModal() {
  document.getElementById('cerrarMesModal').classList.add('hidden');
}

function actualizarPreviewCierre() {
  const mesKey = document.getElementById('cerrarMesSelect').value;
  if (!mesKey) return;
  const rows = APP.allData.filter(r => mesAñoKey(r) === mesKey);
  const prog  = rows.length;
  const ejec  = rows.filter(esEjecutado).length;
  const tol   = rows.filter(esEnTolerancia).length;
  const pend  = rows.filter(esVencido).length;
  const cumpl = pct(ejec + tol, prog);

  document.getElementById('cerrarMesPreview').innerHTML = `
    <p class="text-sm font-semibold text-gray-700 mb-3">
      Resumen de <span class="text-blue-700">${mesKey}</span> que quedará congelado:
    </p>
    <div class="grid grid-cols-2 gap-2 text-sm mb-3">
      <div class="bg-white rounded-lg p-3 text-center border">
        <p class="text-gray-400 text-xs mb-1">Programados</p>
        <p class="text-2xl font-bold text-gray-800">${prog}</p>
      </div>
      <div class="bg-white rounded-lg p-3 text-center border">
        <p class="text-gray-400 text-xs mb-1">Ejecutados</p>
        <p class="text-2xl font-bold text-green-600">${ejec}</p>
      </div>
      <div class="bg-white rounded-lg p-3 text-center border">
        <p class="text-gray-400 text-xs mb-1">Tolerancia</p>
        <p class="text-2xl font-bold text-amber-500">${tol}</p>
      </div>
      <div class="bg-white rounded-lg p-3 text-center border">
        <p class="text-gray-400 text-xs mb-1">Vencidos</p>
        <p class="text-2xl font-bold text-red-500">${pend}</p>
      </div>
    </div>
    <div class="bg-white rounded-lg p-3 text-center border">
      <p class="text-gray-400 text-xs mb-1">Cumplimiento del cierre</p>
      <p class="text-3xl font-bold" style="color:${calColor(cumpl)}">${fmtPct(cumpl)}</p>
    </div>
    <p class="text-xs text-amber-600 mt-3 flex items-start gap-1">
      <span>⚠️</span>
      <span>Una vez cerrado, estos números quedan fijos aunque los estatus cambien en el futuro.</span>
    </p>`;
}

function confirmarCierreMes() {
  const mesKey = document.getElementById('cerrarMesSelect').value;
  if (!mesKey) return;
  const [mes, año] = mesKey.split('/');

  const existe = APP.historico.findIndex(r => r.Mes === mes && r.Año === año);
  if (existe >= 0) {
    if (!confirm(`${mesKey} ya tiene un cierre registrado. ¿Deseas sobreescribirlo?`)) return;
    APP.historico.splice(existe, 1);
  }

  const rows  = APP.allData.filter(r => mesAñoKey(r) === mesKey);
  const prog  = rows.length;
  const ejec  = rows.filter(esEjecutado).length;
  const tol   = rows.filter(esEnTolerancia).length;
  const pend  = rows.filter(esVencido).length;
  const cumpl = pct(ejec + tol, prog);

  APP.historico.push({ Año: año, Mes: mes, Programados: prog, Ejecutados: ejec, Tolerancia: tol, Pendientes: pend, Cumplimiento: cumpl });
  APP.historico.sort((a, b) => sortMesAño(`${a.Mes}/${a.Año}`, `${b.Mes}/${b.Año}`));

  _persistirHistoricoEnStorage();
  cerrarModal();
  _actualizarBadgeHistorico();
  renderDashboard();
  mostrarToast(`Cierre de ${mesKey} guardado — ${APP.historico.length} mes(es) en HISTORICO.`, 'ok');
}

// ─── Exportar Excel con ambas hojas ──────────────────────────────────────────

function exportarExcelConHistorico() {
  if (APP.allData.length === 0) { alert('No hay datos para exportar.'); return; }

  const wb = XLSX.utils.book_new();

  // Hoja DATA (datos originales intactos)
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(APP.allData), 'DATA');

  // Hoja HISTORICO
  const histRows = APP.historico.length > 0
    ? APP.historico.map(r => ({ Año: r.Año, Mes: r.Mes, Programados: r.Programados, Ejecutados: r.Ejecutados, Tolerancia: r.Tolerancia, Pendientes: r.Pendientes, Cumplimiento: r.Cumplimiento }))
    : [{ Año: '', Mes: '', Programados: '', Ejecutados: '', Tolerancia: '', Pendientes: '', Cumplimiento: '' }];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(histRows), 'HISTORICO');

  const fecha = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `mantenimiento_historico_${fecha}.xlsx`);
  mostrarToast('Excel descargado con hojas DATA e HISTORICO.', 'ok');
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function _persistirHistoricoEnStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const payload = JSON.parse(raw);
    payload.historico = APP.historico;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch { /* ignorar */ }
}

function _actualizarBadgeHistorico() {
  const badge = document.getElementById('historicoBadge');
  if (!badge) return;
  if (APP.historico.length > 0) {
    badge.textContent = `${APP.historico.length} mes(es) cerrado(s)`;
    badge.classList.remove('hidden');
  } else {
    badge.classList.add('hidden');
  }
}

function mostrarToast(mensaje, tipo = 'ok') {
  const bg = tipo === 'ok' ? '#15803d' : tipo === 'info' ? '#1e3a5f' : '#b45309';
  const t  = document.createElement('div');
  t.style.cssText = `position:fixed;bottom:24px;right:24px;background:${bg};color:white;padding:12px 20px;border-radius:12px;box-shadow:0 4px 20px rgba(0,0,0,0.2);font-size:0.875rem;font-weight:500;z-index:1000;max-width:360px`;
  t.textContent = mensaje;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3500);
}
