import { Editor, DefaultColorStyle } from 'tldraw';
import { Button } from '@/components/ui/button';
import { 
  Pencil, Eraser, Undo2, Redo2, Trash2, 
  MousePointer2 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface SermonAnnotationToolbarProps {
  editor: Editor | null;
  className?: string;
  readOnly?: boolean;
}

export function SermonAnnotationToolbar({ editor, className, readOnly }: SermonAnnotationToolbarProps) {
  const [activeTool, setActiveTool] = useState('select');
  const [activeColor, setActiveColor] = useState('black');
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [showClearDialog, setShowClearDialog] = useState(false);

  useEffect(() => {
    if (!editor) return;

    const handleChange = () => {
      setActiveTool(editor.getCurrentToolId());
      setCanUndo(editor.getCanUndo());
      setCanRedo(editor.getCanRedo());
    };

    const cleanup = editor.store.listen(handleChange);
    handleChange();

    return () => cleanup();
  }, [editor]);

  if (!editor || readOnly) return null;

  const handleToolSelect = (tool: string) => {
    editor.setCurrentTool(tool);
    setActiveTool(tool);
  };

  const handleColorSelect = (e: React.MouseEvent, color: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    if ((editor as any).setStyleForNextShapes) {
       (editor as any).setStyleForNextShapes(DefaultColorStyle, color);
    } else {
       (editor as any).setStyle(DefaultColorStyle, color);
    }
    
    editor.setCurrentTool('draw');
    setActiveColor(color);
  };

  const handleClearCanvas = () => {
      editor.selectAll().deleteShapes(editor.getSelectedShapeIds());
      setShowClearDialog(false);
  };

  const isToolActive = (tool: string) => activeTool === tool;

  return (
    <>
      <div className={cn(
        "fixed bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-2 p-2 rounded-full shadow-lg border bg-white/90 backdrop-blur-sm transition-all duration-200 z-[9999]",
        className
      )}>
        {/* Tools */}
        <div className="flex items-center gap-1 border-r pr-2 mr-2">
          <Button
            variant={isToolActive('select') ? 'secondary' : 'ghost'}
            size="icon"
            className="h-8 w-8 rounded-full"
            onClick={() => handleToolSelect('select')}
            title="Select"
          >
            <MousePointer2 className="h-4 w-4" />
          </Button>
          <Button
            variant={isToolActive('draw') ? 'secondary' : 'ghost'}
            size="icon"
            className="h-8 w-8 rounded-full transition-colors"
            onClick={() => handleToolSelect('draw')}
            title="Pen"
          >
            <Pencil 
              className="h-4 w-4" 
              style={{ 
                color: isToolActive('draw') 
                  ? (activeColor === 'black' ? 'currentColor' : activeColor === 'blue' ? '#2563eb' : activeColor === 'red' ? '#dc2626' : '#16a34a')
                  : 'currentColor'
              }} 
              fill={isToolActive('draw') && activeColor !== 'black' ? 'currentColor' : 'none'}
            />
          </Button>
          <Button
            variant={isToolActive('eraser') ? 'secondary' : 'ghost'}
            size="icon"
            className="h-8 w-8 rounded-full"
            onClick={() => handleToolSelect('eraser')}
            title="Eraser"
          >
            <Eraser className="h-4 w-4" />
          </Button>
        </div>

        {/* Colors (Only visible if Draw is active) */}
        <div className={cn(
          "flex items-center gap-1 border-r pr-2 mr-2 transition-all duration-200 overflow-hidden",
          isToolActive('draw') ? "w-auto opacity-100 pl-1" : "w-0 opacity-0 border-none pr-0 mr-0"
        )}>
          {['black', 'blue', 'red', 'green'].map((color) => (
            <button
              key={color}
              type="button"
              className={cn(
                "w-6 h-6 rounded-full border border-gray-200 transition-all",
                activeColor === color ? "ring-2 ring-offset-1 ring-primary scale-110" : "hover:scale-105"
              )}
              style={{ backgroundColor: color === 'black' ? '#000' : color === 'blue' ? '#2563eb' : color === 'red' ? '#dc2626' : '#16a34a' }}
              onMouseDown={(e) => {
                handleColorSelect(e, color);
              }}
              title={color.charAt(0).toUpperCase() + color.slice(1)}
            />
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full"
            onClick={() => editor.undo()}
            disabled={!canUndo}
            title="Undo"
          >
            <Undo2 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full"
            onClick={() => editor.redo()}
            disabled={!canRedo}
            title="Redo"
          >
            <Redo2 className="h-4 w-4" />
          </Button>
          
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full hover:text-destructive hover:bg-destructive/10"
            onClick={() => setShowClearDialog(true)}
            title="Clear All"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <AlertDialog open={showClearDialog} onOpenChange={setShowClearDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción borrará todas las anotaciones del lienzo. Esta acción no se puede deshacer fácilmente (aunque podrías usar 'Deshacer' inmediatamente después).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleClearCanvas} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Borrar Todo
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
