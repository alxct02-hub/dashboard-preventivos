// js/catalogo.js — CATÁLOGO DE INFORMACIÓN: CRUD genérico sobre Supabase

// ─── Configuración de secciones ──────────────────────────────────────────────
const SECCIONES_CAT = [
  {
    key:     'tipo_servicios',
    tabla:   'cat_tipo_servicios',
    titulo:  'Tipo de Servicios',
    icono:   'ti-tool',
    orden:   'orden',
    campos:  [
      { key: 'codigo',      label: 'Código',       tipo: 'text', ancho: '130px', required: true },
      { key: 'descripcion', label: 'Descripción',  tipo: 'text', flex: true,     required: true },
    ],
  },
  {
    key:     'talleres',
    tabla:   'cat_talleres',
    titulo:  'Talleres / Proveedores',
    icono:   'ti-building-warehouse',
    orden:   'orden',
    campos:  [
      { key: 'nombre', label: 'Nombre del Taller/Proveedor', tipo: 'text', flex: true, required: true },
    ],
    campoActivo: 'activo',
  },
  {
    key:     'estatus',
    tabla:   'cat_estatus',
    titulo:  'Estatus',
    icono:   'ti-flag',
    orden:   'orden',
    campos:  [
      { key: 'nombre', label: 'Nombre',   tipo: 'text',  ancho: '160px', required: true },
      { key: 'color',  label: 'Color',    tipo: 'color', ancho: '80px'  },
    ],
  },
  {
    key:     'motivos',
    tabla:   'cat_motivos',
    titulo:  'Motivos',
    icono:   'ti-message-circle',
    orden:   'orden',
    campos:  [
      { key: 'codigo',      label: 'Código',      tipo: 'text', ancho: '100px', required: true },
      { key: 'descripcion', label: 'Descripción', tipo: 'text', flex: true,     required: true },
      { key: 'tipo',        label: 'Tipo',        tipo: 'select', ancho: '140px',
        opciones: ['tolerancia', 'vencido', 'pendiente', 'general'] },
    ],
  },
  {
    key:     'plantas',
    tabla:   'cat_plantas',
    titulo:  'Plantas / Ubicaciones',
    icono:   'ti-building-factory',
    orden:   'codigo',
    campos:  [
      { key: 'codigo', label: 'Código',           tipo: 'text', ancho: '110px', required: true },
      { key: 'nombre', label: 'Nombre de Planta', tipo: 'text', flex: true,     required: true },
    ],
    campoActivo: 'activo',
  },
  {
    key:     'kpi_params',
    tabla:   'cat_kpi_params',
    titulo:  'Parámetros KPI',
    icono:   'ti-chart-dots',
    orden:   'clave',
    campos:  [
      { key: 'clave',       label: 'Parámetro',   tipo: 'text', ancho: '200px', readonly: true },
      { key: 'valor',       label: 'Valor',       tipo: 'text', ancho: '120px', required: true },
      { key: 'descripcion', label: 'Descripción', tipo: 'text', flex: true     },
    ],
    noAgregar: true, // los parámetros KPI no se crean libremente
  },
];

// Estado del catálogo
const CAT = {};
SECCIONES_CAT.forEach(s => { CAT[s.key] = []; });

// ─── Inicialización ──────────────────────────────────────────────────────────
async function inicializarCatalogo() {
  const db = getDB();
  if (!db) {
    document.getElementById('catalogoContenido').innerHTML =
      `<div class="p-8 text-center text-red-500">Error: no se pudo conectar con la base de datos.</div>`;
    return;
  }
  await cargarTodosCatalogos();
  renderCatalogo();
}

async function cargarTodosCatalogos() {
  const db = getDB();
  await Promise.all(SECCIONES_CAT.map(async sec => {
    const { data, error } = await db.from(sec.tabla).select('*').order(sec.orden);
    if (!error && data) CAT[sec.key] = data;
  }));
}

// ─── Render principal ────────────────────────────────────────────────────────
function renderCatalogo() {
  const cont = document.getElementById('catalogoContenido');
  if (!cont) return;

  cont.innerHTML = SECCIONES_CAT.map(sec => renderSeccion(sec)).join('');

  // Bind events
  SECCIONES_CAT.forEach(sec => {
    bindSeccion(sec);
  });
}

