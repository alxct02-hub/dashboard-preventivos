// js/datos.js — Carga de datos: Firestore (primario) + localStorage (caché) + Excel (admin)

// ─── Compatibilidad: esta función puede ser llamada desde versiones anteriores del código ──
// Se define globalmente para que nunca lance ReferenceError independientemente del caché del CDN.
function cargarHistorico(workbook) {
  try {
    const hojaHist = workbook && workbook.SheetNames
      ? workbook.SheetNames.find(n => n.trim().toUpperCase() === 'HISTORICO')
      : null;
    APP.historico = hojaHist
      ? XLSX.utils.sheet_to_json(workbook.Sheets[hojaHist], { defval: '' })
          .map(r => ({
            ...r,
            estado: (r.estado || r.Estado || '').toString().toLowerCase().trim(),
          }))
      : (APP.historico && APP.historico.length ? APP.historico : []);
  } catch (_) {
    APP.historico = (APP.historico && APP.historico.length) ? APP.historico : [];
  }
}

// ─── Procesamiento central de archivo Excel ───────────────────────────────────
async function procesarArchivoExcel(file) {
  if (!file) return;
  if (!file.name.match(/\.xlsx?$/i)) {
    mostrarToast('Solo se aceptan archivos .xlsx', 'warn');
    return;
  }

  _setImportProgress(true, 'Leyendo archivo...');

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = async function (ev) {
      try {
        const data     = new Uint8Array(ev.target.result);
        const workbook = XLSX.read(data, { type: 'array' });

        const dataSheet = workbook.SheetNames.find(n => n.trim().toUpperCase() === 'DATA')
                          ?? workbook.SheetNames[0];

        if (!dataSheet) {
          _setImportProgress(false);
          mostrarToast('El archivo no contiene hojas válidas.', 'error');
          resolve(); return;
        }

        const parsed = XLSX.utils.sheet_to_json(workbook.Sheets[dataSheet], { defval: '' });

        if (parsed.length === 0) {
          _setImportProgress(false);
          mostrarToast('El archivo no contiene datos en la hoja DATA.', 'warn');
          resolve(); return;
        }

        APP.allData      = parsed;
        APP.filteredData = [...APP.allData];

        // ─── Leer hoja HISTORICO del mismo workbook (meses cerrados anteriores) ──
        try {
          const hojaHist = workbook.SheetNames.find(n => n.trim().toUpperCase() === 'HISTORICO');
          APP.historico = hojaHist
            ? XLSX.utils.sheet_to_json(workbook.Sheets[hojaHist], { defval: '' })
                .map(r => ({
                  ...r,
                  // Normalizar: Excel exporta 'Estado' con mayúscula; el resto del código usa 'estado'
                  estado: (r.estado || r.Estado || '').toString().toLowerCase().trim(),
                }))
            : (APP.historico.length ? APP.historico : []);
        } catch (_) {
          APP.historico = APP.historico.length ? APP.historico : [];
        }

        _setImportProgress(true, 'Guardando en nube...');

        // — Guardar en Firestore (fuente de verdad, no bloquea si falla)
        try {
          if (typeof guardarSnapshot === 'function') {
            const snapshotId = await guardarSnapshot(APP.allData, APP.historico, file.name);
            console.info('Snapshot guardado en Firestore:', snapshotId);
          }
        } catch (fbErr) {
          console.warn('Firestore no disponible, usando localStorage:', fbErr.message);
        }

        // — Caché local (siempre se guarda)
        _saveToStorage(APP.allData, file.name);

        _setImportProgress(false);
        _showDataStatus(file.name, new Date().toLocaleString('es-MX'));
        _ocultarEstados();
        Configuracion();
        renderDashboard();
        mostrarToast(`Archivo "${file.name}" cargado correctamente.`, 'ok');

      } catch (err) {
        _setImportProgress(false);
        console.error('Error al procesar Excel:', err);
        mostrarToast('Error al procesar el archivo. Verifica que sea un .xlsx válido.', 'error');
      }
      resolve();
    };
    reader.onerror = () => {
      _setImportProgress(false);
      mostrarToast('No se pudo leer el archivo.', 'error');
      resolve();
    };
    reader.readAsArrayBuffer(file);
  });
}

// ─── Listener: selección por clic ─────────────────────────────────────────────
document.getElementById('fileInput').addEventListener('change', async function (e) {
  const file = e.target.files[0];
  await procesarArchivoExcel(file);
  this.value = ''; // permitir volver a seleccionar el mismo archivo
});

