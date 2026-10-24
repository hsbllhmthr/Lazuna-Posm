import React, { useState, useRef, useEffect } from 'react';
import { Menu, Plus, LogOut, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import NotificationDropdown from './NotificationDropdown';

export default function Navbar({ 
  viewMode,
  onViewModeChange,
  onAddStore,
  onOpenMobileMenu,
  notifications = [],
  onMarkAllAsRead,
  onClearNotifications,
  onMarkAsRead,
  isRealtime = false,
  currentUser = null,
  canCRUD = true,
  onLogout
}) {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const profileRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setIsProfileOpen(false);
      }
    };
    if (isProfileOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isProfileOpen]);

  const tabs = [
    { id: 'summary', label: 'Summary' },
    { id: 'checklist', label: 'Checklist POSM' },
    { id: 'table', label: 'Tabel Detail' },
    { id: 'cards', label: 'Grid Kartu' },
  ];

  return (
    <header className="px-4 sm:px-8 pt-4 sm:pt-6 pb-2">
      {/* Top Row: Title (Left) + Notification & Profile (Right) aligned on a single row */}
      <div className="flex items-center justify-between gap-2 sm:gap-4">
        {/* Left: Mobile Toggle + Title */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onOpenMobileMenu}
            className="lg:hidden h-8 w-8 sm:h-9 sm:w-9 -ml-1 text-slate-600 hover:text-slate-900 shrink-0"
            aria-label="Open sidebar"
          >
            <Menu size={20} />
          </Button>

          <h1 className="font-heading text-lg sm:text-2xl font-bold tracking-tight text-slate-900 truncate">
            Dashboard
          </h1>
        </div>

        {/* Right: Notification Bell + User Profile aligned on top-right */}
        <div className="flex items-center gap-1.5 sm:gap-4 shrink-0">
          {/* Realtime Notification Bell */}
          <NotificationDropdown 
            notifications={notifications}
            onMarkAllAsRead={onMarkAllAsRead}
            onClearNotifications={onClearNotifications}
            onMarkAsRead={onMarkAsRead}
            isRealtime={isRealtime}
          />

          {/* User Profile & Dropdown */}
          {currentUser && (
            <div className="relative" ref={profileRef}>
              <button
                type="button"
                onClick={() => setIsProfileOpen((prev) => !prev)}
                className="flex items-center gap-2 sm:gap-3 py-1 pl-1 pr-1 sm:px-1.5 rounded-xl hover:bg-slate-100/70 transition-colors cursor-pointer text-left"
              >
                {/* Circular Initial Avatar */}
                <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-slate-900 text-white font-heading font-bold text-xs sm:text-sm shrink-0 shadow-xs flex items-center justify-center">
                  {currentUser.name?.trim().charAt(0).toUpperCase() || 'A'}
                </div>

                {/* Name + Chevron & Role */}
                <div className="flex flex-col leading-tight min-w-0">
                  <div className="flex items-center gap-1 sm:gap-2">
                    <span className="text-xs sm:text-[13.5px] font-bold text-slate-800 tracking-tight truncate max-w-[105px] min-[390px]:max-w-[135px] sm:max-w-none">
                      {currentUser.name}
                    </span>
                    <ChevronDown 
                      size={14} 
                      className={`text-slate-600 stroke-[2] shrink-0 transition-transform duration-200 ${
                        isProfileOpen ? 'rotate-180' : ''
                      }`} 
                    />
                  </div>
                  <span className="text-[10px] sm:text-xs text-slate-500 font-normal mt-0.5 truncate">
                    {currentUser.role}
                  </span>
                </div>
              </button>

              {/* Profile Dropdown Menu */}
              {isProfileOpen && (
                <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-lg border border-slate-200/90 py-1.5 z-50 text-left">
                  <div className="px-3.5 py-2 border-b border-slate-100">
                    <p className="text-xs font-bold text-slate-800 truncate">{currentUser.name}</p>
                    <p className="text-[11px] text-slate-400 truncate mt-0.5">{currentUser.email}</p>
                  </div>

                  {canCRUD && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsProfileOpen(false);
                        if (onAddStore) onAddStore();
                      }}
                      className="w-full px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2 transition-colors cursor-pointer"
                    >
                      <Plus size={14} className="text-slate-500" />
                      <span>Tambah Store Baru</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      setIsProfileOpen(false);
                      if (onLogout) onLogout();
                    }}
                    className="w-full px-3.5 py-2 text-xs font-medium text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    <LogOut size={14} />
                    <span>Keluar / Logout</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Under Title: Navigation Tabs with clean underline */}
      <div className="flex items-center justify-between sm:justify-start gap-3 sm:gap-6 mt-4 border-b border-slate-200/60 text-xs overflow-x-auto no-scrollbar whitespace-nowrap">
        {tabs.map((tab) => {
          const isActive = viewMode === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onViewModeChange(tab.id)}
              className={`pb-2.5 font-medium transition-all relative cursor-pointer ${
                isActive 
                  ? 'text-[#ff0000] font-semibold' 
                  : 'text-slate-400 hover:text-slate-700'
              }`}
            >
              {tab.label}
              {isActive && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#ff0000] rounded-full" />
              )}
            </button>
          );
        })}
      </div>
    </header>
  );
}
