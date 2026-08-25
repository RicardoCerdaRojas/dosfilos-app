import { describe, it, expect } from 'vitest';
import { buildSectionProsePrompt } from '../buildSectionProsePrompt';
import type { SermonElement } from '../SermonElement';
import { deriveSectionWalk, type WalkSection } from '../deriveSectionWalk';

/**
 * La sección se toma del RECORRIDO REAL, no se construye a mano: así el test
 * usa la misma definición que produce el catálogo y no una copia que puede
 * quedar desincronizada.
 */
const WALK = deriveSectionWalk({
    points: [{ title: 'II. El hombre desobedece y revela su necedad (vv. 3)' }],
    sermonPassage: 'Jonás 1:1-3',
});
const buscar = (sufijo: string): WalkSection => {
    const s = WALK.find((x) => x.id.endsWith(sufijo));
    if (!s) throw new Error(`No hay sección ${sufijo} en el recorrido`);
    return s;
};

const seccion = buscar('.exposition');

let n = 0;
const el = (
    text: string,
    kind: SermonElement['kind'] = 'elemento',
    provenance: SermonElement['provenance'] = 'pastor',
): SermonElement => ({
    id: `e${n++}`,
    sectionId: seccion.id,
    text,
    kind,
    provenance,
    decidedAt: new Date('2026-08-24'),
});

const base = {
    section: seccion,
    sectionLabel: 'Punto 2 — exposición',
    sectionJob: 'Decir lo que el texto dice y por qué importa.',
    passage: 'Jonás 1:1-3',
    proposition: 'En Jonás 1:1-3, veremos dos realidades del conflicto entre Jonás y Dios.',
    pointTitle: 'II. El hombre desobedece y revela su necedad (vv. 3)',
};

describe('buildSectionProsePrompt', () => {
    it('pasa las ideas del pastor verbatim y manda desarrollarlas', () => {
        const p = buildSectionProsePrompt({
            ...base,
            elements: [el('"y pagando su pasaje" en hebreo personifica a la nave.')],
        });
        expect(p).toContain('personifica a la nave');
        expect(p).toContain('IDEAS QUE ÉL DECIDIÓ');
        expect(p).toContain('NO las reemplaces');
    });

    it('separa TEMAS de IDEAS: en el tema el modelo sí aporta contenido', () => {
        // Mezclarlos rompe las dos direcciones: desarrollar un tema lo deja sin
        // cubrir, y "cubrir" una idea invita a reemplazarla por otra.
        const p = buildSectionProsePrompt({
            ...base,
            elements: [el('Nínive era la capital asiria'), el('Fecha del libro', 'directiva')],
        });
        const iIdeas = p.indexOf('IDEAS QUE ÉL DECIDIÓ');
        const iTemas = p.indexOf('TEMAS QUE ÉL MANDÓ CUBRIR');
        expect(iIdeas).toBeGreaterThan(-1);
        expect(iTemas).toBeGreaterThan(iIdeas);
        expect(p.slice(iIdeas, iTemas)).toContain('Nínive era la capital asiria');
        expect(p.slice(iTemas)).toContain('Fecha del libro');
    });

    it('prohíbe agregar ideas que él no decidió — la regla que sostiene la medición', () => {
        // Sin esto el modelo contrabandea contenido y la procedencia miente: la
        // pantalla diría que las ideas son suyas mientras el texto lleva otras.
        const p = buildSectionProsePrompt({ ...base, elements: [el('x')] });
        expect(p).toContain('NO AGREGUES IDEAS QUE ÉL NO DECIDIÓ');
    });

    it('prohíbe citas inventadas, con la razón escrita', () => {
        // Precedente: exigir una cita de autoridad ES el mecanismo por el que se
        // fabrica una falsa.
        const p = buildSectionProsePrompt({ ...base, elements: [el('x')] });
        expect(p).toContain('NO INVENTES CITAS');
        expect(p).toContain('destruye la credibilidad');
    });

    it('descarta los elementos que el pastor rechazó', () => {
        const p = buildSectionProsePrompt({
            ...base,
            elements: [el('la que sirve'), el('la que rechazó', 'elemento', 'descartado')],
        });
        expect(p).toContain('la que sirve');
        expect(p).not.toContain('la que rechazó');
    });

    it('omite el bloque de temas cuando no hay ninguno', () => {
        const p = buildSectionProsePrompt({ ...base, elements: [el('sólo una idea')] });
        expect(p).not.toContain('TEMAS QUE ÉL MANDÓ CUBRIR');
    });

    it('el registro cambia con el nivel elegido, no con el contenido', () => {
        const llano = buildSectionProsePrompt({ ...base, elements: [el('x')], audienceRigor: 'beginner' });
        const tecnico = buildSectionProsePrompt({ ...base, elements: [el('x')], audienceRigor: 'seminary' });
        expect(llano).toContain('explícalo en la misma frase');
        expect(tecnico).toContain('sin explicarlo');
    });

    it('pide frases cortas, sin encabezados ni meta-comentarios', () => {
        // Ya NO prohíbe viñetas: esa regla imponía una forma de predicar que no
        // era la del pastor. La forma la decide la estructura de lo decidido.
        //
        // Y ya no dice "para leer en voz alta": el manuscrito NO es la
        // transcripción de lo que dirá, es su documento de trabajo. Pedirle al
        // modelo que escriba lo que se va a leer invita justamente al adorno
        // que sobra.
        const p = buildSectionProsePrompt({ ...base, elements: [el('x')] });
        expect(p).toContain('Frases cortas');
        expect(p).toContain('meta-comentarios');
        expect(p).not.toContain('sin viñetas');
    });
});

