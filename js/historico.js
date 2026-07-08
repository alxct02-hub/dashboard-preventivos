// js/historico.js — Cierre mensual, reapertura y gestión de estados (FASE 5-8)

// ════════════════════════════════════════════════════════════════════════════
// ESTADOS DE MESES (cargados desde Firestore)
// ════════════════════════════════════════════════════════════════════════════
APP.estadosMeses = {};  // { "Junio/2026": { estado: "cerrado", ... } }

async function cargarEstadosMesesAsync() {
  try {
    if (typeof window.cargarEstadosMeses === 'function') {
      APP.estadosMeses = await window.cargarEstadosMeses();
    }
  } catch (e) {
    console.warn('No se pudieron cargar estados de meses:', e.message);
  }
}

function mesEstaCerrado(mesKey) {
  return APP.estadosMeses[mesKey]?.estado === 'cerrado';
}

// ════════════════════════════════════════════════════════════════════════════
// MODAL CERRAR MES
// ════════════════════════════════════════════════════════════════════════════
function abrirModalCierreMes() {
  if (!_esAdmin()) {
    mostrarToast('Solo el administrador puede cerrar meses.', 'warn');
    return;
  }

  // Meses ya cerrados: unir historico local + estados de Firestore
  const histKeys = new Set([
    ...APP.historico.filter(r => r.estado === 'cerrado').map(r => `${r.Mes}/${r.Año}`),
    ...Object.entries(APP.estadosMeses ?? {}).filter(([, v]) => v.estado === 'cerrado').map(([k]) => k),
  ]);

  // Meses disponibles: datos actuales + Firestore + año actual completo + año anterior
  // (garantiza que el admin siempre pueda cerrar cualquier mes pasado)
  const mesesData      = [...new Set(APP.allData.map(mesAñoKey).filter(Boolean))];
  const mesesFirestore = Object.keys(APP.estadosMeses ?? {});
  const mesesReferencia = _mesesAñoActualYAnterior();
  const disponibles    = [...new Set([...mesesData, ...mesesFirestore, ...mesesReferencia])]
    .filter(m => !histKeys.has(m))
    .sort((a, b) => sortMesAño(b, a)); // más reciente primero

  if (disponibles.length === 0) {
    mostrarToast('Todos los meses ya tienen cierre.', 'info');
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

  const rows = APP.clasificados.filter(r => mesAñoKey(r) === mesKey);
  const prog  = rows.length;
  const ejec  = rows.filter(x => x._cls.ejecutado).length;
  const tol   = rows.filter(x => x._cls.tolerancia).length;
  const pend  = rows.filter(x => x._cls.vencido).length;
  const cumpl = pct(ejec + tol, prog);

  document.getElementById('cerrarMesPreview').innerHTML = `
    <p class="text-sm font-semibold text-gray-700 mb-3">
      Resumen de <span class="font-bold" style="color:var(--navy)">${mesKey}</span>:
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
      <p class="text-gray-400 text-xs mb-1">Cumplimiento</p>
      <p class="text-3xl font-bold" style="color:${calColor(cumpl)}">${fmtPct(cumpl)}</p>
    </div>
    <p class="text-xs text-amber-600 mt-3">Una vez cerrado, los datos quedarán congelados.</p>`;
}

async function confirmarCierreMes() {
  if (!_esAdmin()) {
    mostrarToast('Solo el administrador puede cerrar meses.', 'warn');
    return;
  }
  const mesKey = document.getElementById('cerrarMesSelect').value;
  if (!mesKey) return;
  const [mes, año] = mesKey.split('/');

  const rows  = APP.clasificados.filter(r => mesAñoKey(r) === mesKey);
  const prog  = rows.length;
  const ejec  = rows.filter(x => x._cls.ejecutado).length;
  const tol   = rows.filter(x => x._cls.tolerancia).length;
  const pend  = rows.filter(x => x._cls.vencido).length;
  const cumpl = pct(ejec + tol, prog);

  const existe = APP.historico.findIndex(r => r.Mes === mes && r.Año === año);
  if (existe >= 0) APP.historico.splice(existe, 1);

  APP.historico.push({
    Año: año, Mes: mes,
    Programados: prog, Ejecutados: ejec,
    Tolerancia: tol, Pendientes: pend, Cumplimiento: cumpl,
    estado: 'cerrado',
  });
  APP.historico.sort((a, b) => sortMesAño(`${a.Mes}/${a.Año}`, `${b.Mes}/${b.Año}`));

  try {
    if (typeof cerrarMesFirestore === 'function') {
      await cerrarMesFirestore(mesKey, {
        Programados: prog, Ejecutados: ejec, Tolerancia: tol, Pendientes: pend, Cumplimiento: cumpl,
      });
      APP.estadosMeses[mesKey] = { estado: 'cerrado' };
    }
  } catch (e) {
    console.warn('Error guardando cierre en Firestore:', e.message);
  }

  _persistirHistoricoEnStorage();
  cerrarModal();
  _actualizarBadgeHistorico();
  renderDashboard();
  mostrarToast(`Mes ${mesKey} cerrado correctamente.`, 'ok');
}

// ════════════════════════════════════════════════════════════════════════════
// FASE 7: REAPERTURA DE MES
// ════════════════════════════════════════════════════════════════════════════
async function reabrirMes(mesKey) {
  if (!_esAdmin()) {
    mostrarToast('Solo el administrador puede reabrir meses.', 'warn');
    return;
  }

  if (!confirm(`¿Reabrir el mes ${mesKey}? Se permitirá editar nuevamente.`)) return;

  try {
    if (typeof reabrirMesFirestore === 'function') {
      await reabrirMesFirestore(mesKey);
    }
    APP.estadosMeses[mesKey] = { estado: 'abierto' };

    const [mes, año] = mesKey.split('/');
    const histIdx = APP.historico.findIndex(r => r.Mes === mes && r.Año === año);
    if (histIdx >= 0) APP.historico[histIdx].estado = 'abierto';

    renderDashboard();
    mostrarToast(`Mes ${mesKey} reabierto.`, 'ok');
  } catch (e) {
    mostrarToast('Error al reabrir: ' + e.message, 'error');
  }
}

// ════════════════════════════════════════════════════════════════════════════
// EXPORTAR EXCEL
// ════════════════════════════════════════════════════════════════════════════
function exportarExcelConHistorico() {
  if (APP.allData.length === 0) { alert('No hay datos para exportar.'); return; }

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(APP.allData), 'DATA');

  const histRows = APP.historico.length > 0
    ? APP.historico.map(r => ({
        Año: r.Año, Mes: r.Mes, Estado: r.estado ?? 'abierto',
        Programados: r.Programados, Ejecutados: r.Ejecutados,
        Tolerancia: r.Tolerancia, Pendientes: r.Pendientes, Cumplimiento: r.Cumplimiento,
      }))
    : [{ Año: '', Mes: '', Estado: '' }];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(histRows), 'HISTORICO');

  const fecha = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `mantenimiento_${fecha}.xlsx`);
  mostrarToast('Excel descargado.', 'ok');
}

