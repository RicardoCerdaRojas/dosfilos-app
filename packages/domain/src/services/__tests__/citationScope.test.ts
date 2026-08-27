import { describe, it, expect } from 'vitest';
import { selectSermonCitationChunks, type RetrievedCitationChunk } from '../selectSermonCitationChunks';
import { buildCitationManifest } from '../buildCitationManifest';

const chunk = (id: string, resourceId: string, score = 0.9): RetrievedCitationChunk => ({
    id,
    resourceId,
    resourceTitle: `Libro ${resourceId}`,
    resourceAuthor: 'Autor',
    text: `Texto de ${id}`,
    score,
});

describe('procedencia de la cita — decide si se le puede ofrecer abrir el libro', () => {
    it('marca personal lo que vino de su biblioteca y core lo compartido', () => {
        const elegidos = selectSermonCitationChunks(
            [chunk('p1', 'r-suyo')],
            [chunk('c1', 'r-core')],
        );

        expect(elegidos.map((c) => c.scope)).toEqual(['personal', 'core']);
    });

    it('la procedencia llega hasta el manifiesto', () => {
        // Es el dato que el popover mira para decidir si enlaza a la
        // biblioteca del pastor o sólo dice de dónde salió.
        const manifest = buildCitationManifest(
            selectSermonCitationChunks([chunk('p1', 'r-suyo')], [chunk('c1', 'r-core')]),
        );

        expect(manifest.entries[0]).toMatchObject({ resourceId: 'r-suyo', scope: 'personal' });
        expect(manifest.entries[1]).toMatchObject({ resourceId: 'r-core', scope: 'core' });
    });

    it('NO se deduce de `publiclyCitable`, que es un flag legal', () => {
        // Que hoy coincida con CORE es casualidad de los datos, no una regla:
        // una fuente personal de dominio público rompería esa deducción.
        const personalDePublicoDominio = { ...chunk('p1', 'r-suyo'), publiclyCitable: true };

        const [elegido] = selectSermonCitationChunks([personalDePublicoDominio], []);

        expect(elegido.scope).toBe('personal');
    });

    it('sin procedencia, la clave se OMITE en vez de viajar como undefined', () => {
        // Firestore rechaza `undefined` como valor: una clave presente con
        // undefined haría fallar el guardado entero del sermón.
        const manifest = buildCitationManifest([
            { id: 'x', resourceId: 'r', resourceTitle: 'T', text: 'texto' },
        ]);

        expect('scope' in manifest.entries[0]).toBe(false);
    });

    it('lo suyo va primero, y sigue yendo primero con la marca puesta', () => {
        const elegidos = selectSermonCitationChunks(
            [chunk('p1', 'r-suyo', 0.1)],
            [chunk('c1', 'r-core', 0.99)],
        );

        // Aunque CORE puntúe mejor: su biblioteca es la prioridad.
        expect(elegidos[0]).toMatchObject({ id: 'p1', scope: 'personal' });
    });
});
