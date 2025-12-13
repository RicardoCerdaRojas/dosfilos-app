import { useState, Fragment, ReactNode } from 'react';
import { BookOpen } from 'lucide-react';
import { BiblePassageViewer } from './BiblePassageViewer';
import { LocalBibleService } from '@/services/LocalBibleService';
import { cn } from '@/lib/utils';

interface BibleLinkedTextProps {
    text: string;
    className?: string;
}

// Comprehensive pattern to match Bible references in Spanish
// Matches: "Juan 3:16", "Jn 3:16", "1 Juan 3:16-18", "1Jn 3.16", "Gén 1:1", etc.
// Supports: Full names, abbreviations, with/without spaces, : or . as separator
const BIBLE_REF_PATTERN = /(?:^|[^\wáéíóúñ])((?:[1-3]\s?)?(?:Génesis|Genesis|Gén|Gen|Gn|Éxodo|Exodo|Éx|Ex|Levítico|Levitico|Lev|Lv|Números|Numeros|Núm|Num|Nm|Deuteronomio|Deut|Dt|Josué|Josue|Jos|Jueces|Jue|Jc|Rut|Rt|Samuel|Sam|S|Reyes|Rey|R|Crónicas|Cronicas|Cr|Esdras|Esd|Ezr|Nehemías|Nehemias|Neh|Ne|Ester|Est|Et|Job|Jb|Salmos?|Sal|Sl|Ps|Proverbios|Prov|Pr|Prv|Eclesiastés|Eclesiastes|Ecl|Ec|Cantares|Cantar|Cnt|Ct|Isaías|Isaias|Is|Isa|Jeremías|Jeremias|Jer|Jr|Lamentaciones|Lam|Lm|Ezequiel|Ezeq|Ez|Daniel|Dan|Dn|Oseas|Os|Joel|Jl|Amós|Amos|Am|Abdías|Abdias|Abd|Ab|Jonás|Jonas|Jon|Miqueas|Miq|Mi|Nahúm|Nahum|Nah|Na|Habacuc|Hab|Sofonías|Sofonias|Sof|Hageo|Hag|Zacarías|Zacarias|Zac|Zc|Malaquías|Malaquias|Mal|Mateo|Mat|Mt|Marcos|Mar|Mc|Mr|Lucas|Luc|Lc|Juan|Jn|Hechos|Hch|Hec|Romanos|Rom|Ro|Rm|Corintios|Cor|Co|Gálatas|Galatas|Gál|Gal|Ga|Efesios|Ef|Efe|Filipenses|Fil|Fp|Colosenses|Col|Tesalonicenses|Tes|Ts|Timoteo|Tim|Ti|Tito|Tit|Filemón|Filemon|Flm|Flmn|Hebreos|Heb|He|Santiago|Sant|Stg|Pedro|Ped|Pe|P|Judas|Jud|Apocalipsis|Apoc|Ap)\s*\d+[:.]\d+(?:[-–]\d+)?)/gi;


/**
 * BibleLinkedText Component
 * Detects Bible references in text and makes them clickable to view the passage
 */
export function BibleLinkedText({ text, className }: BibleLinkedTextProps) {
    const [selectedReference, setSelectedReference] = useState<string | null>(null);

    // Find all Bible references in the text
    const parseTextWithReferences = (inputText: string): ReactNode[] => {
        const parts: ReactNode[] = [];
        let lastIndex = 0;
        
        // Reset regex state
        BIBLE_REF_PATTERN.lastIndex = 0;
        
        let match;
        while ((match = BIBLE_REF_PATTERN.exec(inputText)) !== null) {
            const fullMatch = match[0];
            const startIndex = match.index;
            
            // Validate that this is a parseable reference
            const isValid = LocalBibleService.parseReference(fullMatch.trim()) !== null;
            
            if (!isValid) {
                continue;
            }
            
            // Add text before the match
            if (startIndex > lastIndex) {
                parts.push(inputText.substring(lastIndex, startIndex));
            }
            
            // Add the clickable reference
            parts.push(
                <BibleReferenceLink
                    key={`ref-${startIndex}`}
                    reference={fullMatch.trim()}
                    onClick={() => setSelectedReference(fullMatch.trim())}
                />
            );
            
            lastIndex = startIndex + fullMatch.length;
        }
        
        // Add remaining text
        if (lastIndex < inputText.length) {
            parts.push(inputText.substring(lastIndex));
        }
        
        return parts.length > 0 ? parts : [inputText];
    };

    const parts = parseTextWithReferences(text);

    return (
        <>
            <span className={className}>
                {parts.map((part, index) => (
                    <Fragment key={index}>{part}</Fragment>
                ))}
            </span>
            
            {/* Bible Passage Viewer Dialog */}
            <BiblePassageViewer
                reference={selectedReference}
                onClose={() => setSelectedReference(null)}
            />
        </>
    );
}

/**
 * Clickable Bible reference link
 */
interface BibleReferenceLinkProps {
    reference: string;
    onClick: () => void;
    className?: string;
}

function BibleReferenceLink({ reference, onClick, className }: BibleReferenceLinkProps) {
    return (
        <button
            type="button"
            onClick={(e) => {
                e.stopPropagation();
                onClick();
            }}
            className={cn(
                "inline-flex items-center gap-0.5 text-primary font-medium",
                "hover:underline decoration-dotted underline-offset-2",
                "cursor-pointer transition-colors hover:text-primary/80",
                "bg-primary/5 px-1 py-0.5 rounded",
                className
            )}
            title={`Ver ${reference}`}
        >
            <BookOpen className="h-3 w-3 flex-shrink-0" />
            <span>{reference}</span>
        </button>
    );
}