// ════════════════════════════════════════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════════════════════════════════════════
function _persistirHistoricoEnStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const payload = JSON.parse(raw);
    payload.historico = APP.historico;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch { /* ignore */ }
}

function _actualizarBadgeHistorico() {
  const badge = document.getElementById('historicoBadge');
  if (!badge) return;
  const cerrados = APP.historico.filter(r => r.estado === 'cerrado').length;
  if (cerrados > 0) {
    badge.textContent = `${cerrados} mes(es) cerrado(s)`;
    badge.classList.remove('hidden');
  } else {
    badge.classList.add('hidden');
  }
}

// Genera todos los meses del año actual (hasta el mes en curso) + año anterior completo
function _mesesAñoActualYAnterior() {
  const ahora      = new Date();
  const añoActual  = ahora.getFullYear();
  const mesActual  = ahora.getMonth(); // 0-based
  const meses = [];
  // Año anterior completo
  MESES_ORDEN.forEach(m => meses.push(`${m}/${añoActual - 1}`));
  // Año actual hasta el mes en curso (inclusive)
  MESES_ORDEN.slice(0, mesActual + 1).forEach(m => meses.push(`${m}/${añoActual}`));
  return meses;
}

function _esAdmin() {
  const user = window.getFirebaseUser?.() ?? window._fbUser;
  return user && !user.isAnonymous && !!user.email;
}

function mostrarToast(mensaje, tipo = 'ok') {
  const bg = tipo === 'ok' ? '#15803d' : tipo === 'info' ? '#1e3a5f' : tipo === 'warn' ? '#b45309' : '#dc2626';
  const t = document.createElement('div');
  t.style.cssText = `position:fixed;bottom:24px;right:24px;background:${bg};color:white;padding:12px 20px;border-radius:12px;box-shadow:0 4px 20px rgba(0,0,0,0.2);font-size:0.875rem;font-weight:500;z-index:1000;max-width:360px`;
  t.textContent = mensaje;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3500);
}