// ─── Listener: arrastrar y soltar sobre importZone ────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const zone = document.getElementById('importZone');
  if (!zone) return;

  zone.addEventListener('dragover', e => {
    e.preventDefault();
    zone.style.borderColor = '#15803d';
    zone.style.background  = '#f0fdf4';
  });
  zone.addEventListener('dragleave', () => {
    zone.style.borderColor = '';
    zone.style.background  = '';
  });
  zone.addEventListener('drop', async e => {
    e.preventDefault();
    zone.style.borderColor = '';
    zone.style.background  = '';
    const file = e.dataTransfer.files[0];
    await procesarArchivoExcel(file);
  });
});

// ─── Inicio de la app ───────────────────────────────────────────────────────[...]
async function CargaDatos() {
  _mostrarCargando(true);
  _mostrarSinDatos(false);

  // 0) Cargar estados de meses desde Firestore
  if (typeof cargarEstadosMesesAsync === 'function') {
    await cargarEstadosMesesAsync();
  }

  // 1) Intentar Firestore (fuente de verdad)
  try {
    if (typeof cargarUltimoSnapshot === 'function') {
      const snapshot = await cargarUltimoSnapshot();
      if (snapshot && snapshot.registros?.length > 0) {
        APP.allData      = snapshot.registros;
        APP.filteredData = [...APP.allData];

        if (snapshot.historicoRaw?.length > 0) {
          APP.historico = snapshot.historicoRaw;
          _actualizarBadgeHistorico();
        }

        _saveToStorage(APP.allData, snapshot.filename);   // actualizar caché local
        _mostrarCargando(false);
        _showDataStatus(snapshot.filename, snapshot.savedAt);
        Configuracion();
        renderDashboard();
        return;
      }
    }
  } catch (fbErr) {
    console.warn('Firestore no disponible, intentando localStorage:', fbErr.message);
  }

  // 2) Fallback: localStorage (offline o primer acceso antes de Firestore)
  if (_loadFromStorage()) {
    _mostrarCargando(false);
    return;
  }

  // 3) Sin datos — mostrar panel informativo
  _mostrarCargando(false);
  _mostrarSinDatos(true);
}

// ─── Limpiar caché local ───────────────────────────────────────────────────────
function clearStoredData() {
  if (!confirm('¿Deseas limpiar la caché local? Los datos en la nube se conservan.')) return;
  localStorage.removeItem(STORAGE_KEY);
  APP.allData      = [];
  APP.filteredData = [];
  APP.historico    = [];
  document.getElementById('dashboard').classList.add('hidden');
  document.getElementById('dataStatus').classList.add('hidden');
  document.getElementById('fileInput').value = '';
  _actualizarBadgeHistorico();
  _mostrarSinDatos(true);
}

// ─── Helpers privados ───────────────────────────────────────────────────────[...]

function _saveToStorage(data, filename) {
  try {
    // APP._estadosMesesCargados se pone en true solo cuando Firestore
    // entregó exitosamente los estados de meses.  Si no, recuperamos los
    // que ya estaban en localStorage para no perder cierres previos.
    let estadosMeses = APP.estadosMeses ?? {};
    if (!APP._estadosMesesCargados && Object.keys(estadosMeses).length === 0) {
      try {
        const existing = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
        if (existing.estadosMeses && Object.keys(existing.estadosMeses).length > 0) {
          estadosMeses = existing.estadosMeses;
          APP.estadosMeses = estadosMeses;   // restaurar en memoria también
        }
      } catch { /* ignore */ }
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      data, filename,
      savedAt:      new Date().toLocaleString('es-MX'),
      historico:    APP.historico,
      estadosMeses,
    }));
  } catch { /* dataset demasiado grande para localStorage */ }
}

function _loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const payload = JSON.parse(raw);
    if (!payload.data || payload.data.length === 0) return false;
    APP.allData      = payload.data;
    APP.filteredData = [...APP.allData];
    APP.historico    = payload.historico || [];

    // Restaurar estados de meses guardados localmente (cerrado/abierto)
    if (payload.estadosMeses && Object.keys(payload.estadosMeses).length > 0) {
      APP.estadosMeses = payload.estadosMeses;
      console.log('Estados de meses restaurados desde localStorage:', Object.keys(APP.estadosMeses));
    }

    console.log('Datos cargados desde localStorage:', payload.data.length, 'registros');
    _actualizarBadgeHistorico();
    _showDataStatus(payload.filename, payload.savedAt);
    Configuracion();
    renderDashboard();
    return true;
  } catch (e) {
    console.error('Error cargando desde localStorage:', e.message);
    return false;
  }
}

