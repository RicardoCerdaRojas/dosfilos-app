import { useState, useEffect, ReactNode } from 'react';
import { Maximize2, Minimize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PanelDivider } from '@/components/ui/PanelDivider';
import { cn } from '@/lib/utils';

interface ResizableChatPanelProps {
    children: ReactNode;
    storageKey?: string;
    defaultWidth?: number;
    minWidth?: number;
    maxWidth?: number;
    className?: string;
    /** If true, render the maximize button in the panel header area */
    showMaximizeButton?: boolean;
}

const DEFAULT_MIN_WIDTH = 320;
const DEFAULT_MAX_WIDTH = 800;
const DEFAULT_WIDTH = 384; // w-96 = 24rem = 384px

/**
 * El panel lateral del chat, al patrón VS Code dentro de un `PanelGroup`.
 *
 * Su primer hijo es el `PanelDivider`: la línea de 1px que separa el panel
 * del contenido, con arrastre para el ancho y chevron para PLEGARLO — el
 * mismo control, en el mismo lugar, que los divisores del taller. Antes cada
 * pantalla tenía su propio mecanismo (acá un grip ⋮⋮ flotante, allá el rail
 * con chevron) y el fundador lo señaló comparando con VS Code: la misma
 * interacción se veía de dos formas y ninguna definida.
 *
 * El plegado se persiste junto al ancho: quien trabaja sin chat no quiere
 * reabrirlo en cada sermón.
 */
export function ResizableChatPanel({
    children,
    storageKey = 'generatorChatWidth',
    defaultWidth = DEFAULT_WIDTH,
    minWidth = DEFAULT_MIN_WIDTH,
    maxWidth = DEFAULT_MAX_WIDTH,
    className,
    showMaximizeButton = true
}: ResizableChatPanelProps) {
    // Panel width state with localStorage persistence
    const [panelWidth, setPanelWidth] = useState(() => {
        if (typeof window === 'undefined') return defaultWidth;
        const stored = localStorage.getItem(storageKey);
        return stored ? Math.min(Math.max(parseInt(stored), minWidth), maxWidth) : defaultWidth;
    });
    const [isOpen, setIsOpen] = useState(() => {
        if (typeof window === 'undefined') return true;
        return localStorage.getItem(`${storageKey}.open`) !== '0';
    });
    const [isMaximized, setIsMaximized] = useState(false);

    useEffect(() => {
        localStorage.setItem(storageKey, panelWidth.toString());
    }, [panelWidth, storageKey]);
    useEffect(() => {
        localStorage.setItem(`${storageKey}.open`, isOpen ? '1' : '0');
    }, [isOpen, storageKey]);

    const toggleMaximize = () => setIsMaximized(!isMaximized);

    if (isMaximized) {
        return (
            <div className={cn('fixed inset-0 z-50 bg-background flex flex-col', className)}>
                {showMaximizeButton && (
                    <Button
                        variant="ghost"
                        size="icon"
                        className="absolute top-3 right-3 z-20 h-7 w-7"
                        onClick={toggleMaximize}
                        title="Minimizar"
                    >
                        <Minimize2 className="h-4 w-4" />
                    </Button>
                )}
                <div className="h-full flex-1 min-h-0">{children}</div>
            </div>
        );
    }

    return (
        <>
            <PanelDivider
                panelSide="right"
                isOpen={isOpen}
                onToggle={() => setIsOpen((v) => !v)}
                onResize={(delta) =>
                    setPanelWidth((w) => Math.min(maxWidth, Math.max(minWidth, w + delta)))
                }
            />
            {isOpen && (
                <div
                    className={cn('flex-shrink-0 relative flex flex-col min-h-0', className)}
                    style={{ width: `${panelWidth}px` }}
                >
                    {showMaximizeButton && (
                        <Button
                            variant="ghost"
                            size="icon"
                            className="absolute top-3 right-3 z-20 h-7 w-7"
                            onClick={toggleMaximize}
                            title="Pantalla Completa"
                        >
                            <Maximize2 className="h-4 w-4" />
                        </Button>
                    )}
                    <div className="h-full flex-1 min-h-0">{children}</div>
                </div>
            )}
        </>
    );
}
