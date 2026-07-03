// js/catalogo.js — CATÁLOGO DE INFORMACIÓN: diseño grid 7 secciones

// ─── Configuración de secciones ──────────────────────────────────────────────
const SECCIONES_CAT = [
  {
    key: 'tipo_servicios', tabla: 'cat_tipo_servicios', titulo: 'Catálogo de Tipo de Servicios',
    icono: 'ti-tool', orden: 'orden',
    campos: [
      { key: 'codigo',      label: 'Código',       tipo: 'text', ancho: '100px', required: true },
      { key: 'descripcion', label: 'Descripción',  tipo: 'text', flex: true,     required: true },
    ],
    nota: '* Puede agregar, editar o eliminar tipos de servicios según sea necesario.',
  },
  {
    key: 'talleres', tabla: 'cat_talleres', titulo: 'Catálogo de Talleres',
    icono: 'ti-building-warehouse', orden: 'orden',
    campos: [
      { key: 'nombre', label: 'Taller / Proveedor', tipo: 'text', flex: true, required: true },
    ],
    campoActivo: 'activo',
    nota: '* Agregue talleres nuevos cuando sea necesario.',
  },
  {
    key: 'estatus', tabla: 'cat_estatus', titulo: 'Catálogo de Estatus',
    icono: 'ti-flag', orden: 'orden',
    campos: [
      { key: 'nombre',      label: 'Estatus',      tipo: 'text',  ancho: '120px', required: true },
      { key: 'color',       label: 'Color',        tipo: 'color', ancho: '70px'  },
      { key: 'descripcion', label: 'Descripción',  tipo: 'text',  flex: true     },
    ],
    nota: '* Puede agregar, editar o eliminar estatus.',
  },
  {
    key: 'motivos', tabla: 'cat_motivos', titulo: 'Catálogo de Motivos',
    icono: 'ti-message-circle', orden: 'orden',
    campos: [
      { key: 'codigo',      label: 'Código',      tipo: 'text', ancho: '80px',  required: true },
      { key: 'descripcion', label: 'Motivo',      tipo: 'text', ancho: '130px', required: true },
      { key: 'detalle',     label: 'Descripción', tipo: 'text', flex: true     },
    ],
    nota: '* Agregue motivos adicionales según sea necesario.',
  },
  {
    key: 'plantas', tabla: 'cat_plantas', titulo: 'Catálogo de Plantas',
    icono: 'ti-building-factory', orden: 'codigo',
    campos: [
      { key: 'codigo', label: 'Código',           tipo: 'text', ancho: '120px', required: true },
      { key: 'nombre', label: 'Nombre de Planta', tipo: 'text', flex: true,     required: true },
    ],
    campoActivo: 'activo',
    nota: '* Agregue nuevas plantas cuando sea necesario.',
  },
  {
    key: 'kpi_params', tabla: 'cat_kpi_params', titulo: 'Parámetros KPI',
    icono: 'ti-chart-dots', orden: 'clave',
    campos: [
      { key: 'clave',       label: 'Parámetro',   tipo: 'text', ancho: '200px', readonly: true },
      { key: 'valor',       label: 'Valor',       tipo: 'text', ancho: '160px', required: true },
      { key: 'descripcion', label: 'Descripción', tipo: 'text', flex: true     },
    ],
    noAgregar: true,
    nota: '* Parámetros utilizados para el cálculo de tolerancias y KPIs.',
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
      `<div class="p-8 text-center text-red-500 font-medium">
         <i class="ti ti-alert-triangle text-3xl mb-2 block"></i>
         No se pudo conectar con la base de datos.
       </div>`;
    return;
  }
  document.getElementById('catalogoContenido').innerHTML = `
    <div class="p-12 text-center text-gray-400">
      <i class="ti ti-loader-2 text-4xl animate-spin mb-3 block"></i>
      <p>Cargando catálogos...</p>
    </div>`;
  await cargarTodosCatalogos();
  renderCatalogo();
}