function renderSeccion(sec) {
  const items    = CAT[sec.key] || [];
  const theadCols = sec.campos.map(c =>
    `<th class="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500" style="${c.ancho ? `width:${c.ancho}` : ''}${c.flex ? ';width:auto' : ''}">${c.label}</th>`
  ).join('');

  const rows = items.map(item => renderFilaItem(sec, item)).join('');
  const sinDatos = items.length === 0
    ? `<tr><td colspan="${sec.campos.length + 1}" class="px-4 py-6 text-center text-gray-400 text-sm">Sin registros aún</td></tr>`
    : '';

  const btnAgregar = !sec.noAgregar
    ? `<button onclick="mostrarFormAgregar('${sec.key}')"
               class="flex items-center gap-1.5 bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors">
         <i class="ti ti-plus text-sm"></i> Agregar
       </button>`
    : '';

  return `
    <div class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-4" id="sec-${sec.key}">
      <div class="flex items-center justify-between px-5 py-4 bg-navy border-b border-gray-100">
        <div class="flex items-center gap-2">
          <i class="${sec.icono} text-orange text-xl"></i>
          <h3 class="font-semibold text-white">${sec.titulo}</h3>
          <span class="text-xs text-blue-200 bg-blue-900/40 px-2 py-0.5 rounded-full ml-1">${items.length}</span>
        </div>
        ${btnAgregar}
      </div>
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="bg-gray-50 border-b">
            <tr>
              ${theadCols}
              ${sec.campoActivo ? '<th class="px-3 py-3 text-center text-xs font-semibold uppercase tracking-wide text-gray-500 w-20">Activo</th>' : ''}
              <th class="px-3 py-3 w-24"></th>
            </tr>
          </thead>
          <tbody id="tbody-${sec.key}" class="divide-y divide-gray-50">
            ${sinDatos}${rows}
          </tbody>
        </table>
      </div>
      <!-- Fila de agregar (oculta) -->
      <div id="form-${sec.key}" class="hidden border-t bg-orange-50 px-4 py-4">
        ${renderFormAgregar(sec)}
      </div>
    </div>`;
}

function renderFilaItem(sec, item) {
  const celdas = sec.campos.map(c => {
    if (c.tipo === 'color') {
      return `<td class="px-3 py-3">
        <span class="inline-flex items-center gap-2">
          <span style="display:inline-block;width:20px;height:20px;border-radius:50%;background:${item[c.key] || '#ccc'}"></span>
          <code class="text-xs text-gray-500">${item[c.key] || '—'}</code>
        </span>
      </td>`;
    }
    return `<td class="px-3 py-3 text-gray-700">${item[c.key] ?? '—'}</td>`;
  }).join('');

  const celActivo = sec.campoActivo
    ? `<td class="px-3 py-3 text-center">
        <span class="inline-flex items-center justify-center w-6 h-6 rounded-full ${item[sec.campoActivo] ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}">
          <i class="ti ${item[sec.campoActivo] ? 'ti-check' : 'ti-x'} text-xs"></i>
        </span>
       </td>`
    : '';

  return `
    <tr class="hover:bg-gray-50 transition-colors" data-id="${item.id}">
      ${celdas}
      ${celActivo}
      <td class="px-3 py-3 text-right">
        <button onclick="abrirEditar('${sec.key}','${item.id}')" title="Editar"
                class="text-gray-400 hover:text-navy transition-colors mr-1">
          <i class="ti ti-pencil text-base"></i>
        </button>
        <button onclick="eliminarItem('${sec.key}','${item.id}')" title="Eliminar"
                class="text-gray-400 hover:text-red-500 transition-colors">
          <i class="ti ti-trash text-base"></i>
        </button>
      </td>
    </tr>`;
}