function _showDataStatus(filename, savedAt) {
  const isAdmin = typeof _esAdmin === 'function' ? _esAdmin() : false;
  document.getElementById('dataStatus').classList.toggle('hidden', !isAdmin);
  document.getElementById('dataStatusText').textContent =
    `Datos cargados: ${filename || 'archivo'} — guardado el ${savedAt}`;
}

function _mostrarCargando(visible) {
  document.getElementById('firestoreLoading')?.classList.toggle('hidden', !visible);
}

function _mostrarSinDatos(visible) {
  const isAdmin = typeof _esAdmin === 'function' ? _esAdmin() : false;
  document.getElementById('emptyState')?.classList.toggle('hidden', !(visible && isAdmin));
}

function _ocultarEstados() {
  _mostrarCargando(false);
  _mostrarSinDatos(false);
}

function _setImportProgress(active, msg = '') {
  const lbl = document.getElementById('importLabel');
  const fi  = document.getElementById('fileInput');
  if (lbl) lbl.textContent = active ? msg : 'Importar archivo Excel (.xlsx)';
  if (fi)  fi.disabled = active;
}

// ════════════════════════════════════════════════════════════════[...]
// FASE 6: MODAL DE EDICIÓN
// ════════════════════════════════════════════════════════════════[...]
let _idxEdicion = null;

function abrirModalEdicion(idx) {
  _idxEdicion = idx;
  const row = APP.allData[idx];
  if (!row) return;

  const campos = [
    { key: 'Mes',         label: 'Mes' },
    { key: 'Año',         label: 'Año' },
    { key: 'Estatus',     label: 'Estatus' },
    { key: 'Motivo',      label: 'Motivo' },
    { key: 'Costo',       label: 'Costo' },
    { key: 'Taller',      label: 'Taller' },
    { key: 'Hr/Km planificado', label: 'Hr/Km Planificado' },
  ];

  const html = campos.map(c => {
    const val = getValue(row, c.key) ?? '';
    return `
      <div>
        <label class="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">${c.label}</label>
        <input type="text" id="edit_${c.key.replace(/[^a-zA-Z0-9]/g, '_')}"
               value="${val}" ${c.key === 'Mes' || c.key === 'Año' ? 'readonly' : ''}
               class="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-orange-400">
      </div>`;
  }).join('');

  document.getElementById('edicionCampos').innerHTML = html;
  document.getElementById('edicionModal').classList.remove('hidden');
}

function cerrarModalEdicion() {
  document.getElementById('edicionModal').classList.add('hidden');
  _idxEdicion = null;
}

async function guardarEdicion() {
  if (!_esAdmin()) {
    mostrarToast('Solo el administrador puede editar registros.', 'warn');
    return;
  }
  if (_idxEdicion === null) return;

  const row = APP.allData[_idxEdicion];
  const cambios = { 'Estatus': null, 'Motivo': null, 'Costo': null, 'Taller': null, 'Hr/Km planificado': null };

  Object.keys(cambios).forEach(key => {
    const input = document.getElementById('edit_' + key.replace(/[^a-zA-Z0-9]/g, '_'));
    if (input) {
      cambios[key] = key === 'Costo' ? parseFloat(input.value) || 0 : input.value;
    }
  });

  // Actualizar localmente
  Object.keys(cambios).forEach(key => {
    const realKey = Object.keys(row).find(k => k.toLowerCase().trim() === key.toLowerCase()) || key;
    row[realKey] = cambios[key];
  });

  // Guardar en Firestore
  try {
    if (typeof editarRegistroFirestore === 'function') {
      await editarRegistroFirestore(_idxEdicion, row, cambios);
    }
  } catch (e) {
    console.warn('Error guardando en Firestore:', e.message);
  }

  _persistirCambiosLocales();
  cerrarModalEdicion();
  procesarDatos();
  renderDashboard();
  mostrarToast('Registro actualizado.', 'ok');
}

function _persistirCambiosLocales() {
  _saveToStorage(APP.allData, 'datos_editados');
}

// ════════════════════════════════════════════════════════════════[...]
// FASE 9: HISTORIAL POR EQUIPO — con filtros
// ════════════════════════════════════════════════════════════════[...]
let _historialFiltrado = [];

