import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  limit,
  writeBatch 
} from 'firebase/firestore';
import { 
  getStorage, 
  ref, 
  uploadBytes, 
  getDownloadURL 
} from 'firebase/storage';
import { normStore } from '../utils/storage';

const CONFIG_STORAGE_KEY = 'lazuna_firebase_config';

/**
 * Get active Firebase configuration from Vite environment variables or localStorage
 */
export function getFirebaseConfig() {
  // Check localStorage first (manual override via UI)
  try {
    const saved = localStorage.getItem(CONFIG_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.projectId && parsed.apiKey) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('Failed to read firebase config from localStorage:', err);
  }

  // Fallback to Vite env variables
  return {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
    appId: import.meta.env.VITE_FIREBASE_APP_ID || ''
  };
}

/**
 * Save Firebase configuration to localStorage
 */
export function saveFirebaseConfig(config) {
  try {
    localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(config));
    return true;
  } catch (err) {
    console.error('Failed to save Firebase config:', err);
    return false;
  }
}

/**
 * Clear custom Firebase configuration from localStorage
 */
export function clearFirebaseConfig() {
  localStorage.removeItem(CONFIG_STORAGE_KEY);
}

/**
 * Check if Firebase is properly configured
 */
export function isFirebaseConfigured() {
  const cfg = getFirebaseConfig();
  return Boolean(cfg.apiKey && cfg.projectId);
}

/**
 * Check if Firebase Storage is properly configured
 */
export function isFirebaseStorageConfigured() {
  const cfg = getFirebaseConfig();
  return Boolean(cfg.apiKey && cfg.projectId && cfg.storageBucket);
}

// Global Firebase instances
let firebaseApp = null;
let firestoreDb = null;
let firebaseStorage = null;

function initFirebase() {
  const cfg = getFirebaseConfig();
  if (!cfg.apiKey || !cfg.projectId) {
    return { app: null, db: null, storage: null };
  }

  try {
    if (!getApps().length) {
      firebaseApp = initializeApp(cfg);
    } else {
      firebaseApp = getApp();
    }
    firestoreDb = getFirestore(firebaseApp);
    if (cfg.storageBucket) {
      firebaseStorage = getStorage(firebaseApp);
    }
    return { app: firebaseApp, db: firestoreDb, storage: firebaseStorage };
  } catch (err) {
    console.error('Firebase initialization error:', err);
    return { app: null, db: null, storage: null };
  }
}

export function getDb() {
  if (!firestoreDb) initFirebase();
  return firestoreDb;
}

export function getStorageInstance() {
  if (!firebaseStorage) initFirebase();
  return firebaseStorage;
}

/**
 * Subscribe to realtime stores from Firestore
 * @param {Function} onData - Callback with array of stores
 * @param {Function} onError - Callback for errors
 * @returns {Function} Unsubscribe function
 */
export function subscribeToStores(onData, onError) {
  const db = getDb();
  if (!db) {
    if (onError) onError(new Error('Firebase belum terkonfigurasi'));
    return () => {};
  }

  try {
    const storesQuery = query(collection(db, 'stores'), orderBy('no', 'asc'));
    const unsubscribe = onSnapshot(
      storesQuery,
      (snapshot) => {
        const loaded = [];
        snapshot.forEach((docSnapshot) => {
          const data = docSnapshot.data();
          loaded.push(normStore({ ...data, id: docSnapshot.id }));
        });
        const changes = snapshot.docChanges().map(change => ({
          type: change.type,
          doc: normStore({ ...change.doc.data(), id: change.doc.id }),
          hasPendingWrites: snapshot.metadata.hasPendingWrites,
          fromCache: snapshot.metadata.fromCache
        }));
        onData(loaded, { 
          source: snapshot.metadata.fromCache ? 'cache' : 'server',
          hasPendingWrites: snapshot.metadata.hasPendingWrites,
          changes
        });
      },
      (error) => {
        console.error('Firestore snapshot listener error:', error);
        if (onError) onError(error);
      }
    );
    return unsubscribe;
  } catch (err) {
    console.error('Failed to set up Firestore listener:', err);
    if (onError) onError(err);
    return () => {};
  }
}