async function cargarTodosCatalogos() {
  const db = getDB();
  await Promise.all(SECCIONES_CAT.map(async sec => {
    const { data, error } = await db.from(sec.tabla).select('*').order(sec.orden);
    if (!error && data) CAT[sec.key] = data;
    else if (error) console.error(`Error cargando ${sec.tabla}:`, error.message);
  }));
}

// ─── Render principal (grid 7 secciones) ─────────────────────────────────────
function renderCatalogo() {
  const cont = document.getElementById('catalogoContenido');
  if (!cont) return;

  const s = {};
  SECCIONES_CAT.forEach(sec => { s[sec.key] = sec; });

  cont.innerHTML = `
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">

      <!-- 1. Tipo Servicios — ocupa 2 filas (card más alto) -->
      <div class="lg:row-span-2">
        ${renderTarjeta(s['tipo_servicios'], 1)}
      </div>

      <!-- 2. Talleres -->
      <div>${renderTarjeta(s['talleres'], 2)}</div>

      <!-- 3. Estatus -->
      <div>${renderTarjeta(s['estatus'], 3)}</div>

      <!-- 4. Motivos -->
      <div>${renderTarjeta(s['motivos'], 4)}</div>

      <!-- 5. Colores del Dashboard (derivado de cat_estatus) -->
      <div>${renderTarjetaColores(5)}</div>

      <!-- 6. Plantas -->
      <div>${renderTarjeta(s['plantas'], 6)}</div>

      <!-- 7. KPI Params — span 2 columnas -->
      <div class="lg:col-span-2">${renderTarjetaKPI(s['kpi_params'], 7)}</div>

    </div>
    <div class="mt-4 p-4 rounded-xl bg-navy/5 border border-navy/10 flex items-center gap-3">
      <i class="ti ti-shield-check text-xl flex-shrink-0" style="color:var(--navy)"></i>
      <p class="text-sm text-gray-600">La información de estos catálogos se utiliza en todo el sistema para el cálculo de KPIs y análisis de mantenimientos.</p>
    </div>`;
}

// ─── Tarjeta genérica ─────────────────────────────────────────────────────────
function renderTarjeta(sec, num) {
  const items = CAT[sec.key] || [];

  const btnAgregar = !sec.noAgregar
    ? `<button onclick="mostrarFormAgregar('${sec.key}')"
               class="flex items-center gap-1 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors shadow-sm"
               style="background:var(--orange)"
               onmouseover="this.style.opacity='.85'" onmouseout="this.style.opacity='1'">
         <i class="ti ti-plus text-sm"></i> Agregar
       </button>`
    : '';

  const theadCols = sec.campos.map(c =>
    `<th class="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 whitespace-nowrap"
         style="${c.ancho ? `width:${c.ancho};` : ''}${c.flex ? 'min-width:100px;' : ''}">${c.label}</th>`
  ).join('');

  const rows = items.length
    ? items.map(item => renderFilaItem(sec, item)).join('')
    : `<tr><td colspan="${sec.campos.length + (sec.campoActivo ? 2 : 1)}"
              class="px-4 py-5 text-center text-gray-400 text-sm italic">Sin registros aún</td></tr>`;

  return `
    <div class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden" id="sec-${sec.key}">
      <div class="flex items-center justify-between px-4 py-3" style="background:var(--navy)">
        <div class="flex items-center gap-2.5">
          <span class="w-6 h-6 rounded-full text-white text-xs font-bold flex items-center justify-center flex-shrink-0"
                style="background:var(--orange)">${num}</span>
          <span class="font-semibold text-white text-sm">${sec.titulo}</span>
          <span class="text-xs px-2 py-0.5 rounded-full font-medium"
                style="color:#93c5fd;background:rgba(255,255,255,0.1)">${items.length}</span>
        </div>
        ${btnAgregar}
      </div>
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="bg-gray-50 border-b border-gray-100">
            <tr>
              ${theadCols}
              ${sec.campoActivo ? '<th class="px-3 py-2 text-center text-xs font-semibold uppercase tracking-wide text-gray-500 w-16">Activo</th>' : ''}
              <th class="px-3 py-2 w-16"></th>
            </tr>
          </thead>
          <tbody id="tbody-${sec.key}" class="divide-y divide-gray-50">
            ${rows}
          </tbody>
        </table>
      </div>
      <div id="form-${sec.key}" class="hidden border-t px-4 py-3" style="background:#fffbf5">
        ${renderFormAgregar(sec)}
      </div>
      ${sec.nota ? `<p class="text-xs text-gray-400 px-4 py-2 border-t border-gray-50">${sec.nota}</p>` : ''}
    </div>`;
}