function inicializarFiltrosHistorial() {
  // ✅ CORREGIDO: IDs correctos según HTML
  const selUbicacion = document.getElementById('histFiltUbic');
  const selEquipo    = document.getElementById('histFiltEquip');
  const selMes       = document.getElementById('histFiltMes');

  if (!selUbicacion || !selEquipo || !selMes) return;

  // Ubicaciones únicas
  const ubicaciones = [...new Set(APP.allData.map(r => getValue(r, 'Ubicación')).filter(Boolean))].sort();
  selUbicacion.innerHTML = '<option value="">Todas las plantas</option>' +
    ubicaciones.map(u => `<option value="${u}">${u}</option>`).join('');

  // Equipos únicos
  const equipos = [...new Set(APP.allData.map(r => getValue(r, 'Economico') || getValue(r, 'Equipo')).filter(Boolean))].sort();
  selEquipo.innerHTML = '<option value="">Todos los equipos</option>' +
    equipos.map(e => `<option value="${e}">${e}</option>`).join('');

  // Meses únicos (solo 2026)
  const meses = [...new Set(APP.allData.map(mesAñoKey).filter(Boolean))]
    .filter(m => { const a = m.split('/')[1]; return a === '26' || a === '2026'; })
    .sort((a, b) => sortMesAño(b, a));
  selMes.innerHTML = '<option value="">Todos los meses</option>' +
    meses.map(m => `<option value="${m}">${m}</option>`).join('');
}

function filtrarHistorial() {
  // ✅ CORREGIDO: IDs correctos según HTML
  const ubicacion = document.getElementById('histFiltUbic')?.value || '';
  const equipo    = document.getElementById('histFiltEquip')?.value.trim().toLowerCase() || '';
  const mes       = document.getElementById('histFiltMes')?.value || '';

  _historialFiltrado = APP.allData.filter(r => {
    // Solo servicios EJECUTADOS
    const estatus = (getValue(r, 'Estatus') ?? '').toString().toLowerCase().trim();
    if (estatus !== 'ejecutado') return false;

    if (ubicacion && getValue(r, 'Ubicación') !== ubicacion) return false;
    if (equipo) {
      const cod = (getValue(r, 'Economico') || getValue(r, 'Equipo') || '').toString().toLowerCase();
      if (!cod.includes(equipo)) return false;
    }
    if (mes && mesAñoKey(r) !== mes) return false;
    return true;
  });

  renderHistorialAgrupado();
}

