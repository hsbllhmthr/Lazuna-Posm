import React, { useState, useEffect } from 'react';
import { 
  POS_CONFIG, 
  POS_KEYS, 
  cleanStoreName, 
  formatSize, 
  getNeededPOSM, 
  getMissingPOSM, 
  isStoreComplete 
} from '../utils/storage';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Edit3, 
  Search, 
  X, 
  SearchX, 
  Filter, 
  SlidersHorizontal, 
  ChevronDown, 
  ChevronLeft, 
  ChevronRight 
} from 'lucide-react';

export default function CardGridView({ 
  stores = [], 
  onEditStore, 
  onOpenGallery,
  searchQuery = '',
  onSearchChange,
  activeFilter = '',
  onFilterChange 
}) {
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    setCurrentPage(1);
  }, [stores.length, pageSize]);

  const totalItems = stores.length;
  const isShowAll = pageSize === 'all';
  const numericPageSize = isShowAll ? Math.max(1, totalItems) : Number(pageSize);
  const totalPages = Math.max(1, Math.ceil(totalItems / numericPageSize));
  const validPage = Math.min(currentPage, totalPages);
  const startIndex = (validPage - 1) * numericPageSize;
  const endIndex = isShowAll ? totalItems : Math.min(startIndex + numericPageSize, totalItems);
  const currentStores = isShowAll ? stores : stores.slice(startIndex, endIndex);

  return (
    <div className="space-y-4">
      {/* Top Bar with Toolbar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 p-4 bg-white rounded-2xl border border-slate-200/80">
        <span className="font-semibold text-xs text-slate-700 shrink-0">
          Grid Kartu ({totalItems})
        </span>

        {/* Toolbar: Search + Filter Data + Opsi Tampilan Data */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Search Bar */}
          {onSearchChange && (
            <div className="relative flex-1 sm:w-56 md:w-60 min-w-[180px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
              <input 
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="w-full pl-8 pr-8 py-1.5 text-xs bg-slate-50/70 hover:bg-slate-100/70 focus:bg-white border border-slate-200/90 rounded-xl text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
              />
              {searchQuery && (
                <button 
                  type="button"
                  onClick={() => onSearchChange('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer transition-colors"
                  title="Hapus pencarian"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          )}

          {/* Filter Data Dropdown */}
          {onFilterChange && (
            <div className="relative inline-flex items-center">
              <Filter className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400 pointer-events-none" />
              <select
                value={activeFilter || ''}
                onChange={(e) => onFilterChange(e.target.value)}
                className="pl-7 pr-7 py-1.5 text-xs bg-slate-50/70 hover:bg-slate-100/70 focus:bg-white border border-slate-200/90 rounded-xl text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors cursor-pointer appearance-none"
                title="Filter data store"
              >
                <option value="">Semua Data</option>
                <optgroup label="Status Foto">
                  <option value="no">Belum Lengkap Foto</option>
                  <option value="ok">Sudah Lengkap Foto</option>
                </optgroup>
                <optgroup label="Belum Ada Foto POSM">
                  <option value="a">Akrilik belum foto</option>
                  <option value="o">Outdoor belum foto</option>
                  <option value="k">Kanopi belum foto</option>
                  <option value="m">Menu A3 belum foto</option>
                  <option value="t">TV Board belum foto</option>
                  <option value="p">Poster A4 belum foto</option>
                </optgroup>
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400 pointer-events-none" />
            </div>
          )}

          {/* Opsi Menampilkan Beberapa Data (Page Size / Rows Per Page) */}
          <div className="relative inline-flex items-center">
            <SlidersHorizontal className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400 pointer-events-none" />
            <select
              value={pageSize}
              onChange={(e) => {
                const val = e.target.value === 'all' ? 'all' : Number(e.target.value);
                setPageSize(val);
                setCurrentPage(1);
              }}
              className="pl-7 pr-7 py-1.5 text-xs bg-slate-50/70 hover:bg-slate-100/70 focus:bg-white border border-slate-200/90 rounded-xl text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors cursor-pointer appearance-none"
              title="Opsi jumlah data yang ditampilkan"
            >
              <option value={10}>10 data</option>
              <option value={20}>20 data</option>
              <option value={50}>50 data</option>
              <option value={100}>100 data</option>
              <option value="all">Semua data</option>
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {stores.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center space-y-3 border border-slate-200/80">
          <div className="h-9 w-9 rounded-full bg-slate-50 flex items-center justify-center mx-auto text-slate-400">
            <SearchX className="h-5 w-5" />
          </div>
          <p className="font-semibold text-xs text-slate-700">Tidak ada store yang cocok</p>
          <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
            {searchQuery ? `Tidak ditemukan hasil untuk "${searchQuery}"` : 'Kriteria filter tidak menemukan hasil.'}
          </p>
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs rounded-lg transition-colors cursor-pointer"
            >
              Hapus Pencarian
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {currentStores.map((store, localIndex) => {
              const idx = startIndex + localIndex;
              const isFinished = isStoreComplete(store);
              const needed = getNeededPOSM(store);
              const missing = getMissingPOSM(store);
              const doneCount = needed.length - missing.length;
              const noList = [];

        return (
          <Card 
            key={store.id || store.c} 
            className="border border-border rounded-lg bg-card hover:border-zinc-400 transition-colors flex flex-col justify-between"
          >
            <div>
              {/* Card Header */}
              <div className="p-3.5 border-b border-border flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold text-foreground">
                      {store.c}
                    </span>
                    <span className="text-[11px] text-muted-foreground font-medium">
                      #{store.no || idx + 1}
                    </span>
                  </div>
                  <h3 className="text-sm font-semibold truncate mt-0.5 text-foreground" title={store.n}>
                    {cleanStoreName(store.n)}
                  </h3>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-[11px] font-medium text-muted-foreground">
                    {doneCount}/{needed.length} foto
                  </span>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => onEditStore(store)}
                    className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                  >
                    <Edit3 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              {/* POSM Rows */}
              <div className="p-3.5 space-y-2">
                {POS_KEYS.map(k => {
                  const item = store[k];
                  const config = POS_CONFIG[k];
                  const qty = item?.q || 0;

                  if (!(qty > 0)) {
                    let reason = config.name;
                    if (k === 't' && item?.ket) {
                      reason += ` (${item.ket})`;
                    }
                    noList.push(reason);
                    return null;
                  }

                  let details = '';
                  if (k === 'a') {
                    details = `Ukuran ${formatSize(item.s) || '–'}${item.b ? ` · ${item.b}` : ''}${item.m ? ` · Materi: ${item.m}` : ''}`;
                  } else if (k === 'o') {
                    details = `Portrait · Ukuran ${formatSize(item.s) || '–'}`;
                  } else if (k === 'k') {
                    details = `Ukuran ${formatSize(item.s) || '–'}`;
                  } else if (k === 'm') {
                    details = `Standar 1 pcs`;
                  } else if (k === 't') {
                    const parts = [];
                    if (item.r) parts.push(item.r);
                    if (item.rt) parts.push(`Rotasi ${item.rt}`);
                    if (item.x) parts.push(`Penambahan ${item.x}`);
                    details = parts.join(' · ') || 'Orientasi belum diisi';
                  } else if (k === 'p') {
                    const mat = [item.n1, qty > 1 ? item.n2 : ''].filter(Boolean);
                    details = mat.length ? `Materi: ${mat.join(' · ')}` : 'Materi belum diisi';
                  }

                  const photos = item?.e || [];

                  return (
                    <div 
                      key={k} 
                      className="flex items-center justify-between gap-2 py-1 border-b border-border/40 last:border-0"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-medium text-foreground">
                            {config.short}
                          </span>
                          <span className="text-[10px] text-muted-foreground font-medium">
                            ×{qty}
                          </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground truncate">
                          {details}
                        </p>
                      </div>

                      <div className="shrink-0">
                        {photos.length > 0 ? (
                          <div className="flex items-center gap-1">
                            {photos.slice(0, 2).map((imgUrl, pIdx) => (
                              <img 
                                key={pIdx}
                                src={imgUrl} 
                                alt="POSM" 
                                className="h-6 w-6 rounded object-cover border border-border cursor-pointer hover:opacity-85"
                                loading="lazy"
                                onClick={() => onOpenGallery(photos, pIdx)}
                              />
                            ))}
                            {photos.length > 2 && (
                              <span 
                                className="text-[10px] font-medium text-muted-foreground cursor-pointer hover:underline pl-0.5"
                                onClick={() => onOpenGallery(photos, 2)}
                              >
                                +{photos.length - 2}
                              </span>
                            )}
                          </div>
                        ) : (
                          <button 
                            className="text-[10px] text-muted-foreground hover:text-foreground border border-border px-1.5 py-0.5 rounded cursor-pointer"
                            onClick={() => onEditStore(store, k)}
                          >
                            + Foto
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Missing Items Footer */}
            {noList.length > 0 && (
              <div className="px-3.5 py-2 border-t border-border bg-zinc-50/50 dark:bg-zinc-900/50 text-[11px] text-muted-foreground">
                <span className="font-medium text-foreground/60">Tidak ada: </span>
                {noList.join(', ')}
              </div>
            )}
          </Card>
        );
      })}
          </div>

          {/* Pagination Footer */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-white rounded-2xl border border-slate-200/80 text-xs text-slate-500">
            <div>
              {totalItems > 0 ? (
                <span>
                  Menampilkan <strong className="font-semibold text-slate-700">{startIndex + 1}</strong> – <strong className="font-semibold text-slate-700">{endIndex}</strong> dari <strong className="font-semibold text-slate-700">{totalItems}</strong> gerai {isShowAll && <span className="text-slate-400 font-normal">(Semua)</span>}
                </span>
              ) : (
                <span>Tidak ada data</span>
              )}
            </div>

            {!isShowAll && totalPages > 1 && (
              <div className="flex items-center gap-1.5 self-center sm:self-auto">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={validPage <= 1}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-medium text-xs cursor-pointer"
                >
                  <ChevronLeft size={14} />
                  <span>Previous</span>
                </button>

                <div className="flex items-center gap-1 px-1">
                  {totalPages <= 7 ? (
                    Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`h-7 w-7 rounded-lg text-xs font-semibold flex items-center justify-center transition-colors cursor-pointer ${
                          page === validPage 
                            ? 'bg-[#ff0000] text-white shadow-xs' 
                            : 'text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        {page}
                      </button>
                    ))
                  ) : (
                    <span className="px-2 text-xs font-medium text-slate-600">
                      {validPage} / {totalPages}
                    </span>
                  )}
                </div>

                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={validPage >= totalPages}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-medium text-xs cursor-pointer"
                >
                  <span>Next</span>
                  <ChevronRight size={14} />
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
