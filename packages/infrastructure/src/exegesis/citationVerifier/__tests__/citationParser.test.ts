import { describe, it, expect } from 'vitest';
import { parseCitations } from '../citationParser';

describe('parseCitations', () => {
    it('lee la forma canónica con título entre comillas', () => {
        const [cita] = parseCitations('El punto es claro (Lane, "Hebrews 1-8", p. 47).');
        expect(cita).toMatchObject({ author: 'Lane', title: 'Hebrews 1-8', pages: '47' });
    });

    it('lee «Autor (p. N)», que es lo que el paper emite de verdad', () => {
        const citas = parseCitations('El aoristo pide una decisión de la voluntad, Adamson (p. 53).');
        expect(citas).toHaveLength(1);
        expect(citas[0]).toMatchObject({ author: 'Adamson', title: '', pages: '53' });
    });

    it('lee «(Autor, p. N)» y «(Autor, N)»', () => {
        expect(parseCitations('Así se lee el genitivo (Wallace, p. 329).')[0])
            .toMatchObject({ author: 'Wallace', pages: '329' });
        expect(parseCitations('Así se lee el genitivo (Wallace, 329).')[0])
            .toMatchObject({ author: 'Wallace', pages: '329' });
    });

    it('lee rangos de páginas', () => {
        expect(parseCitations('Mayor (pp. 314-315) lo discute.')[0])
            .toMatchObject({ author: 'Mayor', pages: '314-315' });
    });

    it('no parte la forma rica en una pobre: una cita, no dos', () => {
        const citas = parseCitations('El punto es claro (Lane, "Hebrews 1-8", p. 47).');
        expect(citas).toHaveLength(1);
        expect(citas[0]!.title).toBe('Hebrews 1-8');
    });

    it('devuelve las citas en el orden en que aparecen', () => {
        const citas = parseCitations(
            'Primero Adamson (p. 53) y después (Wallace, "Greek Grammar", p. 329) cierran el punto.',
        );
        expect(citas.map(c => c.author)).toEqual(['Adamson', 'Wallace']);
    });

    it('ignora un paréntesis numérico sin autor', () => {
        expect(parseCitations('el segundo participio (2) depende del primero')).toEqual([]);
    });

    it('adjunta como evidencia la frase entrecomillada más cercana', () => {
        const [cita] = parseCitations('Escribe: "la constancia es obra madura" (Adamson, p. 54).');
        expect(cita!.evidenceIsQuoted).toBe(true);
        expect(cita!.evidence).toBe('la constancia es obra madura');
    });

    it('sin comillas cerca, la evidencia es la oración que contiene la cita', () => {
        const [cita] = parseCitations('El aoristo pide una decisión deliberada. Lo sostiene Adamson (p. 53).');
        expect(cita!.evidenceIsQuoted).toBe(false);
        expect(cita!.evidence).toContain('Lo sostiene');
    });

    it('no arrastra estado entre llamadas', () => {
        const md = 'Adamson (p. 53) lo sostiene.';
        expect(parseCitations(md)).toHaveLength(1);
        expect(parseCitations(md)).toHaveLength(1);
    });
});
