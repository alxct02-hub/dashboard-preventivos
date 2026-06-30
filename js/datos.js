// js/datos.js — CargaDatos: lectura de archivo y persistencia localStorage

document.getElementById('fileInput').addEventListener('change', function (e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function (ev) {
    try {
      const data = new Uint8Array(ev.target.result);
      const workbook = XLSX.read(data, { type: 'array' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const parsed = XLSX.utils.sheet_to_json(sheet, { defval: '' });
      if (parsed.length === 0) { alert('El archivo no contiene datos.'); return; }
      APP.allData = parsed;
      saveToStorage(APP.allData, file.name);
      APP.filteredData = [...APP.allData];
      Configuracion();
      renderDashboard();
    } catch (err) {
      console.error('Error al procesar Excel:', err);
      alert('Error al procesar el archivo Excel. Verifique que sea un .xlsx válido.');
    }
  };
  reader.readAsArrayBuffer(file);
});

function CargaDatos() {
  return loadFromStorage();
}

function saveToStorage(data, filename) {
  try {
    const payload = { data, filename, savedAt: new Date().toLocaleString('es-VE') };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    showStorageStatus(filename, payload.savedAt);
  } catch { /* archivo muy grande para localStorage */ }
}

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const payload = JSON.parse(raw);
    if (!payload.data || payload.data.length === 0) return false;
    APP.allData = payload.data;
    APP.filteredData = [...APP.allData];
    showStorageStatus(payload.filename, payload.savedAt);
    Configuracion();
    renderDashboard();
    return true;
  } catch { return false; }
}

function showStorageStatus(filename, savedAt) {
  document.getElementById('dataStatus').classList.remove('hidden');
  document.getElementById('dataStatusText').textContent =
    `Datos cargados: ${filename || 'archivo'} — guardado el ${savedAt}`;
}

function clearStoredData() {
  if (!confirm('¿Deseas eliminar los datos guardados? Deberás cargar el archivo de nuevo.')) return;
  localStorage.removeItem(STORAGE_KEY);
  APP.allData = [];
  APP.filteredData = [];
  document.getElementById('dashboard').classList.add('hidden');
  document.getElementById('dataStatus').classList.add('hidden');
  document.getElementById('fileInput').value = '';
}