// ─── Tarjeta: Colores del Dashboard ──────────────────────────────────────────
function renderTarjetaColores(num) {
  const items = (CAT['estatus'] || []).filter(i => i.color);
  const filas = items.map(i => `
    <tr class="border-b border-gray-50 last:border-0">
      <td class="px-4 py-2.5">
        <div class="flex items-center gap-2">
          <span class="w-4 h-4 rounded-full flex-shrink-0 border border-black/10" style="background:${i.color}"></span>
          <span class="text-sm text-gray-700">${i.nombre}</span>
        </div>
      </td>
      <td class="px-4 py-2.5">
        <div class="flex items-center gap-2">
          <span class="inline-block w-12 h-6 rounded border border-gray-200" style="background:${i.color}"></span>
          <code class="text-xs text-gray-500 font-mono">${i.color.toUpperCase()}</code>
        </div>
      </td>
    </tr>`).join('') || `<tr><td colspan="2" class="px-4 py-5 text-center text-gray-400 text-sm italic">Sin colores configurados</td></tr>`;

  return `
    <div class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden" id="sec-colores">
      <div class="flex items-center gap-2.5 px-4 py-3" style="background:var(--navy)">
        <span class="w-6 h-6 rounded-full text-white text-xs font-bold flex items-center justify-center flex-shrink-0"
              style="background:var(--orange)">${num}</span>
        <span class="font-semibold text-white text-sm">Colores del Dashboard</span>
      </div>
      <table class="w-full text-sm">
        <thead class="bg-gray-50 border-b border-gray-100">
          <tr>
            <th class="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Estado</th>
            <th class="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Color</th>
          </tr>
        </thead>
        <tbody>${filas}</tbody>
      </table>
      <p class="text-xs text-gray-400 px-4 py-2 border-t border-gray-50">* Los colores se aplican en los indicadores y gráficos. Edítalos en la sección Estatus.</p>
    </div>`;
}

// ─── Tarjeta: KPI Params (con iconos) ────────────────────────────────────────
const KPI_ICONS = {
  'Meta Cumplimiento': 'ti-target',
  'Margen Horas':      'ti-clock',
  'Margen Km':         'ti-truck',
  'Margen m³':         'ti-cube',
};

function renderTarjetaKPI(sec, num) {
  const items = CAT[sec.key] || [];
  const rows = items.length
    ? items.map(item => renderFilaKPI(item)).join('')
    : `<tr><td colspan="4" class="px-4 py-5 text-center text-gray-400 text-sm italic">Sin registros</td></tr>`;

  return `
    <div class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden" id="sec-${sec.key}">
      <div class="flex items-center gap-2.5 px-4 py-3" style="background:var(--navy)">
        <span class="w-6 h-6 rounded-full text-white text-xs font-bold flex items-center justify-center flex-shrink-0"
              style="background:var(--orange)">${num}</span>
        <span class="font-semibold text-white text-sm">${sec.titulo}</span>
        <span class="text-xs px-2 py-0.5 rounded-full font-medium"
              style="color:#93c5fd;background:rgba(255,255,255,0.1)">${items.length}</span>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="bg-gray-50 border-b border-gray-100">
            <tr>
              <th class="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Parámetro</th>
              <th class="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 w-40">Valor</th>
              <th class="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Descripción</th>
              <th class="px-4 py-2 w-12"></th>
            </tr>
          </thead>
          <tbody id="tbody-${sec.key}" class="divide-y divide-gray-50">
            ${rows}
          </tbody>
        </table>
      </div>
      <p class="text-xs text-gray-400 px-4 py-2 border-t border-gray-50">${sec.nota}</p>
    </div>`;
}