function renderFormAgregar(sec) {
  const inputs = sec.campos.filter(c => !c.readonly).map(c => {
    if (c.tipo === 'select') {
      return `<div class="flex flex-col gap-1" style="${c.ancho ? `width:${c.ancho}` : 'flex:1'}">
        <label class="text-xs text-gray-500">${c.label}</label>
        <select id="add-${sec.key}-${c.key}" class="border rounded-lg px-3 py-2 text-sm">
          ${(c.opciones || []).map(o => `<option value="${o}">${o}</option>`).join('')}
        </select>
      </div>`;
    }
    if (c.tipo === 'color') {
      return `<div class="flex flex-col gap-1" style="width:${c.ancho || '80px'}">
        <label class="text-xs text-gray-500">${c.label}</label>
        <input type="color" id="add-${sec.key}-${c.key}" value="#16a34a" class="h-9 w-full border rounded-lg cursor-pointer px-1">
      </div>`;
    }
    return `<div class="flex flex-col gap-1" style="${c.ancho ? `width:${c.ancho}` : ''}${c.flex ? 'flex:1' : ''}">
      <label class="text-xs text-gray-500">${c.label}${c.required ? ' *' : ''}</label>
      <input type="text" id="add-${sec.key}-${c.key}" placeholder="${c.label}"
             class="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300">
    </div>`;
  }).join('');

  const activo = sec.campoActivo
    ? `<div class="flex flex-col gap-1 items-center justify-end">
        <label class="text-xs text-gray-500">Activo</label>
        <input type="checkbox" id="add-${sec.key}-activo" checked class="w-5 h-5 accent-orange-500 cursor-pointer">
       </div>`
    : '';

  return `
    <div class="flex flex-wrap gap-3 items-end">
      ${inputs}
      ${activo}
      <div class="flex gap-2 items-end pb-0.5">
        <button onclick="guardarNuevo('${sec.key}')"
                class="bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors">
          Guardar
        </button>
        <button onclick="ocultarFormAgregar('${sec.key}')"
                class="bg-white border border-gray-300 text-gray-600 text-sm px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors">
          Cancelar
        </button>
      </div>
    </div>`;
}

// ─── Bind eventos post-render ────────────────────────────────────────────────
function bindSeccion(sec) {
  // Los event listeners están como onclick="" inline para simplicidad con DOM global
}

// ─── CRUD Funciones ──────────────────────────────────────────────────────────

function mostrarFormAgregar(key) {
  document.getElementById(`form-${key}`).classList.remove('hidden');
  // Limpiar campos
  const sec = SECCIONES_CAT.find(s => s.key === key);
  sec.campos.filter(c => !c.readonly).forEach(c => {
    const el = document.getElementById(`add-${key}-${c.key}`);
    if (el && c.tipo !== 'color') el.value = '';
  });
}

function ocultarFormAgregar(key) {
  document.getElementById(`form-${key}`).classList.add('hidden');
}

async function guardarNuevo(key) {
  const sec  = SECCIONES_CAT.find(s => s.key === key);
  const db   = getDB();
  const datos = {};

  for (const c of sec.campos.filter(f => !f.readonly)) {
    const el = document.getElementById(`add-${key}-${c.key}`);
    if (!el) continue;
    if (c.required && !el.value.trim()) {
      el.classList.add('ring-2', 'ring-red-400');
      el.focus();
      mostrarToast(`El campo "${c.label}" es obligatorio.`, 'warn');
      return;
    }
    el.classList.remove('ring-2', 'ring-red-400');
    datos[c.key] = el.value.trim();
  }

  if (sec.campoActivo) {
    const chk = document.getElementById(`add-${key}-activo`);
    if (chk) datos[sec.campoActivo] = chk.checked;
  }

  // Calcular orden si aplica
  if (sec.orden === 'orden') {
    datos.orden = (CAT[key].length ? Math.max(...CAT[key].map(x => x.orden || 0)) : 0) + 1;
  }

  const { data, error } = await db.from(sec.tabla).insert([datos]).select().maybeSingle();
  if (error) { mostrarToast('Error al guardar: ' + error.message, 'error'); return; }

  CAT[key].push(data);
  ocultarFormAgregar(key);
  refrescarTbody(sec);
  mostrarToast(`"${Object.values(datos).filter(Boolean)[0]}" agregado correctamente.`, 'ok');
}

