import React, { useState, useEffect } from 'react';
import { cleanStoreName, formatSize, isStoreComplete, getNeededPOSM, getMissingPOSM } from '../utils/storage';
import { 
  Table, 
  TableHeader, 
  TableBody, 
  TableRow, 
  TableHead, 
  TableCell 
} from '@/components/ui/table';
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

export default function TableView({ 
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

  const renderEvidenceCell = (evidenceList) => {
    if (!evidenceList || !evidenceList.length) {
      return <span className="text-[11px] text-zinc-400">Belum</span>;
    }
    const firstImg = evidenceList[0];
    const moreCount = evidenceList.length - 1;

    return (
      <div className="flex items-center gap-1.5">
        <img 
          src={firstImg} 
          alt="Evidence" 
          className="h-7 w-7 rounded object-cover border border-border cursor-pointer hover:opacity-85"
          loading="lazy"
          onClick={() => onOpenGallery(evidenceList, 0)}
        />
        {moreCount > 0 && (
          <span 
            className="text-[10px] font-medium text-muted-foreground cursor-pointer hover:underline" 
            onClick={() => onOpenGallery(evidenceList, 1)}
          >
            +{moreCount}
          </span>
        )}
      </div>
    );
  };

  return (
    <div className="border border-border rounded-lg bg-card overflow-hidden">
      {/* Top Bar with Toolbar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 p-3.5 border-b border-border bg-slate-50/50">
        <span className="font-semibold text-xs text-slate-700 shrink-0">
          Tabel Detail Store ({totalItems})
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
                className="w-full pl-8 pr-8 py-1.5 text-xs bg-white border border-slate-200/90 rounded-xl text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
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
                className="pl-7 pr-7 py-1.5 text-xs bg-white border border-slate-200/90 rounded-xl text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors cursor-pointer appearance-none"
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
              className="pl-7 pr-7 py-1.5 text-xs bg-white border border-slate-200/90 rounded-xl text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors cursor-pointer appearance-none"
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
      <Table>
        <TableHeader>
          <TableRow className="border-b border-zinc-200 bg-zinc-50 hover:bg-transparent">
            <TableHead rowSpan={2} className="w-10 text-center text-xs font-semibold text-zinc-600">No</TableHead>
            <TableHead rowSpan={2} className="min-w-[140px] text-xs font-semibold text-zinc-700">Store</TableHead>
            <TableHead colSpan={4} className="text-center border-l border-zinc-200 text-xs font-semibold text-zinc-700">
              Akrilik Dinding
            </TableHead>
            <TableHead colSpan={3} className="text-center border-l border-zinc-200 text-xs font-semibold text-zinc-700">
              Spanduk Outdoor
            </TableHead>
            <TableHead colSpan={3} className="text-center border-l border-zinc-200 text-xs font-semibold text-zinc-700">
              Spanduk Kanopi
            </TableHead>
            <TableHead colSpan={1} className="text-center border-l border-zinc-200 text-xs font-semibold text-zinc-700">
              Menu A3
            </TableHead>
            <TableHead colSpan={4} className="text-center border-l border-zinc-200 text-xs font-semibold text-zinc-700">
              TV Board
            </TableHead>
            <TableHead colSpan={3} className="text-center border-l border-zinc-200 text-xs font-semibold text-zinc-700">
              Poster A4
            </TableHead>
            <TableHead rowSpan={2} className="w-10 text-right"></TableHead>
          </TableRow>
          <TableRow className="border-b border-zinc-200 bg-zinc-50 hover:bg-transparent text-[11px] text-zinc-500">
            <th className="border-l border-border px-2 py-1 font-normal text-left">Ukuran</th>
            <th className="px-2 py-1 font-normal text-left">Bahan</th>
            <th className="px-2 py-1 font-normal text-center">Jml</th>
            <th className="px-2 py-1 font-normal text-left">Foto</th>

            <th className="border-l border-border px-2 py-1 font-normal text-left">Ukuran</th>
            <th className="px-2 py-1 font-normal text-center">Jml</th>
            <th className="px-2 py-1 font-normal text-left">Foto</th>

            <th className="border-l border-border px-2 py-1 font-normal text-left">Ukuran</th>
            <th className="px-2 py-1 font-normal text-center">Jml</th>
            <th className="px-2 py-1 font-normal text-left">Foto</th>

            <th className="border-l border-border px-2 py-1 font-normal text-left">Foto</th>

            <th className="border-l border-border px-2 py-1 font-normal text-center">Jml</th>
            <th className="px-2 py-1 font-normal text-left">Orientasi</th>
            <th className="px-2 py-1 font-normal text-left">Penambahan</th>
            <th className="px-2 py-1 font-normal text-left">Foto</th>

            <th className="border-l border-border px-2 py-1 font-normal text-center">Jml</th>
            <th className="px-2 py-1 font-normal text-left">Materi</th>
            <th className="px-2 py-1 font-normal text-left">Foto</th>
          </TableRow>
        </TableHeader>
        <TableBody>
          {stores.length === 0 ? (
            <TableRow>
              <TableCell colSpan={20} className="py-12 text-center text-slate-400">
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
              </TableCell>
            </TableRow>
          ) : currentStores.map((store, localIndex) => {
            const idx = startIndex + localIndex;
            const isFinished = isStoreComplete(store);
            const needed = getNeededPOSM(store);
            const missing = getMissingPOSM(store);

            return (
              <TableRow key={store.id || store.c} className="hover:bg-zinc-50/60 dark:hover:bg-zinc-900/60">
                <TableCell className="text-center text-xs text-muted-foreground font-medium">
                  {store.no || idx + 1}
                </TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="text-[10px] text-muted-foreground font-medium">{store.c}</span>
                    <span className="font-semibold text-xs text-foreground">{cleanStoreName(store.n)}</span>
                  </div>
                </TableCell>

                {/* Akrilik */}
                {(store.a?.q || 0) > 0 ? (
                  <>
                    <TableCell className="border-l border-border text-xs">{formatSize(store.a.s) || '–'}</TableCell>
                    <TableCell className="text-xs">{store.a.b || '–'}</TableCell>
                    <TableCell className="text-center text-xs font-semibold">{store.a.q}</TableCell>
                    <TableCell>{renderEvidenceCell(store.a.e)}</TableCell>
                  </>
                ) : (
                  <TableCell colSpan={4} className="border-l border-border text-center text-muted-foreground/30 text-xs">
                    –
                  </TableCell>
                )}

                {/* Outdoor */}
                {(store.o?.q || 0) > 0 ? (
                  <>
                    <TableCell className="border-l border-border text-xs">{formatSize(store.o.s) || '–'}</TableCell>
                    <TableCell className="text-center text-xs font-semibold">{store.o.q}</TableCell>
                    <TableCell>{renderEvidenceCell(store.o.e)}</TableCell>
                  </>
                ) : (
                  <TableCell colSpan={3} className="border-l border-border text-center text-muted-foreground/30 text-xs">
                    –
                  </TableCell>
                )}

                {/* Kanopi */}
                {(store.k?.q || 0) > 0 ? (
                  <>
                    <TableCell className="border-l border-border text-xs">{formatSize(store.k.s) || '–'}</TableCell>
                    <TableCell className="text-center text-xs font-semibold">{store.k.q}</TableCell>
                    <TableCell>{renderEvidenceCell(store.k.e)}</TableCell>
                  </>
                ) : (
                  <TableCell colSpan={3} className="border-l border-border text-center text-muted-foreground/30 text-xs">
                    –
                  </TableCell>
                )}

                {/* Menu */}
                <TableCell className="border-l border-border">
                  {renderEvidenceCell(store.m?.e)}
                </TableCell>

                {/* TV */}
                {(store.t?.q || 0) > 0 || !store.t?.ket ? (
                  (store.t?.q || 0) > 0 ? (
                    <>
                      <TableCell className="border-l border-border text-center text-xs font-semibold">{store.t.q}</TableCell>
                      <TableCell className="text-xs">
                        <div>{store.t.r || '–'}</div>
                        {store.t.rt && <span className="text-[10px] text-muted-foreground block">Rotasi {store.t.rt}</span>}
                      </TableCell>
                      <TableCell className="text-xs">{store.t.x || '–'}</TableCell>
                      <TableCell>{renderEvidenceCell(store.t.e)}</TableCell>
                    </>
                  ) : (
                    <TableCell colSpan={4} className="border-l border-border text-center text-muted-foreground/30 text-xs">
                      –
                    </TableCell>
                  )
                ) : (
                  <TableCell colSpan={4} className="border-l border-border text-center text-muted-foreground/40 text-xs">
                    {store.t.ket}
                  </TableCell>
                )}

                {/* Poster */}
                {(store.p?.q || 0) > 0 ? (
                  <>
                    <TableCell className="border-l border-border text-center text-xs font-semibold">{store.p.q}</TableCell>
                    <TableCell className="text-xs">
                      {[store.p.n1, store.p.q > 1 ? store.p.n2 : ''].filter(Boolean).map((n, i) => (
                        <div key={i} className="text-[11px] truncate max-w-[120px]">{n}</div>
                      )) || '–'}
                    </TableCell>
                    <TableCell>{renderEvidenceCell(store.p.e)}</TableCell>
                  </>
                ) : (
                  <TableCell colSpan={3} className="border-l border-border text-center text-muted-foreground/30 text-xs">
                    –
                  </TableCell>
                )}

                <TableCell className="text-right">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => onEditStore(store)}
                    className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                  >
                    <Edit3 className="h-3.5 w-3.5" />
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      {/* Pagination Footer */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 border-t border-border bg-slate-50/50 text-xs text-slate-500">
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
