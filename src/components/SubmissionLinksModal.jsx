import React, { useState } from 'react';
import { X, ExternalLink, Copy, Check } from 'lucide-react';

const SUBMISSION_LINKS = [
  {
    id: 'form-sm',
    title: 'Link Dikirim ke SM',
    url: 'https://docs.google.com/forms/d/e/1FAIpQLSdF1joQO8WjO0THwhgktojGqySPIavmWkyo6QdK-4ylllW1MA/viewform',
  },
  {
    id: 'edit-form',
    title: 'Edit Google Form (Akun Marketing)',
    url: 'https://docs.google.com/forms/d/1vDGzfsvRKbQpy_SVQfvVtwU0YG3BXPsQMybx4rsSZ5s/edit',
  },
  {
    id: 'rekapan-store',
    title: 'Rekapan Per Store (Akun Marketing)',
    url: 'https://docs.google.com/spreadsheets/d/1rXAX9wKWEFN-y_vh8ZramqRBmYbvl4zn22Ij4zIdEbQ/edit?gid=1#gid=1',
  },
  {
    id: 'data-mentah',
    title: 'Data Mentah (Akun Marketing)',
    url: 'https://docs.google.com/spreadsheets/d/1rXAX9wKWEFN-y_vh8ZramqRBmYbvl4zn22Ij4zIdEbQ/edit?gid=474785988#gid=474785988',
  },
  {
    id: 'folder-foto',
    title: 'Folder Foto (Akun Marketing)',
    url: 'https://drive.google.com/drive/folders/1Nwd3nOMVqxB0xuG6S8OrlQvi7wBUBsOH',
  },
];

export default function SubmissionLinksModal({ isOpen, onClose }) {
  const [copiedId, setCopiedId] = useState(null);

  if (!isOpen) return null;

  const handleCopy = async (id, url) => {
    try {
      await navigator.clipboard.writeText(url);
    } catch (e) {
      const textarea = document.createElement('textarea');
      textarea.value = url;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
    setCopiedId(id);
    setTimeout(() => {
      setCopiedId((prev) => (prev === id ? null : prev));
    }, 2000);
  };

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 font-sans"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-xl w-full max-w-lg shadow-xl border border-slate-200 overflow-hidden text-slate-900 animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-4 pb-2">
          <h3 className="font-heading font-bold text-sm sm:text-base text-slate-900">
            Link & Form Pengajuan
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
            aria-label="Tutup"
          >
            <X size={16} />
          </button>
        </div>

        {/* Clean Divided List */}
        <div className="px-5 pb-4 divide-y divide-slate-100">
          {SUBMISSION_LINKS.map((item) => {
            const isCopied = copiedId === item.id;
            return (
              <div
                key={item.id}
                className="py-3 flex items-center justify-between gap-4"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-slate-800 truncate">
                    {item.title}
                  </p>
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-xs font-normal text-slate-400 hover:text-blue-600 truncate mt-0.5 transition-colors"
                  >
                    {item.url}
                  </a>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleCopy(item.id, item.url)}
                    className="h-7.5 px-2.5 rounded-lg border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 text-[11px] font-medium text-slate-600 inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                    title="Salin link"
                  >
                    {isCopied ? (
                      <>
                        <Check size={12} className="text-emerald-600" />
                        <span className="text-emerald-600">Disalin</span>
                      </>
                    ) : (
                      <>
                        <Copy size={12} className="text-slate-400" />
                        <span>Salin</span>
                      </>
                    )}
                  </button>

                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="h-7.5 px-2.5 rounded-lg border border-slate-200 hover:border-slate-300 bg-slate-50 hover:bg-slate-100 text-[11px] font-medium text-slate-700 inline-flex items-center gap-1 transition-colors cursor-pointer"
                    title="Buka di tab baru"
                  >
                    <span>Buka</span>
                    <ExternalLink size={11} className="text-slate-400" />
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
