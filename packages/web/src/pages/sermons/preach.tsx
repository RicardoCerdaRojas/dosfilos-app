import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSermon } from '@/hooks/use-sermons';
import { Button } from '@/components/ui/button';
import { 
  ArrowLeft, Minus, Plus, Clock, Play, Pause, RotateCcw, 
  Settings, BookOpen 
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { LocalBibleService } from '@/services/LocalBibleService';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';

// Helper to format time
const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export function PreachModePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { sermon, loading } = useSermon(id);
  
  // Settings State
  const [fontSize, setFontSize] = useState(24); // Base font size in px
  const [showControls, setShowControls] = useState(true);
  
  // Timer State
  const [targetDuration, setTargetDuration] = useState(30); // minutes
  const [timeLeft, setTimeLeft] = useState(30 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [showTimerSettings, setShowTimerSettings] = useState(false);
  
  // Bible Viewer State
  const [selectedReference, setSelectedReference] = useState<string | null>(null);
  const [bibleText, setBibleText] = useState<string | null>(null);
  const [loadingBible, setLoadingBible] = useState(false);

  // Timer Logic
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      setIsRunning(false);
    }
    return () => clearInterval(interval);
  }, [isRunning, timeLeft]);

  // Hide controls on scroll/inactivity could be added here
  
  // Bible Fetching Logic
  const fetchBibleText = async (ref: string) => {
    setLoadingBible(true);
    setBibleText(null);
    try {
      // Simulate a small delay for better UX (optional, but feels more natural)
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const text = LocalBibleService.getVerses(ref);
      
      if (text) {
        setBibleText(text);
      } else {
        setBibleText('No se pudo encontrar el texto. Verifique la referencia.');
      }
    } catch (error) {
      console.error('Error fetching bible text:', error);
      setBibleText('Error al cargar el texto bíblico.');
    } finally {
      setLoadingBible(false);
    }
  };

  useEffect(() => {
    if (selectedReference) {
      fetchBibleText(selectedReference);
    }
  }, [selectedReference]);

  // Custom Markdown Renderer to detect Bible References
  // Strategy: We will pre-process the content to wrap potential references in a custom link format
  // or just use a custom paragraph renderer that scans for patterns.
  // For simplicity and robustness in this MVP, let's try to identify links that start with 'bible://'
  // The user would need to format them or we auto-format.
  // AUTO-FORMATTING:
  const processContent = (content: string) => {
    // Regex for common Spanish bible references: e.g., "Juan 3:16", "1 Pedro 2:1", "Gn 1:1"
    // Matches: (Number optional) (Word) (Chapter):(Verse)
    const bibleRegex = /\b((?:[1-3]\s)?[A-Z][a-zá-ú]+\s\d+:\d+(?:-\d+)?)\b/g;
    return content.replace(bibleRegex, (match) => `[${match}](#bible-${encodeURIComponent(match)})`);
  };

  const components = {
    a: ({ node, ...props }: any) => {
      const href = props.href || '';
      if (href.startsWith('#bible-')) {
        const ref = decodeURIComponent(href.replace('#bible-', ''));
        return (
          <span 
            className="text-primary font-semibold cursor-pointer hover:underline decoration-dotted underline-offset-4"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setSelectedReference(ref);
            }}
          >
            {props.children}
          </span>
        );
      }
      return <a {...props} className="text-blue-500 underline" />;
    }
  };

  if (loading || !sermon) {
    return <div className="flex items-center justify-center h-screen">Cargando...</div>;
  }

  // Timer Color Logic
  const getTimerColor = () => {
    if (timeLeft <= 0) return 'text-red-500 animate-pulse';
    if (timeLeft <= 5 * 60) return 'text-red-500';
    if (timeLeft <= 10 * 60) return 'text-yellow-500';
    return 'text-muted-foreground';
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Top Bar - Controls */}
      <div className={cn(
        "fixed top-0 left-0 right-0 bg-background/95 backdrop-blur border-b z-50 transition-transform duration-300 p-4 flex items-center justify-between",
        !showControls && "-translate-y-full"
      )}>
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate(`/dashboard/sermons/${id}`)}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Salir
          </Button>
          <div className="h-6 w-px bg-border" />
          <h1 className="font-semibold truncate max-w-[200px]">{sermon.title}</h1>
        </div>

        <div className="flex items-center gap-6">
          {/* Timer Controls */}
          <div className="flex items-center gap-3 bg-muted/50 rounded-full px-4 py-1.5">
            <Clock className={cn("h-4 w-4", getTimerColor())} />
            <span className={cn("font-mono font-medium tabular-nums min-w-[60px] text-center", getTimerColor())}>
              {formatTime(timeLeft)}
            </span>
            <div className="flex items-center gap-1">
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-6 w-6" 
                onClick={() => setIsRunning(!isRunning)}
              >
                {isRunning ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-6 w-6" 
                onClick={() => {
                  setIsRunning(false);
                  setTimeLeft(targetDuration * 60);
                }}
              >
                <RotateCcw className="h-3 w-3" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-6 w-6" 
                onClick={() => setShowTimerSettings(true)}
              >
                <Settings className="h-3 w-3" />
              </Button>
            </div>
          </div>

          {/* Font Controls */}
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => setFontSize(s => Math.max(16, s - 2))}>
              <Minus className="h-4 w-4" />
            </Button>
            <span className="w-8 text-center text-sm">{fontSize}px</span>
            <Button variant="outline" size="icon" onClick={() => setFontSize(s => Math.min(60, s + 2))}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div 
        className="flex-1 max-w-4xl mx-auto w-full p-8 pt-24 pb-32 focus:outline-none"
        onClick={() => setShowControls(!showControls)}
      >
        <div 
          className="prose prose-lg max-w-none dark:prose-invert font-serif leading-relaxed transition-all duration-200"
          style={{ fontSize: `${fontSize}px` }}
        >
          <ReactMarkdown 
            components={components}
            rehypePlugins={[rehypeRaw]}
          >
            {processContent(sermon.content)}
          </ReactMarkdown>
        </div>
      </div>

      {/* Timer Settings Dialog */}
      <Dialog open={showTimerSettings} onOpenChange={setShowTimerSettings}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Configurar Temporizador</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Duración del Sermón (minutos)</Label>
              <Input 
                type="number" 
                value={targetDuration} 
                onChange={(e) => setTargetDuration(Number(e.target.value))}
                min={1}
              />
            </div>
            <Button onClick={() => {
              setTimeLeft(targetDuration * 60);
              setShowTimerSettings(false);
            }} className="w-full">
              Guardar y Reiniciar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bible Verse Dialog */}
      <Dialog open={!!selectedReference} onOpenChange={(open) => !open && setSelectedReference(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              {selectedReference}
            </DialogTitle>
          </DialogHeader>
          <div className="py-4 min-h-[100px]">
            {loadingBible ? (
              <div className="flex justify-center py-8">
                <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <div className="text-lg leading-relaxed">
                {bibleText}
              </div>
            )}
            <div className="mt-4 text-xs text-muted-foreground text-right">
              Fuente: Reina Valera 1960
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
