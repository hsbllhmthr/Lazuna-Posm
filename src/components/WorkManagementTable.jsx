import React, { useState, useEffect } from 'react';
import { 
  Pencil, 
  ChevronLeft, 
  ChevronRight,
  Check,
  Search,
  X,
  SearchX,
  Filter,
  SlidersHorizontal,
  ChevronDown
} from 'lucide-react';
import { 
  POS_CONFIG, 
  POS_KEYS, 
  cleanStoreName, 
  getNeededPOSM, 
  getMissingPOSM 
} from '../utils/storage';

export default function WorkManagementTable({ 
  stores = [], 
  allStores = [], 
  onEditStore, 
  onOpenGallery,
  searchQuery = '',
  onSearchChange,
  activeFilter = '',
  onFilterChange
}) {
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  // Reset to first page when filtered stores list or pageSize changes
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

  // Calculate dynamic stats for each POSM category header (e.g. 29/37 foto)
  const headerStats = POS_KEYS.map(k => {
    const config = POS_CONFIG[k];
    const sourceStores = allStores.length > 0 ? allStores : stores;
    const targetStores = sourceStores.filter(d => (d[k]?.q || 0) > 0);
    const withPhotos = targetStores.filter(d => d[k]?.e && d[k].e.length > 0);
    return {
      key: k,
      config,
      withPhotosCount: withPhotos.length,
      targetCount: targetStores.length,
      ratio: `${withPhotos.length}/${targetStores.length} foto`
    };
  });

  return (
    <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/80 select-none">
      {/* Card Header with Controls on the Right */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-4">
        <h2 className="font-heading text-sm sm:text-base font-bold text-slate-900 shrink-0">
          Work Management
        </h2>

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

      {/* Table matching user's requested header structure (light style, NOT black) */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs min-w-[760px]">
          <thead>
            <tr className="text-slate-400 font-semibold border-b border-dashed border-slate-200/70 pb-2">
              <th className="py-2.5 px-3 text-center font-semibold text-[11px] tracking-wide uppercase w-12">
                No
              </th>
              <th className="py-2.5 px-3 font-semibold text-[11px] tracking-wide uppercase w-20">
                Kode
              </th>
              <th className="py-2.5 px-4 font-semibold text-[11px] tracking-wide uppercase min-w-[150px]">
                Nama Store
              </th>

              {/* POSM Category Headers */}
              {headerStats.map(h => (
                <th 
                  key={h.key} 
                  className="text-center py-2.5 px-2 min-w-[90px]"
                >
                  <div className="font-semibold text-[11px] tracking-wide uppercase text-slate-600">
                    {h.config.short}
                  </div>
                  <div className="text-[10px] text-slate-400 font-normal mt-0.5 whitespace-nowrap lowercase">
                    {h.withPhotosCount}/{h.targetCount} foto
                  </div>
                </th>
              ))}

              <th className="text-center py-2.5 px-3 font-semibold text-[11px] tracking-wide uppercase w-24">
                Progres
              </th>
              <th className="py-2.5 pr-3 text-right w-10"></th>
            </tr>
          </thead>

          <tbody className="divide-y divide-dashed divide-slate-100">
            {currentStores.length === 0 ? (
              <tr>
                <td colSpan={POS_KEYS.length + 5} className="py-12 text-center text-slate-400">
                  <div className="h-9 w-9 rounded-full bg-slate-50 flex items-center justify-center mx-auto text-slate-400 mb-2">
                    <SearchX className="h-5 w-5" />
                  </div>
                  <p className="font-semibold text-xs text-slate-700">Tidak ada store yang cocok</p>
                  <p className="text-[11px] text-slate-400 mt-1 max-w-xs mx-auto">
                    {searchQuery 
                      ? `Tidak ditemukan hasil untuk "${searchQuery}"`
                      : 'Kriteria filter tidak menemukan hasil.'}
                  </p>
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => onSearchChange('')}
                      className="mt-3 px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs rounded-lg transition-colors cursor-pointer"
                    >
                      Hapus Pencarian
                    </button>
                  )}
                </td>
              </tr>
            ) : currentStores.map((store, localIndex) => {
              const originalIndex = startIndex + localIndex;
              const needed = getNeededPOSM(store);
              const missing = getMissingPOSM(store);
              const doneCount = needed.length - missing.length;
              const isFinished = needed.length > 0 && missing.length === 0;
              const progressPct = needed.length > 0 ? Math.round((doneCount / needed.length) * 100) : 0;

              return (
                <tr 
                  key={store.id || store.c} 
                  className="hover:bg-slate-50/70 transition-colors group"
                >
                  {/* No Column */}
                  <td className="py-3.5 px-3 text-center text-slate-400 font-medium text-xs">
                    {store.no || originalIndex + 1}
                  </td>

                  {/* Kode Store */}
                  <td className="py-3.5 px-3">
                    <span className="text-xs font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200/80">
                      {store.c}
                    </span>
                  </td>

                  {/* Nama Store (clean, no icon) */}
                  <td className="py-3.5 px-4">
                    <span className="font-semibold text-slate-900 text-xs block truncate max-w-[200px]">
                      {cleanStoreName(store.n)}
                    </span>
                  </td>

                  {/* POSM Columns */}
                  {POS_KEYS.map(k => {
                    const item = store[k];
                    const config = POS_CONFIG[k];
                    const hasPOSM = (item?.q || 0) > 0;
                    const photoCount = item?.e?.length || 0;

                    if (!hasPOSM) {
                      return (
                        <td key={k} className="text-center py-3.5 px-2">
                          <div className="flex items-center justify-center">
                            <span className="w-2.5 h-[2px] bg-slate-200 rounded-full select-none" />
                          </div>
                        </td>
                      );
                    }

                    if (photoCount > 0) {
                      return (
                        <td key={k} className="text-center py-3.5 px-2">
                          <button 
                            className={`inline-flex items-center justify-center rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-all cursor-pointer group/btn active:scale-95 shadow-xs ${
                              photoCount > 1 ? 'h-6 px-1.5 gap-1 min-w-[32px]' : 'h-6 w-6'
                            }`}
                            onClick={() => onOpenGallery(item.e, 0)}
                            title={`${config.name}: ${photoCount} foto eviden — klik untuk lihat`}
                          >
                            <Check size={11} strokeWidth={2.8} className="text-white group-hover/btn:scale-110 transition-transform" />
                            {photoCount > 1 && (
                              <span className="text-[10px] font-bold text-white tabular-nums">
                                {photoCount}
                              </span>
                            )}
                          </button>
                        </td>
                      );
                    }

                    return (
                      <td key={k} className="text-center py-3.5 px-2">
                        <button 
                          className="inline-flex items-center justify-center h-6 w-6 rounded-lg bg-[#ffdf01] text-yellow-950 hover:bg-[#e6c800] transition-all cursor-pointer group/btn active:scale-95 shadow-xs"
                          onClick={() => onEditStore(store, k)}
                          title={`${config.name}: belum ada foto — klik untuk unggah`}
                        >
                          <svg viewBox="0 0 14 14" width="11" height="11" fill="none" className="text-yellow-950 group-hover/btn:scale-110 transition-transform">
                            <line x1="7" y1="2.5" x2="7" y2="7.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
                            <circle cx="7" cy="11" r="1.15" fill="currentColor" />
                          </svg>
                        </button>
                      </td>
                    );
                  })}

                  {/* Progres Column */}
                  <td className="py-3.5 px-3">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-14 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                        <div 
                          className={`h-full transition-all duration-300 ${isFinished ? 'bg-emerald-500' : 'bg-slate-700'}`}
                          style={{ width: `${progressPct}%` }}
                        />
                      </div>
                      <span className="text-[11px] font-semibold text-slate-600 min-w-[24px] text-right">
                        {doneCount}/{needed.length}
                      </span>
                    </div>
                  </td>

                  {/* Action Column */}
                  <td className="py-3.5 pr-3 text-right">
                    <button
                      onClick={() => onEditStore(store)}
                      className="h-7 w-7 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100 flex items-center justify-center transition-colors cursor-pointer"
                      title="Edit data store"
                    >
                      <Pencil size={13} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-5 mt-2 border-t border-slate-100 text-xs text-slate-500">
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
    </div>
  );
}
