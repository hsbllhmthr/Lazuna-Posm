import React, { useEffect } from 'react';
import { CheckCircle2, AlertCircle, X } from 'lucide-react';

export default function Toast({ message, type = 'success', onClose }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 4000);
    return () => clearTimeout(timer);
  }, [message, onClose]);

  if (!message) return null;

  return (
    <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl border border-slate-200/90 bg-white text-slate-800 shadow-xl text-sm font-semibold max-w-lg animate-in slide-in-from-top-5 fade-in duration-200">
      <div className="shrink-0">
        {type === 'error' ? (
          <AlertCircle size={19} className="text-destructive" />
        ) : (
          <CheckCircle2 size={19} className="text-emerald-500" />
        )}
      </div>
      <div className="flex-1 text-slate-800 leading-snug">{message}</div>
      <button 
        className="text-slate-400 hover:text-slate-700 cursor-pointer p-0.5 ml-1 transition-colors" 
        onClick={onClose}
        aria-label="Close"
      >
        <X size={15} />
      </button>
    </div>
  );
}