function renderFilaKPI(item) {
  const icono = KPI_ICONS[item.clave] || 'ti-adjustments';
  return `
    <tr class="hover:bg-gray-50 transition-colors" data-id="${item.id}">
      <td class="px-4 py-3">
        <div class="flex items-center gap-2">
          <i class="${icono} text-base flex-shrink-0" style="color:var(--orange)"></i>
          <span class="text-sm font-medium text-gray-700">${item.clave ?? '—'}</span>
        </div>
      </td>
      <td class="px-4 py-3 font-semibold text-sm" style="color:var(--navy)">${item.valor ?? '—'}</td>
      <td class="px-4 py-3 text-gray-500 text-sm">${item.descripcion ?? ''}</td>
      <td class="px-4 py-3 text-right">
        <button onclick="abrirEditar('kpi_params','${item.id}')" title="Editar"
                class="text-gray-400 hover:text-orange-500 transition-colors">
          <i class="ti ti-pencil text-sm"></i>
        </button>
      </td>
    </tr>`;
}

// ─── Fila de tabla genérica ──────────────────────────────────────────────────
function renderFilaItem(sec, item) {
  const celdas = sec.campos.map(c => {
    if (c.tipo === 'color') {
      const hex = item[c.key] || '#cccccc';
      return `<td class="px-3 py-2.5">
        <div class="flex items-center gap-2">
          <span class="w-5 h-5 rounded-full flex-shrink-0 border border-black/10" style="background:${hex}"></span>
          <code class="text-xs text-gray-500">${hex}</code>
        </div>
      </td>`;
    }
    const val = item[c.key] ?? '';

    if (sec.key === 'talleres' && c.key === 'nombre') {
      return `<td class="px-3 py-2.5">
        <div class="flex items-center gap-2">
          <i class="ti ti-building-warehouse text-base flex-shrink-0" style="color:var(--orange)"></i>
          <span class="text-gray-700 text-sm">${val}</span>
        </div>
      </td>`;
    }
    if (sec.key === 'plantas' && c.key === 'nombre') {
      return `<td class="px-3 py-2.5">
        <div class="flex items-center gap-2">
          <i class="ti ti-building-factory text-base flex-shrink-0" style="color:var(--orange)"></i>
          <span class="text-gray-700 text-sm">${val}</span>
        </div>
      </td>`;
    }
    if (c.key === 'codigo') {
      return `<td class="px-3 py-2.5">
        <span class="inline-block px-2 py-0.5 rounded font-mono font-bold text-xs"
              style="color:var(--orange);background:#fef3e2">${val}</span>
      </td>`;
    }
    return `<td class="px-3 py-2.5 text-gray-700 text-sm">${val || '—'}</td>`;
  }).join('');

  const celActivo = sec.campoActivo
    ? `<td class="px-3 py-2.5 text-center">
        <span class="inline-flex items-center justify-center w-5 h-5 rounded-full
              ${item[sec.campoActivo] ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}">
          <i class="ti ${item[sec.campoActivo] ? 'ti-check' : 'ti-x'} text-xs"></i>
        </span>
       </td>`
    : '';

  return `
    <tr class="hover:bg-gray-50 transition-colors" data-id="${item.id}">
      ${celdas}
      ${celActivo}
      <td class="px-3 py-2.5 text-right">
        <button onclick="abrirEditar('${sec.key}','${item.id}')" title="Editar"
                class="text-gray-400 hover:text-orange-500 transition-colors mr-1">
          <i class="ti ti-pencil text-sm"></i>
        </button>
        <button onclick="eliminarItem('${sec.key}','${item.id}')" title="Eliminar"
                class="text-gray-400 hover:text-red-500 transition-colors">
          <i class="ti ti-trash text-sm"></i>
        </button>
      </td>
    </tr>`;
}

