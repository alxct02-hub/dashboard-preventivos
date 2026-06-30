// js/estado.js — Estado global compartido entre módulos
const APP = {
  allData: [],
  filteredData: [],
  charts: {},
  indMesValue: '',
  metricas: {},
  metricasPorMes: {},
  historico: [],       // filas congeladas de la hoja HISTORICO
};

const STORAGE_KEY = 'mant_preventivo_data';

const MESES_ORDEN = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];
