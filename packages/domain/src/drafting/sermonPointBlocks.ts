/** Un bloque del cuerpo de un punto, en el orden en que se predica. */
export interface SermonPointBlock {
    /** Identifica el bloque. La UI decide cómo pintarlo. */
    kind:
        | 'mainPassage'
        | 'content'
        | 'keyWords'
        | 'crossReferences'
        | 'authorityQuote'
        | 'illustration'
        | 'implications'
        | 'transition';
    /** Clave i18n de su encabezado. Ausente cuando el bloque no lleva rótulo. */
    headingKey?: string;
    /** Texto corrido, para los bloques de un solo cuerpo. */
    text?: string;
    /** Ítems, para los bloques que son lista. */
    items?: string[];
}

/** Forma mínima que este módulo necesita de un punto del sermón. */
export interface SermonPointShape {
    /**
     * Referencia del pasaje que ESTE punto expone.
     *
     * Separada de `scriptureReferences`, que son las de APOYO. Antes el texto
     * del pasaje venía escrito dentro de la prosa porque el prompt se lo pedía
     * al modelo — dato que ya tenemos, pedido a quien puede equivocarlo.
     */
    mainPassageRef?: string;
    content?: string;
    keyWords?: string[];
    scriptureReferences?: string[];
    illustration?: string;
    implications?: string[];
    authorityQuote?: string | null;
    transition?: string;
}

const NS = 'drafting.pointBlocks';

/**
 * QUÉ BLOQUES TIENE UN PUNTO, EN QUÉ ORDEN Y CON QUÉ RÓTULO.
 *
 * ES LA ÚNICA DESCRIPCIÓN DE ESA FORMA, y por eso existe. El sermón se dibujaba
 * en DOS lugares que no se hablaban: el lienzo de edición (`SectionCard`) y el
 * serializador de la vista previa y del sermón publicado (`buildFullContent`).
 * Divergieron exactamente como se esperaría — las referencias cruzadas salían
 * con su texto en uno y desnudas en el otro, la transición tenía bloque propio
 * en uno y cursiva rota en el otro, las implicaciones iban con viñeta acá y
 * numeradas allá.
 *
 * El pastor edita en un renderizador y publica desde el otro: la divergencia no
 * es un detalle estético, es que revisa una cosa y su congregación recibe otra.
 *
 * DEVUELVE CLAVES i18n, NO TEXTO. Los rótulos vivían hardcodeados en español
 * dentro del componente, que además es compartido con exégesis.
 *
 * LOS BLOQUES VACÍOS NO SE DEVUELVEN. Un rótulo sobre nada anuncia algo que no
 * está — y `authorityQuote` es `null` por diseño en todo sermón del taller.
 */
export function sermonPointBlocks(point: SermonPointShape): SermonPointBlock[] {
    const bloques: SermonPointBlock[] = [];
    const texto = (v: string | null | undefined) => v?.trim() || undefined;

    // EL TEXTO BÍBLICO VA PRIMERO: título → versículo → proposición → desarrollo.
    // El pastor lee el pasaje antes de oír qué se afirma de él, que es el orden
    // en que se predica. Va sin rótulo: la referencia lo identifica.
    const pasaje = texto(point.mainPassageRef);
    if (pasaje) bloques.push({ kind: 'mainPassage', text: pasaje });

    const contenido = texto(point.content);
    // El cuerpo del punto no lleva rótulo: es lo que se predica, no una ficha.
    if (contenido) bloques.push({ kind: 'content', text: contenido });

    // DESPUÉS DE LA EXPOSICIÓN, ANTES DE LAS REFERENCIAS — donde el fundador
    // las pidió: son el sustento léxico de lo que se acaba de exponer.
    const palabras = (point.keyWords ?? []).map((k) => k.trim()).filter(Boolean);
    if (palabras.length > 0) {
        bloques.push({ kind: 'keyWords', headingKey: `${NS}.keyWords`, items: palabras });
    }

    const refs = (point.scriptureReferences ?? [])
        // Las referencias generadas llegan con un "> " de cita al inicio; dentro
        // de un ítem de lista se renderiza como carácter literal.
        .map((r) => r.replace(/^\s*>\s*/, '').trim())
        .filter(Boolean);
    if (refs.length > 0) {
        bloques.push({ kind: 'crossReferences', headingKey: `${NS}.crossReferences`, items: refs });
    }

    // ANTES DE LA ILUSTRACIÓN: la cita respalda lo que se acaba de exponer; la
    // imagen viene después a hacerlo visible. Se muestra SÓLO si existe —
    // nunca se fabrica, y un rótulo vacío sobraría.
    const cita = texto(point.authorityQuote);
    if (cita) bloques.push({ kind: 'authorityQuote', headingKey: `${NS}.authorityQuote`, text: cita });

    const ilustracion = texto(point.illustration);
    if (ilustracion) {
        bloques.push({ kind: 'illustration', headingKey: `${NS}.illustration`, text: ilustracion });
    }

    const implicaciones = (point.implications ?? [])
        // El generador antepone "**Implicación:**" (o "**Implicación 2:**") y
        // la tarjeta ya rotula el bloque; además el lienzo pinta los ítems como
        // texto plano, así que los asteriscos quedaban LITERALES en pantalla.
        // Se limpia acá para que los sermones viejos también sanen.
        .map((i) => i.replace(/^\s*\*{0,2}\s*Implicaci[oó]n(\s*\d+)?\s*:?\s*\*{0,2}\s*/i, '').trim())
        .filter(Boolean);
    if (implicaciones.length > 0) {
        bloques.push({ kind: 'implications', headingKey: `${NS}.implications`, items: implicaciones });
    }

    const transicion = texto(point.transition);
    if (transicion) {
        bloques.push({ kind: 'transition', headingKey: `${NS}.transition`, text: transicion });
    }

    return bloques;
}