function abrirEditar(key, id) {
  const sec  = SECCIONES_CAT.find(s => s.key === key);
  const item = CAT[key].find(i => i.id === id);
  if (!item) return;

  const fila = document.querySelector(`#tbody-${key} tr[data-id="${id}"]`);
  if (!fila) return;

  const celdas = sec.campos.map((c, idx) => {
    const val = item[c.key] ?? '';
    if (c.readonly) return `<td class="px-3 py-2 text-gray-500 text-sm">${val}</td>`;
    if (c.tipo === 'select') {
      return `<td class="px-3 py-2">
        <select class="border rounded-lg px-2 py-1.5 text-sm w-full" data-field="${c.key}">
          ${(c.opciones || []).map(o => `<option value="${o}" ${o === val ? 'selected' : ''}>${o}</option>`).join('')}
        </select></td>`;
    }
    if (c.tipo === 'color') {
      return `<td class="px-3 py-2"><input type="color" value="${val || '#cccccc'}" data-field="${c.key}" class="h-9 w-full border rounded-lg cursor-pointer px-1"></td>`;
    }
    return `<td class="px-3 py-2"><input type="text" value="${val}" data-field="${c.key}"
      class="border rounded-lg px-2 py-1.5 text-sm w-full focus:outline-none focus:ring-2 focus:ring-orange-300"></td>`;
  }).join('');

  const celActivo = sec.campoActivo
    ? `<td class="px-3 py-2 text-center"><input type="checkbox" ${item[sec.campoActivo] ? 'checked' : ''} data-field="${sec.campoActivo}" class="w-5 h-5 accent-orange-500 cursor-pointer"></td>`
    : '';

  fila.innerHTML = `
    ${celdas}
    ${celActivo}
    <td class="px-3 py-2 text-right">
      <button onclick="guardarEdicion('${key}','${id}')"
              class="text-orange-500 hover:text-orange-700 font-semibold text-sm mr-2">Guardar</button>
      <button onclick="cancelarEdicion('${key}','${id}')"
              class="text-gray-400 hover:text-gray-600 text-sm">Cancelar</button>
    </td>`;
}

async function guardarEdicion(key, id) {
  const sec  = SECCIONES_CAT.find(s => s.key === key);
  const db   = getDB();
  const fila = document.querySelector(`#tbody-${key} tr[data-id="${id}"]`);
  if (!fila) return;

  const datos = {};
  fila.querySelectorAll('[data-field]').forEach(el => {
    datos[el.dataset.field] = el.type === 'checkbox' ? el.checked : el.value.trim();
  });

  if (sec.tabla === 'cat_kpi_params') {
    datos.updated_at = new Date().toISOString();
  }

  const { error } = await db.from(sec.tabla).update(datos).eq('id', id);
  if (error) { mostrarToast('Error al actualizar: ' + error.message, 'error'); return; }

  const idx = CAT[key].findIndex(i => i.id === id);
  if (idx >= 0) CAT[key][idx] = { ...CAT[key][idx], ...datos };
  refrescarTbody(sec);
  mostrarToast('Registro actualizado.', 'ok');
}

function cancelarEdicion(key, id) {
  const sec = SECCIONES_CAT.find(s => s.key === key);
  refrescarTbody(sec);
}

async function eliminarItem(key, id) {
  const sec  = SECCIONES_CAT.find(s => s.key === key);
  const item = CAT[key].find(i => i.id === id);
  const nombre = item ? (item.nombre || item.codigo || item.clave || 'este registro') : 'este registro';

  if (!confirm(`¿Eliminar "${nombre}"? Esta acción no se puede deshacer.`)) return;

  const db = getDB();
  const { error } = await db.from(sec.tabla).delete().eq('id', id);
  if (error) { mostrarToast('Error al eliminar: ' + error.message, 'error'); return; }

  CAT[key] = CAT[key].filter(i => i.id !== id);
  refrescarTbody(sec);

  // Actualizar contador en el header de la sección
  const badge = document.querySelector(`#sec-${key} .text-blue-200`);
  if (badge) badge.textContent = CAT[key].length;

  mostrarToast(`"${nombre}" eliminado.`, 'ok');
}

// ─── Helpers de render ───────────────────────────────────────────────────────

function refrescarTbody(sec) {
  const tbody = document.getElementById(`tbody-${sec.key}`);
  if (!tbody) return;

  const items = CAT[sec.key] || [];
  tbody.innerHTML = items.length === 0
    ? `<tr><td colspan="${sec.campos.length + 1}" class="px-4 py-6 text-center text-gray-400 text-sm">Sin registros aún</td></tr>`
    : items.map(item => renderFilaItem(sec, item)).join('');

  // Actualizar badge del header
  const badge = document.querySelector(`#sec-${sec.key} .text-blue-200`);
  if (badge) badge.textContent = items.length;
}
