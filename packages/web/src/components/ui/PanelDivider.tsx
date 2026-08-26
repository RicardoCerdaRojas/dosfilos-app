import { useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
    /**
     * Arrastre. Recibe el delta en píxeles con el signo ya normalizado:
     * positivo = el panel al lado de `panelSide` se ENSANCHA. Quien llama
     * es dueño del ancho y del clamping. Sin `onResize`, sólo alterna.
     */
    onResize?: (deltaPx: number) => void;
    /** De qué lado del divisor está el panel que se redimensiona/pliega. */
    panelSide: 'left' | 'right';
    /** Alternar plegado. Sin él, no hay chevron: el divisor sólo arrastra. */
    onToggle?: () => void;
    isOpen?: boolean;
    clickThreshold?: number;
    title?: string;
}

/**
 * La línea divisoria entre dos paneles de un `PanelGroup` — al patrón VS Code:
 *
 * - Ocupa 1px REAL en el flujo: es el borde compartido entre los paneles, así
 *   que queda centrada por construcción. La versión anterior era una hitbox de
 *   12px con la línea "centrada" adentro, montada junto a gaps y bordes de
 *   tarjeta: tres líneas compitiendo y ninguna en su lugar.
 * - La zona de agarre es INVISIBLE y más ancha (se superpone a ambos paneles
 *   sin ocupar layout), con cursor de resize.
 * - Al pasar el mouse o arrastrar, la línea se ilumina con el acento.
 * - Con `onToggle`, un chevron pequeño —siempre visible, la lección de "nunca
 *   lo hubiera sabido"— pliega el panel; clic corto en la línea también.
 */
export function PanelDivider({
    onResize,
    panelSide,
    onToggle,
    isOpen = true,
    clickThreshold = 4,
    title,
}: Props) {
    const dragRef = useRef<{ startX: number; lastX: number; hasMoved: boolean } | null>(null);

    const handleMouseDown = (e: React.MouseEvent) => {
        if (e.button !== 0) return;
        e.preventDefault();
        dragRef.current = { startX: e.clientX, lastX: e.clientX, hasMoved: false };

        const handleMove = (ev: MouseEvent) => {
            if (!dragRef.current) return;
            if (Math.abs(ev.clientX - dragRef.current.startX) > clickThreshold) {
                dragRef.current.hasMoved = true;
            }
            if (dragRef.current.hasMoved && onResize && isOpen) {
                const step = ev.clientX - dragRef.current.lastX;
                // Normaliza el signo: mover el cursor ALEJÁNDOSE del panel lo
                // ensancha, da igual de qué lado esté.
                onResize(panelSide === 'left' ? step : -step);
                dragRef.current.lastX = ev.clientX;
            }
        };

        const handleUp = () => {
            const wasClick = dragRef.current && !dragRef.current.hasMoved;
            dragRef.current = null;
            document.removeEventListener('mousemove', handleMove);
            document.removeEventListener('mouseup', handleUp);
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
            if (wasClick && onToggle) onToggle();
        };

        document.addEventListener('mousemove', handleMove);
        document.addEventListener('mouseup', handleUp);
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
    };

    const Icon = panelSide === 'left' ? (isOpen ? ChevronLeft : ChevronRight) : (isOpen ? ChevronRight : ChevronLeft);

    return (
        <div
            role="separator"
            aria-orientation="vertical"
            aria-label={title}
            title={title}
            onMouseDown={handleMouseDown}
            className="group relative hidden md:block shrink-0 w-px bg-border hover:bg-primary/60 active:bg-primary transition-colors cursor-col-resize select-none"
        >
            {/* Zona de agarre invisible, superpuesta a ambos paneles. */}
            <span className="absolute inset-y-0 -left-1 -right-1 z-10" />

            {onToggle && (
                <span
                    className={cn(
                        'absolute top-1/2 -translate-y-1/2 left-1/2 -translate-x-1/2 z-20',
                        'h-10 w-4 rounded-md border border-border bg-card shadow-sm',
                        'flex items-center justify-center',
                        'opacity-70 group-hover:opacity-100 transition-opacity',
                    )}
                >
                    <Icon className="w-3 h-3 text-muted-foreground" />
                </span>
            )}
        </div>
    );
}
