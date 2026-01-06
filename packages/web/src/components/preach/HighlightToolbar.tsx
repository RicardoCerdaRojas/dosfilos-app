import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Highlighter, X, Underline } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { HighlightColor } from '@/hooks/useHighlights';

interface HighlightToolbarProps {
  selectedText: { text: string; range: Range } | null;
  onHighlight: (color?: HighlightColor, style?: 'highlight' | 'underline') => void;
  onClose: () => void;
}

const COLORS: { color: HighlightColor; bg: string; label: string }[] = [
  { color: 'yellow', bg: 'bg-yellow-300', label: 'Amarillo' },
  { color: 'green', bg: 'bg-green-300', label: 'Verde' },
  { color: 'pink', bg: 'bg-pink-300', label: 'Rosa' },
  { color: 'blue', bg: 'bg-blue-300', label: 'Azul' },
];

export function HighlightToolbar({ selectedText, onHighlight, onClose }: HighlightToolbarProps) {
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);

  useEffect(() => {
    const updatePosition = () => {
      if (selectedText?.range) {
        const rect = selectedText.range.getBoundingClientRect();
        setPosition({
          top: rect.top - 60, // Fixed position relative to viewport
          left: rect.left + (rect.width / 2), // Fixed position relative to viewport
        });
      } else {
        setPosition(null);
      }
    };

    updatePosition();

    // Update position on scroll
    window.addEventListener('scroll', updatePosition);
    return () => window.removeEventListener('scroll', updatePosition);
  }, [selectedText]);

  if (!selectedText || !position) return null;

  return (
    <div
      className="fixed z-[1000] animate-in fade-in slide-in-from-bottom-2 duration-200"
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
        transform: 'translateX(-50%)',
      }}
    >
      <div className="bg-background border shadow-lg rounded-lg p-2 flex items-center gap-1">
        <Highlighter className="h-4 w-4 text-muted-foreground mr-1" />
        
        {COLORS.map(({ color, bg, label }) => (
          <Button
            key={color}
            variant="ghost"
            size="sm"
            className={cn('h-8 w-8 p-0', bg, 'hover:opacity-80')}
            onClick={() => onHighlight(color, 'highlight')}
            title={label}
          >
            <span className="sr-only">{label}</span>
          </Button>
        ))}
        
        <div className="w-px h-6 bg-border mx-1" />
        
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() => onHighlight(undefined, 'underline')}
          title="Subrayar"
        >
          <Underline className="h-4 w-4" />
        </Button>
        
        <div className="w-px h-6 bg-border mx-1" />
        
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={onClose}
          title="Cerrar"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
