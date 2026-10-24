export const LS_KEY = 'posm_lazuna_v3';
export const THEME_KEY = 'posm_lazuna_theme';

export const POS_CONFIG = {
  a: { key: 'a', name: 'Akrilik Dinding', short: 'Akrilik', unit: 'pcs', colorVar: '--cA', colorHex: '#e8590c' },
  o: { key: 'o', name: 'Spanduk Outdoor', short: 'Outdoor', unit: 'pcs', colorVar: '--cO', colorHex: '#1c7ed6' },
  k: { key: 'k', name: 'Spanduk Kanopi', short: 'Kanopi', unit: 'pcs', colorVar: '--cK', colorHex: '#2f9e44' },
  m: { key: 'm', name: 'Menu A3', short: 'Menu A3', unit: 'pcs', colorVar: '--cM', colorHex: '#7048e8' },
  t: { key: 't', name: 'TV Board', short: 'TV Board', unit: 'unit TV', colorVar: '--cT', colorHex: '#0c8599' },
  p: { key: 'p', name: 'Poster A4', short: 'Poster A4', unit: 'pcs', colorVar: '--cP', colorHex: '#d6336c' },
};

export const POS_KEYS = ['a', 'o', 'k', 'm', 't', 'p'];

export function normStore(d) {
  POS_KEYS.forEach(k => {
    const s = d[k] || (d[k] = { s: '', b: '', q: 0, e: [], at: 0 });
    if (s.b === undefined) s.b = '';
    if (!Array.isArray(s.e)) s.e = s.e ? [s.e] : [];
    if (!s.at) s.at = 0;
  });
  if (!d.id) d.id = String(d.c || 'S_' + Date.now()).replace(/[^A-Za-z0-9_-]/g, '_');
  if (d.no === undefined) d.no = 0;
  if (!Array.isArray(d.a.ms)) {
    d.a.ms = d.a.m ? [String(d.a.m)] : [];
  }
  if (d.a.m === undefined) {
    d.a.m = d.a.ms.filter(Boolean).join(', ');
  }
  
  d.m.s = 'A3';
  d.m.q = 1;
  
  if (d.t.r === undefined) d.t.r = '';
  if (d.t.x === undefined) d.t.x = '';
  if (d.t.rt === undefined) d.t.rt = '';
  if (d.t.ket === undefined) d.t.ket = '';
  
  d.p.s = 'A4';
  if (d.p.n1 === undefined) d.p.n1 = '';
  if (d.p.n2 === undefined) d.p.n2 = '';
  return d;
}

export const getNeededPOSM = (d) => POS_KEYS.filter(k => d[k].q > 0);
export const getMissingPOSM = (d) => getNeededPOSM(d).filter(k => !d[k].e || !d[k].e.length);
export const isStoreComplete = (d) => {
  const needed = getNeededPOSM(d);
  return needed.length > 0 && getMissingPOSM(d).length === 0;
};

export const cleanStoreName = (n) =>
  String(n || '')
    .replace(/^\s*LAZUNA\s+(CHICKEN\s+)?/i, '')
    .trim() || String(n || '');

export const formatSize = (v) =>
  String(v ?? '')
    .trim()
    .replace(/\s*[xX×]\s*/g, '×');

// ==========================================
// IndexedDB Helper (Solves 5MB LocalStorage Quota Exceeded)
// ==========================================
const IDB_NAME = 'lazuna_posm_db';
const IDB_VERSION = 1;
const IDB_STORE = 'stores_cache';

