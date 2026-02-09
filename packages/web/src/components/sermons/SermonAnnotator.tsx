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

// Track which sermons have been hydrated to prevent re-loading on remounts
const hydratedSermons = new Set<string>();

export function SermonAnnotator({ sermonId, className, readOnly = false, scrollContainerRef }: SermonAnnotatorProps) {
  console.log('[SermonAnnotator] Component render, sermonId:', sermonId);
  const { initialSnapshot, loading, saveSnapshot } = useSermonAnnotations(sermonId);
  const [editor, setEditor] = useState<Editor | null>(null);
  
  console.log('[SermonAnnotator] State - loading:', loading, 'hasSnapshot:', !!initialSnapshot, 'snapshotSize:', initialSnapshot?.store ? Object.keys(initialSnapshot.store).length : 0);

  const isReady = useRef(false);
  const hasHydrated = useRef(false);

  // Handle editor mounting
  const handleMount = (editorInstance: Editor) => {
    console.log('[SermonAnnotator] handleMount called, hasHydrated:', hasHydrated.current, 'alreadyHydrated:', hydratedSermons.has(sermonId));
    setEditor(editorInstance);
    
    // Only hydrate if we haven't already for this sermon (prevents re-loading on remounts)
    const shouldHydrate = !hasHydrated.current && !hydratedSermons.has(sermonId);
    
    if (shouldHydrate && initialSnapshot && initialSnapshot.store) {
       const records = Object.values(initialSnapshot.store);
       console.log('[SermonAnnotator] Snapshot has', records.length, 'records');
       
       // Check for actual user-created content (shapes, not just internal Tldraw records)
       const hasUserContent = records.some((record: any) => {
         // Look for draw, geo, arrow, text, image shapes - actual user drawings
         return record.typeName === 'shape' && 
                ['draw', 'geo', 'arrow', 'text', 'image', 'line', 'highlight', 'note'].includes(record.type);
       });
       
       console.log('[SermonAnnotator] Has user content:', hasUserContent);
       
       // Only load if there's actual user content
       if (hasUserContent) {
         console.log('[SermonAnnotator] Loading snapshot with user content');
         editorInstance.store.put(records);
         console.log('[SermonAnnotator] Snapshot loaded successfully');
       } else {
         console.log('[SermonAnnotator] Snapshot has no user content, skipping load');
       }
       
       hasHydrated.current = true;
       hydratedSermons.add(sermonId);
    } else if (hasHydrated.current || hydratedSermons.has(sermonId)) {
       console.log('[SermonAnnotator] Already hydrated for this sermon, skipping');
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
       const records = snapshot.store ? Object.values(snapshot.store) : [];
       
       // Check for actual user-created shapes
       const hasUserContent = records.some((record: any) => {
         // Look for draw, geo, arrow, text, image shapes - actual user drawings
         return record.typeName === 'shape' && 
                ['draw', 'geo', 'arrow', 'text', 'image', 'line', 'highlight', 'note'].includes(record.type);
       });
       
       // Only save if there's actual user content
       if (hasUserContent) {
         const recordCount = records.length;
         console.log('[SermonAnnotator] Store has user content, saving snapshot with', recordCount, 'records');
         saveSnapshot(snapshot as any);
       } else {
         console.log('[SermonAnnotator] Store has no user content, skipping save');
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
