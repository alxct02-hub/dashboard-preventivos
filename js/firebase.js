// js/firebase.js — Configuración e inicialización de Firebase
// Este archivo usa type="module" para importar el SDK modular de Firebase.
// Los servicios se exponen en window.FIREBASE_* para que el resto del código
// (scripts no-modulares con onclick="...") pueda acceder a ellos.

import { initializeApp }   from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { getAuth }          from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';

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

// Exponer en window para que los scripts no-modulares puedan acceder
window.FIREBASE_APP  = app;
window.FIREBASE_DB   = db;
window.FIREBASE_AUTH = auth;

console.info('%cFirebase conectado ✓', 'color:#e8870f;font-weight:bold;font-size:13px',
  `| proyecto: ${firebaseConfig.projectId}`);
