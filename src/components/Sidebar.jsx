import React from 'react';
import { 
  Building2, 
  AlertCircle, 
  CheckCircle2, 
  Frame, 
  Image as ImageIcon, 
  Layers, 
  BookOpen, 
  Tv, 
  FileText, 
  Plus, 
  FileSpreadsheet, 
  Download, 
  Upload, 
  X,
  PieChart,
  Cloud,
  LayoutDashboard,
  ChevronsUpDown,
  Compass,
  MessageSquare,
  Users,
  CheckSquare2,
  FileCheck,
  LogOut,
  Link2
} from 'lucide-react';
import { POS_CONFIG, POS_KEYS, getNeededPOSM, isStoreComplete } from '../utils/storage';

export default function Sidebar({
  stores = [],
  activeFilter,
  onFilterChange,
  onAddStore,
  onExportCSV,
  onExportHTML,
  onImportClick,
  isOpen,
  onClose,
  isRealtimeConnected = false,
  onOpenFirebaseModal,
  onOpenLinksModal,
  currentUser = null,
  canCRUD = true,
  onLogout
}) {
  // Counts
  const totalStores = stores.length;
  const storesWithPOSM = stores.filter(d => getNeededPOSM(d).length > 0);
  const completeStores = storesWithPOSM.filter(isStoreComplete).length;
  const incompleteStores = storesWithPOSM.length - completeStores;

  const posmIcons = {
    a: Frame,
    o: ImageIcon,
    k: Layers,
    m: BookOpen,
    t: Tv,
    p: FileText,
  };

  const navItemClass = (isActive) =>
    `w-full flex items-center justify-between px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer text-left ${
      isActive 
        ? 'bg-[#ffdf01] text-slate-900 font-bold shadow-xs' 
        : 'text-white/85 hover:text-white hover:bg-white/15'
    }`;

  const sidebarContent = (
    <div className="min-h-full flex flex-col justify-between px-4 pt-4 pb-8 select-none bg-[#ff0000] text-white">
      {/* Top Part */}
      <div className="space-y-3.5 pb-4">
        {/* Brand Header */}
        <div className="flex items-center justify-between px-2 pt-1 pb-1">
          <div className="flex items-center">
            <img 
              src="/lazuna.png" 
              alt="Lazuna Chicken" 
              className="h-10 sm:h-11 w-auto max-w-[170px] object-contain drop-shadow-sm" 
            />
          </div>
          {onClose && (
            <button 
              className="lg:hidden text-white/80 hover:text-white p-1"
              onClick={onClose}
              aria-label="Close sidebar"
            >
              <X size={18} />
            </button>
          )}
        </div>

        {/* Navigation Section: MAIN */}
        <div className="space-y-1 pt-1">
          <div className="px-3 pb-1.5 text-[10px] font-bold tracking-wider text-white/60 uppercase">
            Main
          </div>

          <button 
            className={navItemClass(!activeFilter)}
            onClick={() => { onFilterChange(''); onClose?.(); }}
          >
            <div className="flex items-center gap-2.5">
              <PieChart size={16} className={!activeFilter ? 'text-slate-900' : 'text-white/90'} />
              <span>Dashboard</span>
            </div>
          </button>

          <button 
            className={navItemClass(activeFilter === 'no')}
            onClick={() => { onFilterChange('no'); onClose?.(); }}
          >
            <div className="flex items-center gap-2.5">
              <AlertCircle size={16} className={activeFilter === 'no' ? 'text-slate-900' : 'text-white/90'} />
              <span>Perlu Foto</span>
            </div>
            {incompleteStores > 0 && (
              <span className={`h-5 min-w-5 px-1.5 rounded-full text-[10px] font-semibold flex items-center justify-center ${
                activeFilter === 'no' ? 'bg-[#ff0000] text-[#ffdf01]' : 'bg-white text-[#ff0000] font-bold'
              }`}>
                {incompleteStores}
              </span>
            )}
          </button>

          <button 
            className={navItemClass(activeFilter === 'ok')}
            onClick={() => { onFilterChange('ok'); onClose?.(); }}
          >
            <div className="flex items-center gap-2.5">
              <CheckCircle2 size={16} className={activeFilter === 'ok' ? 'text-slate-900' : 'text-white/90'} />
              <span>Sudah Lengkap</span>
            </div>
            <span className={`text-[11px] font-semibold ${
              activeFilter === 'ok' ? 'text-slate-900' : 'text-white/85'
            }`}>
              {completeStores}
            </span>
          </button>
        </div>

        {/* Navigation Section: SHORTCUTS (Kategori POSM) */}
        <div className="space-y-1 pt-1">
          <div className="px-3 pb-1.5 text-[10px] font-bold tracking-wider text-white/60 uppercase">
            Shortcuts
          </div>

          {POS_KEYS.map(k => {
            const config = POS_CONFIG[k];
            const Icon = posmIcons[k] || Frame;
            const isActive = activeFilter === k;
            const targetStores = stores.filter(d => (d[k]?.q || 0) > 0);
            const missing = targetStores.filter(d => !d[k]?.e || d[k].e.length > 0 ? false : true).length;

            return (
              <button 
                key={k}
                className={navItemClass(isActive)}
                onClick={() => { onFilterChange(isActive ? '' : k); onClose?.(); }}
              >
                <div className="flex items-center gap-2.5 truncate">
                  <Icon size={15} className={isActive ? 'text-slate-900' : 'text-white/90'} />
                  <span className="truncate">{config.short}</span>
                </div>
                {missing > 0 && (
                  <span className={`text-[10px] font-semibold ${
                    isActive ? 'text-slate-900' : 'text-white/80'
                  }`}>
                    -{missing}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Navigation Section: ALAT & DATA */}
        <div className="space-y-1 pt-1 pb-4">
          <div className="px-3 pb-1 text-[10px] font-bold tracking-wider text-white/60 uppercase">
            Tools
          </div>

          {onOpenLinksModal && (
            <button 
              className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-xl text-xs font-medium text-white/85 hover:text-white hover:bg-white/15 transition-colors text-left cursor-pointer"
              onClick={() => { onOpenLinksModal(); onClose?.(); }}
            >
              <Link2 size={15} className="text-white/85" />
              <span>Link & Form Pengajuan</span>
            </button>
          )}

          {onOpenFirebaseModal && (
            <button 
              className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-xl text-xs font-medium text-white/85 hover:text-white hover:bg-white/15 transition-colors text-left cursor-pointer"
              onClick={() => { onOpenFirebaseModal(); onClose?.(); }}
            >
              <Cloud size={15} className="text-white/85" />
              <span>Koneksi Realtime</span>
            </button>
          )}

          {canCRUD && (
            <button 
              className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-xl text-xs font-medium text-white/85 hover:text-white hover:bg-white/15 transition-colors text-left cursor-pointer"
              onClick={() => { onAddStore(); onClose?.(); }}
            >
              <Plus size={15} className="text-white/85" />
              <span>Tambah Store Baru</span>
            </button>
          )}

          <button 
            className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-xl text-xs font-medium text-white/85 hover:text-white hover:bg-white/15 transition-colors text-left cursor-pointer"
            onClick={onExportCSV}
          >
            <FileSpreadsheet size={15} className="text-white/85" />
            <span>Export ke CSV</span>
          </button>

          <button 
            className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-xl text-xs font-medium text-white/85 hover:text-white hover:bg-white/15 transition-colors text-left cursor-pointer"
            onClick={onExportHTML}
          >
            <Download size={15} className="text-white/85" />
            <span>Unduh Backup HTML</span>
          </button>

          {canCRUD && (
            <button 
              className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-xl text-xs font-medium text-white/85 hover:text-white hover:bg-white/15 transition-colors text-left cursor-pointer"
              onClick={onImportClick}
            >
              <Upload size={15} className="text-white/85" />
              <span>Impor Data File</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar (Fixed Left) */}
      <aside className="hidden lg:block w-64 shrink-0 bg-[#ff0000] h-screen sticky top-0 overflow-y-auto z-30 border-r border-black/10">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer Backdrop & Sidebar */}
      {isOpen && (
        <div 
          className="lg:hidden fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex animate-in fade-in duration-150"
          onClick={onClose}
        >
          <div 
            className="w-68 max-w-[85vw] h-full bg-[#ff0000] shadow-2xl animate-in slide-in-from-left duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
}
