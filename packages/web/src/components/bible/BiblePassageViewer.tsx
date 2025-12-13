import { useState, useEffect } from 'react';
import { BookOpen } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { LocalBibleService } from '@/services/LocalBibleService';

interface BiblePassageViewerProps {
  reference: string | null;
  onClose: () => void;
}

export function BiblePassageViewer({ reference, onClose }: BiblePassageViewerProps) {
  const [bibleText, setBibleText] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (reference) {
      setLoading(true);
      setBibleText(null);
      
      // Small delay for better UX
      const timer = setTimeout(async () => {
        try {
          const text = LocalBibleService.getVerses(reference);
          if (text) {
            setBibleText(text);
          } else {
            setBibleText('No se pudo encontrar el texto. Verifique la referencia.');
          }
        } catch (error) {
          console.error('Error fetching bible text:', error);
          setBibleText('Error al cargar el texto bíblico.');
        } finally {
          setLoading(false);
        }
      }, 200);

      return () => clearTimeout(timer);
    }
  }, [reference]);

  return (
    <Dialog open={!!reference} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            {reference}
          </DialogTitle>
          <DialogDescription className="sr-only">
            Texto bíblico del pasaje seleccionado
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 min-h-[100px]">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="text-lg leading-relaxed max-h-[60vh] overflow-y-auto pr-2">
              {bibleText}
            </div>
          )}
          <div className="mt-4 text-xs text-muted-foreground text-right">
            Fuente: Reina Valera 1960
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Simple clickable reference component
interface BibleReferenceProps {
  reference: string;
  onClick: (ref: string) => void;
  className?: string;
}

export function BibleReference({ reference, onClick, className = '' }: BibleReferenceProps) {
  return (
    <button
      type="button"
      onClick={() => onClick(reference)}
      className={`inline-flex items-center gap-1 text-sm text-primary font-medium hover:underline decoration-dotted underline-offset-4 cursor-pointer ${className}`}
    >
      <BookOpen className="h-3.5 w-3.5" />
      {reference}
    </button>
  );
}
