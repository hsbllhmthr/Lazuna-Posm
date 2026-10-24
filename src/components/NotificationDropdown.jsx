import React, { useState, useEffect, useRef } from 'react';
import { Bell } from 'lucide-react';

/**
 * Format timestamp into simple, short relative time
 */
function formatRelativeTime(isoString) {
  if (!isoString) return '';
  try {
    const date = new Date(isoString);
    const now = new Date();
    const diffSec = Math.floor((now - date) / 1000);

    if (diffSec < 60) return 'Baru saja';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m lalu`;
    const diffHour = Math.floor(diffMin / 60);
    if (diffHour < 24) return `${diffHour}j lalu`;
    return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
  } catch (e) {
    return '';
  }
}

export default function NotificationDropdown({
  notifications = [],
  onMarkAllAsRead,
  onClearNotifications,
  onMarkAsRead
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Batasi hanya 5 notifikasi terbaru
  const recentNotifications = notifications.slice(0, 5);
  const hasUnread = recentNotifications.some(n => !n.read);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Escape key to close
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) setIsOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button matching reference design */}
      <button 
        type="button"
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen && hasUnread && onMarkAllAsRead) {
            onMarkAllAsRead();
          }
        }}
        className="h-9 w-9 rounded-full text-slate-700 hover:text-slate-950 hover:bg-slate-100/80 flex items-center justify-center cursor-pointer transition-colors relative"
        aria-label="Notifikasi"
        title="Notifikasi"
      >
        <svg 
          width="20" 
          height="20" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="1.8" 
          strokeLinecap="round" 
          strokeLinejoin="round"
        >
          {/* Ringing wave lines on top-left */}
          <path d="M4.2 5.2C2.8 6.8 2 8.8 2 11" />
          <path d="M6.8 7.2C5.9 8.3 5.4 9.6 5.4 11" />
          {/* Bell body */}
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          {/* Clapper */}
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {hasUnread && (
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full ring-2 ring-white bg-[#ff3b30]" />
        )}
      </button>

      {/* Minimalist Dropdown */}
      {isOpen && (
        <div className="fixed left-4 right-4 top-16 sm:absolute sm:left-auto sm:right-0 sm:top-full sm:mt-2 sm:w-80 bg-white rounded-xl shadow-lg border border-slate-200 z-50 overflow-hidden text-left">
          {recentNotifications.length === 0 ? (
            /* Clean Empty State: Cukup teks dan icon saja */
            <div className="py-8 flex flex-col items-center justify-center gap-2 text-slate-400">
              <Bell size={22} className="stroke-[1.5]" />
              <span className="text-xs font-medium text-slate-500">Tidak ada notifikasi</span>
            </div>
          ) : (
            <div>
              {/* Header */}
              <div className="px-3.5 py-2.5 border-b border-slate-100 flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-800">Notifikasi</span>
                <button
                  type="button"
                  onClick={() => {
                    if (onClearNotifications) onClearNotifications();
                  }}
                  className="text-[11px] text-slate-400 hover:text-[#ff0000] cursor-pointer transition-colors"
                >
                  Hapus semua
                </button>
              </div>

              {/* List (Maksimal 5 Notifikasi Terbaru) */}
              <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
                {recentNotifications.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => onMarkAsRead && onMarkAsRead(item.id)}
                    className="px-3.5 py-2.5 hover:bg-slate-50/80 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-medium text-slate-800 truncate">
                        {item.title}
                      </p>
                      <span className="text-[10px] text-slate-400 shrink-0">
                        {formatRelativeTime(item.timestamp)}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                      {item.message}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
