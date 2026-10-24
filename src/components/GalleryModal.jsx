import React, { useEffect } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function GalleryModal({ 
  photos, 
  currentIndex, 
  onIndexChange, 
  onClose 
}) {
  const total = photos.length;

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') onIndexChange((currentIndex - 1 + total) % total);
      if (e.key === 'ArrowRight') onIndexChange((currentIndex + 1) % total);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, total, onIndexChange, onClose]);

  if (!total) return null;
  const currentPhoto = photos[currentIndex];

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="relative max-w-4xl max-h-[92vh] flex flex-col items-center gap-3" 
        onClick={(e) => e.stopPropagation()}
      >
        <button 
          className="absolute -top-10 right-0 h-8 w-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer transition-colors"
          onClick={onClose}
          aria-label="Close"
        >
          <X size={18} />
        </button>

        <div className="rounded-xl overflow-hidden shadow-2xl bg-black border border-white/10 flex items-center justify-center">
          <img 
            src={currentPhoto} 
            alt={`Evidence ${currentIndex + 1} of ${total}`} 
            className="max-h-[75vh] max-w-[88vw] object-contain block" 
          />
        </div>

        <div className="flex items-center gap-3 bg-card/90 backdrop-blur-md px-4 py-1.5 rounded-full border border-border shadow-md">
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-7 px-2 text-xs"
            onClick={() => onIndexChange((currentIndex - 1 + total) % total)}
            disabled={total <= 1}
          >
            <ChevronLeft size={14} />
            <span>Sebelumnya</span>
          </Button>

          <span className="text-xs font-semibold text-foreground px-2">
            {currentIndex + 1} / {total}
          </span>

          <Button 
            variant="ghost" 
            size="sm" 
            className="h-7 px-2 text-xs"
            onClick={() => onIndexChange((currentIndex + 1) % total)}
            disabled={total <= 1}
          >
            <span>Berikutnya</span>
            <ChevronRight size={14} />
          </Button>
        </div>
      </div>
    </div>
  );
}
