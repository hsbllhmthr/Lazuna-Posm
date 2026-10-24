import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';
import OverviewSection from './components/OverviewSection';
import WorkManagementTable from './components/WorkManagementTable';
import ChecklistView from './components/ChecklistView';
import TableView from './components/TableView';
import CardGridView from './components/CardGridView';
import EditStoreModal from './components/EditStoreModal';
import GalleryModal from './components/GalleryModal';
import FirebaseConfigModal from './components/FirebaseConfigModal';
import SubmissionLinksModal from './components/SubmissionLinksModal';
import Toast from './components/Toast';
import LoginPage from './components/LoginPage';
import { Button } from '@/components/ui/button';
import { 
  loadInitialStores, 
  saveStoresToLS, 
  getMissingPOSM, 
  isStoreComplete,
  POS_KEYS,
  LS_KEY
} from './utils/storage';
import { 
  isFirebaseConfigured, 
  subscribeToStores, 
  saveStoreToFirestore, 
  deleteStoreFromFirestore,
  syncAllStoresToFirestore,
  saveNotificationToFirestore,
  subscribeToNotifications
} from './lib/firebase';
import { exportToCSV, exportToHTML, importDataFile } from './utils/exportImport';
import { canUserPerformCRUD, findUserByEmailOrUsername } from './utils/auth';
import { Loader2, Heart } from 'lucide-react';

const REALTIME_CHANNEL_NAME = 'lazuna_posm_realtime_v1';
const SYNC_PING_KEY = 'lazuna_posm_sync_ping';

