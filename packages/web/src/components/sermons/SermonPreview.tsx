import { useState, useEffect } from 'react';
import { 
  BookOpen, Minus, Plus, Type
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import ReactMarkdown from 'react-markdown';
import { useTranslation } from 'react-i18next';
import remarkGfm from 'remark-gfm';
import { LocalBibleService } from '@/services/LocalBibleService';

interface SermonPreviewProps {
  title: string;
  content: string;
  authorName?: string;
  date?: Date;
  bibleReferences?: string[];
  tags?: string[];
  category?: string;
  status?: string;
}

export function SermonPreview({
  title,
  content,
  authorName = 'Pastor',
  date = new Date(),
  bibleReferences = [],
  tags = [],
  category,
  status = 'draft'
}: SermonPreviewProps) {
  const { t, i18n } = useTranslation('sermonDetail');
  const [fontSize, setFontSize] = useState(18);
  
  // Bible Viewer State
  const [selectedReference, setSelectedReference] = useState<string | null>(null);
  const [bibleText, setBibleText] = useState<string | null>(null);
  const [bibleVersion, setBibleVersion] = useState<string>('');
  const [loadingBible, setLoadingBible] = useState(false);

  // Bible Fetching Logic
  const fetchBibleText = async (ref: string) => {
    setLoadingBible(true);
    setBibleText(null);
    try {
      await new Promise(resolve => setTimeout(resolve, 300));
      const text = LocalBibleService.getVerses(ref);
      if (text) {
        setBibleText(text);
        setBibleVersion(LocalBibleService.getVersionName(ref));
      } else {
        setBibleText(t('preachMode.bible.notFound'));
        setBibleVersion('');
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

  // Bible Reference Pattern (Robust) - includes Full English and Spanish book names
  const BIBLE_REF_PATTERN = /(?:^|[^\wáéíóúñ])((?:[1-3]\s?)?(?:Génesis|Genesis|Gén|Gen|Gn|Éxodo|Exodo|Exodus|Éx|Ex|Levítico|Levitico|Leviticus|Lev|Lv|Números|Numeros|Numbers|Núm|Num|Nm|Deuteronomio|Deut|Deuteronomy|Dt|Josué|Josue|Joshua|Jos|Jueces|Jue|Judges|Jc|Rut|Ruth|Rt|Samuel|Sam|S|Reyes|Rey|Kings|Kgs|R|Crónicas|Cronicas|Chronicles|Chr|Cr|Esdras|Esd|Ezra|Ezr|Nehemías|Nehemias|Nehemiah|Neh|Ne|Ester|Est|Esther|Et|Job|Jb|Salmos?|Psalms?|Sal|Sl|Ps|Proverbios|Prov|Proverbs|Pr|Prv|Eclesiastés|Eclesiastes|Ecclesiastes|Ecl|Ec|Cantares|Cantar|Song of Solomon|Songs|Cnt|Ct|Isaías|Isaias|Isaiah|Is|Isa|Jeremías|Jeremias|Jeremiah|Jer|Jr|Lamentaciones|Lam|Lamentations|Lm|Ezequiel|Ezeq|Ezekiel|Ez|Daniel|Dan|Dn|Oseas|Os|Hosea|Joel|Jl|Amós|Amos|Am|Abdías|Abdias|Obadiah|Abd|Ab|Jonás|Jonas|Jonah|Jon|Miqueas|Miq|Micah|Mi|Nahúm|Nahum|Nah|Na|Habacuc|Habakkuk|Hab|Sofonías|Sofonias|Zephaniah|Sof|Hageo|Hag|Haggai|Zacarías|Zacarias|Zechariah|Zac|Zc|Malaquías|Malaquias|Malachi|Mal|Mateo|Mat|Matthew|Matt|Mt|Marcos|Mar|Mark|Mk|Mr|Lucas|Luc|Luke|Lk|Lm|Juan|Jn|John|Hechos|Hch|Hec|Acts|Ac|Romanos|Rom|Romans|Ro|Rm|Corintios|Cor|Corinthians|Co|Gálatas|Galatas|Galatians|Gál|Gal|Ga|Efesios|Ef|Ephesians|Eph|Efe|Filipenses|Fil|Philippians|Phil|Php|Fp|Colosenses|Col|Colossians|Tesalonicenses|Tes|Thessalonians|Thess|Ts|Th|Timoteo|Tim|Timothy|Ti|Tito|Tit|Titus|Filemón|Filemon|Philemon|Phm|Flm|Flmn|Hebreos|Heb|Hebrews|He|Santiago|Sant|James|Jas|Stg|Pedro|Ped|Peter|Pet|Pe|Pt|P|Judas|Jud|Jude|Apocalipsis|Apoc|Ap|Revelation|Rev)\s*\d+[:.]\d+(?:[-–]\d+)?)/gi;

  // Markdown Processing for Bible Links
  const processContent = (content: string) =>{
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
      return `${prefix}[📖 ${trimmedRef}](#bible-${encodeURIComponent(trimmedRef)})`;
    });
    
    return processed;
  };

  const components = {
    a: ({ node, ...props }: any) => {
      const href = props.href || '';
      // Handle internal bible links
      if (href.startsWith('#bible-')) {
        const ref = decodeURIComponent(href.replace('#bible-', ''));
        return (
          <span 
            className="text-primary font-semibold cursor-pointer hover:underline decoration-dotted underline-offset-4 inline-flex items-center gap-0.5"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setSelectedReference(ref);
            }}
            title={`Ver ${ref}`}
          >
            {props.children}
          </span>
        );
      }
      // Handle normal links
      return <a {...props} className="text-blue-500 underline hover:text-blue-700" target="_blank" rel="noopener noreferrer" />;
    },
    // Custom blockquote styling
    blockquote: ({ node, ...props }: any) => (
      <blockquote 
        {...props} 
        className="border-l-4 border-primary/30 pl-4 my-4 text-muted-foreground bg-muted/10 py-2 pr-2 rounded-r"
      />
    ),
    // Custom heading styling
    h2: ({ node, ...props }: any) => <h2 {...props} className="text-2xl font-bold mt-6 mb-3" />,
    h3: ({ node, ...props }: any) => <h3 {...props} className="text-xl font-semibold mt-5 mb-2" />,
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any; label: string }> = {
      draft: { variant: 'secondary', label: t('status.draft') },
      published: { variant: 'default', label: t('status.published') },
      archived: { variant: 'outline', label: t('status.archived') },
    };
    const config = variants[status] || variants.draft;
    const safeConfig = config!;
    return (
      <Badge variant={safeConfig.variant} className="capitalize">
        {safeConfig.label}
      </Badge>
    );
  };

  return (
    <div className="bg-background min-h-full">
      {/* Floating Controls */}
      <div className="sticky top-4 z-10 flex justify-end px-4 mb-4 pointer-events-none">
        <div className="flex items-center gap-1 bg-background/80 backdrop-blur border rounded-full px-2 py-1 shadow-sm pointer-events-auto">
          <Type className="h-3 w-3 text-muted-foreground ml-1" />
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setFontSize(s => Math.max(14, s - 1))}>
            <Minus className="h-3 w-3" />
          </Button>
          <span className="text-xs w-6 text-center tabular-nums">{fontSize}</span>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setFontSize(s => Math.min(24, s + 1))}>
            <Plus className="h-3 w-3" />
          </Button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Document Header */}
        <div className="text-center space-y-8 pb-8 border-b">
          <div className="space-y-4">
            <div className="flex items-center justify-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-[0.2em]">
              <span>{date.toLocaleDateString(i18n.language, { dateStyle: 'long' })}</span>
              {authorName && authorName !== 'Pastor' && (
                <>
                  <span className="text-border">•</span>
                  <span>{authorName}</span>
                </>
              )}
            </div>
            <h1 className="text-4xl sm:text-6xl font-bold tracking-tight font-serif text-foreground leading-tight">
              {title}
            </h1>
            <div className="flex justify-center pt-2">
              {getStatusBadge(status)}
            </div>
          </div>
          
          {/* Bible References */}
          {bibleReferences.length > 0 && (
            <div className="flex flex-wrap items-center justify-center gap-3 pt-4">
              {bibleReferences.map((ref, index) => (
                <div 
                  key={index} 
                  className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-50 text-amber-900 border border-amber-200 text-sm font-medium shadow-sm cursor-pointer hover:bg-amber-100 transition-colors"
                  onClick={() => setSelectedReference(ref)}
                >
                  <BookOpen className="h-3.5 w-3.5 text-amber-600" />
                  {ref}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Main Content */}
        <div 
          className="prose prose-lg max-w-none dark:prose-invert sermon-content transition-all duration-200"
          style={{ fontSize: `${fontSize}px` }}
        >
          <style>{`
            .sermon-content p {
              margin-top: 1.25em !important;
              margin-bottom: 1.25em !important;
            }
            .sermon-content p:first-child {
              margin-top: 0 !important;
            }
          `}</style>
          <ReactMarkdown 
            components={components}
            remarkPlugins={[remarkGfm]}
          >
            {processContent(content)}
          </ReactMarkdown>
        </div>

        {/* Footer Info */}
        {(tags.length > 0 || category) && (
          <div className="pt-8 border-t">
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                {t('sections.tagsAndCategory')}
              </h3>
              <div className="flex flex-wrap gap-2">
                {category && (
                  <Badge variant="outline" className="text-sm py-1 px-3 border-primary/20 bg-primary/5">
                    {category}
                  </Badge>
                )}
                {tags.map((tag, i) => (
                  <Badge key={i} variant="outline" className="text-sm py-1 px-3">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

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
              <div className="text-lg leading-relaxed max-h-[60vh] overflow-y-auto pr-2">
                {bibleText}
              </div>
            )}
            <div className="mt-4 text-xs text-muted-foreground text-right">
              {bibleVersion && t('preachMode.bible.source', { version: bibleVersion })}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
