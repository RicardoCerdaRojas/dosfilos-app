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
    /** Títulos y referencias del bosquejo. */
    points: readonly { title?: string; scriptureReferences?: string[] }[];
    /** Traduce una clave i18n: los encabezados son texto de cara al usuario. */
    t: (key: string) => string;
}

interface PartesDelPunto {
    content: string[];
    authorityQuote: string;
    illustration: string;
    implications: string;
    transition: string;
}

const vacio = (): PartesDelPunto => ({
    content: [],
    authorityQuote: '',
    illustration: '',
    implications: '',
    transition: '',
});

/**
 * Arma el borrador a partir de lo que el pastor decidió y escribió.
 *
 * ES DETERMINISTA. NO HAY LLAMADA AL MODELO, y es la decisión central: la prosa
 * ya está escrita sección por sección desde sus decisiones. Unirla es
 * concatenación. Pedirle a un modelo que "arme el sermón con las piezas" le
 * daría permiso para reescribirlas, y el texto publicado dejaría de ser el que
 * él revisó — la cadena de procedencia se rompería en el último paso.
 *
 * NO CONOCE NINGÚN `sectionId`. Cada sección declara su destino en el catálogo
 * y este módulo sólo lo obedece. Antes mapeaba ids a campos a mano, así que
 * agregar una sección al taller y olvidarse acá la dejaba sin llegar al sermón
 * — sin error y sin aviso.
 *
 * LO QUE FALTA, FALTA. Una sección sin contenido queda vacía: no se rellena ni
 * se pide al modelo. Rellenar sería la puerta de atrás que este flujo cierra.
 */
export function assembleDraft(input: AssembleDraftInput): SermonContent {
    /**
     * El contenido de una sección: su prosa redactada o, si no la hay, lo que
     * ya traía hecho.
     *
     * LA PROSA MANDA SOBRE LAS NOTAS. Lo que el pastor escribió en el bosquejo
     * son notas de trabajo —viñetas con asteriscos a la vista— y llevarlas al
     * púlpito tal cual sería publicar su borrador. Pero si todavía no redactó,
     * es preferible su texto crudo a una sección vacía.
     */
    const contenido = (s: WalkSection): string => {
        const redactada = input.prose[s.id]?.trim();
        if (redactada) return redactada;

        const decidido = (input.elements[s.id] ?? [])
            .filter((e) => e.provenance !== 'descartado')
            .map((e) => e.text.trim())
            .filter(Boolean)
            .join(' ')
            .trim();
        if (decidido) return decidido;

        // SÓLO si su material de origen ES el contenido. El recordatorio de la
        // transición y las palabras clave del estudio son CONTEXTO: entraban al
        // sermón por esta puerta, y el recordatorio salía dos veces porque
        // `assembleTransitions` lo agrega después.
        return s.coveredIsContent ? (s.coveredBy ?? []).join('\n').trim() : '';
    };

    const unir = (partes: string[]) => partes.map((p) => p.trim()).filter(Boolean).join('\n\n');

    const introduccion: string[] = [];
    let title = '';
    let conclusion = '';
    let callToAction = '';

    const porPunto = new Map<number, PartesDelPunto>();
    const delPunto = (n: number): PartesDelPunto => {
        const previo = porPunto.get(n);
        if (previo) return previo;
        const nuevo = vacio();
        porPunto.set(n, nuevo);
        return nuevo;
    };
    const numeroDe = (s: WalkSection) => Number(s.parentId?.split('.')[1] ?? 0);

    for (const seccion of input.walk) {
        const texto = contenido(seccion);
        const destino = seccion.definition.target;

        switch (destino.kind) {
            case 'title':
                title = texto;
                break;
            case 'introduction':
                // El encabezado va SÓLO si hay contenido: un título sobre una
                // sección vacía anuncia algo que no está.
                if (texto) introduccion.push(`### ${input.t(destino.headingKey)}\n\n${texto}`);
                break;
            case 'conclusion':
                conclusion = texto;
                break;
            case 'callToAction':
                callToAction = texto;
                break;
            case 'pointContent':
                if (texto) delPunto(numeroDe(seccion)).content.push(texto);
                break;
            case 'pointAuthorityQuote':
                delPunto(numeroDe(seccion)).authorityQuote = texto;
                break;
            case 'pointIllustration':
                delPunto(numeroDe(seccion)).illustration = texto;
                break;
            case 'pointImplications':
                delPunto(numeroDe(seccion)).implications = texto;
                break;
            case 'pointTransition':
                // Sólo el puente retórico si el pastor lo escribió. El
                // RECORDATORIO —proposición + puntos— lo agrega
                // `assembleTransitions` desde el bosquejo: es dato que ya
                // existe, y pedirlo al modelo es darle ocasión de reformularlo.
                delPunto(numeroDe(seccion)).transition = texto;
                break;
        }
    }

    const body = input.points.map((punto, i) => {
        const n = i + 1;
        const parte = porPunto.get(n) ?? vacio();
        return {
            point: punto.title?.trim() ?? '',
            // El pasaje que ESTE punto expone, para que el bloque del texto lo
            // abra. Sale del recorrido, que ya lo derivó del título del punto.
            mainPassageRef: input.walk.find((s) => s.parentId === `point.${n}` && s.scriptureRef)?.scriptureRef,
            content: unir(parte.content),
            illustration: parte.illustration || undefined,
            implications: splitApplication(parte.implications),
            scriptureReferences: punto.scriptureReferences,
            // LA CITA ES UNA DECISIÓN SUYA, no un campo que el modelo rellena.
            //
            // Acá se forzaba `null` razonando "nunca se fabrica". Pero no
            // fabricar no es lo mismo que no permitir: una cita verificable de
            // su biblioteca es legítima y el proyecto la contempla. Al forzarla
            // a `null` desapareció del sermón sin que nadie lo decidiera.
            //
            // Ahora sale de su sección: si él no decidió ninguna, es `null` —
            // que es lo correcto — pero por ausencia de decisión, no por
            // imposición.
            authorityQuote: parte.authorityQuote || null,
            transition: parte.transition || undefined,
        };
    });

    return {
        title,
        introduction: unir(introduccion),
        body,
        conclusion,
        callToAction: callToAction || undefined,
    };
}

/** Secciones que aún no tienen contenido. Para avisar antes de armar. */
export function missingForDraft(input: AssembleDraftInput): WalkSection[] {
    return input.walk.filter((s) => {
        if (s.status === 'cubierta') return false;
        // Una sección opcional vacía no es una falta: contarla empujaría al
        // pastor a rellenarla para "completar" el sermón.
        if (s.optional) return false;
        if (s.mode === 'verbatim') {
            return (input.elements[s.id] ?? []).every((e) => e.provenance === 'descartado');
        }
        return !input.prose[s.id]?.trim();
    });
}