// ─── Formulario de agregar ───────────────────────────────────────────────────
function renderFormAgregar(sec) {
  const inputs = sec.campos.filter(c => !c.readonly).map(c => {
    const style = c.ancho ? `width:${c.ancho}` : c.flex ? 'flex:1;min-width:100px' : '';
    if (c.tipo === 'color') {
      return `<div class="flex flex-col gap-1" style="width:${c.ancho || '70px'}">
        <label class="text-xs text-gray-500">${c.label}</label>
        <input type="color" id="add-${sec.key}-${c.key}" value="#16a34a"
               class="h-9 w-full border rounded-lg cursor-pointer px-1">
      </div>`;
    }
    return `<div class="flex flex-col gap-1" style="${style}">
      <label class="text-xs text-gray-500">${c.label}${c.required ? ' *' : ''}</label>
      <input type="text" id="add-${sec.key}-${c.key}" placeholder="${c.label}"
             class="border rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300">
    </div>`;
  }).join('');

  const activo = sec.campoActivo
    ? `<div class="flex flex-col gap-1 items-center justify-end">
        <label class="text-xs text-gray-500">Activo</label>
        <input type="checkbox" id="add-${sec.key}-activo" checked class="w-5 h-5 accent-orange-500 cursor-pointer">
       </div>`
    : '';

  return `
    <div class="flex flex-wrap gap-2 items-end">
      ${inputs}
      ${activo}
      <div class="flex gap-2 items-end">
        <button onclick="guardarNuevo('${sec.key}')"
                class="text-white text-sm font-semibold px-4 py-1.5 rounded-lg transition-colors"
                style="background:var(--orange)"
                onmouseover="this.style.opacity='.85'" onmouseout="this.style.opacity='1'">
          Guardar
        </button>
        <button onclick="ocultarFormAgregar('${sec.key}')"
                class="bg-white border border-gray-300 text-gray-600 text-sm px-4 py-1.5 rounded-lg hover:bg-gray-50 transition-colors">
          Cancelar
        </button>
      </div>
    </div>`;
}

// ─── CRUD ─────────────────────────────────────────────────────────────────────

function mostrarFormAgregar(key) {
  document.getElementById(`form-${key}`).classList.remove('hidden');
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
  const sec = SECCIONES_CAT.find(s => s.key === key);
  const db  = getDB();
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

  if (sec.orden === 'orden') {
    datos.orden = (CAT[key].length ? Math.max(...CAT[key].map(x => x.orden || 0)) : 0) + 1;
  }

  const { data, error } = await db.from(sec.tabla).insert([datos]).select().maybeSingle();
  if (error) { mostrarToast('Error al guardar: ' + error.message, 'error'); return; }

  CAT[key].push(data);
  ocultarFormAgregar(key);
  refrescarTbody(sec);
  mostrarToast('Registro agregado correctamente.', 'ok');
}

