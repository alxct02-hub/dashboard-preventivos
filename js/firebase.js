// js/firebase.js — Firebase: configuración, Firestore y Auth
// type="module" → importa SDK modular; expone todo en window.* para scripts globales.

import { initializeApp }
  from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import {
  getFirestore, collection, addDoc, query,
  orderBy, limit, getDocs, serverTimestamp,
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import {
  getAuth, signInWithEmailAndPassword, signInAnonymously,
  signOut, onAuthStateChanged,
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';

// ─── Config ───────────────────────────────────────────────────────────────────
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

// ─── Firestore: guardar snapshot ──────────────────────────────────────────────
// Guarda todos los registros del Excel en Firestore.
// Si el dataset es grande se parte en chunks de 400 filas para evitar el límite de 1MB.
async function _guardarSnapshot(registros, historicoRaw, filename) {
  const CHUNK = 400;
  const chunks = [];
  for (let i = 0; i < registros.length; i += CHUNK) {
    chunks.push(registros.slice(i, i + CHUNK));
  }

  // Documento principal (metadatos + primer chunk)
  const docRef = await addDoc(collection(db, 'mant_snapshots'), {
    filename,
    savedAt:      serverTimestamp(),
    uploadedBy:   auth.currentUser?.email ?? 'anon',
    totalRows:    registros.length,
    chunks:       chunks.length,
    historicoRaw: historicoRaw ?? [],
    registros:    chunks[0] ?? [],          // primer chunk siempre en el doc raíz
  });

  // Chunks adicionales como sub-colección
  for (let i = 1; i < chunks.length; i++) {
    await addDoc(collection(db, 'mant_snapshots', docRef.id, 'chunks'), {
      index: i, registros: chunks[i],
    });
  }

  return docRef.id;
}

// ─── Firestore: cargar último snapshot ────────────────────────────────────────
async function _cargarUltimoSnapshot() {
  const q    = query(collection(db, 'mant_snapshots'), orderBy('savedAt', 'desc'), limit(1));
  const snap = await getDocs(q);
  if (snap.empty) return null;

  const doc  = snap.docs[0];
  const data = doc.data();
  let registros = data.registros ?? [];

  // Recuperar chunks adicionales si los hay
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

// ─── Auth ─────────────────────────────────────────────────────────────────────
async function _login(email, password) {
  return signInWithEmailAndPassword(auth, email, password);
}

async function _logout() {
  return signOut(auth);
}

// _authReady: Promise que se resuelve cuando la sesión está inicializada.
// DOMContentLoaded en app.js la awaita antes de llamar CargaDatos.
window._authReady = new Promise(resolve => {
  onAuthStateChanged(auth, async user => {
    // Si no hay usuario activo, iniciar sesión anónima para poder leer Firestore
    if (!user) {
      try { await signInAnonymously(auth); }
      catch (e) { console.warn('Sesión anónima no disponible:', e.message); }
    }
    window._fbUser = auth.currentUser ?? null;
    if (typeof window._onAuthChange === 'function') window._onAuthChange(auth.currentUser);
    resolve(auth.currentUser);
  });
});

// ─── Exponer en window ────────────────────────────────────────────────────────
window.FIREBASE_APP          = app;
window.FIREBASE_DB           = db;
window.FIREBASE_AUTH         = auth;
window.guardarSnapshot       = _guardarSnapshot;
window.cargarUltimoSnapshot  = _cargarUltimoSnapshot;
window.loginFirebase         = _login;
window.logoutFirebase        = _logout;
window.getFirebaseUser       = () => auth.currentUser;

console.info(
  '%cFirebase conectado ✓', 'color:#e8870f;font-weight:bold;font-size:13px',
  `| proyecto: ${firebaseConfig.projectId}`,
);