/**
 * Save / Update a single store in Firestore
 */
export async function saveStoreToFirestore(store) {
  const db = getDb();
  if (!db) throw new Error('Firebase belum terkonfigurasi');

  const normalized = normStore({ ...store });
  const storeId = String(normalized.id);
  const storeRef = doc(db, 'stores', storeId);

  await setDoc(storeRef, normalized, { merge: true });
  return normalized;
}

/**
 * Delete a store from Firestore
 */
export async function deleteStoreFromFirestore(storeId) {
  const db = getDb();
  if (!db) throw new Error('Firebase belum terkonfigurasi');

  const storeRef = doc(db, 'stores', String(storeId));
  await deleteDoc(storeRef);
  return true;
}

/**
 * Upload an eviden image to Firebase Storage and get public URL
 */
export async function uploadEvidenImage(storeId, posmKey, file, customName) {
  const storageInst = getStorageInstance();
  if (!storageInst) throw new Error('Firebase Storage belum terkonfigurasi');

  const rawName = customName || file.name || 'image.jpg';
  const cleanName = rawName.replace(/[^a-zA-Z0-9._-]/g, '_');
  const filePath = `eviden/${storeId}/${posmKey}/${Date.now()}_${cleanName}`;
  const fileRef = ref(storageInst, filePath);

  const snapshot = await uploadBytes(fileRef, file, {
    contentType: file.type || 'image/jpeg'
  });

  const downloadUrl = await getDownloadURL(snapshot.ref);
  return downloadUrl;
}

/**
 * Seed all initial stores into Firestore
 */
export async function syncAllStoresToFirestore(stores, onProgress) {
  const db = getDb();
  if (!db) throw new Error('Firebase belum terkonfigurasi');

  const BATCH_SIZE = 450;
  let processed = 0;

  for (let i = 0; i < stores.length; i += BATCH_SIZE) {
    const chunk = stores.slice(i, i + BATCH_SIZE);
    const batch = writeBatch(db);

    for (const store of chunk) {
      const normalized = normStore({ ...store });
      const storeRef = doc(db, 'stores', String(normalized.id));
      batch.set(storeRef, normalized, { merge: true });
    }

    await batch.commit();
    processed += chunk.length;
    if (onProgress) onProgress(processed, stores.length);
  }

  return processed;
}

/**
 * Save a realtime notification event to Firestore so all connected accounts receive it
 */
export async function saveNotificationToFirestore(notif) {
  const db = getDb();
  if (!db || !notif?.id) return null;

  try {
    const notifRef = doc(db, 'notifications', String(notif.id));
    await setDoc(notifRef, notif, { merge: true });
    return notif;
  } catch (err) {
    console.warn('Failed to save notification to Firestore:', err);
    return null;
  }
}

/**
 * Subscribe to the latest notifications in Firestore across all accounts
 */
export function subscribeToNotifications(onData, onError) {
  const db = getDb();
  if (!db) return () => {};

  try {
    const notifQuery = query(
      collection(db, 'notifications'),
      orderBy('timestamp', 'desc'),
      limit(10)
    );
    const unsubscribe = onSnapshot(
      notifQuery,
      (snapshot) => {
        const list = [];
        snapshot.forEach((docSnap) => {
          list.push({ ...docSnap.data(), id: docSnap.id });
        });
        const addedChanges = snapshot
          .docChanges()
          .filter((c) => c.type === 'added' && !snapshot.metadata.hasPendingWrites)
          .map((c) => ({ ...c.doc.data(), id: c.doc.id }));

        onData(list, { addedChanges });
      },
      (error) => {
        if (onError) onError(error);
      }
    );
    return unsubscribe;
  } catch (err) {
    if (onError) onError(err);
    return () => {};
  }
}