function abrirEditar(key, id) {
  const sec  = SECCIONES_CAT.find(s => s.key === key);
  const item = CAT[key].find(i => i.id === id);
  if (!item) return;

  const fila = document.querySelector(`#tbody-${key} tr[data-id="${id}"]`);
  if (!fila) return;

  const celdas = sec.campos.map(c => {
    const val = item[c.key] ?? '';
    if (c.readonly) return `<td class="px-3 py-2 text-gray-500 text-sm">${val}</td>`;
    if (c.tipo === 'color') {
      return `<td class="px-3 py-2">
        <input type="color" value="${val || '#cccccc'}" data-field="${c.key}" class="h-8 w-14 border rounded cursor-pointer">
      </td>`;
    }
    return `<td class="px-3 py-2">
      <input type="text" value="${val}" data-field="${c.key}"
             class="border rounded-lg px-2 py-1 text-sm w-full focus:outline-none focus:ring-2 focus:ring-orange-300">
    </td>`;
  }).join('');

  const celActivo = sec.campoActivo
    ? `<td class="px-3 py-2 text-center">
        <input type="checkbox" ${item[sec.campoActivo] ? 'checked' : ''} data-field="${sec.campoActivo}"
               class="w-5 h-5 accent-orange-500 cursor-pointer">
       </td>`
    : '';

  fila.innerHTML = `
    ${celdas}
    ${celActivo}
    <td class="px-3 py-2 text-right whitespace-nowrap">
      <button onclick="guardarEdicion('${key}','${id}')"
              class="font-semibold text-xs mr-1" style="color:var(--orange)">Guardar</button>
      <button onclick="cancelarEdicion('${key}','${id}')"
              class="text-gray-400 hover:text-gray-600 text-xs">Cancelar</button>
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

  const { error } = await db.from(sec.tabla).update(datos).eq('id', id);
  if (error) { mostrarToast('Error al actualizar: ' + error.message, 'error'); return; }

  const idx = CAT[key].findIndex(i => i.id === id);
  if (idx >= 0) CAT[key][idx] = { ...CAT[key][idx], ...datos };

  refrescarTbody(sec);
  if (key === 'estatus') refrescarColores();
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
  if (key === 'estatus') refrescarColores();
  mostrarToast(`"${nombre}" eliminado.`, 'ok');
}

// ─── Helpers de render ────────────────────────────────────────────────────────

function refrescarTbody(sec) {
  const tbody = document.getElementById(`tbody-${sec.key}`);
  if (!tbody) return;
  const items = CAT[sec.key] || [];

  if (sec.key === 'kpi_params') {
    tbody.innerHTML = items.length
      ? items.map(renderFilaKPI).join('')
      : `<tr><td colspan="4" class="px-4 py-5 text-center text-gray-400 text-sm italic">Sin registros</td></tr>`;
    return;
  }

  tbody.innerHTML = items.length
    ? items.map(item => renderFilaItem(sec, item)).join('')
    : `<tr><td colspan="${sec.campos.length + (sec.campoActivo ? 2 : 1)}"
              class="px-4 py-5 text-center text-gray-400 text-sm italic">Sin registros aún</td></tr>`;

  const badge = document.querySelector(`#sec-${sec.key} [style*="rgba(255,255,255,0.1)"]`);
  if (badge) badge.textContent = items.length;
}

function refrescarColores() {
  const tbody = document.querySelector('#sec-colores tbody');
  if (!tbody) return;
  const items = (CAT['estatus'] || []).filter(i => i.color);
  tbody.innerHTML = items.map(i => `
    <tr class="border-b border-gray-50 last:border-0">
      <td class="px-4 py-2.5">
        <div class="flex items-center gap-2">
          <span class="w-4 h-4 rounded-full flex-shrink-0 border border-black/10" style="background:${i.color}"></span>
          <span class="text-sm text-gray-700">${i.nombre}</span>
        </div>
      </td>
      <td class="px-4 py-2.5">
        <div class="flex items-center gap-2">
          <span class="inline-block w-12 h-6 rounded border border-gray-200" style="background:${i.color}"></span>
          <code class="text-xs text-gray-500 font-mono">${i.color.toUpperCase()}</code>
        </div>
      </td>
    </tr>`).join('') || `<tr><td colspan="2" class="px-4 py-5 text-center text-gray-400 text-sm italic">Sin estatus configurados</td></tr>`;
}
