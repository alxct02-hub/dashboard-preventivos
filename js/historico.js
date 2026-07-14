// js/historico.js — Cierre mensual, reapertura y gestión de estados (FASE 5-8)

// ════════════════════════════════════════════════════════════════════════════
// ESTADOS DE MESES (cargados desde Firestore)
// ════════════════════════════════════════════════════════════════════════════
APP.estadosMeses = {};  // { "Junio/2026": { estado: "cerrado", ... } }

async function cargarEstadosMesesAsync() {
  // Primero intentar cargar desde localStorage (respaldo inmediato)
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const payload = JSON.parse(raw);
      if (payload.estadosMeses && Object.keys(payload.estadosMeses).length > 0) {
        APP.estadosMeses = payload.estadosMeses;
        console.log('Estados cargados desde localStorage:', Object.keys(APP.estadosMeses).length, 'meses');
      }
    }
  } catch (e) {
    console.warn('Error leyendo localStorage:', e.message);
  }

  // Luego intentar cargar desde Firestore (fuente de verdad)
  try {
    if (typeof window.cargarEstadosMeses === 'function') {
      const estadosFirestore = await window.cargarEstadosMeses();
      if (estadosFirestore && Object.keys(estadosFirestore).length > 0) {
        // Combinar: Firestore tiene prioridad, pero localStorage puede tener datos adicionales
        APP.estadosMeses = { ...APP.estadosMeses, ...estadosFirestore };
        console.log('Estados cargados desde Firestore:', Object.keys(estadosFirestore).length, 'meses');
      }
    }
  } catch (e) {
    console.warn('Error cargando desde Firestore:', e.message);
    console.log('Usando estados de localStorage como respaldo');
  }

  // Guardar en localStorage para la próxima vez
  _persistirHistoricoEnStorage();
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

  // Meses disponibles: datos actuales + meses del año 2026
  const mesesData      = [...new Set(APP.allData.map(mesAñoKey).filter(Boolean))];
  // Tomar un ejemplo de clave para detectar el formato (numérico vs texto, año corto vs largo)
  const formatExample = mesesData[0] ?? '7/26';
  const mesesReferencia = _mesesAñoActual(formatExample);

  // Solo incluir meses del año 2026 (formato 26 o 2026)
  const disponibles = [...new Set([...mesesData, ...mesesReferencia])]
    .filter(m => {
      const año = (m.split('/')[1] || '');
      return (año === '26' || año === '2026') && !histKeys.has(m);
    })
    .sort((a, b) => sortMesAño(b, a));

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
    mostrarToast('Solo el administrador puede cerrar meses. Inicia sesión primero.', 'warn');
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

  // Actualizar historico local
  const existe = APP.historico.findIndex(r => r.Mes === mes && r.Año === año);
  if (existe >= 0) APP.historico.splice(existe, 1);

  APP.historico.push({
    Año: año, Mes: mes,
    Programados: prog, Ejecutados: ejec,
    Tolerancia: tol, Pendientes: pend, Cumplimiento: cumpl,
    estado: 'cerrado',
    cerradoPor: window._fbUser?.email ?? 'admin',
  });
  APP.historico.sort((a, b) => sortMesAño(`${a.Mes}/${a.Año}`, `${b.Mes}/${b.Año}`));

  // Actualizar estado local
  APP.estadosMeses[mesKey] = {
    estado:      'cerrado',
    cerradoPor:  window._fbUser?.email ?? 'admin',
    Programados: prog, Ejecutados: ejec, Tolerancia: tol, Pendientes: pend, Cumplimiento: cumpl,
  };

  // Persistir en localStorage SIEMPRE (respaldo)
  _persistirHistoricoEnStorage();

  // Intentar persistir en Firestore
  let firestoreOk = false;
  try {
    if (typeof window.cerrarMesFirestore === 'function') {
      await window.cerrarMesFirestore(mesKey, {
        Programados: prog, Ejecutados: ejec, Tolerancia: tol, Pendientes: pend, Cumplimiento: cumpl,
      });
      firestoreOk = true;
      console.log('Mes guardado en Firestore exitosamente:', mesKey);
    }
  } catch (e) {
    console.error('Error guardando en Firestore:', e.message);
    mostrarToast('Advertencia: guardado solo localmente. ' + e.message, 'warn');
  }

  cerrarModal();
  _actualizarBadgeHistorico();
  KPIsHistoricos();

  if (firestoreOk) {
    mostrarToast(`Mes ${mesKey} cerrado y sincronizado con la nube.`, 'ok');
  } else if (typeof window.cerrarMesFirestore === 'function') {
    mostrarToast(`Mes ${mesKey} cerrado (solo local). Verifica permisos de admin.`, 'warn');
  } else {
    mostrarToast(`Mes ${mesKey} cerrado (modo offline).`, 'ok');
  }
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

  // Actualizar estado local
  APP.estadosMeses[mesKey] = {
    estado:     'abierto',
    reabrioPor: window._fbUser?.email ?? 'admin',
  };

  const [mes, año] = mesKey.split('/');
  const histIdx = APP.historico.findIndex(r => r.Mes === mes && r.Año === año);
  if (histIdx >= 0) APP.historico[histIdx].estado = 'abierto';

  // Persistir en localStorage SIEMPRE
  _persistirHistoricoEnStorage();

  // Intentar persistir en Firestore
  let firestoreOk = false;
  try {
    if (typeof window.reabrirMesFirestore === 'function') {
      await window.reabrirMesFirestore(mesKey);
      firestoreOk = true;
      console.log('Mes reabierto en Firestore:', mesKey);
    }
  } catch (e) {
    console.error('Error reabriendo en Firestore:', e.message);
  }

  _actualizarBadgeHistorico();
  KPIsHistoricos();

  if (firestoreOk) {
    mostrarToast(`Mes ${mesKey} reabierto y sincronizado con la nube.`, 'ok');
  } else {
    mostrarToast(`Mes ${mesKey} reabierto (solo local).`, 'warn');
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
    let payload = raw ? JSON.parse(raw) : {};
    payload.historico    = APP.historico ?? [];
    payload.estadosMeses = APP.estadosMeses ?? {};
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    console.log('Persistido en localStorage:', Object.keys(payload.estadosMeses).length, 'estados de meses');
  } catch (e) {
    console.error('Error persistiendo en localStorage:', e.message);
  }
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

// Genera todos los meses del año 2026 hasta el mes actual.
// Detecta automáticamente el formato usado en los datos (p. ej. "7/26" vs "Julio/2026").
function _mesesAñoActual(formatExample) {
  if (!formatExample) {
    // Si no hay datos, usar formato numérico con año corto (estándar del sistema)
    const ahora = new Date();
    const mesActual = ahora.getMonth();
    const meses = [];
    for (let i = 0; i <= mesActual; i++) meses.push(`${i + 1}/26`);
    return meses;
  }

  const [mesStr, añoStr] = formatExample.split('/');
  const isNumeric  = /^\d+$/.test((mesStr || '').trim());
  const isShortYr  = añoStr && añoStr.trim().length === 2;

  const fmtAño = () => isShortYr ? '26' : '2026';
  const fmtMes = (idx) => isNumeric ? String(idx + 1) : MESES_ORDEN[idx];

  const meses = [];
  // Solo año 2026, hasta Julio (mes 6, índice 0-6 = Enero-Julio)
  for (let i = 0; i < 7; i++) meses.push(`${fmtMes(i)}/${fmtAño()}`);
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
