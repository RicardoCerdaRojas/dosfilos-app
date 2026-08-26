import type { RAGSource, SermonContent } from '../entities/SermonGenerator';
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
    t: (key: string, params?: Record<string, string | number>) => string;
}

interface PartesDelPunto {
    content: string[];
    keyWords: string[];
    authorityQuote: string;
    illustration: string;
    implications: string;
    transition: string;
}

const vacio = (): PartesDelPunto => ({
    content: [],
    keyWords: [],
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
            case 'pointKeyWords': {
                // ÍTEM POR ÍTEM, no la prosa: cada palabra decidida es una
                // entrada de la lista, tal como el pastor la dejó. `contenido()`
                // las uniría en un párrafo — el dato léxico no se redacta.
                const palabras = (input.elements[seccion.id] ?? [])
                    .filter((e) => e.provenance !== 'descartado')
                    .map((e) => e.text.trim())
                    .filter(Boolean);
                delPunto(numeroDe(seccion)).keyWords.push(...palabras);
                break;
            }
            case 'pointAuthorityQuote': {
                // VARIAS CITAS SON BLOQUES SEPARADOS. `contenido()` une los
                // elementos con espacio — dos citas quedarían pegadas en una
                // frase ilegible con dos atribuciones adentro.
                const citas = (input.elements[seccion.id] ?? [])
                    .filter((e) => e.provenance !== 'descartado')
                    .map((e) => e.text.trim())
                    .filter(Boolean);
                delPunto(numeroDe(seccion)).authorityQuote =
                    citas.length > 0 ? citas.join('\n\n') : texto;
                break;
            }
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
            ...(parte.keyWords.length > 0 ? { keyWords: parte.keyWords } : {}),
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

    const ragSources = collectElementSources(input);

    return {
        // El taller es el camino de las decisiones: el borrador lo declara.
        assembledFrom: 'workshop',
        title,
        introduction: unir(introduccion),
        body,
        conclusion,
        callToAction: callToAction || undefined,
        ...(ragSources.length > 0 ? { ragSources } : {}),
    };
}

/**
 * Las fuentes de la biblioteca que respaldan elementos DECIDIDOS del sermón.
 *
 * Sin esto, la cita quedaba en el cuerpo con su atribución escrita pero el
 * LIBRO no quedaba en `ragSources`: la bibliografía del sermón publicado no
 * nombraba de dónde salió lo citado — a menos que el mismo libro ya viniera
 * de la exégesis o la homilética, que es una coincidencia, no un registro.
 *
 * DEDUPLICADO POR OBRA Y PÁGINA: la bibliografía lista fuentes, no usos. La
 * primera aparición gana y `usedFor` nombra su sección — se recorre el WALK y
 * no el mapa de elementos para que el orden sea el del sermón, no el del
 * objeto.
 */
function collectElementSources(input: AssembleDraftInput): RAGSource[] {
    const fuentes: RAGSource[] = [];
    const vistas = new Set<string>();
    for (const seccion of input.walk) {
        for (const el of input.elements[seccion.id] ?? []) {
            if (el.provenance === 'descartado' || !el.source?.title) continue;
            const clave = `${el.source.title}|${el.source.page ?? ''}`;
            if (vistas.has(clave)) continue;
            vistas.add(clave);
            fuentes.push({
                title: el.source.title,
                ...(el.source.author ? { author: el.source.author } : {}),
                ...(el.source.page ? { page: el.source.page } : {}),
                usedFor: input.t(seccion.labelKey, seccion.labelParams),
            });
        }
    }
    return fuentes;
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
