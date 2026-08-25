import type { SermonContent } from '../entities/SermonGenerator';
import type { SermonElement } from './SermonElement';
import type { WalkSection } from './deriveSectionWalk';
import { splitApplication } from '../sermon-judge/splitApplication';

export interface AssembleDraftInput {
    walk: readonly WalkSection[];
    /** Prosa escrita por sección. */
    prose: Readonly<Record<string, string>>;
    /** Decisiones por sección. Las `verbatim` traen el texto final acá. */
    elements: Readonly<Record<string, SermonElement[]>>;
    /** Títulos de los puntos y sus referencias, del bosquejo. */
    points: readonly { title?: string; application?: string; scriptureReferences?: string[] }[];
}

/**
 * Arma el borrador a partir de lo que el pastor decidió y escribió.
 *
 * ES DETERMINISTA. NO HAY LLAMADA AL MODELO ACÁ, y es la decisión central de
 * este módulo: la prosa ya está escrita sección por sección, cada una desde sus
 * decisiones. Unirla es concatenación. Pedirle a un modelo que "arme el sermón"
 * con las piezas le daría permiso para reescribirlas — y entonces el texto
 * publicado dejaría de ser el que él revisó, con lo que toda la cadena de
 * procedencia se rompe en el último paso.
 *
 * LO QUE FALTA, FALTA. Una sección sin prosa no se rellena ni se pide al
 * modelo: queda vacía. Rellenar sería exactamente la puerta de atrás que este
 * flujo existe para cerrar.
 */
export function assembleDraft(input: AssembleDraftInput): SermonContent {
    const prosa = (id: string) => input.prose[id]?.trim() ?? '';

    /** Lo decidido en una sección `verbatim` ES su texto final. */
    const verbatim = (id: string) =>
        (input.elements[id] ?? [])
            .filter((e) => e.provenance !== 'descartado')
            .map((e) => e.text.trim())
            .filter(Boolean)
            .join(' ')
            .trim();

    const unir = (partes: string[]) => partes.map((p) => p.trim()).filter(Boolean).join('\n\n');

    const introduction = unir([
        prosa('introduction.openingIllustration'),
        prosa('introduction.bookOverview'),
        prosa('introduction.historicalContext'),
    ]);

    const body = input.points.map((punto, i) => {
        const n = i + 1;
        const id = `point.${n}`;
        return {
            point: punto.title?.trim() ?? '',
            // LA PROPOSICIÓN DEL PUNTO ABRE SU CONTENIDO. Es la frase de la que
            // se desprenden las partes, así que va antes de la exposición que la
            // desarrolla — el mismo orden en que él la decide.
            content: unir([verbatim(`${id}.proposition`), prosa(`${id}.exposition`)]),
            illustration: prosa(`${id}.illustration`) || undefined,
            // LA PROSA REDACTADA MANDA SOBRE LAS NOTAS DEL BOSQUEJO. Sus viñetas
            // son notas de trabajo —con los asteriscos a la vista— y llevarlas
            // al sermón tal cual sería publicar su borrador. Si todavía no
            // redactó la sección, se usan las notas: es preferible su texto
            // crudo a un sermón sin aplicación.
            implications: splitApplication(prosa(`${id}.application`) || punto.application),
            scriptureReferences: punto.scriptureReferences,
            // NUNCA se fabrica una cita de autoridad. Si no hay una verificable,
            // `null` — es la regla que ya rige el resto del sermón.
            authorityQuote: null,
        };
    });

    return {
        title: verbatim('title'),
        introduction,
        body,
        conclusion: prosa('conclusion.recap'),
        callToAction: prosa('conclusion.callToAction') || undefined,
    };
}

/** Secciones que aún no tienen prosa ni texto final. Para avisar antes de armar. */
export function missingForDraft(input: AssembleDraftInput): WalkSection[] {
    return input.walk.filter((s) => {
        if (s.status === 'cubierta') return false;
        if (s.mode === 'verbatim') {
            return (input.elements[s.id] ?? []).every((e) => e.provenance === 'descartado');
        }
        return !input.prose[s.id]?.trim();
    });
}
