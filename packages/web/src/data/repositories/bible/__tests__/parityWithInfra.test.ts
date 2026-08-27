import { describe, it, expect } from 'vitest';
import { RVR1960Repository as WebRVR } from '../RVR1960Repository';
import { RVR1960Repository as InfraRVR } from '@dosfilos/infrastructure';
import { resolveBibleBook } from '@dosfilos/domain';

/**
 * LA BARANDA CONTRA LA DIVERGENCIA SILENCIOSA.
 *
 * Hay dos repositorios de la RVR: éste alimenta la página de Biblia y el de
 * infraestructura alimenta el asistente. Cada uno EXPONE el libro de forma
 * distinta a propósito —id contra clave— porque cada superficie construyó su UI
 * sobre el suyo. Lo que NO puede pasar es que discrepen sobre QUÉ libro es
 * "filemon", o en qué capítulo cae "Filemón 8".
 *
 * Ya pasó: las dos tablas habían divergido y `Gén`, `Éx` y `Núm` resolvían sólo
 * en una. Sin ningún error de por medio — la referencia simplemente no aparecía.
 * Antes de eso, PR #280 arregló una copia y dejó la otra rota en producción.
 *
 * Esta prueba corre LAS DOS sobre el mismo corpus y exige que lleguen al mismo
 * libro y a los mismos números. Si alguien vuelve a tocar una sola, falla acá.
 */
const CORPUS = [
    'Génesis 1:1', 'Gén 1:1', 'Gen 1:1', 'genesis 1:1',
    'Éxodo 3', 'Éx 3', 'Ex 3', 'exodo 3',
    'Números 6:24-26', 'Núm 6:24-26', 'Num 6:24',
    'Juan 3:16', 'Juan 3:16-17', 'Jn 3.16',
    'Romanos 1', 'Ro 8:28', 'Rom 12:1-2',
    'Filemón', 'Filemón 8', 'filemon 8-21', 'Flm 8',
    'Abdías 1-4', 'Judas 3', '2 Juan 4', '3 Juan 2',
    'Santiago 1:2-4', 'Stg 1:5',
    '1 Corintios 13:4', '1 Co 13:4-7', '2 Timoteo 3:16',
    'Salmos 23', 'Sal 23:1', 'Apocalipsis 21:4',
    // Los que deben fallar en las dos por igual.
    'Romanos 1-3', 'Juan 3-4:1', 'Melquisedec 2:1', '', '3:16',
];

describe('paridad entre las dos copias de la RVR', () => {
    const web = new WebRVR();
    const infra = new InfraRVR();

    it.each(CORPUS)('«%s» se entiende igual en las dos', (ref) => {
        const w = web.parseReference(ref);
        const i = infra.parseReference(ref);

        // O las dos resuelven, o ninguna. Que una entienda y la otra no es
        // exactamente el bug que costó dos PRs.
        expect(Boolean(w), `web=${JSON.stringify(w)} infra=${JSON.stringify(i)}`).toBe(Boolean(i));
        if (!w || !i) return;

        // Cada una expone el libro a su manera y la prueba lo dice explícito,
        // porque ESE contrato es parte de lo que hay que no romper:
        //   web   → el id      ('jo')
        //   infra → la clave   ('Juan'), que se resuelve a su id
        // La pregunta de verdad es si las dos llegaron al MISMO libro.
        expect(w.book).toBe(resolveBibleBook(i.book)?.id);
        expect(w.chapter).toBe(i.chapter);
        expect(w.verseStart).toBe(i.verseStart);
        expect(w.verseEnd).toBe(i.verseEnd);
    });

    it('las abreviaturas que faltaban ahora resuelven en LAS DOS', () => {
        // El caso concreto de la divergencia encontrada.
        for (const ref of ['Gén 1:1', 'Éx 3', 'Núm 6:24']) {
            expect(web.parseReference(ref), `web no entiende ${ref}`).not.toBeNull();
            expect(infra.parseReference(ref), `infra no entiende ${ref}`).not.toBeNull();
        }
    });
});
