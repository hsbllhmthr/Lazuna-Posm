import React from 'react';
import { Search, X, CheckSquare, Table as TableIcon, LayoutGrid } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function FilterBar({
  searchQuery,
  onSearchChange,
  activeFilter,
  onFilterChange,
  viewMode,
  onViewModeChange,
  sortOrder,
  onSortOrderChange,
  filteredCount,
  totalCount
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 py-2 border-b border-border pb-4">
      {/* Search Input */}
      <div className="relative flex-1 min-w-[220px] max-w-sm">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
        <Input 
          type="search"
          placeholder="Cari kode store, nama, ukuran..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-8 pr-7 h-8 text-xs bg-background rounded-md border-border"
        />
        {searchQuery && (
          <button 
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
            onClick={() => onSearchChange('')}
            aria-label="Clear search"
          >
            <X size={12} />
          </button>
        )}
      </div>

      {/* Filter & Sort Dropdowns */}
      <div className="flex items-center flex-wrap gap-2">
        <select 
          value={activeFilter} 
          onChange={(e) => onFilterChange(e.target.value)}
          className="h-8 px-2.5 text-xs rounded-md border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer"
        >
          <option value="">Semua Store ({totalCount})</option>
          <option value="no">Belum Lengkap Foto</option>
          <option value="ok">Sudah Lengkap</option>
          <option value="a">Akrilik belum foto</option>
          <option value="o">Outdoor belum foto</option>
          <option value="k">Kanopi belum foto</option>
          <option value="m">Menu A3 belum foto</option>
          <option value="t">TV Board belum foto</option>
          <option value="p">Poster A4 belum foto</option>
        </select>

        <select 
          value={sortOrder} 
          onChange={(e) => onSortOrderChange(e.target.value)}
          className="h-8 px-2.5 text-xs rounded-md border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer"
        >
          <option value="">Urut No</option>
          <option value="m">Kurang foto terbanyak</option>
          <option value="name">Nama (A-Z)</option>
        </select>
      </div>

      {/* Tabs View Switcher */}
      <div className="flex items-center gap-3">
        <Tabs value={viewMode} onValueChange={onViewModeChange}>
          <TabsList className="h-8 bg-muted/50 p-0.5 rounded-md">
            <TabsTrigger value="checklist" className="px-2.5 py-1 text-xs font-normal">
              <CheckSquare size={12} />
              <span>Checklist</span>
            </TabsTrigger>
            <TabsTrigger value="table" className="px-2.5 py-1 text-xs font-normal">
              <TableIcon size={12} />
              <span>Tabel</span>
            </TabsTrigger>
            <TabsTrigger value="cards" className="px-2.5 py-1 text-xs font-normal">
              <LayoutGrid size={12} />
              <span>Kartu</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <span className="text-xs text-muted-foreground font-medium">
          {filteredCount}/{totalCount}
        </span>
      </div>
    </div>
  );
}
