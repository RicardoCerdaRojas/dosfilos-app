import { useState } from 'react';
import { BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BiblePassageViewer } from '@/components/bible/BiblePassageViewer';
import { cn } from '@/lib/utils';

interface PassageQuickViewProps {
  passage: string;
  variant?: 'badge' | 'button' | 'inline';
  className?: string;
}

/**
 * PassageQuickView - Componente para acceso rápido al texto bíblico
 * 
 * @description Muestra un botón/badge clickable que abre el visor de pasajes bíblicos.
 * Útil para mantener el pasaje visible y accesible durante el proceso de preparación.
 * 
 * @example
 * <PassageQuickView passage="Hebreos 2:14-18" variant="badge" />
 */
export function PassageQuickView({ 
  passage, 
  variant = 'badge',
  className 
}: PassageQuickViewProps) {
  const [showViewer, setShowViewer] = useState(false);

  if (!passage) return null;

  const handleClick = () => {
    setShowViewer(true);
  };

  const handleClose = () => {
    setShowViewer(false);
  };

  // Badge variant - compact, suitable for headers
  if (variant === 'badge') {
    return (
      <>
        <Badge 
          variant="outline"
          className={cn(
            "cursor-pointer hover:bg-primary/10 transition-colors gap-1.5 px-3 py-1",
            "border-primary/30 text-primary font-medium",
            className
          )}
          onClick={handleClick}
        >
          <BookOpen className="h-3.5 w-3.5" />
          {passage}
        </Badge>
        <BiblePassageViewer 
          reference={showViewer ? passage : null} 
          onClose={handleClose} 
        />
      </>
    );
  }

  // Button variant - more prominent
  if (variant === 'button') {
    return (
      <>
        <Button
          variant="outline"
          size="sm"
          className={cn("gap-2", className)}
          onClick={handleClick}
        >
          <BookOpen className="h-4 w-4" />
          Ver Pasaje: {passage}
        </Button>
        <BiblePassageViewer 
          reference={showViewer ? passage : null} 
          onClose={handleClose} 
        />
      </>
    );
  }

  // Inline variant - minimal, for inline text
  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        className={cn(
          "inline-flex items-center gap-1 text-sm text-primary font-medium",
          "hover:underline decoration-dotted underline-offset-4 cursor-pointer",
          className
        )}
      >
        <BookOpen className="h-3.5 w-3.5" />
        {passage}
      </button>
      <BiblePassageViewer 
        reference={showViewer ? passage : null} 
        onClose={handleClose} 
      />
    </>
  );
}
