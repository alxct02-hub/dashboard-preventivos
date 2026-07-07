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
