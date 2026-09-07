import { describe, it, expect } from 'vitest';
import rvr from '@/assets/bible/rvr1960.json';

/**
 * LA BARANDA DEL TEXTO BÍBLICO.
 *
 * El asset de la RVR llegó a producción con defectos que nadie miraba porque
 * nada los miraba: un versículo perdido en Génesis 33, un versículo partido
 * en dos en el Salmo 47, y la secuencia literal `/n` en 4.738 versículos —el
 * 15% de la Biblia— que se veía tal cual en pantalla salvo en el buscador,
 * que la limpiaba por su cuenta.
 *
 * Se descubrieron por accidente, comparando conteos mientras se construía el
 * mapa de versificación. Esta prueba convierte ese accidente en un chequeo
 * permanente: es la Biblia que se le muestra a un pastor, y un versículo de
 * menos es peor que cualquier bug de interfaz.
 *
 * Los conteos esperados salen de la versificación oficial de las Sociedades
 * Bíblicas Unidas, la misma fuente del mapa de versificación
 * (`packages/domain/src/bible/versification/`).
 */

interface LibroAsset {
    id: string;
    chapters: string[][];
}

const LIBROS = rvr as unknown as LibroAsset[];

/**
 * Conteos por capítulo donde la RVR se aparta legítimamente de la
 * versificación `eng` de las Sociedades Bíblicas. NO son defectos: son
 * diferencias reales de tradición textual, verificadas contra el texto.
 *
 * - **Apocalipsis 12** — el texto crítico separa 12:18 («Y se paró sobre la
 *   arena del mar»); la RVR lo une al 13:1, que efectivamente arranca «Me
 *   paré sobre la arena del mar». 17 versículos es correcto.
 */
const DIFERENCIAS_LEGITIMAS: Readonly<Record<string, number>> = {
    're:12': 17,
};

/**
 * Génesis 33 estuvo incompleto: le faltaba el 33:12, la invitación de Esaú
 * («Anda, vamos; y yo iré delante de ti»). El asset saltaba de «Acepta, te
 * ruego, mi presente…» a la respuesta de Jacob sobre los niños tiernos, que
 * es el 33:13 real — por eso la respuesta parecía venir de la nada.
 *
 * Se restauró con el texto que el fundador aportó desde su RVR1960 impresa,
 * verificado contra la ASV del propio repositorio. Esta comprobación queda
 * para que no se vuelva a perder.
 */

describe('integridad del asset rvr1960.json', () => {
    it('trae los 66 libros', () => {
        expect(LIBROS).toHaveLength(66);
    });

    it('ningún versículo está vacío', () => {
        const vacios: string[] = [];
        for (const libro of LIBROS) {
            libro.chapters.forEach((cap, ci) => {
                cap.forEach((v, vi) => {
                    if (!String(v ?? '').trim()) vacios.push(`${libro.id} ${ci + 1}:${vi + 1}`);
                });
            });
        }
        expect(vacios).toEqual([]);
    });

    it('no queda ni un literal "/n" — el escape mal convertido del origen', () => {
        // Era el 15% de la Biblia. Se veía tal cual en la pantalla de lectura,
        // en el panel del wizard y en cualquier superficie que imprimiera el
        // versículo sin pasar por el buscador.
        const conBarraN: string[] = [];
        for (const libro of LIBROS) {
            libro.chapters.forEach((cap, ci) => {
                cap.forEach((v, vi) => {
                    if (String(v).includes('/n')) conBarraN.push(`${libro.id} ${ci + 1}:${vi + 1}`);
                });
            });
        }
        expect(conBarraN).toEqual([]);
    });

    it('el Salmo 47 tiene 9 versículos, no 10', () => {
        // El asset partía el 9 en dos, a la altura del punto y coma.
        const salmos = LIBROS.find(l => l.id === 'ps')!;
        expect(salmos.chapters[46]).toHaveLength(9);
    });

    it('Génesis 33 tiene sus 20 versículos, con la invitación de Esaú en el 12', () => {
        const genesis = LIBROS.find(l => l.id === 'gn')!;
        const cap33 = genesis.chapters[32]!;
        expect(cap33).toHaveLength(20);
        expect(cap33[11]).toContain('Anda, vamos');
    });

    it('las diferencias legítimas de versificación siguen siendo las declaradas', () => {
        for (const [clave, esperado] of Object.entries(DIFERENCIAS_LEGITIMAS)) {
            const [id, cap] = clave.split(':');
            const libro = LIBROS.find(l => l.id === id)!;
            expect(libro.chapters[Number(cap) - 1]).toHaveLength(esperado);
        }
    });

    it('el total de versículos no se mueve sin que alguien lo note', () => {
        const total = LIBROS.reduce(
            (n, l) => n + l.chapters.reduce((m, c) => m + c.length, 0),
            0,
        );
        // Detector de cambios, no afirmación doctrinal: el conteo total de la
        // RVR1960 difiere del de otras versiones por decisiones de tradición
        // textual, así que el número correcto no se puede postular de memoria.
        // Lo que sí se puede es exigir que no cambie por accidente. Las
        // comprobaciones por capítulo de arriba son la garantía real.
        expect(total).toBe(31103);
    });
});