describe('la forma del texto sigue la forma de lo decidido', () => {
    it('con VARIAS ideas pide una por movimiento, en orden', () => {
        // Estructura real del fundador (2026-08-24): sus cinco elementos
        // salieron como cinco viñetas, una a una. La prosa corrida los funde y
        // el oyente no puede seguir dónde termina uno y empieza el otro.
        const p = buildSectionProsePrompt({
            ...base,
            elements: [el('La formulación muestra el mandato directo'), el('Hijo de Amitai lo sitúa como profeta'), el('Nínive era capital asiria')],
        });
        expect(p).toContain('UNA IDEA POR MOVIMIENTO');
        expect(p).toContain('en el orden en que');
        expect(p).toContain('NO fundas dos ideas');
    });

    it('con UNA sola idea pide párrafo continuo, no viñetas', () => {
        // Sin varias partes que separar, la lista es andamiaje vacío — y una
        // ilustración partida en viñetas deja de ser una ilustración.
        const p = buildSectionProsePrompt({ ...base, elements: [el('¿Han visto a los niños cuando hacen rabietas?')] });
        expect(p).toContain('párrafo continuo');
        expect(p).toContain('No la partas en');
    });

    it('un tema también cuenta para decidir la forma', () => {
        const p = buildSectionProsePrompt({
            ...base,
            elements: [el('Nínive era capital asiria'), el('Fecha del libro', 'directiva')],
        });
        expect(p).toContain('UNA IDEA POR MOVIMIENTO');
    });
});

describe('el manuscrito no es la predicación', () => {
    const p = () => buildSectionProsePrompt({ ...base, elements: [el('Nínive era la capital asiria')] });

    it('prohíbe los vocativos: el trato con la congregación lo pone él, vivo', () => {
        // La prosa generada abría con "Hermanos, esta formulación inicial…".
        // Escribirlo de antemano le pre-guioniza la entrega, que es suya.
        expect(p()).toContain('Vocativos');
        expect(p()).toContain('Hermanos');
        expect(p()).toContain('pre-guioniza');
    });

    it('prohíbe el adorno retórico por su nombre, no en abstracto', () => {
        // Nombrar los giros concretos que aparecieron ("Imaginen la profunda…",
        // "de manera poderosa") funciona mejor que pedir "sé conciso".
        const texto = p();
        expect(texto).toContain('Imaginen la profunda');
        expect(texto).toContain('de manera poderosa');
    });

    it('dice para QUÉ sirve la concisión, no sólo que se exige', () => {
        // El propósito no es ahorrar tokens: es que el predicador vea la idea
        // de un vistazo cuando repase su manuscrito.
        expect(p()).toContain('DE UN VISTAZO');
    });

    it('da un largo orientativo por movimiento', () => {
        expect(p()).toContain('Dos a cuatro frases');
    });
});

describe('la proposición del punto gobierna la estructura', () => {
    const PROP = 'Dios habla, y cuando habla identifica, ordena y da razón.';
    const tres = [
        el('La formulación establece un mandato directo'),
        el('Hijo de Amitai lo sitúa como profeta conocido'),
        el('Nínive era la capital asiria'),
    ];

    it('cuando existe, se enuncia tal cual y las viñetas se desprenden de ella', () => {
        // "Esta frase es a un punto lo que la proposición homilética es al
        // sermón" (fundador). Las viñetas no son una lista suelta: son la
        // descomposición de los conceptos que la frase contiene.
        const p = buildSectionProsePrompt({ ...base, elements: tres, pointProposition: PROP });
        expect(p).toContain(PROP);
        expect(p).toContain('enúnciala TAL CUAL');
        // La regla evolucionó: ya no es "una viñeta por idea, cada una ligada a
        // un concepto" sino "un movimiento POR CONCEPTO, con las ideas como
        // material". El cambio salió de ver que las viñetas seguían el orden de
        // la lista y dos no correspondían a ningún concepto de la frase.
        expect(p).toContain('POR CADA CONCEPTO QUE LA PROPOSICIÓN NOMBRA');
    });

    it('sin proposición del punto vuelve a la estructura simple, sin inventarla', () => {
        // Si el pastor todavía no la decidió, el modelo NO la escribe: sería
        // otra decisión central tomada por la máquina, como pasó con el título.
        const p = buildSectionProsePrompt({ ...base, elements: tres });
        expect(p).toContain('UNA IDEA POR MOVIMIENTO');
        expect(p).not.toContain('PROPOSICIÓN DE ESTE PUNTO');
    });

    it('con una sola idea la proposición no impone tres movimientos', () => {
        const p = buildSectionProsePrompt({ ...base, elements: [el('una sola')], pointProposition: PROP });
        expect(p).toContain('párrafo continuo');
    });
});

