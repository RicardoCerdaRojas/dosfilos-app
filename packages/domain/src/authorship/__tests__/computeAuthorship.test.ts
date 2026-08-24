import { describe, it, expect } from 'vitest';
import type { SermonContent } from '../../entities/SermonGenerator';
import { sermonSectionTexts } from '../sermonSectionTexts';
import {
    computeAuthorship,
    computeSectionAuthorship,
    AUTHORSHIP_FLOOR,
} from '../computeAuthorship';

const GENERADO =
    'El libro de Jonás comienza con una declaración poderosa y directa que establece la relación entre Dios y su profeta.';

describe('computeSectionAuthorship — mide lo que es DEL PASTOR', () => {
    it('texto sin tocar → autoría cercana a cero', () => {
        const r = computeSectionAuthorship('introduction', GENERADO, GENERADO);
        expect(r.pastorRatio).toBe(0);
    });

    it('texto reescrito entero → autoría casi total, no exactamente 1', () => {
        // NO da 1.0 y está bien: palabras función como "que" o "el" coinciden
        // entre cualquier par de textos en español, así que siempre queda un
        // piso pequeño de coincidencia. Forzar un 1.0 exacto exigiría filtrar
        // palabras vacías, y eso ABARATARÍA la medida en el sentido peligroso:
        // un pastor que sólo cambia conectores parecería haber escrito más.
        const r = computeSectionAuthorship(
            'introduction',
            GENERADO,
            'Hermanos, quiero contarles algo que me pasó el martes pasado volviendo del hospital.',
        );
        expect(r.pastorRatio).toBeGreaterThan(0.85);
        expect(r.withoutBaseline).toBe(false);
    });

    it('el pastor agrega su propio párrafo: la autoría sube en proporción', () => {
        const r = computeSectionAuthorship(
            'introduction',
            GENERADO,
            `${GENERADO} Y eso me lleva a preguntarles algo esta mañana, con toda honestidad pastoral.`,
        );
        expect(r.pastorRatio).toBeGreaterThan(0.2);
        expect(r.pastorRatio).toBeLessThan(0.6);
    });

    it('mayúsculas, acentos y markdown NO cuentan como autoría', () => {
        // Cambiar "Dios habla." por "**dios habla**" es tipeo, no escribir.
        const r = computeSectionAuthorship('x', 'Dios habla con propósito.', '**DIOS HABLA CON PROPOSITO**');
        expect(r.pastorRatio).toBe(0);
    });

    it('reescribir con el MISMO vocabulario sí cuenta: el orden importa', () => {
        // Por eso es LCS y no intersección de conjuntos. Una intersección diría
        // que el pastor no escribió nada.
        const r = computeSectionAuthorship(
            'x',
            'Dios habla porque quiere dirigir a su pueblo hacia el arrepentimiento verdadero',
            'Hacia el arrepentimiento verdadero dirige Dios a su pueblo cuando habla porque quiere',
        );
        expect(r.pastorRatio).toBeGreaterThan(0);
    });

    it('sin referencia el texto es suyo, pero se marca', () => {
        const r = computeSectionAuthorship('conclusion', undefined, 'Escrito por el pastor desde cero.');
        expect(r.pastorRatio).toBe(1);
        expect(r.withoutBaseline).toBe(true);
    });

    it('sección vacía no aporta nada', () => {
        expect(computeSectionAuthorship('x', GENERADO, '').words).toBe(0);
    });
});

describe('computeAuthorship — ponderado por palabras, no promedio simple', () => {
    it('una conclusión corta reescrita NO compensa un cuerpo largo sin tocar', () => {
        // El promedio simple daría 50% — una mentira favorable.
        const cuerpo = Array.from({ length: 200 }, (_, i) => `palabra${i}`).join(' ');
        const r = computeAuthorship(
            { body: cuerpo, conclusion: 'texto original de la maquina' },
            { body: cuerpo, conclusion: 'yo escribi esto entero con mis propias palabras' },
        );
        expect(r.overall).toBeLessThan(0.15);
        expect(r.gateStatus).toBe('confront');
    });

    it('trabajo parejo por encima del piso → pasa', () => {
        const r = computeAuthorship(
            { introduction: 'uno dos tres cuatro cinco seis siete ocho' },
            { introduction: 'nueve diez once doce trece catorce quince dieciseis' },
        );
        expect(r.overall).toBe(1);
        expect(r.gateStatus).toBe('pass');
    });

    it('bajo el piso CONFRONTA, nunca bloquea', () => {
        // El estado es 'confront', no 'block': ADR-027 y el precedente del
        // contra-scan. Un bloqueo duro sin salida invita a burlarlo.
        const r = computeAuthorship({ x: GENERADO }, { x: GENERADO });
        expect(r.gateStatus).toBe('confront');
        expect(['pass', 'confront']).toContain(r.gateStatus);
    });

    it('sin texto todavía no hay nada que confrontar', () => {
        expect(computeAuthorship({}, {}).gateStatus).toBe('pass');
        expect(computeAuthorship({ x: GENERADO }, { x: '' }).gateStatus).toBe('pass');
    });

    it('el piso por defecto es la mitad, y es configurable', () => {
        const mitad = { a: 'uno dos tres cuatro', b: 'cinco seis siete ocho' };
        const finales = { a: 'uno dos tres cuatro', b: 'nueve diez once doce' };
        expect(computeAuthorship(mitad, finales).floor).toBe(AUTHORSHIP_FLOOR);
        expect(computeAuthorship(mitad, finales, 0.9).gateStatus).toBe('confront');
        expect(computeAuthorship(mitad, finales, 0.4).gateStatus).toBe('pass');
    });
});

