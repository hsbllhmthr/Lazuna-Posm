import React, { useState, useEffect } from 'react';
import { X, ExternalLink, RefreshCw, Check, Copy } from 'lucide-react';
import { 
  getFirebaseConfig, 
  saveFirebaseConfig, 
  clearFirebaseConfig, 
  isFirebaseConfigured,
  isFirebaseStorageConfigured,
  syncAllStoresToFirestore
} from '../lib/firebase';
import { Button } from '@/components/ui/button';

export default function FirebaseConfigModal({ 
  isOpen, 
  onClose, 
  currentStores = [], 
  onSuccess 
}) {
  const [config, setConfig] = useState({
    apiKey: '',
    authDomain: '',
    projectId: '',
    storageBucket: '',
    messagingSenderId: '',
    appId: ''
  });
  const [rawSnippet, setRawSnippet] = useState('');
  const [showManualFields, setShowManualFields] = useState(false);
  const [syncStatus, setSyncStatus] = useState({ loading: false, progress: '', done: false });
  const [errorMsg, setErrorMsg] = useState('');
  const [copiedEnv, setCopiedEnv] = useState(false);
  const [parseSuccess, setParseSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const cfg = getFirebaseConfig();
      setConfig(cfg);
      setSyncStatus({ loading: false, progress: '', done: false });
      setErrorMsg('');
      setParseSuccess(false);
      setRawSnippet('');
      setShowManualFields(Boolean(cfg.apiKey && cfg.projectId));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const isConnected = isFirebaseConfigured();
  const isStorageReady = isFirebaseStorageConfigured();

  const handleSnippetChange = (text) => {
    setRawSnippet(text);
    setErrorMsg('');

    if (!text.trim()) {
      setParseSuccess(false);
      return;
    }

    const extract = (key) => {
      const match = text.match(new RegExp(`${key}\\s*:\\s*["'\`]([^"'\`]+)["'\`]`, 'i'));
      return match ? match[1] : '';
    };

    const apiKey = extract('apiKey');
    const projectId = extract('projectId');

    if (apiKey || projectId) {
      setConfig(prev => ({
        apiKey: apiKey || prev.apiKey,
        authDomain: extract('authDomain') || prev.authDomain,
        projectId: projectId || prev.projectId,
        storageBucket: extract('storageBucket') || prev.storageBucket,
        messagingSenderId: extract('messagingSenderId') || prev.messagingSenderId,
        appId: extract('appId') || prev.appId
      }));
      setParseSuccess(true);
    } else {
      setParseSuccess(false);
    }
  };

  const handleSave = (e) => {
    e.preventDefault();
    if (!config.apiKey || !config.projectId) {
      setErrorMsg('API Key dan Project ID wajib diisi');
      return;
    }

    const success = saveFirebaseConfig(config);
    if (success) {
      if (onSuccess) onSuccess('Konfigurasi Firebase berhasil disimpan');
      window.location.reload();
    } else {
      setErrorMsg('Gagal menyimpan konfigurasi');
    }
  };

  const handleClear = () => {
    if (window.confirm('Putuskan koneksi cloud dan kembali ke mode penyimpanan lokal?')) {
      clearFirebaseConfig();
      window.location.reload();
    }
  };

  const handleSyncToFirestore = async () => {
    setSyncStatus({ loading: true, progress: 'Menyiapkan data...', done: false });
    setErrorMsg('');

    let masterStores = [];
    try {
      const res = await fetch('/initialData.json');
      if (res.ok) {
        const parsed = await res.json();
        masterStores = parsed?.stores || [];
      }
    } catch (e) {}

    const storeMap = new Map();
    masterStores.forEach(s => storeMap.set(String(s.id || s.c), s));
    currentStores.forEach(s => storeMap.set(String(s.id || s.c), s));
    const allToUpload = Array.from(storeMap.values());

    if (!allToUpload.length) {
      setSyncStatus({ loading: false, progress: '', done: false });
      return;
    }

    try {
      await syncAllStoresToFirestore(allToUpload, (processed, total) => {
        setSyncStatus({ loading: true, progress: `${processed}/${total} store terunggah...`, done: false });
      });
      setSyncStatus({ loading: false, progress: `${allToUpload.length} store tersinkronisasi`, done: true });
      if (onSuccess) onSuccess(`${allToUpload.length} store berhasil disinkronkan`);
    } catch (err) {
      console.error(err);
      setErrorMsg('Gagal sinkronisasi: ' + err.message);
      setSyncStatus({ loading: false, progress: '', done: false });
    }
  };

  const envString = `VITE_FIREBASE_API_KEY=${config.apiKey || ''}
VITE_FIREBASE_AUTH_DOMAIN=${config.authDomain || ''}
VITE_FIREBASE_PROJECT_ID=${config.projectId || ''}
VITE_FIREBASE_STORAGE_BUCKET=${config.storageBucket || ''}
VITE_FIREBASE_MESSAGING_SENDER_ID=${config.messagingSenderId || ''}
VITE_FIREBASE_APP_ID=${config.appId || ''}`;

  const handleCopyEnv = () => {
    navigator.clipboard.writeText(envString);
    setCopiedEnv(true);
    setTimeout(() => setCopiedEnv(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-0 sm:p-4">
      <div className="bg-white w-full h-dvh sm:h-auto sm:max-w-lg sm:rounded-xl shadow-xl border-0 sm:border border-slate-200 flex flex-col overflow-hidden text-slate-900 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-2.5">
            <h3 className="font-semibold text-sm text-slate-900">
              Koneksi Database
            </h3>
            <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium ${
              isConnected 
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                : 'bg-slate-100 text-slate-600 border border-slate-200'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-emerald-500' : 'bg-slate-400'}`} />
              <span>{isConnected ? 'Cloud Aktif' : 'Lokal'}</span>
            </span>
          </div>

          <button 
            onClick={onClose}
            className="h-7 w-7 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Tutup"
          >
            <X size={15} />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-5 space-y-4 flex-1 sm:max-h-[85vh] overflow-y-auto text-xs">
          {/* Active Cloud Connection Details */}
          {isConnected && (
            <div className="bg-slate-50 border border-slate-200/80 rounded-lg p-3 space-y-2.5">
              <div className="flex items-center justify-between text-slate-600">
                <div className="truncate pr-2">
                  <span className="text-slate-400">Project:</span>{' '}
                  <span className="font-mono font-medium text-slate-800">{config.projectId}</span>
                  {isStorageReady && (
                    <span className="text-slate-400 ml-2">· Storage aktif</span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={handleClear}
                  className="text-xs text-slate-400 hover:text-[#ff0000] cursor-pointer transition-colors shrink-0"
                >
                  Putuskan
                </button>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 gap-2">
                <span className="text-slate-500 text-[11px] truncate">
                  {syncStatus.progress || 'Sinkronkan data lokal & foto ke Firestore'}
                </span>
                <button
                  type="button"
                  onClick={handleSyncToFirestore}
                  disabled={syncStatus.loading}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-md transition-colors cursor-pointer disabled:opacity-50 shrink-0"
                >
                  {syncStatus.loading && <RefreshCw size={11} className="animate-spin" />}
                  <span>{syncStatus.done ? 'Sinkron Ulang' : 'Upload Data'}</span>
                </button>
              </div>
            </div>
          )}

          {errorMsg && (
            <div className="p-2.5 bg-red-50 border border-red-200 text-[#ff0000] rounded-lg text-xs">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleSave} className="space-y-3.5">
            {/* Snippet Paste Box */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <label className="font-medium text-slate-700">
                  Tempel Konfigurasi Firebase
                </label>
                <a 
                  href="https://console.firebase.google.com/" 
                  target="_blank" 
                  rel="noreferrer"
                  className="text-slate-400 hover:text-slate-700 inline-flex items-center gap-1 text-[11px] transition-colors"
                >
                  <span>Console</span>
                  <ExternalLink size={10} />
                </a>
              </div>

              <div className="relative">
                <textarea
                  rows={showManualFields ? 2 : 4}
                  placeholder="Tempel blok firebaseConfig dari Firebase Console di sini..."
                  value={rawSnippet}
                  onChange={(e) => handleSnippetChange(e.target.value)}
                  className="w-full p-2.5 font-mono text-[11px] bg-slate-50/60 hover:bg-slate-50 focus:bg-white border border-slate-200 rounded-lg text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-slate-400 transition-colors"
                />
                {parseSuccess && (
                  <span className="absolute bottom-2 right-2 text-[10px] text-emerald-600 font-medium bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                    ✓ Terdeteksi
                  </span>
                )}
              </div>
            </div>

            {/* Manual Fields Toggle */}
            <div>
              <button
                type="button"
                onClick={() => setShowManualFields(!showManualFields)}
                className="text-[11px] text-slate-500 hover:text-slate-800 font-medium cursor-pointer transition-colors"
              >
                {showManualFields ? '− Sembunyikan parameter individual' : '+ Parameter individual'}
              </button>
            </div>

            {showManualFields && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">
                    API Key <span className="text-[#ff0000]">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={config.apiKey}
                    onChange={(e) => setConfig(prev => ({ ...prev, apiKey: e.target.value }))}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-md text-slate-800 text-xs focus:outline-none focus:border-slate-400 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">
                    Project ID <span className="text-[#ff0000]">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={config.projectId}
                    onChange={(e) => setConfig(prev => ({ ...prev, projectId: e.target.value }))}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-md text-slate-800 text-xs focus:outline-none focus:border-slate-400 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">
                    Storage Bucket
                  </label>
                  <input
                    type="text"
                    value={config.storageBucket}
                    onChange={(e) => setConfig(prev => ({ ...prev, storageBucket: e.target.value }))}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-md text-slate-800 text-xs focus:outline-none focus:border-slate-400 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">
                    Auth Domain
                  </label>
                  <input
                    type="text"
                    value={config.authDomain}
                    onChange={(e) => setConfig(prev => ({ ...prev, authDomain: e.target.value }))}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-md text-slate-800 text-xs focus:outline-none focus:border-slate-400 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">
                    Messaging Sender ID
                  </label>
                  <input
                    type="text"
                    value={config.messagingSenderId}
                    onChange={(e) => setConfig(prev => ({ ...prev, messagingSenderId: e.target.value }))}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-md text-slate-800 text-xs focus:outline-none focus:border-slate-400 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">
                    App ID
                  </label>
                  <input
                    type="text"
                    value={config.appId}
                    onChange={(e) => setConfig(prev => ({ ...prev, appId: e.target.value }))}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-md text-slate-800 text-xs focus:outline-none focus:border-slate-400 font-mono"
                  />
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={handleCopyEnv}
                className="text-[11px] text-slate-400 hover:text-slate-700 inline-flex items-center gap-1 cursor-pointer transition-colors"
              >
                {copiedEnv ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                <span>{copiedEnv ? 'Tersalin' : 'Salin .env'}</span>
              </button>

              <div className="flex items-center gap-2">
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="sm" 
                  onClick={onClose}
                  className="text-xs h-8 px-3 text-slate-600 hover:text-slate-900"
                >
                  Tutup
                </Button>
                <Button 
                  type="submit" 
                  size="sm"
                  className="bg-[#ff0000] hover:bg-[#e60000] text-white text-xs h-8 px-4 font-medium rounded-lg cursor-pointer transition-colors"
                >
                  Simpan
                </Button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