describe('la proposición es la espina, no una decoración', () => {
    const PROP = 'Dios habla con intención: se identifica, identifica a Jonás, ordena y explica la razón.';
    const cinco = [
        el('La formulación muestra un mandato directo e imperativo'),
        el('Hijo de Amitai lo sitúa como profeta conocido'),
        el('Nínive era la capital asiria'),
        el('El motivo divino revela el carácter justo de Dios'),
        el('"Pregona contra ella" indica denuncia de juicio'),
    ];
    const p = () => buildSectionProsePrompt({ ...base, elements: cinco, pointProposition: PROP });

    it('los movimientos salen de los conceptos de la frase, no de la lista', () => {
        // Fallo real: las viñetas siguieron el orden de los elementos y dos de
        // ellas no correspondían a ningún concepto de la proposición.
        expect(p()).toContain('NO hagas un movimiento por idea');
        expect(p()).toContain('POR CADA CONCEPTO QUE LA PROPOSICIÓN NOMBRA');
    });

    it('prohíbe parafrasear: una idea reescrita con sinónimos no aporta', () => {
        // Los elementos `elegido` YA vienen escritos como frases completas. Pedir
        // "desarrolla" sobre ellas produce la misma frase con otras palabras.
        expect(p()).toContain('NO REESCRIBAS UNA IDEA CON OTRAS PALABRAS');
        expect(p()).toContain('sinónimos');
    });

    it('dice qué ES desarrollar, no sólo qué no hacer', () => {
        expect(p()).toContain('anclar en las palabras del texto bíblico');
    });

    it('una idea que no cabe en ningún concepto NO se descarta ni fuerza uno nuevo', () => {
        // Descartarla perdería una decisión suya; inventar un concepto para
        // acomodarla adulteraría su proposición.
        const texto = p();
        expect(texto).toContain('NO la descartes');
        expect(texto).toContain('NO inventes un concepto');
    });
});

describe('cada movimiento va como su propia viñeta', () => {
    it('lo pide explícitamente y dice para qué sirve', () => {
        // La espina funcionó pero salieron párrafos corridos: al reescribir el
        // bloque quedó dicho CUÁNTOS movimientos hacer y no CÓMO separarlos.
        const p = buildSectionProsePrompt({
            ...base,
            elements: [el('una'), el('otra'), el('tercera')],
            pointProposition: 'Dios se identifica, ordena y explica.',
        });
        expect(p).toContain('CADA UNO COMO SU PROPIA VIÑETA');
        expect(p).toContain('de un vistazo en cuántas partes');
    });
});

describe('una sección de una sola idea no se abre en movimientos', () => {
    const ilustracion = buscar('.illustration');
    const dosFrases = [el('Imagina que trabajas como jefe de obras.'), el('El arquitecto podría nunca ir a la obra.')];

    it('con proposición y varias frases, sigue siendo un relato continuo', () => {
        // Éste es el fallo: dos frases de la MISMA imagen la hacían entrar por
        // la rama de conceptos y salía estructurada como exposición.
        const p = buildSectionProsePrompt({
            ...base,
            section: ilustracion,
            elements: dosFrases,
            pointProposition: 'Dios se identifica, ordena y explica.',
        });
        expect(p).toContain('Es UNA imagen, no un argumento');
        expect(p).not.toContain('POR CADA CONCEPTO QUE LA PROPOSICIÓN NOMBRA');
    });

    it('prohíbe la moraleja: la aplicación vive en otra sección', () => {
        const p = buildSectionProsePrompt({ ...base, section: ilustracion, elements: dosFrases });
        expect(p).toContain('NO le agregues una moraleja');
    });

    it('la exposición con varias ideas conserva sus movimientos', () => {
        const p = buildSectionProsePrompt({
            ...base,
            elements: dosFrases,
            pointProposition: 'Dios se identifica, ordena y explica.',
        });
        expect(p).toContain('POR CADA CONCEPTO QUE LA PROPOSICIÓN NOMBRA');
    });
});

describe('la proposición sólo estructura donde la sección la desglosa', () => {
    const PROP = 'Dios se identifica, ordena y explica.';
    const dos = [el('Vive consciente de su dirección'), el('Lee tu biblia, ora, escucha a tu pastor')];

    it('la aplicación NO se estructura por conceptos de la proposición', () => {
        const p = buildSectionProsePrompt({
            ...base,
            section: buscar('.application'),
            elements: dos,
            pointProposition: PROP,
        });
        expect(p).not.toContain('POR CADA CONCEPTO QUE LA PROPOSICIÓN NOMBRA');
        expect(p).toContain('UNA IDEA POR MOVIMIENTO');
    });

    it('la exposición sí', () => {
        const p = buildSectionProsePrompt({
            ...base,
            section: seccion,
            elements: dos,
            pointProposition: PROP,
        });
        expect(p).toContain('POR CADA CONCEPTO QUE LA PROPOSICIÓN NOMBRA');
    });
});
