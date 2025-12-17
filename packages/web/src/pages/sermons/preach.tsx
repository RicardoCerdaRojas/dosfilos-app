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
import remarkGfm from 'remark-gfm';

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

  // Bible Reference Pattern (Robust) - Same as SermonPreview
  const BIBLE_REF_PATTERN = /(?:^|[^\wáéíóúñ])((?:[1-3]\s?)?(?:Génesis|Genesis|Gén|Gen|Gn|Éxodo|Exodo|Éx|Ex|Levítico|Levitico|Lev|Lv|Números|Numeros|Núm|Num|Nm|Deuteronomio|Deut|Dt|Josué|Josue|Jos|Jueces|Jue|Jc|Rut|Rt|Samuel|Sam|S|Reyes|Rey|R|Crónicas|Cronicas|Cr|Esdras|Esd|Ezr|Nehemías|Nehemias|Neh|Ne|Ester|Est|Et|Job|Jb|Salmos?|Sal|Sl|Ps|Proverbios|Prov|Pr|Prv|Eclesiastés|Eclesiastes|Ecl|Ec|Cantares|Cantar|Cnt|Ct|Isaías|Isaias|Is|Isa|Jeremías|Jeremias|Jer|Jr|Lamentaciones|Lam|Lm|Ezequiel|Ezeq|Ez|Daniel|Dan|Dn|Oseas|Os|Joel|Jl|Amós|Amos|Am|Abdías|Abdias|Abd|Ab|Jonás|Jonas|Jon|Miqueas|Miq|Mi|Nahúm|Nahum|Nah|Na|Habacuc|Hab|Sofonías|Sofonias|Sof|Hageo|Hag|Zacarías|Zacarias|Zac|Zc|Malaquías|Malaquias|Mal|Mateo|Mat|Mt|Marcos|Mar|Mc|Mr|Lucas|Luc|Lc|Juan|Jn|Hechos|Hch|Hec|Romanos|Rom|Ro|Rm|Corintios|Cor|Co|Gálatas|Galatas|Gál|Gal|Ga|Efesios|Ef|Efe|Filipenses|Fil|Fp|Colosenses|Col|Tesalonicenses|Tes|Ts|Timoteo|Tim|Ti|Tito|Tit|Filemón|Filemon|Flm|Flmn|Hebreos|Heb|He|Santiago|Sant|Stg|Pedro|Ped|Pe|P|Judas|Jud|Apocalipsis|Apoc|Ap)\s*\d+[:.]\d+(?:[-–]\d+)?)/gi;

  // Helper to replace refs in plain text only
  const replaceRefsInText = (text: string) => {
    return text.replace(BIBLE_REF_PATTERN, (match, ref) => {
      const prefix = match.slice(0, match.length - ref.length);
      return `${prefix}<a href="#bible-${encodeURIComponent(ref.trim())}">${ref.trim()}</a>`;
    });
  };

  // Helper to replace markdown bold with HTML strong
  const replaceBoldWithStrong = (text: string) => {
    return text.replace(/\*\*([\s\S]*?)\*\*/g, '<strong>$1</strong>');
  };

  // Markdown Processing for Bible Links
  const processContent = (content: string) => {
    if (!content) return '';
    
    let processed = content;
    
    // Step 1: Normalize line breaks
    // First handle actual newlines (from editor)
    processed = processed.replace(/\n\n+/g, '\n\n'); // Multiple newlines -> double newline (paragraph)
    
    // Step 2: Convert HTML breaks to newlines
    // Double <br/> = paragraph break
    processed = processed.replace(/<br\s*\/?>\s*<br\s*\/?>/gi, '\n\n');
    // Single <br/> = line break  
    processed = processed.replace(/<br\s*\/?>/gi, '\n');
    
    // Step 3: Add Bible reference links
    processed = processed.replace(BIBLE_REF_PATTERN, (match, ref) => {
      const prefix = match.slice(0, match.length - ref.length);
      const trimmedRef = ref.trim();
      return `${prefix}[📖 ${trimmedRef}](# bible-${encodeURIComponent(trimmedRef)})`;
    });
    
    return processed;
  };

  const components = {
    a: ({ node, ...props }: any) => {
      const href = props.href || '';
      if (href.startsWith('#bible-')) {
        const ref = decodeURIComponent(href.replace('#bible-', ''));
        return (
          <span 
            className="text-primary font-semibold cursor-pointer hover:underline decoration-dotted underline-offset-4 inline-flex items-center gap-1"
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
    },
    // Custom blockquote styling
    blockquote: ({ node, ...props }: any) => (
      <blockquote 
        {...props} 
        className="border-l-4 border-primary/30 pl-4 my-6 text-muted-foreground bg-muted/10 py-3 pr-4 rounded-r"
      />
    ),
    // Custom heading styling
    h2: ({ node, ...props }: any) => <h2 {...props} className="text-2xl font-bold mt-8 mb-4" />,
    h3: ({ node, ...props }: any) => <h3 {...props} className="text-xl font-semibold mt-6 mb-3" />,
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
          <h1 className="font-semibold truncate max-w-[400px] md:max-w-[600px]">{sermon.title}</h1>
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
        {/* Sermon Title - Discrete */}
        <div className="text-center mb-12">
          <h1 
            className="font-serif font-bold text-muted-foreground/70"
            style={{ fontSize: `${Math.min(fontSize * 1.5, 48)}px` }}
          >
            {sermon.title}
          </h1>
          {sermon.bibleReferences && sermon.bibleReferences.length > 0 && (
            <p className="text-muted-foreground mt-2" style={{ fontSize: `${fontSize * 0.7}px` }}>
              {sermon.bibleReferences.join(' • ')}
            </p>
          )}
        </div>

        <div 
          className="prose prose-lg max-w-none dark:prose-invert font-serif leading-relaxed transition-all duration-200 prose-headings:font-bold prose-headings:text-foreground prose-p:text-foreground prose-blockquote:border-l-primary prose-blockquote:bg-muted/30 prose-blockquote:rounded-r-lg prose-blockquote:py-2 prose-blockquote:px-4 prose-strong:text-foreground"
          style={{ fontSize: `${fontSize}px` }}
        >
          <style>{`
            .prose p {
              margin-top: 1.25em !important;
              margin-bottom: 1.25em !important;
            }
            .prose p:first-child {
              margin-top: 0 !important;
            }
          `}</style>
          <ReactMarkdown 
            components={components}
            remarkPlugins={[remarkGfm]}
          >
            {processContent(sermon.content)}
          </ReactMarkdown>
        </div>
      </div>

      {/* Floating Timer - Visible when running and controls are hidden */}
      {isRunning && !showControls && (
        <div 
          className={cn(
            "fixed bottom-8 right-8 z-50 px-6 py-3 rounded-2xl shadow-lg backdrop-blur-md transition-all duration-300",
            timeLeft <= 5 * 60 
              ? "bg-red-500/90 text-white animate-pulse" 
              : timeLeft <= 10 * 60 
                ? "bg-amber-500/90 text-white"
                : "bg-background/90 border"
          )}
          onClick={(e) => {
            e.stopPropagation();
            setShowControls(true);
          }}
        >
          <div className="flex items-center gap-3">
            <Clock className={cn("h-5 w-5", timeLeft <= 10 * 60 ? "text-white" : "text-muted-foreground")} />
            <span className={cn(
              "font-mono text-2xl font-bold tabular-nums",
              timeLeft <= 10 * 60 ? "text-white" : "text-foreground"
            )}>
              {formatTime(timeLeft)}
            </span>
            {timeLeft <= 5 * 60 && (
              <span className="text-xs font-medium opacity-80">¡Tiempo!</span>
            )}
          </div>
        </div>
      )}

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
