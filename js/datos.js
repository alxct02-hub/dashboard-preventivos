// js/datos.js — Carga de datos: Firestore (primario) + localStorage (caché) + Excel (admin)

// ─── Listener de importación Excel (solo visible para admin) ──────────────────
document.getElementById('fileInput').addEventListener('change', async function (e) {
  const file = e.target.files[0];
  if (!file) return;

  _setImportProgress(true, 'Leyendo archivo...');

  const reader = new FileReader();
  reader.onload = async function (ev) {
    try {
      const data     = new Uint8Array(ev.target.result);
      const workbook = XLSX.read(data, { type: 'array' });

      const dataSheet = workbook.SheetNames.find(n => n.trim().toUpperCase() === 'DATA')
                        ?? workbook.SheetNames[0];
      const parsed    = XLSX.utils.sheet_to_json(workbook.Sheets[dataSheet], { defval: '' });

      if (parsed.length === 0) {
        _setImportProgress(false);
        alert('El archivo no contiene datos en la hoja DATA.');
        return;
      }

      APP.allData      = parsed;
      APP.filteredData = [...APP.allData];
      cargarHistorico(workbook);

      _setImportProgress(true, 'Guardando en Firestore...');

      // — Guardar en Firestore (fuente de verdad)
      try {
        if (typeof guardarSnapshot === 'function') {
          const snapshotId = await guardarSnapshot(APP.allData, APP.historico, file.name);
          console.info('Snapshot guardado en Firestore:', snapshotId);
        }
      } catch (fbErr) {
        console.warn('No se pudo guardar en Firestore, usando sólo localStorage:', fbErr.message);
      }

      // — Caché local (backup para carga rápida)
      _saveToStorage(APP.allData, file.name);

      _setImportProgress(false);
      _showDataStatus(file.name, new Date().toLocaleString('es-MX'));
      _ocultarEstados();
      Configuracion();
      renderDashboard();

    } catch (err) {
      _setImportProgress(false);
      console.error('Error al procesar Excel:', err);
      alert('Error al procesar el archivo Excel. Verifique que sea un .xlsx válido.');
    }
  };
  reader.readAsArrayBuffer(file);
});

// ─── Inicio de la app ─────────────────────────────────────────────────────────
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

// ─── Limpiar caché local ──────────────────────────────────────────────────────
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

// ─── Helpers privados ─────────────────────────────────────────────────────────

function _saveToStorage(data, filename) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      data, filename,
      savedAt:   new Date().toLocaleString('es-MX'),
      historico: APP.historico,
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
    _actualizarBadgeHistorico();
    _showDataStatus(payload.filename, payload.savedAt);
    Configuracion();
    renderDashboard();
    return true;
  } catch { return false; }
}

function _showDataStatus(filename, savedAt) {
  document.getElementById('dataStatus').classList.remove('hidden');
  document.getElementById('dataStatusText').textContent =
    `Datos cargados: ${filename || 'archivo'} — guardado el ${savedAt}`;
}

function _mostrarCargando(visible) {
  document.getElementById('firestoreLoading')?.classList.toggle('hidden', !visible);
}

function _mostrarSinDatos(visible) {
  document.getElementById('emptyState')?.classList.toggle('hidden', !visible);
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

// ════════════════════════════════════════════════════════════════════════════
// FASE 6: MODAL DE EDICIÓN
// ════════════════════════════════════════════════════════════════════════════
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

// ════════════════════════════════════════════════════════════════════════════
// FASE 9: HISTORIAL POR EQUIPO — lista agrupada por equipo, solo ejecutados
// ════════════════════════════════════════════════════════════════════════════
function renderHistorialCompleto() {
  const container = document.getElementById('historialGrupos');
  if (!container) return;

  if (APP.allData.length === 0) {
    container.innerHTML = `
      <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center text-gray-400">
        <i class="ti ti-history text-3xl mb-2 block"></i>
        No hay datos cargados.
      </div>`;
    const badge = document.getElementById('historialContador');
    if (badge) badge.classList.add('hidden');
    return;
  }

  // Agrupar por equipo, solo servicios ejecutados
  const grupos = {};
  APP.allData.forEach(r => {
    const estatus = (getValue(r, 'Estatus') ?? '').toString().toLowerCase().trim();
    if (estatus !== 'ejecutado') return;
    const equipo = (getValue(r, 'Economico') || getValue(r, 'Equipo') || '—').toString().trim();
    if (!grupos[equipo]) grupos[equipo] = [];
    grupos[equipo].push(r);
  });

  const equipos = Object.keys(grupos).sort((a, b) => a.localeCompare(b, 'es'));

  const badge = document.getElementById('historialContador');
  if (equipos.length === 0) {
    container.innerHTML = `
      <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center text-gray-400">
        <i class="ti ti-history text-3xl mb-2 block"></i>
        No hay servicios ejecutados en los datos actuales.
      </div>`;
    if (badge) badge.classList.add('hidden');
    return;
  }

  if (badge) {
    badge.textContent = `${equipos.length} equipo(s)`;
    badge.classList.remove('hidden');
  }

  container.innerHTML = '';
  equipos.forEach(equipo => {
    const rows = grupos[equipo];

    const filas = rows.map(r => {
      const fecha  = `${getValue(r, 'Mes')}/${getValue(r, 'Año')}`;
      const ot     = getValue(r, 'OT') || getValue(r, 'orden') || '—';
      const tipo   = getValue(r, 'Tipo mtto') || getValue(r, 'TipoMtto') || '—';
      const costo  = formatCosto(getValue(r, 'Costo'));
      const taller = getValue(r, 'Taller') || '—';
      return `
        <tr class="hover:bg-gray-50 border-b">
          <td class="p-3 text-gray-600">${fecha}</td>
          <td class="p-3 text-gray-700">${ot}</td>
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
              <th class="p-3 text-left text-white font-semibold text-xs uppercase">OT</th>
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
