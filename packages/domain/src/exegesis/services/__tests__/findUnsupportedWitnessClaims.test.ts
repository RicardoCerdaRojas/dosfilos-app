import { describe, it, expect } from 'vitest';
import { findUnsupportedWitnessClaims } from '../findUnsupportedWitnessClaims';

const sinCitas: Array<{ offset: number }> = [];

describe('findUnsupportedWitnessClaims', () => {
    it('marca la lista de testigos que ninguna fuente respalda', () => {
        const md = 'La lectura más corta se apoya en los manuscritos alejandrinos, incluido el Sinaítico.';
        const r = findUnsupportedWitnessClaims(md, sinCitas);
        expect(r).toHaveLength(1);
        expect(r[0]!.sentence).toContain('Sinaítico');
    });

    it('calla cuando la MISMA oración cita una fuente', () => {
        const md = 'La lectura se apoya en los manuscritos alejandrinos (Metzger, p. 47).';
        expect(findUnsupportedWitnessClaims(md, [{ offset: md.indexOf('(Metzger') }])).toEqual([]);
    });

    it('no le alcanza con que el párrafo cite en otra oración', () => {
        // La evidencia manuscrita se atribuye frase por frase.
        const md = 'El verso presenta una dificultad (Metzger, p. 12). Los papiros más antiguos omiten la cláusula.';
        const r = findUnsupportedWitnessClaims(md, [{ offset: md.indexOf('(Metzger') }]);
        expect(r).toHaveLength(1);
        expect(r[0]!.sentence).toContain('papiros');
    });

    it('NO marca la nota obligatoria que dice que no hay variantes', () => {
        // Es la disciplina que el esquema exige, no una afirmación sobre
        // manuscritos: castigarla sería premiar el silencio.
        const md = 'El aparato NA28 no registra variantes significativas para este versículo.';
        expect(findUnsupportedWitnessClaims(md, sinCitas)).toEqual([]);
    });

    it('NO marca la discusión de una lectura sin nombrar evidencia', () => {
        const md = 'La lectura adoptada mantiene el orden de palabras del texto recibido.';
        expect(findUnsupportedWitnessClaims(md, sinCitas)).toEqual([]);
    });

    it('reconoce las siglas, no sólo las palabras', () => {
        expect(findUnsupportedWitnessClaims('La omiten 𝔓⁴⁶ y ℵ.', sinCitas)).toHaveLength(1);
    });

    it('funciona en inglés', () => {
        const r = findUnsupportedWitnessClaims('Several Western witnesses add the clause.', sinCitas);
        expect(r).toHaveLength(1);
    });

    it('texto vacío no produce hallazgos', () => {
        expect(findUnsupportedWitnessClaims('', sinCitas)).toEqual([]);
        expect(findUnsupportedWitnessClaims('   \n  ', sinCitas)).toEqual([]);
    });

    it('devuelve la posición para poder resaltarla', () => {
        const md = 'Primera oración sin nada. Los códices bizantinos añaden la frase.';
        const r = findUnsupportedWitnessClaims(md, sinCitas);
        expect(r[0]!.offset).toBeGreaterThan(0);
        expect(md.slice(r[0]!.offset)).toContain('códices');
    });
});