function renderHistorialAgrupado() {
  // ✅ CORREGIDO: Definir container antes de usarla
  const container = document.getElementById('historialGrupos');
  if (!container) return;

  // ✅ CORREGIDO: Usar IDs correctos
  const filtUbic  = (document.getElementById('histFiltUbic')?.value  ?? '').trim();
  const filtEquip = (document.getElementById('histFiltEquip')?.value ?? '').trim();
  const filtMes   = (document.getElementById('histFiltMes')?.value   ?? '').trim();

  // Solo servicios ejecutados
  const ejecutados = APP.allData.filter(r => {
    const estatus = (getValue(r, 'Estatus') ?? '').toString().toLowerCase().trim();
    return estatus === 'ejecutado';
  });

  // Poblar opciones de filtro con todos los valores únicos (antes de filtrar)
  const todasUbic  = [...new Set(ejecutados.map(r => getValue(r, 'Ubicación') || '—').filter(v => v !== '—'))].sort((a, b) => a.localeCompare(b, 'es'));
  const todosEquip = [...new Set(ejecutados.map(r => getValue(r, 'Economico') || getValue(r, 'Equipo') || '—').filter(v => v !== '—'))].sort((a, b) => a.localeCompare(b, 'es'));
  // mesAñoKey ya garantiza que Mes y Año existan; filtrar '/' para filas vacías
  const todosMeses = [...new Set(ejecutados.map(r => mesAñoKey(r)).filter(k => k && k !== '/'))].sort(sortMesAño);
  _poblarFiltrosHistorial(todasUbic, todosEquip, todosMeses);

  // Aplicar filtros
  const filtrados = ejecutados.filter(r => {
    const ubic  = getValue(r, 'Ubicación') || '—';
    const equip = getValue(r, 'Economico') || getValue(r, 'Equipo') || '—';
    const mes   = `${getValue(r, 'Mes')}/${getValue(r, 'Año')}`;
    if (filtUbic  && ubic  !== filtUbic)  return false;
    if (filtEquip && equip !== filtEquip) return false;
    if (filtMes   && mes   !== filtMes)   return false;
    return true;
  });

  // Agrupar por equipo
  const grupos = {};
  filtrados.forEach(r => {
    const equipo = (getValue(r, 'Economico') || getValue(r, 'Equipo') || '—').toString().trim();
    if (!grupos[equipo]) grupos[equipo] = [];
    grupos[equipo].push(r);
  });

  const equipos = Object.keys(grupos).sort((a, b) => a.localeCompare(b, 'es'));

  // ✅ CORREGIDO: Usar variable correcta badge en lugar de redefinirla
  const badge = document.getElementById('historialContador');
  if (equipos.length === 0) {
    container.innerHTML = `
      <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center text-gray-400">
        <i class="ti ti-history text-3xl mb-2 block"></i>
        No hay servicios ejecutados con los filtros aplicados.
      </div>`;
    if (badge) badge.classList.add('hidden');
    return;
  }

  if (badge) {
    const totalServicios = _historialFiltrado.length;
    badge.textContent = `${equipos.length} unidad(es), ${totalServicios} servicio(s)`;
    badge.classList.remove('hidden');
  }

  container.innerHTML = '';

  equipos.forEach(equipo => {
    const rows = grupos[equipo];

    const filas = rows.map(r => {
      const fecha  = `${getValue(r, 'Mes')}/${getValue(r, 'Año')}`;
      const ubic   = getValue(r, 'Ubicación') || '—';
      // ✅ CORREGIDO: Usar nombre correcto del campo con espacio
      const tipo   = getValue(r, 'Tipo Mtto') || getValue(r, 'Tipo mtto') || '—';
      const costo  = formatCosto(getValue(r, 'Costo'));
      const taller = getValue(r, 'Taller') || '—';
      return `
        <tr class="hover:bg-gray-50 border-b">
          <td class="p-3 text-gray-600">${fecha}</td>
          <td class="p-3 text-gray-700">${ubic}</td>
          <td class="p-3 text-gray-600">${tipo}</td>
          <td class="p-3 text-right font-medium text-gray-800">${costo}</td>
          <td class="p-3 text-gray-600">${taller}</td>
        </tr>`;
    }).join('');

    const card = document.createElement('div');
    card.className = 'bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-4';
    card.innerHTML = `
      <div class="px-5 py-4 border-b flex items-center gap-3" style="background:#f8fafc">
        <span class="font-bold text-sm px-3 py-1 rounded-lg"
              style="background:rgba(30,58,95,0.12);color:var(--navy)">${equipo}</span>
        <span class="text-xs text-gray-500">${rows.length} servicio(s) ejecutado(s)</span>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr style="background:var(--navy)">
              <th class="p-3 text-left text-white font-semibold text-xs uppercase">Fecha</th>
              <th class="p-3 text-left text-white font-semibold text-xs uppercase">Ubicación</th>
              <th class="p-3 text-left text-white font-semibold text-xs uppercase">Tipo Mtto</th>
              <th class="p-3 text-right text-white font-semibold text-xs uppercase">Costo</th>
              <th class="p-3 text-left text-white font-semibold text-xs uppercase">Taller</th>
            </tr>
          </thead>
          <tbody class="divide-y">${filas}</tbody>
        </table>
      </div>`;
    container.appendChild(card);
  });
}

// Puebla las opciones de los 3 selectores de filtro del historial
function _poblarFiltrosHistorial(ubicaciones, equipos, meses) {
  // ✅ CORREGIDO: IDs correctos según HTML
  const selUbic  = document.getElementById('histFiltUbic');
  const selEquip = document.getElementById('histFiltEquip');
  const selMes   = document.getElementById('histFiltMes');
  if (!selUbic || !selEquip || !selMes) return;

  const valUbic  = selUbic.value;
  const valEquip = selEquip.value;
  const valMes   = selMes.value;

  selUbic.innerHTML  = `<option value="">Todas las ubicaciones</option>` + ubicaciones.map(u => `<option value="${u}">${u}</option>`).join('');
  selEquip.innerHTML = `<option value="">Todos los equipos</option>`     + equipos.map(e => `<option value="${e}">${e}</option>`).join('');
  selMes.innerHTML   = `<option value="">Todos los meses</option>`       + meses.map(m => `<option value="${m}">${m}</option>`).join('');

  // Restaurar selección previa iterando opciones (seguro ante valores con caracteres especiales)
  const _restoreSelect = (sel, val) => {
    if (!val) return;
    for (const opt of sel.options) { if (opt.value === val) { sel.value = val; break; } }
  };
  _restoreSelect(selUbic,  valUbic);
  _restoreSelect(selEquip, valEquip);
  _restoreSelect(selMes,   valMes);
}

// Limpiar filtros del historial y re-renderizar
function resetFiltrosHistorial() {
  // ✅ CORREGIDO: IDs correctos según HTML
  const ids = ['histFiltUbic', 'histFiltEquip', 'histFiltMes'];
  ids.forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  // ✅ CORREGIDO: Llamar a la función correcta
  renderHistorialAgrupado();
}
