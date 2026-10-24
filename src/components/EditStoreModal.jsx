import React, { useState, useEffect, useRef } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { X, Upload, Trash2, Check, AlertCircle, Loader2, Camera, Plus } from 'lucide-react';
import { POS_CONFIG, normStore } from '../utils/storage';
import { compFile, compressImageFile, formatFileSize } from '../utils/imageCompress';
import { isFirebaseStorageConfigured, uploadEvidenImage } from '../lib/firebase';

export default function EditStoreModal({
  store,
  isNew,
  initialFocusKey,
  onClose,
  onSave,
  onDelete,
  isReadOnly = false
}) {
  const [formData, setFormData] = useState(() => {
    if (!store || isNew) {
      return {
        id: '',
        c: '',
        n: '',
        a: { s: '', b: '', q: 0, m: '', ms: [], e: [] },
        o: { s: '', q: 0, e: [] },
        k: { s: '', q: 0, e: [] },
        m: { s: 'A3', q: 1, e: [] },
        t: { s: '', q: 0, r: '', rt: '', x: '', ket: '', e: [] },
        p: { s: 'A4', q: 0, n1: '', n2: '', e: [] }
      };
    }
    return JSON.parse(JSON.stringify(normStore(store)));
  });

  const [processingImage, setProcessingImage] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const posmRefs = useRef({});

  useEffect(() => {
    if (initialFocusKey && posmRefs.current[initialFocusKey]) {
      setTimeout(() => {
        posmRefs.current[initialFocusKey]?.scrollIntoView({
          behavior: 'smooth',
          block: 'center'
        });
      }, 150);
    }
  }, [initialFocusKey]);

  const handleBasicChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handlePOSMFieldChange = (key, field, value) => {
    setFormData(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        [field]: value
      }
    }));
  };

  const handleAkrilikMateriChange = (index, value) => {
    setFormData(prev => {
      const qty = Math.max(0, Number(prev.a?.q) || 0);
      const currentMs = Array.isArray(prev.a?.ms) ? [...prev.a.ms] : (prev.a?.m ? [prev.a.m] : []);
      while (currentMs.length <= index) {
        currentMs.push('');
      }
      currentMs[index] = value;
      const summaryM = currentMs.slice(0, qty).filter(Boolean).join(', ');
      return {
        ...prev,
        a: {
          ...prev.a,
          ms: currentMs,
          m: summaryM
        }
      };
    });
  };

  const handleAddPhotos = async (key, files) => {
    if (!files || !files.length) return;
    setProcessingImage(true);
    setErrorMsg('');

    try {
      const newUrls = [];
      let failCount = 0;

      for (const file of Array.from(files)) {
        // Cek ekstensi atau tipe file gambar
        const isImage = file.type?.startsWith('image/') || /\.(jpe?g|png|webp|gif|bmp|heic|heif|jfif)$/i.test(file.name);
        if (!isImage) {
          failCount++;
          continue;
        }

        try {
          // 1. Kompresi gambar terlebih dahulu: resolusi maks 1000px, ukuran maks ~180KB
          const compressed = await compressImageFile(file, {
            maxDimension: 1000,
            maxBytes: 180 * 1024
          });

          if (!compressed || !compressed.dataUrl) {
            failCount++;
            continue;
          }

          // 2. Jika Firebase Storage aktif, coba unggah dengan timeout 8 detik agar tidak macet
          let uploadedUrl = null;
          if (isFirebaseStorageConfigured()) {
            try {
              const uploadPromise = uploadEvidenImage(
                formData.id || formData.c || 'store', 
                key, 
                compressed.file || compressed.blob,
                compressed.fileName
              );
              const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Upload timeout')), 8000)
              );
              uploadedUrl = await Promise.race([uploadPromise, timeoutPromise]);
            } catch (uploadErr) {
              console.warn('Firebase Storage upload failed, falling back to local compression:', uploadErr);
            }
          }

          // 3. Gunakan URL Firebase jika sukses, atau dataUrl terkompresi
          const finalUrl = uploadedUrl || compressed.dataUrl;
          if (finalUrl) {
            newUrls.push(finalUrl);
          } else {
            failCount++;
          }
        } catch (fileErr) {
          console.error(`Gagal memproses file ${file.name}:`, fileErr);
          failCount++;
        }
      }

      if (newUrls.length > 0) {
        setFormData(prev => ({
          ...prev,
          [key]: {
            ...prev[key],
            e: [...(prev[key]?.e || []), ...newUrls],
            at: Date.now()
          }
        }));
      }

      if (failCount > 0) {
        setErrorMsg(`${failCount} file tidak dapat diproses. Pastikan format file gambar valid.`);
      }
    } catch (err) {
      console.error('Error handling photos:', err);
      setErrorMsg('Terjadi kesalahan saat memproses foto.');
    } finally {
      setProcessingImage(false);
    }
  };

  const handleRemovePhoto = (key, photoIndex) => {
    setFormData(prev => {
      const currentList = [...(prev[key]?.e || [])];
      currentList.splice(photoIndex, 1);
      return {
        ...prev,
        [key]: {
          ...prev[key],
          e: currentList,
          at: Date.now()
        }
      };
    });
  };

  const handleSubmit = (e) => {
    e?.preventDefault();
    if (!formData.c?.trim() || !formData.n?.trim()) {
      setErrorMsg('Store Code dan Nama Store wajib diisi!');
      return;
    }

    const akrilikQty = Math.max(0, Number(formData.a?.q) || 0);
    const rawMs = Array.isArray(formData.a?.ms)
      ? formData.a.ms
      : (formData.a?.m ? [formData.a.m] : []);
    const trimmedMs = Array.from({ length: akrilikQty }, (_, i) => String(rawMs[i] || '').trim());

    const payload = {
      ...formData,
      c: formData.c.trim(),
      n: formData.n.trim(),
      a: {
        ...formData.a,
        ms: trimmedMs,
        m: trimmedMs.filter(Boolean).join(', ')
      },
      at: Date.now()
    };
    if (!payload.id) {
      payload.id = payload.c.replace(/[^A-Za-z0-9_-]/g, '_');
    }

    onSave(payload);
  };

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-full h-dvh max-h-dvh sm:h-auto sm:max-w-2xl sm:max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden bg-slate-50 border-0 sm:border border-slate-200 shadow-xl rounded-none sm:rounded-xl">
        {/* Header */}
        <DialogHeader className="px-4 sm:px-5 pt-4 pb-2 bg-slate-50 text-left shrink-0">
          <div className="flex items-center gap-2 pr-8">
            <DialogTitle className="font-heading text-sm sm:text-base font-bold text-slate-900 leading-snug text-left">
              {isNew ? 'Tambah Store Baru' : (isReadOnly ? `Detail Store: ${formData.c} – ${formData.n}` : `Edit Store: ${formData.c} – ${formData.n}`)}
            </DialogTitle>
          </div>
          <DialogDescription className="sr-only">
            Form edit data store dan bukti foto POSM
          </DialogDescription>
        </DialogHeader>

        {isReadOnly && (
          <div className="mx-4 sm:mx-5 mt-1.5 p-2.5 rounded-lg bg-amber-50/90 text-amber-800 text-xs flex items-center gap-2 border border-amber-200/80 shrink-0">
            <AlertCircle size={15} className="shrink-0 text-amber-600" />
            <span>Akun Administrator hanya memiliki izin <strong>membaca data (View-Only)</strong>. Untuk menambah, mengedit, atau menghapus data, silakan gunakan akun Superadmin.</span>
          </div>
        )}

        {errorMsg && (
          <div className="mx-4 sm:mx-5 mt-2 p-3 rounded-lg bg-red-50 text-red-700 text-xs flex items-center gap-2 border border-red-200 shrink-0">
            <AlertCircle size={15} className="shrink-0 text-red-600" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3.5 bg-slate-50">
          {/* Identitas Store */}
          <div className="rounded-lg border border-slate-200/90 bg-white overflow-hidden shadow-2xs">
            <div className="px-3.5 py-2 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between">
              <h4 className="font-heading font-semibold text-xs text-slate-800 tracking-tight">
                Identitas Store
              </h4>
              <span className="text-[10px] text-slate-400 font-medium">* Wajib diisi</span>
            </div>
            <div className="p-3.5 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[11px] font-medium text-slate-600 block mb-1">
                  Kode Store *
                </label>
                <Input 
                  placeholder="mis. LCPD"
                  value={formData.c}
                  disabled={isReadOnly}
                  onChange={(e) => handleBasicChange('c', e.target.value)}
                  className="h-8 text-xs font-mono uppercase"
                  required
                />
              </div>
              <div className="sm:col-span-2">
                <label className="text-[11px] font-medium text-slate-600 block mb-1">
                  Nama Store *
                </label>
                <Input 
                  placeholder="mis. LAZUNA CHICKEN PERDOS"
                  value={formData.n}
                  disabled={isReadOnly}
                  onChange={(e) => handleBasicChange('n', e.target.value)}
                  className="h-8 text-xs uppercase"
                  required
                />
              </div>
            </div>
          </div>

          {/* Section Divider POSM */}
          <div className="flex items-center justify-between pt-1 px-0.5">
            <span className="text-[11px] font-semibold tracking-wider text-slate-500 uppercase">
              Spesifikasi & Bukti Foto POSM
            </span>
            <span className="text-[11px] text-slate-400 font-medium">
              6 Kategori
            </span>
          </div>

          {/* POSM Cards */}
          <div className="space-y-3">
            {/* Akrilik Dinding */}
            <div 
              ref={el => posmRefs.current['a'] = el}
              className={`rounded-lg border bg-white overflow-hidden transition-all shadow-2xs ${
                initialFocusKey === 'a' ? 'ring-2 ring-blue-500 border-blue-500' : 'border-slate-200/90'
              }`}
            >
              <div className="px-3.5 py-2 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between">
                <h4 className="font-heading font-semibold text-xs text-slate-800">Akrilik Dinding</h4>
                <span className="text-[11px] font-medium text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200/70">
                  {formData.a?.q || 0} Unit
                </span>
              </div>
              <div className="p-3.5 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div>
                    <label className="text-[11px] font-medium text-slate-600 block mb-1">Ukuran</label>
                    <Input 
                      placeholder="mis. 58x110" 
                      value={formData.a?.s || ''} 
                      disabled={isReadOnly}
                      onChange={e => handlePOSMFieldChange('a', 's', e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-slate-600 block mb-1">Bahan</label>
                    <Input 
                      placeholder="mis. DURATRANS" 
                      value={formData.a?.b || ''} 
                      disabled={isReadOnly}
                      onChange={e => handlePOSMFieldChange('a', 'b', e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-slate-600 block mb-1">Jumlah</label>
                    <Input 
                      type="number" 
                      min="0" 
                      value={formData.a?.q ?? 0} 
                      disabled={isReadOnly}
                      onChange={e => handlePOSMFieldChange('a', 'q', +e.target.value || 0)}
                      className="h-8 text-xs"
                    />
                  </div>
                </div>

                {(formData.a?.q || 0) > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                    {Array.from({ length: Math.min(20, Math.max(0, Number(formData.a?.q) || 0)) }).map((_, idx) => {
                      const currentMs = Array.isArray(formData.a?.ms)
                        ? formData.a.ms
                        : (formData.a?.m ? [formData.a.m] : []);
                      const val = currentMs[idx] ?? '';
                      return (
                        <div key={idx}>
                          <label className="text-[11px] font-medium text-slate-600 block mb-1">
                            Nama Materi {idx + 1}
                          </label>
                          <Input 
                            placeholder={`Nama materi akrilik ${idx + 1}`}
                            value={val}
                            disabled={isReadOnly}
                            onChange={e => handleAkrilikMateriChange(idx, e.target.value)}
                            className="h-8 text-xs"
                          />
                        </div>
                      );
                    })}
                  </div>
                )}

                <PhotoUploader 
                  photos={formData.a?.e || []}
                  onAddPhotos={files => handleAddPhotos('a', files)}
                  onRemovePhoto={idx => handleRemovePhoto('a', idx)}
                  disabled={processingImage}
                  readOnly={isReadOnly}
                />
              </div>
            </div>

            {/* Outdoor Portrait */}
            <div 
              ref={el => posmRefs.current['o'] = el}
              className={`rounded-lg border bg-white overflow-hidden transition-all shadow-2xs ${
                initialFocusKey === 'o' ? 'ring-2 ring-blue-500 border-blue-500' : 'border-slate-200/90'
              }`}
            >
              <div className="px-3.5 py-2 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between">
                <h4 className="font-heading font-semibold text-xs text-slate-800">Spanduk Outdoor (Portrait)</h4>
                <span className="text-[11px] font-medium text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200/70">
                  {formData.o?.q || 0} Unit
                </span>
              </div>
              <div className="p-3.5 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div className="sm:col-span-2">
                    <label className="text-[11px] font-medium text-slate-600 block mb-1">Ukuran</label>
                    <Input 
                      placeholder="mis. 60x130" 
                      value={formData.o?.s || ''} 
                      disabled={isReadOnly}
                      onChange={e => handlePOSMFieldChange('o', 's', e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-slate-600 block mb-1">Jumlah</label>
                    <Input 
                      type="number" 
                      min="0" 
                      value={formData.o?.q ?? 0} 
                      disabled={isReadOnly}
                      onChange={e => handlePOSMFieldChange('o', 'q', +e.target.value || 0)}
                      className="h-8 text-xs"
                    />
                  </div>
                </div>
                <PhotoUploader 
                  photos={formData.o?.e || []}
                  onAddPhotos={files => handleAddPhotos('o', files)}
                  onRemovePhoto={idx => handleRemovePhoto('o', idx)}
                  disabled={processingImage}
                  readOnly={isReadOnly}
                />
              </div>
            </div>

            {/* Bawah Kanopi */}
            <div 
              ref={el => posmRefs.current['k'] = el}
              className={`rounded-lg border bg-white overflow-hidden transition-all shadow-2xs ${
                initialFocusKey === 'k' ? 'ring-2 ring-blue-500 border-blue-500' : 'border-slate-200/90'
              }`}
            >
              <div className="px-3.5 py-2 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between">
                <h4 className="font-heading font-semibold text-xs text-slate-800">Spanduk Bawah Kanopi</h4>
                <span className="text-[11px] font-medium text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200/70">
                  {formData.k?.q || 0} Unit
                </span>
              </div>
              <div className="p-3.5 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div className="sm:col-span-2">
                    <label className="text-[11px] font-medium text-slate-600 block mb-1">Ukuran</label>
                    <Input 
                      placeholder="mis. 500X100" 
                      value={formData.k?.s || ''} 
                      disabled={isReadOnly}
                      onChange={e => handlePOSMFieldChange('k', 's', e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-slate-600 block mb-1">Jumlah</label>
                    <Input 
                      type="number" 
                      min="0" 
                      value={formData.k?.q ?? 0} 
                      disabled={isReadOnly}
                      onChange={e => handlePOSMFieldChange('k', 'q', +e.target.value || 0)}
                      className="h-8 text-xs"
                    />
                  </div>
                </div>
                <PhotoUploader 
                  photos={formData.k?.e || []}
                  onAddPhotos={files => handleAddPhotos('k', files)}
                  onRemovePhoto={idx => handleRemovePhoto('k', idx)}
                  disabled={processingImage}
                  readOnly={isReadOnly}
                />
              </div>
            </div>

            {/* Menu A3 */}
            <div 
              ref={el => posmRefs.current['m'] = el}
              className={`rounded-lg border bg-white overflow-hidden transition-all shadow-2xs ${
                initialFocusKey === 'm' ? 'ring-2 ring-blue-500 border-blue-500' : 'border-slate-200/90'
              }`}
            >
              <div className="px-3.5 py-2 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between">
                <h4 className="font-heading font-semibold text-xs text-slate-800">Menu A3 (Landscape)</h4>
                <span className="text-[11px] font-medium text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200/70">
                  Standar 1 Unit
                </span>
              </div>
              <div className="p-3.5 space-y-2">
                <p className="text-[11px] text-slate-500">
                  Format menu kasir standar ukuran A3 Landscape per cabang store.
                </p>
                <PhotoUploader 
                  photos={formData.m?.e || []}
                  onAddPhotos={files => handleAddPhotos('m', files)}
                  onRemovePhoto={idx => handleRemovePhoto('m', idx)}
                  disabled={processingImage}
                  readOnly={isReadOnly}
                />
              </div>
            </div>

            {/* TV Board */}
            <div 
              ref={el => posmRefs.current['t'] = el}
              className={`rounded-lg border bg-white overflow-hidden transition-all shadow-2xs ${
                initialFocusKey === 't' ? 'ring-2 ring-blue-500 border-blue-500' : 'border-slate-200/90'
              }`}
            >
              <div className="px-3.5 py-2 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h4 className="font-heading font-semibold text-xs text-slate-800">TV Board</h4>
                  {formData.t?.ket && !(formData.t?.q > 0) && (
                    <span className="text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 font-medium">
                      {formData.t.ket}
                    </span>
                  )}
                </div>
                <span className="text-[11px] font-medium text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200/70">
                  {formData.t?.q > 0 ? `${formData.t.q} TV` : 'Tidak Ada'}
                </span>
              </div>
              <div className="p-3.5 space-y-3">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div>
                    <label className="text-[11px] font-medium text-slate-600 block mb-1">Jumlah TV</label>
                    <Input 
                      type="number" 
                      min="0" 
                      value={formData.t?.q ?? 0} 
                      disabled={isReadOnly}
                      onChange={e => handlePOSMFieldChange('t', 'q', +e.target.value || 0)}
                      className="h-8 text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-slate-600 block mb-1">Orientasi</label>
                    <select 
                      value={formData.t?.r || ''} 
                      disabled={isReadOnly}
                      onChange={e => handlePOSMFieldChange('t', 'r', e.target.value)}
                      className="h-8 w-full rounded-md border border-slate-200 bg-white px-2 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
                    >
                      <option value="">–</option>
                      <option value="Portrait">Portrait</option>
                      <option value="Landscape">Landscape</option>
                      <option value="Portrait & Landscape">Portrait & Landscape</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-slate-600 block mb-1">Rotasi</label>
                    <select 
                      value={formData.t?.rt || ''} 
                      disabled={isReadOnly}
                      onChange={e => handlePOSMFieldChange('t', 'rt', e.target.value)}
                      className="h-8 w-full rounded-md border border-slate-200 bg-white px-2 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
                    >
                      <option value="">–</option>
                      <option value="90°">90°</option>
                      <option value="270°">270°</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-slate-600 block mb-1">Penambahan</label>
                    <Input 
                      placeholder="mis. Cemilan" 
                      value={formData.t?.x || ''} 
                      disabled={isReadOnly}
                      onChange={e => handlePOSMFieldChange('t', 'x', e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>
                </div>
                <PhotoUploader 
                  photos={formData.t?.e || []}
                  onAddPhotos={files => handleAddPhotos('t', files)}
                  onRemovePhoto={idx => handleRemovePhoto('t', idx)}
                  disabled={processingImage}
                  readOnly={isReadOnly}
                />
              </div>
            </div>

            {/* Poster A4 */}
            <div 
              ref={el => posmRefs.current['p'] = el}
              className={`rounded-lg border bg-white overflow-hidden transition-all shadow-2xs ${
                initialFocusKey === 'p' ? 'ring-2 ring-blue-500 border-blue-500' : 'border-slate-200/90'
              }`}
            >
              <div className="px-3.5 py-2 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between">
                <h4 className="font-heading font-semibold text-xs text-slate-800">Poster A4</h4>
                <span className="text-[11px] font-medium text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200/70">
                  {formData.p?.q > 0 ? `${formData.p.q} Poster` : 'Tidak Ada'}
                </span>
              </div>
              <div className="p-3.5 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div>
                    <label className="text-[11px] font-medium text-slate-600 block mb-1">Jumlah</label>
                    <select 
                      value={formData.p?.q ?? 0} 
                      disabled={isReadOnly}
                      onChange={e => handlePOSMFieldChange('p', 'q', +e.target.value || 0)}
                      className="h-8 w-full rounded-md border border-slate-200 bg-white px-2 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
                    >
                      <option value="0">Tidak ada</option>
                      <option value="1">1</option>
                      <option value="2">2</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-slate-600 block mb-1">Materi Poster 1</label>
                    <Input 
                      placeholder="Nama materi poster 1" 
                      disabled={isReadOnly || (formData.p?.q || 0) < 1}
                      value={formData.p?.n1 || ''} 
                      onChange={e => handlePOSMFieldChange('p', 'n1', e.target.value)}
                      className="h-8 text-xs disabled:opacity-40"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-slate-600 block mb-1">Materi Poster 2</label>
                    <Input 
                      placeholder="Nama materi poster 2" 
                      disabled={isReadOnly || (formData.p?.q || 0) < 2}
                      value={formData.p?.n2 || ''} 
                      onChange={e => handlePOSMFieldChange('p', 'n2', e.target.value)}
                      className="h-8 text-xs disabled:opacity-40"
                    />
                  </div>
                </div>
                <PhotoUploader 
                  photos={formData.p?.e || []}
                  onAddPhotos={files => handleAddPhotos('p', files)}
                  onRemovePhoto={idx => handleRemovePhoto('p', idx)}
                  disabled={processingImage}
                  readOnly={isReadOnly}
                />
              </div>
            </div>
          </div>
        </form>

        {/* Footer */}
        {!isReadOnly && (
          <DialogFooter className="px-5 py-3 border-t border-slate-200/80 bg-white flex flex-row items-center justify-between sm:justify-between w-full">
            <div>
              {!isNew && (
                <Button 
                  type="button" 
                  variant="destructive" 
                  size="sm"
                  onClick={() => {
                    if (confirm(`Yakin ingin menghapus store ${formData.c} (${formData.n}) beserta seluruh fotonya?`)) {
                      onDelete(formData.id);
                    }
                  }}
                  className="h-8.5 px-3.5 text-xs font-semibold gap-1.5 cursor-pointer"
                >
                  <Trash2 size={13} />
                  <span>Hapus Store</span>
                </Button>
              )}
            </div>

            <Button 
              type="button" 
              variant="default" 
              size="sm" 
              onClick={handleSubmit}
              disabled={processingImage}
              className="h-8.5 px-4 text-xs font-semibold gap-1.5 cursor-pointer ml-auto"
            >
              {processingImage ? (
                <>
                  <Loader2 size={13} className="animate-spin" />
                  <span>Memproses Foto...</span>
                </>
              ) : (
                <>
                  <Check size={13} />
                  <span>Simpan Perubahan</span>
                </>
              )}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}

function PhotoUploader({ photos, onAddPhotos, onRemovePhoto, disabled, readOnly = false }) {
  const fileInputRef = useRef(null);

  return (
    <div className="pt-2.5 border-t border-slate-100">
      {!readOnly && (
        <input 
          type="file" 
          ref={fileInputRef} 
          className="hidden" 
          accept="image/*" 
          capture="environment"
          multiple 
          onChange={(e) => {
            onAddPhotos(e.target.files);
            e.target.value = '';
          }}
        />
      )}

      {photos.length > 0 ? (
        <div className="flex items-center gap-2 flex-wrap">
          {photos.map((photoUrl, idx) => (
            <div 
              key={idx} 
              className="relative h-13 w-13 rounded-lg overflow-hidden border border-slate-200 bg-slate-100 group shadow-2xs shrink-0"
            >
              <img 
                src={photoUrl} 
                alt={`Evidence ${idx + 1}`} 
                className="h-full w-full object-cover transition-transform group-hover:scale-105" 
              />
              {!readOnly && (
                <button 
                  type="button" 
                  className="absolute top-1 right-1 h-4.5 w-4.5 rounded-full bg-slate-900/80 hover:bg-rose-600 text-white flex items-center justify-center transition-colors shadow-xs cursor-pointer"
                  onClick={() => onRemovePhoto(idx)}
                  title="Hapus foto"
                >
                  <X size={10} strokeWidth={2.5} />
                </button>
              )}
            </div>
          ))}

          {!readOnly && (
            <button 
              type="button" 
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled}
              className="h-13 px-2.5 rounded-lg border border-dashed border-slate-300 hover:border-slate-400 hover:bg-slate-50 flex items-center gap-1 text-xs font-medium text-slate-600 transition-colors disabled:opacity-50 cursor-pointer shrink-0"
            >
              {disabled ? (
                <>
                  <Loader2 size={12} className="animate-spin text-slate-500" />
                  <span>Memproses...</span>
                </>
              ) : (
                <>
                  <Plus size={13} className="text-slate-500" />
                  <span>Tambah</span>
                </>
              )}
            </button>
          )}

          <span className="text-[11px] font-medium text-slate-500 ml-1">
            {photos.length} foto terlampir
          </span>
        </div>
      ) : (
        <div className="flex items-center justify-between">
          {!readOnly ? (
            <button 
              type="button" 
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 text-xs font-medium text-slate-700 shadow-2xs transition-colors disabled:opacity-50 cursor-pointer"
            >
              {disabled ? (
                <>
                  <Loader2 size={12} className="animate-spin text-slate-500" />
                  <span>Memproses...</span>
                </>
              ) : (
                <>
                  <Camera size={13} className="text-slate-500" />
                  <span>Unggah Bukti Foto</span>
                </>
              )}
            </button>
          ) : (
            <span className="text-[11px] text-slate-400 italic">
              Tidak ada akses unggah (Hanya Lihat)
            </span>
          )}

          <span className="text-[11px] text-slate-400 font-medium">
            Belum ada foto
          </span>
        </div>
      )}
    </div>
  );
}
