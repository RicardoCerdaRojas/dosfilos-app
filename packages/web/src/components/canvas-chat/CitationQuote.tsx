import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Languages, Loader2 } from 'lucide-react';
import { needsTranslation, type ReaderLanguage } from '@dosfilos/domain';
import { useCitationTranslation } from '@/hooks/useCitationTranslation';
import { cn } from '@/lib/utils';

interface Props {
    children: ReactNode;
    className?: string | undefined;
}

/** Texto plano de un árbol de React, para poder juzgar el idioma de la cita. */
function textoDe(node: ReactNode): string {
    if (node === null || node === undefined || typeof node === 'boolean') return '';
    if (typeof node === 'string' || typeof node === 'number') return String(node);
    if (Array.isArray(node)) return node.map(textoDe).join('');
    if (typeof node === 'object' && 'props' in (node as any)) return textoDe((node as any).props?.children);
    return '';
}

/**
 * La cita de la biblioteca, con traducción a un clic — SIN perder el original.
 *
 * POR QUÉ NO SE REEMPLAZA EL TEXTO: este blockquote no es decoración. Es el
 * ANCLA VERIFICABLE — un snapshot verbatim del chunk real de la biblioteca del
 * pastor, que `injectNarrativeCitationAnchors` inyecta justamente para que el
 * modelo no pueda atribuirle a un autor algo que no escribió.
 *
 * TRADUCIR NO ES PARAFRASEAR. Una traducción conserva lo que el autor afirmó y
 * cambia el idioma; una paráfrasis cambia sus palabras y las presenta como
 * suyas. Por eso la traducción va ROTULADA y el original queda a un clic:
 * ninguna de las dos se hace pasar por la otra.
 *
 * El botón sólo aparece cuando el idioma de la cita no es el del lector — y esa
 * decisión se calcula en dominio (`needsTranslation`), no se le pregunta al
 * modelo.
 */
export function CitationQuote({ children, className }: Props) {
    const { t, i18n } = useTranslation('generator');
    const { translate, translating, error } = useCitationTranslation();
    const [traduccion, setTraduccion] = useState<string | null>(null);
    const [viendoOriginal, setViendoOriginal] = useState(false);

    const texto = textoDe(children);
    const lector: ReaderLanguage = i18n.language?.startsWith('en') ? 'en' : 'es';
    const ofrecer = needsTranslation(texto, lector);

    // La primera línea de la cita: lo que se traduce. La atribución —autor,
    // obra, marcador— NO se toca: un nombre propio traducido sería un error.
    const soloCita = texto.replace(/\n?—[^\n]*$/, '').trim();

    const alPedir = async () => {
        if (traduccion) {
            setViendoOriginal((v) => !v);
            return;
        }
        const out = await translate(soloCita, lector);
        if (out) {
            setTraduccion(out);
            setViendoOriginal(false);
        }
    };

    const mostrandoTraduccion = Boolean(traduccion) && !viendoOriginal;

    return (
        <blockquote className={className}>
            {mostrandoTraduccion ? (
                <>
                    <p>«{traduccion}»</p>
                    {/* El rótulo es obligatorio: sin él, una traducción con el
                        nombre del autor debajo se lee como sus palabras. */}
                    <p className="not-italic text-[11px] uppercase tracking-wide opacity-70">
                        {t('citations.ownTranslation')}
                    </p>
                </>
            ) : (
                children
            )}

            {ofrecer && (
                <button
                    type="button"
                    onClick={alPedir}
                    disabled={translating}
                    className={cn(
                        'not-italic mt-1 inline-flex items-center gap-1 text-[11px] font-medium',
                        'text-primary hover:underline decoration-dotted underline-offset-2',
                        'disabled:opacity-60 disabled:cursor-wait',
                    )}
                >
                    {translating ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                        <Languages className="h-3 w-3" />
                    )}
                    {translating
                        ? t('citations.translating')
                        : mostrandoTraduccion
                            ? t('citations.seeOriginal')
                            : traduccion
                                ? t('citations.seeTranslation')
                                : t('citations.translate')}
                </button>
            )}

            {error && (
                <span className="not-italic ml-2 text-[11px] text-muted-foreground">
                    {t('citations.translateFailed')}
                </span>
            )}
        </blockquote>
    );
}