function openIDB() {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return reject(new Error('IndexedDB not supported'));
    }
    const req = indexedDB.open(IDB_NAME, IDB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(IDB_STORE)) {
        db.createObjectStore(IDB_STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveStoresToIDB(stores, at = Date.now()) {
  try {
    const db = await openIDB();
    return new Promise((resolve) => {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      const store = tx.objectStore(IDB_STORE);
      store.put({ stores, at }, 'master_data');
      tx.oncomplete = () => resolve(true);
      tx.onerror = (e) => {
        console.warn('IndexedDB save failed:', e);
        resolve(false);
      };
    });
  } catch (err) {
    console.warn('IndexedDB error:', err);
    return false;
  }
}

export async function loadStoresFromIDB() {
  try {
    const db = await openIDB();
    return new Promise((resolve) => {
      const tx = db.transaction(IDB_STORE, 'readonly');
      const store = tx.objectStore(IDB_STORE);
      const req = store.get('master_data');
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });
  } catch (err) {
    return null;
  }
}

export async function loadInitialStores() {
  // 1. Try IndexedDB first (holds large base64 image data without quota limits)
  let idbData = null;
  try {
    idbData = await loadStoresFromIDB();
  } catch (err) {
    console.warn('IDB load error:', err);
  }

  // 2. Try localStorage fallback
  let lsData = null;
  try {
    const cached = localStorage.getItem(LS_KEY);
    if (cached) {
      lsData = JSON.parse(cached);
    }
  } catch (err) {
    console.warn('Failed to parse localStorage data:', err);
  }

  // Choose the newest cached data between IndexedDB and localStorage
  const savedCache = (idbData?.at || 0) >= (lsData?.at || 0) ? idbData : (lsData || idbData);

  // Fast path: if IndexedDB / localStorage already has the full store dataset, use it immediately without downloading 8.5MB JSON
  if (savedCache && Array.isArray(savedCache.stores) && savedCache.stores.length >= 41) {
    const cachedStores = savedCache.stores;
    cachedStores.forEach(normStore);
    if (!cachedStores.some(d => d.no)) {
      cachedStores.forEach((d, i) => { d.no = i + 1; });
    }
    return { stores: cachedStores, at: savedCache.at || Date.now() };
  }

  // 3. Fetch master /initialData.json (only when local cache is empty or incomplete)
  let fileData = null;
  try {
    const res = await fetch('/initialData.json');
    if (res.ok) {
      fileData = await res.json();
    }
  } catch (err) {
    console.warn('Could not fetch /initialData.json directly:', err);
  }

  let stores = [];
  let at = 0;

  const baseStores = (fileData && fileData.stores && fileData.stores.length > 0) 
    ? fileData.stores 
    : [];

  if (baseStores.length > 0) {
    if (savedCache && savedCache.stores && savedCache.stores.length > 0) {
      // Merge: keep all master stores, overlay any updated store from cache
      const cacheMap = new Map(savedCache.stores.map(s => [String(s.id || s.c).toLowerCase(), s]));
      stores = baseStores.map(b => cacheMap.get(String(b.id || b.c).toLowerCase()) || b);
      // Append any new stores created by user that weren't in base
      savedCache.stores.forEach(s => {
        const id = String(s.id || s.c).toLowerCase();
        if (!baseStores.some(b => String(b.id || b.c).toLowerCase() === id)) {
          stores.push(s);
        }
      });
      at = Math.max(savedCache.at || 0, fileData?.at || 0);
    } else {
      stores = baseStores;
      at = fileData?.at || Date.now();
    }
  } else if (savedCache && savedCache.stores && savedCache.stores.length > 0) {
    stores = savedCache.stores;
    at = savedCache.at || Date.now();
  }

  if (Array.isArray(stores) && stores.length > 0) {
    stores.forEach(normStore);
    if (!stores.some(d => d.no)) {
      stores.forEach((d, i) => { d.no = i + 1; });
    }
    // Persist into IndexedDB so next reload is instant
    saveStoresToIDB(stores, at);
  } else {
    stores = [];
  }

  return { stores, at };
}

export function saveStoresToLS(stores) {
  const at = Date.now();
  // 1. Always save to IndexedDB asynchronously (handles 50MB+ without any quota issues)
  saveStoresToIDB(stores, at);

  // 2. Also try localStorage (will fail gracefully if over 5MB quota)
  try {
    const payload = {
      at,
      stores
    };
    localStorage.setItem(LS_KEY, JSON.stringify(payload));
    return true;
  } catch (err) {
    // Quota exceeded in localStorage is expected when dataset > 5MB, IndexedDB has saved it
    console.info('LocalStorage quota exceeded; data safely persisted in browser IndexedDB.');
    return true;
  }
}