export default function App() {
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = sessionStorage.getItem('lazuna_posm_user') || localStorage.getItem('lazuna_posm_user');
      if (!saved) return null;
      const parsed = JSON.parse(saved);
      // Sinkronisasi otomatis data akun dengan master roles terbaru
      const matched = findUserByEmailOrUsername(parsed.email);
      if (matched) {
        const synced = { ...parsed, name: matched.name, role: matched.role };
        sessionStorage.setItem('lazuna_posm_user', JSON.stringify(synced));
        localStorage.setItem('lazuna_posm_user', JSON.stringify(synced));
        return synced;
      }
      sessionStorage.setItem('lazuna_posm_user', JSON.stringify(parsed));
      return parsed;
    } catch (e) {
      return null;
    }
  });
  const isSuperadmin = canUserPerformCRUD(currentUser);
  const currentUserRef = useRef(currentUser);
  useEffect(() => {
    currentUserRef.current = currentUser;
  }, [currentUser]);
  const [stores, setStores] = useState([]);
  const storesRef = useRef([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isRealtime, setIsRealtime] = useState(() => isFirebaseConfigured());
  const [isFirebaseModalOpen, setIsFirebaseModalOpen] = useState(false);
  const [isLinksModalOpen, setIsLinksModalOpen] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    storesRef.current = stores;
  }, [stores]);

  // Filter and view states - default 'summary' matching reference dashboard
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('');
  const [viewMode, setViewMode] = useState('summary');
  const [sortOrder, setSortOrder] = useState('');

  // Modals and toast states
  const [editModal, setEditModal] = useState({
    isOpen: false,
    store: null,
    isNew: false,
    focusKey: null,
  });
  const [galleryModal, setGalleryModal] = useState({
    isOpen: false,
    photos: [],
    currentIndex: 0,
  });
  const [toast, setToast] = useState(null);

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type });
  }, []);

  // Master Realtime Notifications state (shared across accounts, with per-account readBy/clearedBy)
  const [rawNotifications, setRawNotifications] = useState(() => {
    try {
      const saved = localStorage.getItem('lazuna_notifications');
      return saved ? JSON.parse(saved).slice(0, 15) : [];
    } catch (e) {
      return [];
    }
  });
  const seenNotifIdsRef = useRef(new Set());
  const broadcastChannelRef = useRef(null);

  // Merge helper for notifications list sorted newest-first
  const mergeNotifications = useCallback((incomingList) => {
    setRawNotifications((prev) => {
      const map = new Map();
      [...incomingList, ...prev].forEach((item) => {
        if (!item || !item.id) return;
        const existing = map.get(item.id);
        if (existing) {
          const mergedReadBy = Array.from(new Set([...(existing.readBy || []), ...(item.readBy || [])]));
          const mergedClearedBy = Array.from(new Set([...(existing.clearedBy || []), ...(item.clearedBy || [])]));
          map.set(item.id, { ...existing, ...item, readBy: mergedReadBy, clearedBy: mergedClearedBy });
        } else {
          map.set(item.id, {
            ...item,
            readBy: Array.isArray(item.readBy) ? item.readBy : [],
            clearedBy: Array.isArray(item.clearedBy) ? item.clearedBy : []
          });
        }
      });
      const merged = Array.from(map.values())
        .sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0))
        .slice(0, 15);
      try {
        localStorage.setItem('lazuna_notifications', JSON.stringify(merged));
      } catch (e) {}
      return merged;
    });
  }, []);

  // Compute per-account notifications so Administrator & Superadmin each have independent unread states
  const notifications = useMemo(() => {
    const userEmail = (currentUser?.email || '').toLowerCase().trim();
    return rawNotifications
      .filter((n) => !userEmail || !(Array.isArray(n.clearedBy) && n.clearedBy.includes(userEmail)))
      .map((n) => ({
        ...n,
        read: userEmail && Array.isArray(n.readBy) ? n.readBy.includes(userEmail) : Boolean(n.read)
      }))
      .slice(0, 5);
  }, [rawNotifications, currentUser]);

  const broadcastEvent = useCallback((payload) => {
    try {
      if (broadcastChannelRef.current) {
        broadcastChannelRef.current.postMessage(payload);
      }
    } catch (e) {}
    try {
      localStorage.setItem(SYNC_PING_KEY, JSON.stringify({ ...payload, _ts: Date.now() }));
    } catch (e) {}
    try {
      fetch('/api/realtime', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }).catch(() => {});
    } catch (e) {}
  }, []);

  const addNotification = useCallback(({ title, message, type = 'update', syncPayload = null, broadcast = true }) => {
    const actor = currentUserRef.current;
    const newNotif = {
      id: Date.now().toString() + '-' + Math.random().toString(36).substring(2, 6),
      title,
      message,
      type,
      actorEmail: (actor?.email || '').toLowerCase(),
      actorName: actor?.name || 'Superadmin',
      timestamp: new Date().toISOString(),
      read: false,
      readBy: [],
      clearedBy: []
    };

    seenNotifIdsRef.current.add(newNotif.id);
    mergeNotifications([newNotif]);

    if (broadcast) {
      broadcastEvent({
        eventType: 'NOTIF_AND_SYNC',
        notification: newNotif,
        syncPayload
      });

      if (isFirebaseConfigured()) {
        saveNotificationToFirestore(newNotif).catch(() => {});
      }
    }
    return newNotif;
  }, [mergeNotifications, broadcastEvent]);

  const handleMarkAllNotificationsAsRead = useCallback(() => {
    const userEmail = (currentUserRef.current?.email || '').toLowerCase().trim();
    setRawNotifications((prev) => {
      const updated = prev.map((n) => {
        const readBy = Array.isArray(n.readBy) ? n.readBy : [];
        const nextReadBy = userEmail && !readBy.includes(userEmail) ? [...readBy, userEmail] : readBy;
        return {
          ...n,
          read: !userEmail ? true : n.read,
          readBy: nextReadBy
        };
      });
      try {
        localStorage.setItem('lazuna_notifications', JSON.stringify(updated));
      } catch (e) {}
      try {
        fetch('/api/realtime', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ eventType: 'SYNC_NOTIFS_ONLY', notifications: updated })
        }).catch(() => {});
      } catch (e) {}
      if (isFirebaseConfigured()) {
        updated.slice(0, 5).forEach((n) => saveNotificationToFirestore(n).catch(() => {}));
      }
      return updated;
    });
  }, []);

  const handleMarkNotificationAsRead = useCallback((id) => {
    const userEmail = (currentUserRef.current?.email || '').toLowerCase().trim();
    setRawNotifications((prev) => {
      const updated = prev.map((n) => {
        if (n.id !== id) return n;
        const readBy = Array.isArray(n.readBy) ? n.readBy : [];
        const nextReadBy = userEmail && !readBy.includes(userEmail) ? [...readBy, userEmail] : readBy;
        const updatedItem = { ...n, read: !userEmail ? true : n.read, readBy: nextReadBy };
        if (isFirebaseConfigured()) {
          saveNotificationToFirestore(updatedItem).catch(() => {});
        }
        return updatedItem;
      });
      try {
        localStorage.setItem('lazuna_notifications', JSON.stringify(updated));
      } catch (e) {}
      try {
        fetch('/api/realtime', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ eventType: 'SYNC_NOTIFS_ONLY', notifications: updated })
        }).catch(() => {});
      } catch (e) {}
      return updated;
    });
  }, []);

  const handleClearNotifications = useCallback(() => {
    const userEmail = (currentUserRef.current?.email || '').toLowerCase().trim();
    if (!userEmail) {
      setRawNotifications([]);
      return;
    }
    setRawNotifications((prev) => {
      const updated = prev.map((n) => {
        const clearedBy = Array.isArray(n.clearedBy) ? n.clearedBy : [];
        const nextClearedBy = !clearedBy.includes(userEmail) ? [...clearedBy, userEmail] : clearedBy;
        const updatedItem = { ...n, clearedBy: nextClearedBy };
        if (isFirebaseConfigured()) {
          saveNotificationToFirestore(updatedItem).catch(() => {});
        }
        return updatedItem;
      });
      try {
        localStorage.setItem('lazuna_notifications', JSON.stringify(updated));
      } catch (e) {}
      try {
        fetch('/api/realtime', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ eventType: 'SYNC_NOTIFS_ONLY', notifications: updated })
        }).catch(() => {});
      } catch (e) {}
      return updated;
    });
  }, []);

  // Light theme active
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', 'light');
    document.documentElement.classList.remove('dark');
  }, []);

  // Cross-tab, Incognito, & Multi-Browser realtime listener (SSE + BroadcastChannel + Storage event)
  useEffect(() => {
    let eventSource = null;

    const applyServerStoresState = (updatedStoresMap, deletedIds) => {
      if (!updatedStoresMap && !deletedIds) return;
      setStores((prev) => {
        if (!prev || prev.length === 0) return prev;
        const delSet = new Set((deletedIds || []).map((id) => String(id).toLowerCase()));
        let next = prev
          .filter((s) => !delSet.has(String(s.id || s.c).toLowerCase()))
          .map((s) => {
            const key = String(s.id || s.c).toLowerCase();
            return updatedStoresMap && updatedStoresMap[key] ? updatedStoresMap[key] : s;
          });

        if (updatedStoresMap) {
          Object.entries(updatedStoresMap).forEach(([key, storeObj]) => {
            if (!delSet.has(key) && !next.some((s) => String(s.id || s.c).toLowerCase() === key)) {
              next.push(storeObj);
            }
          });
        }
        storesRef.current = next;
        return next;
      });
    };

    const handleIncomingSync = async (data) => {
      if (!data) return;

      if (data.eventType === 'INIT' && data.state) {
        const srvNotifs = data.state.notifications || [];
        if (srvNotifs.length > 0) {
          srvNotifs.forEach((n) => seenNotifIdsRef.current.add(n.id));
          mergeNotifications(srvNotifs);
        }
        // Also push any existing local notifications up to the shared server so Incognito / other browsers get them immediately
        try {
          const localSaved = localStorage.getItem('lazuna_notifications');
          if (localSaved) {
            const parsedLocal = JSON.parse(localSaved);
            if (Array.isArray(parsedLocal) && parsedLocal.length > 0) {
              fetch('/api/realtime', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ eventType: 'SYNC_NOTIFS_ONLY', notifications: parsedLocal })
              }).catch(() => {});
            }
          }
        } catch (e) {}

        applyServerStoresState(data.state.updatedStores, data.state.deletedStoreIds);
        return;
      }

      if (data.eventType === 'SYNC_NOTIFS_ONLY' && Array.isArray(data.notifications)) {
        mergeNotifications(data.notifications);
        return;
      }

      // Apply immediate store change if included in payload
      if (data.syncPayload) {
        const { action, store, storeId } = data.syncPayload;
        if (action === 'save' && store) {
          setStores((prev) => {
            const targetKey = String(store.id || store.c).toLowerCase();
            const exists = prev.some((s) => String(s.id || s.c).toLowerCase() === targetKey);
            const next = exists
              ? prev.map((s) => (String(s.id || s.c).toLowerCase() === targetKey ? store : s))
              : [...prev, store];
            storesRef.current = next;
            return next;
          });
        } else if (action === 'delete' && storeId) {
          const targetKey = String(storeId).toLowerCase();
          setStores((prev) => {
            const next = prev.filter((s) => String(s.id || s.c).toLowerCase() !== targetKey);
            storesRef.current = next;
            return next;
          });
        } else if (action === 'reload') {
          const { stores: freshStores } = await loadInitialStores();
          if (Array.isArray(freshStores) && freshStores.length > 0) {
            storesRef.current = freshStores;
            setStores(freshStores);
          }
        }
      }

      if (Array.isArray(data.notifications) && data.notifications.length > 0) {
        mergeNotifications(data.notifications);
      }

      if (data.notification && !seenNotifIdsRef.current.has(data.notification.id)) {
        seenNotifIdsRef.current.add(data.notification.id);
        mergeNotifications([data.notification]);
        if (currentUserRef.current) {
          showToast(`${data.notification.title}: ${data.notification.message}`, 'success');
        }
      }
    };

    // 1. Connect to Server-Sent Events (works across Normal, Incognito, Edge, Firefox, etc.)
    if (typeof window !== 'undefined' && 'EventSource' in window) {
      try {
        eventSource = new EventSource('/api/realtime-stream');
        eventSource.onmessage = (e) => {
          try {
            const parsed = JSON.parse(e.data);
            handleIncomingSync(parsed);
          } catch (err) {}
        };
      } catch (e) {}
    }

    // 2. BroadcastChannel (same-profile tabs)
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        const bc = new BroadcastChannel(REALTIME_CHANNEL_NAME);
        broadcastChannelRef.current = bc;
        bc.onmessage = (event) => {
          handleIncomingSync(event.data);
        };
      } catch (e) {}
    }

    // 3. Storage event fallback
    const handleStorageChange = (e) => {
      if (e.key === SYNC_PING_KEY && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          handleIncomingSync(parsed);
        } catch (err) {}
      } else if (e.key === 'lazuna_notifications' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (Array.isArray(parsed)) {
            mergeNotifications(parsed);
          }
        } catch (err) {}
      } else if ((e.key === LS_KEY || e.key === 'lazuna_posm_stores_v1') && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          const newStores = Array.isArray(parsed) ? parsed : parsed.stores;
          if (Array.isArray(newStores) && newStores.length > 0) {
            setStores(newStores);
            storesRef.current = newStores;
          }
        } catch (err) {}
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      if (eventSource) {
        try {
          eventSource.close();
        } catch (e) {}
      }
      if (broadcastChannelRef.current) {
        try {
          broadcastChannelRef.current.close();
        } catch (e) {}
        broadcastChannelRef.current = null;
      }
    };
  }, [mergeNotifications, showToast]);

  // Initial load & Realtime subscription
  useEffect(() => {
    let unsubscribe = null;
    let unsubscribeNotifs = null;
    let isMounted = true;
    let isFirstSnapshot = true;
    let isFirstNotifSnapshot = true;

    async function init() {
      setIsLoading(true);

      // 1. Instant local/cache load + shared server realtime state
      const { stores: loadedStores } = await loadInitialStores();
      let initial = loadedStores || [];

      try {
        const res = await fetch('/api/realtime');
        if (res.ok) {
          const srvState = await res.json();
          if (srvState) {
            if (Array.isArray(srvState.notifications) && srvState.notifications.length > 0) {
              srvState.notifications.forEach((n) => seenNotifIdsRef.current.add(n.id));
              mergeNotifications(srvState.notifications);
            }
            const updatedMap = srvState.updatedStores || {};
            const delSet = new Set((srvState.deletedStoreIds || []).map((id) => String(id).toLowerCase()));
            initial = initial
              .filter((s) => !delSet.has(String(s.id || s.c).toLowerCase()))
              .map((s) => {
                const key = String(s.id || s.c).toLowerCase();
                return updatedMap[key] ? updatedMap[key] : s;
              });
            Object.entries(updatedMap).forEach(([key, storeObj]) => {
              if (!delSet.has(key) && !initial.some((s) => String(s.id || s.c).toLowerCase() === key)) {
                initial.push(storeObj);
              }
            });
          }
        }
      } catch (e) {}

      if (isMounted) {
        storesRef.current = initial;
        setStores(initial);
        setIsLoading(false);
      }

      // 2. Realtime listener if Firebase is configured
      if (isFirebaseConfigured()) {
        try {
          unsubscribeNotifs = subscribeToNotifications((cloudNotifs, meta) => {
            if (!isMounted) return;
            if (Array.isArray(cloudNotifs) && cloudNotifs.length > 0) {
              cloudNotifs.forEach((n) => {
                if (isFirstNotifSnapshot) {
                  seenNotifIdsRef.current.add(n.id);
                }
              });
              mergeNotifications(cloudNotifs);

              if (!isFirstNotifSnapshot && meta?.addedChanges?.length > 0) {
                meta.addedChanges.forEach((newCloudNotif) => {
                  if (!seenNotifIdsRef.current.has(newCloudNotif.id)) {
                    seenNotifIdsRef.current.add(newCloudNotif.id);
                    if (currentUserRef.current) {
                      showToast(`${newCloudNotif.title}: ${newCloudNotif.message}`, 'success');
                    }
                  }
                });
              }
            }
            isFirstNotifSnapshot = false;
          });

          unsubscribe = subscribeToStores(
            (realtimeStores, metadata) => {
              if (isMounted) {
                let activeList = realtimeStores || [];
                const currentMaster = storesRef.current?.length ? storesRef.current : (loadedStores || []);

                // If Firestore is empty or has fewer stores than master data, merge & auto-seed
                if (currentMaster && currentMaster.length > activeList.length) {
                  const cloudMap = new Map(activeList.map(r => [String(r.id || r.c).toLowerCase(), r]));
                  activeList = currentMaster.map(l => cloudMap.get(String(l.id || l.c).toLowerCase()) || l);
                  realtimeStores.forEach(r => {
                    const id = String(r.id || r.c).toLowerCase();
                    if (!currentMaster.some(l => String(l.id || l.c).toLowerCase() === id)) {
                      activeList.push(r);
                    }
                  });

                  // Automatically sync complete master stores to Firestore
                  syncAllStoresToFirestore(activeList).catch(err => {
                    console.warn('Auto-sync ke Firestore:', err);
                  });
                }

                if (activeList && activeList.length > 0) {
                  storesRef.current = activeList;
                  setStores(activeList);
                  saveStoresToLS(activeList);
                  setIsRealtime(true);

                  // Detect external cloud changes if not initial load
                  if (!isFirstSnapshot && metadata?.changes) {
                    const externalChanges = metadata.changes.filter(c => !c.hasPendingWrites);
                    externalChanges.forEach(change => {
                      if (change.type === 'modified') {
                        addNotification({
                          title: 'Sinkronisasi Realtime',
                          message: `Data cabang "${change.doc.c || 'Store'}" diperbarui secara realtime`,
                          type: 'sync',
                          broadcast: false
                        });
                      } else if (change.type === 'added') {
                        addNotification({
                          title: 'Store Baru (Cloud)',
                          message: `Cabang "${change.doc.c || 'Store'}" ditambahkan secara realtime`,
                          type: 'add',
                          broadcast: false
                        });
                      } else if (change.type === 'removed') {
                        addNotification({
                          title: 'Store Dihapus (Cloud)',
                          message: `Cabang "${change.doc.c || 'Store'}" dihapus dari Cloud`,
                          type: 'delete',
                          broadcast: false
                        });
                      }
                    });
                  }
                } else if (activeList && activeList.length === 0) {
                  setIsRealtime(true);
                }
                isFirstSnapshot = false;
              }
            },
            (err) => {
              console.warn('Realtime subscription fallback:', err);
              if (isMounted) setIsRealtime(false);
            }
          );
        } catch (err) {
          console.error('Failed to initialize Firestore listener:', err);
          if (isMounted) setIsRealtime(false);
        }
      }
    }

    init();

    return () => {
      isMounted = false;
      if (unsubscribe) unsubscribe();
      if (unsubscribeNotifs) unsubscribeNotifs();
    };
  }, [addNotification, mergeNotifications, showToast]);

  const triggerSave = useCallback((updatedStores) => {
    const success = saveStoresToLS(updatedStores);
    if (!success) {
      showToast('Memori browser penuh. Disarankan unduh backup data.', 'error');
    }
  }, [showToast]);

  const handleLogout = useCallback(() => {
    try {
      sessionStorage.removeItem('lazuna_posm_user');
      localStorage.removeItem('lazuna_posm_user');
    } catch (e) {}
    setCurrentUser(null);
    showToast('Anda telah keluar dari dashboard');
  }, [showToast]);

  // Export / Import handlers
  const handleExportCSV = () => {
    try {
      exportToCSV(stores);
      showToast('Data berhasil diekspor ke CSV');
    } catch (err) {
      showToast('Gagal ekspor CSV: ' + err.message, 'error');
    }
  };

  const handleExportHTML = () => {
    try {
      exportToHTML(stores);
      showToast('File backup HTML berhasil diunduh');
    } catch (err) {
      showToast('Gagal unduh backup: ' + err.message, 'error');
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    if (!isSuperadmin) {
      showToast('Hanya akun Superadmin yang memiliki hak akses untuk mengimpor data.', 'error');
      return;
    }

    try {
      const result = await importDataFile(file, stores);
      storesRef.current = result.stores;
      setStores(result.stores);
      triggerSave(result.stores);
      showToast(
        `✓ Impor selesai: ${result.addCount} store baru, ${result.updateCount} diperbarui`
      );
      addNotification({
        title: 'Impor Data Selesai',
        message: `${currentUser?.name || 'Superadmin'} mengimpor ${result.addCount} cabang baru & memperbarui ${result.updateCount} cabang`,
        type: 'sync',
        syncPayload: { action: 'reload' }
      });
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // Edit store handler
  const handleOpenEditStore = (store = null, focusKey = null) => {
    if (!store && !isSuperadmin) {
      showToast('Hanya akun Superadmin yang memiliki hak akses untuk menambah store baru.', 'error');
      return;
    }
    setEditModal({
      isOpen: true,
      store: store,
      isNew: !store,
      focusKey: focusKey || null
    });
  };

  const handleSaveStore = async (savedStore) => {
    if (!isSuperadmin) {
      showToast('Hanya akun Superadmin yang memiliki hak akses untuk mengubah data store.', 'error');
      return;
    }

    let updated;
    const targetKey = String(savedStore.id || savedStore.c).toLowerCase();
    const isAddingNew = editModal.isNew;

    if (isAddingNew) {
      const maxNo = stores.reduce((max, s) => Math.max(max, s.no || 0), 0);
      savedStore.no = maxNo + 1;
      updated = [...stores, savedStore];
    } else {
      updated = stores.map(s => {
        const sKey = String(s.id || s.c).toLowerCase();
        return sKey === targetKey ? savedStore : s;
      });
    }

    storesRef.current = updated;
    setStores(updated);
    triggerSave(updated);
    setEditModal({ isOpen: false, store: null, isNew: false, focusKey: null });

    if (isAddingNew) {
      showToast(`Cabang ${savedStore.c} berhasil ditambahkan`);
      addNotification({
        title: 'Cabang Baru Ditambahkan',
        message: `${currentUser?.name || 'Superadmin'} menambahkan cabang "${savedStore.c}" (${savedStore.n || 'Store'})`,
        type: 'add',
        syncPayload: { action: 'save', store: savedStore }
      });
    } else {
      showToast(`Data cabang ${savedStore.c} berhasil diperbarui`);
      addNotification({
        title: 'Data Store Diperbarui',
        message: `${currentUser?.name || 'Superadmin'} memperbarui data cabang "${savedStore.c}"`,
        type: 'update',
        syncPayload: { action: 'save', store: savedStore }
      });
    }

    // Sync to Firestore in realtime
    if (isFirebaseConfigured()) {
      try {
        await saveStoreToFirestore(savedStore);
      } catch (err) {
        console.error('Failed to sync store to Firestore:', err);
        showToast('Tersimpan di lokal, gagal sinkron ke cloud: ' + err.message, 'warning');
      }
    }
  };

  const handleDeleteStore = async (storeId) => {
    if (!isSuperadmin) {
      showToast('Hanya akun Superadmin yang memiliki hak akses untuk menghapus data store.', 'error');
      return;
    }

    const targetKey = String(storeId).toLowerCase();
    const targetStore = stores.find(s => String(s.id || s.c).toLowerCase() === targetKey);
    const updated = stores.filter(s => String(s.id || s.c).toLowerCase() !== targetKey);
    storesRef.current = updated;
    setStores(updated);
    triggerSave(updated);
    setEditModal({ isOpen: false, store: null, isNew: false, focusKey: null });
    showToast('Store berhasil dihapus');
    addNotification({
      title: 'Store Dihapus',
      message: `${currentUser?.name || 'Superadmin'} menghapus cabang "${targetStore?.c || storeId}"`,
      type: 'delete',
      syncPayload: { action: 'delete', storeId }
    });

    // Delete from Firestore in realtime
    if (isFirebaseConfigured()) {
      try {
        await deleteStoreFromFirestore(storeId);
      } catch (err) {
        console.error('Failed to delete store from Firestore:', err);
      }
    }
  };

  // Gallery viewer handler
  const handleOpenGallery = (photos, startIndex = 0) => {
    if (!photos || !photos.length) return;
    setGalleryModal({
      isOpen: true,
      photos,
      currentIndex: startIndex
    });
  };

  // Filter & Sort computation
  const filteredStores = useMemo(() => {
    let result = stores.map((store, originalIndex) => ({ store, originalIndex }));

    // Search query filter
    const q = searchQuery.toLowerCase().trim();
    if (q) {
      result = result.filter(({ store }) => {
        const searchCorpus = [
          store.c,
          store.n,
          store.a?.s,
          store.a?.b,
          store.o?.s,
          store.k?.s,
          store.t?.r,
          store.t?.x,
          store.t?.ket,
          store.p?.n1,
          store.p?.n2
        ].filter(Boolean).join(' ').toLowerCase();

        return searchCorpus.includes(q);
      });
    }

    // Status / Category filter
    if (activeFilter === 'ok') {
      result = result.filter(({ store }) => isStoreComplete(store));
    } else if (activeFilter === 'no') {
      result = result.filter(({ store }) => getMissingPOSM(store).length > 0);
    } else if (POS_KEYS.includes(activeFilter)) {
      result = result.filter(({ store }) => {
        const item = store[activeFilter];
        return (item?.q || 0) > 0 && (!item.e || item.e.length === 0);
      });
    }

    // Sort order
    if (sortOrder === 'm') {
      result.sort((a, b) => {
        const missingDiff = getMissingPOSM(b.store).length - getMissingPOSM(a.store).length;
        if (missingDiff !== 0) return missingDiff;
        return (a.store.no || a.originalIndex) - (b.store.no || b.originalIndex);
      });
    } else if (sortOrder === 'name') {
      result.sort((a, b) => a.store.n.localeCompare(b.store.n));
    } else {
      result.sort((a, b) => (a.store.no || a.originalIndex) - (b.store.no || b.originalIndex));
    }

    return result.map(item => item.store);
  }, [stores, searchQuery, activeFilter, sortOrder]);

  if (!currentUser) {
    return (
      <>
        <LoginPage 
          onLogin={(user) => {
            setCurrentUser(user);
            try {
              const savedNotifs = localStorage.getItem('lazuna_notifications');
              if (savedNotifs) {
                mergeNotifications(JSON.parse(savedNotifs));
              }
            } catch (e) {}
            showToast(`Selamat datang, ${user.name}!`);
          }} 
        />
        {toast && (
          <Toast 
            message={toast.message} 
            type={toast.type} 
            onClose={() => setToast(null)} 
          />
        )}
      </>
    );
  }

  return (
    <div className="min-h-screen bg-[#F4F7FC] text-slate-900 flex font-sans">
      {/* Red Left Sidebar */}
      <Sidebar 
        stores={stores}
        activeFilter={activeFilter}
        onFilterChange={setActiveFilter}
        onAddStore={() => handleOpenEditStore(null)}
        onExportCSV={handleExportCSV}
        onExportHTML={handleExportHTML}
        onImportClick={() => fileInputRef.current?.click()}
        isOpen={isMobileSidebarOpen}
        onClose={() => setIsMobileSidebarOpen(false)}
        isRealtimeConnected={isRealtime}
        onOpenFirebaseModal={() => setIsFirebaseModalOpen(true)}
        onOpenLinksModal={() => setIsLinksModalOpen(true)}
        currentUser={currentUser}
        canCRUD={isSuperadmin}
        onLogout={handleLogout}
      />

      {/* Hidden file input for import */}
      <input 
        type="file" 
        ref={fileInputRef} 
        className="hidden" 
        accept=".html,.htm,.json" 
        onChange={handleFileChange} 
      />

      {/* Main Right Content Layout */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <Navbar 
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          onAddStore={() => handleOpenEditStore(null)}
          onOpenMobileMenu={() => setIsMobileSidebarOpen(true)}
          notifications={notifications}
          onMarkAllAsRead={handleMarkAllNotificationsAsRead}
          onClearNotifications={handleClearNotifications}
          onMarkAsRead={handleMarkNotificationAsRead}
          isRealtime={isRealtime}
          currentUser={currentUser}
          canCRUD={isSuperadmin}
          onLogout={handleLogout}
        />

        <main className="p-4 sm:p-6 lg:p-8 space-y-6 flex-1 max-w-[1400px] w-full mx-auto">
          {isLoading ? (
            <div className="py-24 flex flex-col items-center justify-center space-y-3 text-slate-400">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              <p className="text-xs font-medium">Memuat data dashboard...</p>
            </div>
          ) : stores.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center space-y-3 border border-slate-200/80">
              <h3 className="font-semibold text-sm text-slate-800">
                Belum ada data store
              </h3>
              <p className="text-xs text-slate-400 max-w-xs mx-auto">
                Silakan impor data file backup atau tambahkan store baru.
              </p>
              {isSuperadmin && (
                <Button 
                  size="sm"
                  onClick={() => handleOpenEditStore(null)}
                  className="rounded-xl text-xs bg-[#ff0000] hover:bg-[#e60000] text-white cursor-pointer"
                >
                  Tambah Store
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              {/* Summary View: Spline Chart + 2x2 Metric Cards + Work Management Table */}
              {viewMode === 'summary' && (
                <>
                  <OverviewSection 
                    stores={stores}
                    activeFilter={activeFilter}
                    onFilterChange={setActiveFilter}
                  />

                  <WorkManagementTable 
                    stores={filteredStores}
                    allStores={stores}
                    searchQuery={searchQuery}
                    onSearchChange={setSearchQuery}
                    activeFilter={activeFilter}
                    onFilterChange={setActiveFilter}
                    onEditStore={handleOpenEditStore}
                    onOpenGallery={handleOpenGallery}
                  />
                </>
              )}

              {/* Checklist POSM View */}
              {viewMode === 'checklist' && (
                <div className="bg-white rounded-2xl p-5 border border-slate-200/80">
                  <ChecklistView 
                    stores={filteredStores}
                    allStores={stores}
                    searchQuery={searchQuery}
                    onSearchChange={setSearchQuery}
                    activeFilter={activeFilter}
                    onFilterChange={setActiveFilter}
                    onEditStore={handleOpenEditStore}
                    onOpenGallery={handleOpenGallery}
                  />
                </div>
              )}

              {/* Table Detail View */}
              {viewMode === 'table' && (
                <div className="bg-white rounded-2xl p-5 border border-slate-200/80">
                  <TableView 
                    stores={filteredStores}
                    searchQuery={searchQuery}
                    onSearchChange={setSearchQuery}
                    activeFilter={activeFilter}
                    onFilterChange={setActiveFilter}
                    onEditStore={handleOpenEditStore}
                    onOpenGallery={handleOpenGallery}
                  />
                </div>
              )}

              {/* Cards Grid View */}
              {viewMode === 'cards' && (
                <CardGridView 
                  stores={filteredStores}
                  searchQuery={searchQuery}
                  onSearchChange={setSearchQuery}
                  activeFilter={activeFilter}
                  onFilterChange={setActiveFilter}
                  onEditStore={handleOpenEditStore}
                  onOpenGallery={handleOpenGallery}
                />
              )}
            </div>
          )}

          {/* Footer Credit & Copyright */}
          <footer className="mt-8 pt-6 pb-2 border-t border-slate-200/70 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
            <p className="text-[11px] text-slate-400">
              © {new Date().getFullYear()} POSM Lazuna Chicken Dashboard
            </p>
            <div className="inline-flex items-center gap-1.5 text-xs text-slate-500 font-medium">
              <span>made with</span>
              <Heart size={13} className="text-[#ff0000] fill-[#ff0000] inline animate-pulse" />
              <span>by</span>
              <span className="font-semibold text-slate-700 hover:text-[#ff0000] transition-colors">
                Underlabs.id
              </span>
            </div>
          </footer>
        </main>
      </div>

      {/* Modals */}
      {editModal.isOpen && (
        <EditStoreModal 
          store={editModal.store}
          isNew={editModal.isNew}
          initialFocusKey={editModal.focusKey}
          onClose={() => setEditModal({ isOpen: false, store: null, isNew: false, focusKey: null })}
          onSave={handleSaveStore}
          onDelete={handleDeleteStore}
          isReadOnly={!isSuperadmin}
        />
      )}

      {galleryModal.isOpen && (
        <GalleryModal 
          photos={galleryModal.photos}
          currentIndex={galleryModal.currentIndex}
          onIndexChange={(idx) => setGalleryModal(prev => ({ ...prev, currentIndex: idx }))}
          onClose={() => setGalleryModal({ isOpen: false, photos: [], currentIndex: 0 })}
        />
      )}

      {/* Toast */}
      {toast && (
        <Toast 
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* Submission Links Modal */}
      <SubmissionLinksModal 
        isOpen={isLinksModalOpen}
        onClose={() => setIsLinksModalOpen(false)}
      />

      {/* Firebase Realtime Config Modal */}
      <FirebaseConfigModal 
        isOpen={isFirebaseModalOpen}
        onClose={() => setIsFirebaseModalOpen(false)}
        currentStores={stores}
        onSuccess={(msg) => {
          showToast(msg, 'success');
          addNotification({
            title: 'Sinkronisasi Cloud Selesai',
            message: msg,
            type: 'sync'
          });
        }}
      />
    </div>
  );
}
