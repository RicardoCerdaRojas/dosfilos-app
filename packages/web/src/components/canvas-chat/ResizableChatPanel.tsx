import React, { useState, useCallback, useEffect, useRef, ReactNode } from 'react';
import { GripVertical, Maximize2, Minimize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
    
    const [isResizing, setIsResizing] = useState(false);
    const [isMaximized, setIsMaximized] = useState(false);
    const panelRef = useRef<HTMLDivElement>(null);

    // Save width to localStorage
    useEffect(() => {
        localStorage.setItem(storageKey, panelWidth.toString());
    }, [panelWidth, storageKey]);

    // Handle mouse move during resize
    const handleMouseMove = useCallback((e: MouseEvent) => {
        if (!isResizing || !panelRef.current) return;
        
        const panelRect = panelRef.current.getBoundingClientRect();
        if (!panelRect) return;
        
        // Calculate new width based on distance from mouse to panel's RIGHT edge
        // This works for both scenarios:
        // - Panel aligned to right of viewport
        // - Panel in a flex container
        const newWidth = panelRect.right - e.clientX;
        
        if (newWidth >= minWidth && newWidth <= maxWidth) {
            setPanelWidth(newWidth);
        }
    }, [isResizing, minWidth, maxWidth]);

    // Handle mouse up - stop resizing
    const handleMouseUp = useCallback(() => {
        setIsResizing(false);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
    }, []);

    // Add/remove event listeners
    useEffect(() => {
        if (isResizing) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
            document.body.style.cursor = 'col-resize';
            document.body.style.userSelect = 'none';
        }
        
        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isResizing, handleMouseMove, handleMouseUp]);

    // Start resizing
    const startResize = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        setIsResizing(true);
    }, []);

    const toggleMaximize = () => {
        setIsMaximized(!isMaximized);
    };

    return (
        <div
            ref={panelRef}
            className={cn(
                "flex-shrink-0 relative flex flex-col",
                isMaximized && "fixed inset-0 z-50 bg-background",
                isResizing && "select-none",
                className
            )}
            style={{ 
                width: isMaximized ? '100%' : `${panelWidth}px`,
                height: isMaximized ? '100%' : undefined
            }}
        >
            {/* Resize Handle - only show when not maximized */}
            {!isMaximized && (
                <div
                    className={cn(
                        "absolute left-0 top-0 bottom-0 w-2 cursor-col-resize z-10 flex items-center justify-center group hover:bg-primary/10 transition-colors",
                        isResizing && "bg-primary/20"
                    )}
                    onMouseDown={startResize}
                >
                    <GripVertical 
                        className={cn(
                            "h-6 w-6 text-muted-foreground/30 group-hover:text-muted-foreground transition-all",
                            isResizing && "text-primary"
                        )} 
                    />
                </div>
            )}

            {/* Maximize/Minimize Button - positioned at top right of panel */}
            {showMaximizeButton && (
                <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-3 right-3 z-20 h-7 w-7"
                    onClick={toggleMaximize}
                    title={isMaximized ? "Minimizar" : "Pantalla Completa"}
                >
                    {isMaximized ? (
                        <Minimize2 className="h-4 w-4" />
                    ) : (
                        <Maximize2 className="h-4 w-4" />
                    )}
                </Button>
            )}

            {/* Content with padding for resize handle */}
            <div className={cn(
                "h-full flex-1 min-h-0",
                !isMaximized && "pl-2"
            )}>
                {children}
            </div>
        </div>
    );
}