describe('sermonSectionTexts — la misma forma a los dos lados del diff', () => {
    const sermon = {
        title: 'El Dios que persigue al rebelde',
        introduction: 'Cuando se estrenó LOST, millones nos obsesionamos.',
        conclusion: 'A Él sea la alabanza por su misericordia.',
        body: [
            {
                point: 'I. Dios habla',
                content: 'El pasaje comienza con una declaración directa.',
                illustration: '**El Mensajero Real**\n\nImaginemos un reino antiguo.',
                implications: ['**Implicación:** Vive consciente de su dirección.'],
                transition: '¿Y cómo respondió el profeta?',
                scriptureReferences: ['> "Vino palabra de Jehová" (Jonás 1:1)'],
                authorityQuote: '> «From the LORD…»\n> — David W. Baker',
            },
        ],
    } as SermonContent;

    it('entra lo que el pastor redacta', () => {
        const t = sermonSectionTexts(sermon);
        expect(t.body).toContain('I. Dios habla');
        expect(t.body).toContain('El Mensajero Real');
        expect(t.body).toContain('Vive consciente');
        expect(t.body).toContain('¿Y cómo respondió');
    });

    it('NO entran las referencias bíblicas ni las citas de autoridad', () => {
        // Contarlas arrastraría la autoría hacia abajo por hacer lo correcto:
        // el texto bíblico no se reescribe, y la cita es verbatim por diseño.
        const t = sermonSectionTexts(sermon);
        expect(t.body).not.toContain('Vino palabra de Jehová');
        expect(t.body).not.toContain('David W. Baker');
    });

    it('las tres secciones salen, y un sermón nulo no explota', () => {
        expect(Object.keys(sermonSectionTexts(sermon)).sort()).toEqual(['body', 'conclusion', 'introduction']);
        expect(sermonSectionTexts(null)).toEqual({});
    });
});

describe('el material del pastor cuenta como SUYO aunque lo emita el generador', () => {
    // El caso real (fundador, 2026-08-24): regeneró y el badge dijo "0% tuyo"
    // sobre un sermón construido con su ilustración verbatim, sus aplicaciones,
    // su proposición y sus títulos de puntos. El generador no originó eso: lo
    // transcribió. Medir contra TODO lo generado se lo atribuía a la máquina.
    const suyo =
        'Cuando se estrenó la famosa serie LOST millones de personas nos obsesionamos con los misterios de la isla';
    const deLaMaquina =
        'El pasaje comienza con una declaración rotunda que establece la autoridad divina del mensaje profético';
    const generado = `${suyo} ${deLaMaquina}`;

    it('sin rastrear su material, un sermón recién generado marca 0%', () => {
        const sin = computeSectionAuthorship('introduction', generado, generado);
        expect(sin.pastorRatio).toBe(0);
    });

    it('rastreando su material, la mitad que trajo él SE LE CUENTA', () => {
        const con = computeSectionAuthorship('introduction', generado, generado, suyo);
        expect(con.pastorRatio).toBeGreaterThan(0.4);
        expect(con.pastorRatio).toBeLessThan(0.6);
    });

    it('y sigue subiendo cuando además reescribe', () => {
        const editado = `${suyo} ${deLaMaquina} Y esto me lleva a preguntarles algo con toda honestidad pastoral esta mañana.`;
        const antes = computeSectionAuthorship('x', generado, generado, suyo).pastorRatio;
        const despues = computeSectionAuthorship('x', generado, editado, suyo).pastorRatio;
        expect(despues).toBeGreaterThan(antes);
    });

    it('NO regala autoría: texto que el pastor nunca escribió sigue siendo de la máquina', () => {
        // Un medidor que regala autoría no sirve para confrontar a nadie.
        const r = computeSectionAuthorship('x', deLaMaquina, deLaMaquina, suyo);
        expect(r.pastorRatio).toBeLessThan(0.2);
    });
});
