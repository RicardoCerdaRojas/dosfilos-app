import { useEffect, useState, useRef } from 'react';
import { Excalidraw } from '@excalidraw/excalidraw';
import '@excalidraw/excalidraw/index.css';
import { useSermonAnnotations } from '@/hooks/useSermonAnnotations';
import { ExcalidrawAdapter } from '@/adapters/ExcalidrawAdapter';
import { cn } from '@/lib/utils';
import { Loader2, MousePointer2, Pencil, Eraser } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SermonAnnotatorProps {
  sermonId: string;
  className?: string;
  readOnly?: boolean;
  scrollContainerRef?: React.RefObject<HTMLDivElement>;
}

export function SermonAnnotator({ sermonId, className, readOnly = false, scrollContainerRef }: SermonAnnotatorProps) {
  const { initialSnapshot, loading, saveSnapshot } = useSermonAnnotations(sermonId);
  const [excalidrawAPI, setExcalidrawAPI] = useState<any>(null);
  const adapterRef = useRef<ExcalidrawAdapter | null>(null);
  const isReady = useRef(false);
  
  // Custom toolbar state
  const [activeTool, setActiveTool] = useState<'selection' | 'freedraw' | 'eraser'>('freedraw');
  const [strokeWidth, setStrokeWidth] = useState<number>(1); // 0.5=thin, 1=medium, 2=bold
  const [strokeColor, setStrokeColor] = useState<string>('#000000'); // Default black

  // Initialize adapter when API is ready
  useEffect(() => {
    if (!excalidrawAPI) return;

    // Create adapter
    const adapter = new ExcalidrawAdapter(excalidrawAPI);
    adapterRef.current = adapter;

    // Apply initial tool state after Excalidraw finishes initializing
    // Small delay ensures Excalidraw is ready and won't override our settings
    setTimeout(() => {
      excalidrawAPI.updateScene({
        appState: {
          activeTool: { type: activeTool },
          currentItemStrokeWidth: strokeWidth,
          currentItemStrokeColor: strokeColor,
          currentItemRoughness: 0,
        },
      });
    }, 100);

    // Mark as ready
    isReady.current = true;

  }, [excalidrawAPI, activeTool, strokeWidth, strokeColor]);

  // Allow scroll ONLY in sermon content containers - surgical fix
  useEffect(() => {
    const styleId = 'excalidraw-scroll-fix';
    
    // Remove existing style if any
    const existingStyle = document.getElementById(styleId);
    if (existingStyle) {
      existingStyle.remove();
    }
    
    // Inject CSS to enable scroll in sermon containers ONLY
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      /* Enable scroll ONLY in sermon content containers */
      .overflow-y-auto,
      [data-radix-scroll-area-viewport] {
        touch-action: pan-y !important;
      }
      
      /* Keep Excalidraw canvas functional */
      .excalidraw .excalidraw-canvas-wrapper {
        touch-action: none !important;
      }
      
      /* HIDE native Excalidraw UI - we use custom toolbar */
      .excalidraw .layer-ui__wrapper__top-right,
      .excalidraw .App-toolbar,
      .excalidraw .App-menu,
      .excalidraw .App-menu_top,
      .excalidraw .Island {
        display: none !important;
      }
      
      /* Keep canvas full size */
      .excalidraw .excalidraw-canvas {
        width: 100% !important;
        height: 100% !important;
      }
    `;
    document.head.appendChild(style);
    
    // Cleanup
    return () => {
      const styleToRemove = document.getElementById(styleId);
      if (styleToRemove) {
        styleToRemove.remove();
      }
    };
  }, []);

  // Synchronize scroll between sermon content and canvas
  useEffect(() => {
    if (!scrollContainerRef?.current || !excalidrawAPI) return;

    const container = scrollContainerRef.current;

    const handleScroll = () => {
      const scrollTop = container.scrollTop;
      
      // Use CSS transform to shift the canvas viewport
      const canvasWrapper = document.querySelector('.excalidraw-wrapper');
      if (canvasWrapper) {
        (canvasWrapper as HTMLElement).style.transform = `translateY(${scrollTop}px)`;
      }
    };

    container.addEventListener('scroll', handleScroll);
    
    // Apply initial scroll position
    handleScroll();

    return () => {
      container.removeEventListener('scroll', handleScroll);
      const canvasWrapper = document.querySelector('.excalidraw-wrapper');
      if (canvasWrapper) {
        (canvasWrapper as HTMLElement).style.transform = '';
      }
    };
  }, [scrollContainerRef, excalidrawAPI]);


  // Handle tool changes
  const handleToolChange = (tool: 'selection' | 'freedraw' | 'eraser') => {
    if (!excalidrawAPI) return;
    
    setActiveTool(tool);
    
    // Update Excalidraw state
    excalidrawAPI.updateScene({
      appState: {
        activeTool: {
          type: tool,
        },
      },
    });
  };

  // Handle stroke width change
  const handleStrokeWidthChange = (width: number) => {
    if (!excalidrawAPI) return;
    
    setStrokeWidth(width);
    
    // Update Excalidraw state
    excalidrawAPI.updateScene({
      appState: {
        currentItemStrokeWidth: width,
      },
    });
  };

  // Handle color change
  const handleColorChange = (color: string) => {
    if (!excalidrawAPI) return;
    
    setStrokeColor(color);
    
    // Update Excalidraw state
    excalidrawAPI.updateScene({
      appState: {
        currentItemStrokeColor: color,
      },
    });
  };

  const handleChange = () => {
    if (!isReady.current || !adapterRef.current) {
      return;
    }

    const adapter = adapterRef.current;
    const snapshot = adapter.getSnapshot();
    
    if (adapter.hasUserContent(snapshot)) {
      saveSnapshot(snapshot);
    }
  };

  if (loading) {
    return (
      <div className={cn("flex items-center justify-center h-full", className)}>
        <Loader2 className="animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className={cn("w-full h-full", className)}>
      {/* Custom Toolbar - Fixed to viewport bottom-right, always visible, never covers banner */}
      {!readOnly && excalidrawAPI && (
        <div className="fixed bottom-4 right-4 z-50 bg-white/95 backdrop-blur-sm rounded-lg shadow-lg border">
          <div className="flex gap-2 items-center p-2">
            {/* Tools */}
            <div className="flex gap-1 border-r pr-2">
              <Button
                variant={activeTool === 'selection' ? 'default' : 'ghost'}
                size="icon"
                onClick={() => handleToolChange('selection')}
                title="Seleccionar (V)"
              >
                <MousePointer2 className="h-4 w-4" />
              </Button>
              <Button
                variant={activeTool === 'freedraw' ? 'default' : 'ghost'}
                size="icon"
                onClick={() => handleToolChange('freedraw')}
                title="Lápiz (P)"
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                variant={activeTool === 'eraser' ? 'default' : 'ghost'}
                size="icon"
                onClick={() => handleToolChange('eraser')}
                title="Goma (E)"
              >
                <Eraser className="h-4 w-4" />
              </Button>
            </div>
            
            {/* Colors */}
            <div className="flex gap-1 items-center border-r pr-2">
              <Button
                variant={strokeColor === '#000000' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleColorChange('#000000')}
                className="h-7 w-7 p-0"
                title="Negro"
              >
                <div className="w-4 h-4 rounded-full bg-black"></div>
              </Button>
              <Button
                variant={strokeColor === '#dc2626' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleColorChange('#dc2626')}
                className="h-7 w-7 p-0"
                title="Rojo"
              >
                <div className="w-4 h-4 rounded-full bg-red-600"></div>
              </Button>
              <Button
                variant={strokeColor === '#2563eb' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleColorChange('#2563eb')}
                className="h-7 w-7 p-0"
                title="Azul"
              >
                <div className="w-4 h-4 rounded-full bg-blue-600"></div>
              </Button>
              <Button
                variant={strokeColor === '#16a34a' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleColorChange('#16a34a')}
                className="h-7 w-7 p-0"
                title="Verde"
              >
                <div className="w-4 h-4 rounded-full bg-green-600"></div>
              </Button>
              <Button
                variant={strokeColor === '#ea580c' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleColorChange('#ea580c')}
                className="h-7 w-7 p-0"
                title="Naranja"
              >
                <div className="w-4 h-4 rounded-full bg-orange-600"></div>
              </Button>
            </div>
            
            {/* Stroke Width */}
            <div className="flex gap-1 items-center">
              <Button
                variant={strokeWidth === 0.5 ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleStrokeWidthChange(0.5)}
                className="h-7 w-7 p-0"
                title="Delgado"
              >
                <div className="w-3 h-0.5 bg-current"></div>
              </Button>
              <Button
                variant={strokeWidth === 1 ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleStrokeWidthChange(1)}
                className="h-7 w-7 p-0"
                title="Medio"
              >
                <div className="w-3 h-1 bg-current"></div>
              </Button>
              <Button
                variant={strokeWidth === 2 ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleStrokeWidthChange(2)}
                className="h-7 w-7 p-0"
                title="Grueso"
              >
                <div className="w-3 h-1.5 bg-current"></div>
              </Button>
            </div>
          </div>
        </div>
      )}
      
      <Excalidraw
        excalidrawAPI={(api) => setExcalidrawAPI(api)}
        onChange={handleChange}
        viewModeEnabled={readOnly}
        theme="light"
        initialData={initialSnapshot && !loading ? {
          elements: initialSnapshot.elements as any[],
          // Don't include appState - let our initialization handle tool selection
        } : undefined}
        UIOptions={{
          canvasActions: {
            loadScene: false,
            saveToActiveFile: false,
            export: false,
            saveAsImage: false,
          },
          // Hide native toolbar - we use custom toolbar
          dockedSidebarBreakpoint: 0,
        }}
        renderTopRightUI={() => null} // Hide top-right UI (hamburger menu, etc)
      />
    </div>
  );
}
