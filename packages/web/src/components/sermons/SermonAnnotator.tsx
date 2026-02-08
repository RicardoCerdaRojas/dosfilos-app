import { useEffect, useState } from 'react';
import { Tldraw, Editor, getSnapshot } from 'tldraw';
import 'tldraw/tldraw.css';
import { useSermonAnnotations } from '@/hooks/useSermonAnnotations';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';
import { SermonAnnotationToolbar } from './SermonAnnotationToolbar';

interface SermonAnnotatorProps {
  sermonId: string;
  className?: string;
  readOnly?: boolean;
  scrollContainerRef?: React.RefObject<HTMLDivElement>;
}

export function SermonAnnotator({ sermonId, className, readOnly = false, scrollContainerRef }: SermonAnnotatorProps) {
  const { initialSnapshot, loading, saveSnapshot } = useSermonAnnotations(sermonId);
  const [editor, setEditor] = useState<Editor | null>(null);

  // Handle editor mounting
  const handleMount = (editorInstance: Editor) => {
    setEditor(editorInstance);
    
    // Manually load snapshot if available
    if (initialSnapshot && initialSnapshot.store) {
       editorInstance.store.put(Object.values(initialSnapshot.store));
    }

    // Set readonly mode
    editorInstance.updateInstanceState({ isReadonly: readOnly });

    // Lock camera options to prevent manual panning/zooming if sync is enabled
    if (scrollContainerRef) {
       editorInstance.setCameraOptions({ isLocked: true });
    }
  };

  // Sync scroll from container to Tldraw camera
  useEffect(() => {
    if (!editor || !scrollContainerRef?.current) return;
    
    const container = scrollContainerRef.current;
    
    const handleScroll = () => {
      // Sync Y position: When container scrolls down (scrollTop increases), camera moves down (y decreases)
      // Tldraw coordinates: +y is down.
      // If text scrolls down by 100px, we want to see the part of canvas at y=100.
      // To see canvas at y=100, camera must be at y=-100.
      editor.setCamera({ x: 0, y: -container.scrollTop });
    };

    // Initial sync
    handleScroll();

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [editor, scrollContainerRef]);

  // Sync edits to Firestore
  useEffect(() => {
    if (!editor) return;

    const cleanup = editor.store.listen(() => {
      // Setup a listener for changes
      // This listener fires on every change, so debouncing in the hook is crucial
       const snapshot = getSnapshot(editor.store);
       saveSnapshot(snapshot as any);
    });

    return () => cleanup();
  }, [editor, saveSnapshot]);

  // Update readonly state if prop changes
  useEffect(() => {
    if (editor) {
      editor.updateInstanceState({ isReadonly: readOnly });
    }
  }, [editor, readOnly]);

  if (loading) {
    return (
      <div className={cn("flex items-center justify-center bg-muted/10 h-full w-full", className)}>
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className={cn("relative w-full h-full border-l bg-white overflow-hidden touch-none", className)}>
      <Tldraw
        key={sermonId}
        onMount={handleMount}
        hideUi={true}
        inferDarkMode={false} 
      />
      <SermonAnnotationToolbar editor={editor} readOnly={readOnly} />
    </div>
  );
}
