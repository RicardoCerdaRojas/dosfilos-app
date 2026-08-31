import { describe, it, expect } from 'vitest';
import { buildWizardProgressFromPaper } from '../paperToWizardProgress';
import type { ExegeticalPaper, PaperToSermonOutput } from '@dosfilos/domain';

/**
 * Regresión de los OCHO CHIPS IGUALES.
 *
 * Cada punto del bosquejo recibía `transformerOutput.bibleReferences` —la lista
 * del DOCUMENTO— y la UI los pinta como referencias DE ESE punto. Medido sobre
 * el caso real: tres puntos, el mismo array de ocho referencias en los tres,
 * byte a byte igual a `sermon.bibleReferences`.
 *
 * No era un mapeo defectuoso: el paper no tiene señal por punto. Su prosa cita
 * narrativamente ("el versículo 13", ADR-031), así que no hay referencias
 * formales que repartir — ninguna de las ocho aparecía en el cuerpo de ninguna
 * sección. Ningún chip es mejor que ocho que afirman algo falso.
 */

const paper = {
    id: 'paper-1',
    title: 'El Dios soberano',
    passage: { bookId: 'JON', chapterStart: 1, chapterEnd: 1, verseStart: 4, verseEnd: 16 },
    displayLanguage: 'es',
    assignmentBrief: null,
    sources: [],
    steps: [],
} as unknown as ExegeticalPaper;

const transformerOutput = {
    title: 'El Dios soberano',
    modelId: 'gemini-2.5-pro',
    bibleReferences: [
        'Jonás 1:4-16',
        '2 Reyes 14:25',
        'Génesis 1:9-10',
        'Éxodo 14:22',
        'Salmo 115:3',
    ],
    content: [
        'Texto introductorio antes de cualquier encabezado.',
        '',
        '## 1. La Intervención Soberana de Dios',
        'El primer acto lo inicia Dios mismo. El versículo 4 nos dice que YHWH arrojó un gran viento.',
        '',
        '## 2. La Confesión Forzada',
        'La intervención del capitán funciona y saca a Jonás de su escondite.',
        '',
        '## Conclusión',
        'Cierre del sermón.',
    ].join('\n'),
} as unknown as PaperToSermonOutput;

describe('buildWizardProgressFromPaper — referencias del bosquejo', () => {
    const progress = buildWizardProgressFromPaper({ paper, transformerOutput, tone: 'pastoral' });
    const points = progress.homiletics!.outline!.mainPoints;

    it('arma un punto por sección, sin la introducción ni la conclusión', () => {
        expect(points).toHaveLength(2);
        expect(points[0]!.title).toBe('1. La Intervención Soberana de Dios');
        expect(points[1]!.title).toBe('2. La Confesión Forzada');
    });

    it('NINGÚN punto hereda la lista de referencias del documento', () => {
        for (const point of points) {
            expect(point.scriptureReferences).toEqual([]);
        }
    });

    it('no repite la misma lista en todos los puntos — el síntoma que se veía', () => {
        const listas = points.map(p => JSON.stringify(p.scriptureReferences));
        const iguales = new Set(listas).size === 1 && listas[0] !== '[]';
        expect(iguales).toBe(false);
    });

    it('la descripción de cada punto SÍ sale de su propia sección', () => {
        expect(points[0]!.description).toContain('versículo 4');
        expect(points[1]!.description).toContain('capitán');
    });
});
