import { useEffect, useState, useRef } from 'react';
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
  console.log('[SermonAnnotator] Component render, sermonId:', sermonId);
  const { initialSnapshot, loading, saveSnapshot } = useSermonAnnotations(sermonId);
  const [editor, setEditor] = useState<Editor | null>(null);
  
  console.log('[SermonAnnotator] State - loading:', loading, 'hasSnapshot:', !!initialSnapshot, 'snapshotSize:', initialSnapshot?.store ? Object.keys(initialSnapshot.store).length : 0);

  const isReady = useRef(false);

  // Handle editor mounting
  const handleMount = (editorInstance: Editor) => {
    console.log('[SermonAnnotator] handleMount called');
    setEditor(editorInstance);
    
    // Manually load snapshot if available AND has content
    if (initialSnapshot && initialSnapshot.store) {
       const records = Object.values(initialSnapshot.store);
       console.log('[SermonAnnotator] Snapshot has', records.length, 'records');
       
       // Only load if there's actual content (more than just the default page/document)
       if (records.length > 2) {
         console.log('[SermonAnnotator] Loading snapshot with content');
         editorInstance.store.put(records);
         console.log('[SermonAnnotator] Snapshot loaded successfully');
       } else {
         console.log('[SermonAnnotator] Snapshot is empty, skipping load');
       }
    } else {
       console.log('[SermonAnnotator] No snapshot to load');
    }
    
    // Mark as ready to allow saving
    console.log('[SermonAnnotator] Setting isReady to true');
    isReady.current = true;

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
    
    console.log('[SermonAnnotator] Attaching store listener');

    const cleanup = editor.store.listen(() => {
       // Only save if we are ready (initial load/hydration complete)
       if (!isReady.current) {
         console.log('[SermonAnnotator] Store changed but not ready, skipping save');
         return;
       }

       const snapshot = getSnapshot(editor.store);
       const recordCount = snapshot.store ? Object.keys(snapshot.store).length : 0;
       
       // Only save if there's actual content (more than default page/document)
       if (recordCount > 2) {
         console.log('[SermonAnnotator] Store has content, saving snapshot with', recordCount, 'records');
         saveSnapshot(snapshot as any);
       } else {
         console.log('[SermonAnnotator] Store is empty, skipping save');
       }
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
