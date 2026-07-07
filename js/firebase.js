// js/firebase.js — Firebase: Firestore + Auth (FASE 5-9)
// Funciones para cierres, edición, reapertura, bitácora e historial.

import { initializeApp }
  from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import {
  getFirestore, collection, doc, addDoc, setDoc, getDoc, getDocs,
  query, orderBy, limit, where, serverTimestamp, updateDoc,
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import {
  getAuth, signInWithEmailAndPassword, signInAnonymously,
  signOut, onAuthStateChanged,
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';

// ════════════════════════════════════════════════════════════════════════════
// CONFIGURACIÓN
// ════════════════════════════════════════════════════════════════════════════
const firebaseConfig = {
  apiKey:            'AIzaSyBM-4TSdDFbR-SmNMLwJc5cc4WjZbtqPCU',
  authDomain:        'dashboard-mantenimiento-78a06.firebaseapp.com',
  projectId:         'dashboard-mantenimiento-78a06',
  storageBucket:     'dashboard-mantenimiento-78a06.firebasestorage.app',
  messagingSenderId: '35605800106',
  appId:             '1:35605800106:web:01eead6cd18645e0b7dcd3',
};

const app  = initializeApp(firebaseConfig);
const db   = getFirestore(app);
const auth = getAuth(app);

window._authReady = new Promise(resolve => {
  onAuthStateChanged(auth, async user => {
    if (!user) {
      try { await signInAnonymously(auth); }
      catch (e) { console.warn('Sesión anónima no disponible:', e.message); }
    }
    window._fbUser = auth.currentUser ?? null;
    if (typeof window._onAuthChange === 'function') window._onAuthChange(auth.currentUser);
    resolve(auth.currentUser);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// SNAPSHOTS (carga inicial de datos)
// ════════════════════════════════════════════════════════════════════════════
async function _guardarSnapshot(registros, historicoRaw, filename) {
  const CHUNK = 400;
  const chunks = [];
  for (let i = 0; i < registros.length; i += CHUNK) {
    chunks.push(registros.slice(i, i + CHUNK));
  }

  const docRef = await addDoc(collection(db, 'mant_snapshots'), {
    filename,
    savedAt:      serverTimestamp(),
    uploadedBy:   auth.currentUser?.email ?? 'anon',
    totalRows:    registros.length,
    chunks:       chunks.length,
    historicoRaw: historicoRaw ?? [],
    registros:    chunks[0] ?? [],
  });

  for (let i = 1; i < chunks.length; i++) {
    await addDoc(collection(db, 'mant_snapshots', docRef.id, 'chunks'), {
      index: i, registros: chunks[i],
    });
  }

  return docRef.id;
}

async function _cargarUltimoSnapshot() {
  const q    = query(collection(db, 'mant_snapshots'), orderBy('savedAt', 'desc'), limit(1));
  const snap = await getDocs(q);
  if (snap.empty) return null;

  const doc  = snap.docs[0];
  const data = doc.data();
  let registros = data.registros ?? [];

  if ((data.chunks ?? 1) > 1) {
    const chunksSnap = await getDocs(
      query(collection(db, 'mant_snapshots', doc.id, 'chunks'), orderBy('index'))
    );
    chunksSnap.forEach(c => { registros = registros.concat(c.data().registros ?? []); });
  }

  return {
    id:           doc.id,
    filename:     data.filename ?? 'datos',
    savedAt:      data.savedAt?.toDate?.()?.toLocaleString('es-MX') ?? '—',
    uploadedBy:   data.uploadedBy ?? '',
    registros,
    historicoRaw: data.historicoRaw ?? [],
  };
}

// ════════════════════════════════════════════════════════════════════════════
// FASE 5: ESTADOS DE MESES (abierto/cerrado)
// ════════════════════════════════════════════════════════════════════════════
async function _cargarEstadosMeses() {
  const snap = await getDocs(collection(db, 'meses'));
  const estados = {};
  snap.forEach(d => { estados[d.id] = d.data(); });
  return estados;
}

async function _cerrarMes(mesKey, datosCierre) {
  await setDoc(doc(db, 'meses', mesKey), {
    estado:      'cerrado',
    cerradoPor:  auth.currentUser?.email ?? 'admin',
    cerradoEn:   serverTimestamp(),
    ...datosCierre,
  }, { merge: true });

  await _registrarBitacora('cierre', `Cerró el mes ${mesKey}`, { mesKey });
}

async function _reabrirMes(mesKey) {
  await updateDoc(doc(db, 'meses', mesKey), {
    estado:      'abierto',
    reabrioPor:  auth.currentUser?.email ?? 'admin',
    reabrioEn:   serverTimestamp(),
  });

  await _registrarBitacora('reapertura', `Reabrió el mes ${mesKey}`, { mesKey });
}

// ════════════════════════════════════════════════════════════════════════════
// FASE 6: EDICIÓN DE REGISTROS
// ════════════════════════════════════════════════════════════════════════════
// Guarda un snapshot actualizado con el registro editado
async function _editarRegistro(index, datosOriginales, datosNuevos) {
  // Cargar snapshot actual
  const snapshot = await _cargarUltimoSnapshot();
  if (!snapshot) throw new Error('No hay datos para editar');

  const registros = snapshot.registros;
  if (index < 0 || index >= registros.length) throw new Error('Índice inválido');

  // Actualizar el registro
  registros[index] = { ...registros[index], ...datosNuevos };

  // Crear nuevo snapshot con los datos actualizados
  const nuevoId = await _guardarSnapshot(registros, APP.historico, snapshot.filename + ' (editado)');

  // Registrar en bitácora
  const equipo = datosNuevos['Equipo'] ?? datosOriginales['Equipo'] ?? 'N/A';
  await _registrarBitacora('edicion', `Editó registro de ${equipo}`, {
    index,
    cambios: datosNuevos,
    original: datosOriginales,
  });

  return nuevoId;
}

// ════════════════════════════════════════════════════════════════════════════
// FASE 8: BITÁCORA
// ════════════════════════════════════════════════════════════════════════════
async function _registrarBitacora(tipo, descripcion, detalles = {}) {
  await addDoc(collection(db, 'bitacora'), {
    usuario:     auth.currentUser?.email ?? 'anon',
    tipo,
    descripcion,
    detalles,
    fecha:       serverTimestamp(),
  });
}

async function _cargarBitacora(limite = 50) {
  const q = query(collection(db, 'bitacora'), orderBy('fecha', 'desc'), limit(limite));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

// ════════════════════════════════════════════════════════════════════════════
// FASE 9: HISTORIAL POR EQUIPO
// ════════════════════════════════════════════════════════════════════════════
async function _buscarHistorialEquipo(codigoEquipo) {
  // Buscar en todos los snapshots
  const snap = await getDocs(query(collection(db, 'mant_snapshots'), orderBy('savedAt', 'desc'), limit(10)));

  const resultados = [];
  for (const docSnap of snap.docs) {
    const data = docSnap.data();
    let registros = data.registros ?? [];

    // Cargar chunks adicionales
    if ((data.chunks ?? 1) > 1) {
      const chunksSnap = await getDocs(
        query(collection(db, 'mant_snapshots', docSnap.id, 'chunks'), orderBy('index'))
      );
      chunksSnap.forEach(c => { registros = registros.concat(c.data().registros ?? []); });
    }

    // Filtrar por equipo
    const matches = registros.filter(r => {
      const equipo = (r['Equipo'] ?? r['equipo'] ?? '').toString().toLowerCase();
      return equipo.includes(codigoEquipo.toLowerCase());
    });

    resultados.push(...matches);
  }

  // Eliminar duplicados (mismo OT o mismo servicio en diferentes snapshots)
  const unicos = [];
  const vistos = new Set();
  for (const r of resultados) {
    const key = r['OT'] ?? r['orden'] ?? r['Equipo'] + r['Mes'] + r['Tipo Mtto'];
    if (!vistos.has(JSON.stringify(key))) {
      vistos.add(JSON.stringify(key));
      unicos.push(r);
    }
  }

  return unicos;
}

// ════════════════════════════════════════════════════════════════════════════
// AUTH
// ════════════════════════════════════════════════════════════════════════════
async function _login(email, password) {
  return signInWithEmailAndPassword(auth, email, password);
}

async function _logout() {
  return signOut(auth);
}

// ════════════════════════════════════════════════════════════════════════════
// EXPONER EN WINDOW
// ════════════════════════════════════════════════════════════════════════════
window.FIREBASE_APP          = app;
window.FIREBASE_DB           = db;
window.FIREBASE_AUTH         = auth;

window.guardarSnapshot       = _guardarSnapshot;
window.cargarUltimoSnapshot  = _cargarUltimoSnapshot;
window.cargarEstadosMeses    = _cargarEstadosMeses;
window.cerrarMesFirestore    = _cerrarMes;
window.reabrirMesFirestore    = _reabrirMes;
window.editarRegistroFirestore = _editarRegistro;
window.cargarBitacora        = _cargarBitacora;
window.buscarHistorialEquipo = _buscarHistorialEquipo;

window.loginFirebase         = _login;
window.logoutFirebase        = _logout;
window.getFirebaseUser       = () => auth.currentUser;

console.info(
  '%cFirebase conectado ✓', 'color:#e8870f;font-weight:bold;font-size:13px',
  `| proyecto: ${firebaseConfig.projectId}`,
);
