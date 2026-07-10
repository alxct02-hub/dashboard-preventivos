// js/app.js — Orquestación principal del dashboard

// ─── Tabs ─────────────────────────────────────────────────────────────────────
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('tab-' + btn.dataset.tab).classList.add('active');

    if (btn.dataset.tab === 'indicador') renderIndicador();
    if (btn.dataset.tab === 'catalogo')  inicializarCatalogo();
    if (btn.dataset.tab === 'historial') renderHistorialCompleto();
  });
});

// ─── Render principal ─────────────────────────────────────────────────────────
function renderDashboard() {
  document.getElementById('dashboard').classList.remove('hidden');

  procesarDatos();   // capa de procesamiento
  KPIs();            // indicadores clave
  Graficas();        // gráficas + tendencia
  renderTable();     // tabla de detalle
  KPIsHistoricos();  // cierre mensual
  AnalisisIA();      // análisis inteligente

  if (document.getElementById('tab-indicador').classList.contains('active')) {
    renderIndicador();
  }
}

// ─── Mapeo usuario → email de Firebase (agregar más cuentas aquí si se necesita) ──
const ADMIN_USERS = {
  'admin': 'admin@concreplus.com',
};

// ─── Admin: autenticación ─────────────────────────────────────────────────────
function abrirLoginAdmin() {
  document.getElementById('loginModal').classList.remove('hidden');
  setTimeout(() => document.getElementById('adminEmailInput')?.focus(), 50);
}

function cerrarLoginAdmin() {
  document.getElementById('loginModal').classList.add('hidden');
  document.getElementById('loginError').classList.add('hidden');
  document.getElementById('adminEmailInput').value = '';
  document.getElementById('adminPwd').value = '';
}

async function submitLoginAdmin() {
  const username = document.getElementById('adminEmailInput').value.trim().toLowerCase();
  const pwd      = document.getElementById('adminPwd').value;
  const errEl    = document.getElementById('loginError');
  const btn      = document.getElementById('loginSubmitBtn');

  if (!username || !pwd) {
    errEl.textContent = 'Completa usuario y contraseña.';
    errEl.classList.remove('hidden');
    return;
  }

  // Resolver usuario → email de Firebase
  const email = ADMIN_USERS[username] ?? username;

  errEl.classList.add('hidden');
  btn.disabled    = true;
  btn.textContent = 'Verificando...';

  try {
    await loginFirebase(email, pwd);
    cerrarLoginAdmin();
  } catch {
    errEl.textContent = 'Usuario o contraseña incorrectos.';
    errEl.classList.remove('hidden');
  } finally {
    btn.disabled    = false;
    btn.textContent = 'Iniciar sesión';
  }
}

async function logoutAdmin() {
  if (!confirm('¿Cerrar sesión de administrador?')) return;
  await logoutFirebase();
}

// Callback de firebase.js — se ejecuta cuando cambia la sesión
window._onAuthChange = function (user) {
  // Usuarios anónimos (sesión automática para leer Firestore) NO son admin
  const isAdmin = user && !user.isAnonymous && !!user.email;

  const loginBtn   = document.getElementById('adminLoginBtn');
  const userInfo   = document.getElementById('adminUserInfo');
  const emailSpan  = document.getElementById('adminEmailDisplay');
  const importZone = document.getElementById('importZone');

  loginBtn?.classList.toggle('hidden', isAdmin);
  userInfo?.classList.toggle('hidden', !isAdmin);
  if (isAdmin) {
    userInfo?.classList.add('flex');
    // Mostrar el nombre de usuario (no el email interno de Firebase)
    const displayName = Object.keys(ADMIN_USERS).find(u => ADMIN_USERS[u] === user.email) ?? user.email;
    if (emailSpan) emailSpan.textContent = displayName;
    importZone?.classList.remove('hidden');
    document.getElementById('btnCerrarMes')?.classList.remove('hidden');
  } else {
    userInfo?.classList.remove('flex');
    importZone?.classList.add('hidden');
    document.getElementById('btnCerrarMes')?.classList.add('hidden');
  }

  // "Datos cargados" y "No hay datos disponibles" son solo para el administrador
  document.getElementById('dataStatus')?.classList.toggle('hidden', !isAdmin);
  const emptyState = document.getElementById('emptyState');
  if (emptyState && !isAdmin) emptyState.classList.add('hidden');
};

// Enter en el campo contraseña → enviar
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('adminPwd')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') submitLoginAdmin();
  });
  document.getElementById('adminEmailInput')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') document.getElementById('adminPwd')?.focus();
  });
});

// ─── Inicio ───────────────────────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', async () => {
  // Esperar a que Firebase Auth inicialice (sesión anónima o existente)
  if (window._authReady) await window._authReady;
  // Garantizar sincronización de UI de auth (por si onAuthStateChanged disparó antes que _onAuthChange estuviera listo)
  window._onAuthChange(window.getFirebaseUser?.() ?? window._fbUser ?? null);
  await CargaDatos();
});
