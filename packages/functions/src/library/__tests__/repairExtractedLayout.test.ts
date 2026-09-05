import { describe, it, expect } from 'vitest';
import { repairExtractedLayout } from '../repairExtractedLayout';

const r = (s: string) => repairExtractedLayout(s).text;

describe('palabras partidas por el guion de fin de línea', () => {
    it('reúne las que se vieron en el NA28 real', () => {
        expect(r('ἔρ- χεται')).toBe('ἔρχεται');
        expect(r('πι- στεύ')).toBe('πιστεύ');
        expect(r('μαθη- ταὶ')).toBe('μαθηταὶ');
        expect(r('γυ- μνός')).toBe('γυμνός');
    });

    it('reúne también cuando el corte cae en un salto de línea', () => {
        expect(r('ἔρ-\nχεται')).toBe('ἔρχεται');
        expect(r('conse-\n  jería')).toBe('consejería');
    });

    it('el número marginal que se coló en medio se conserva, delante', () => {
        // Perderlo costaría la referencia del versículo.
        expect(r('εἰσελθεῖν αὐ- 21 τοὺς')).toBe('εἰσελθεῖν 21 αὐτοὺς');
    });

    it('NO toca el guion que pertenece a la palabra', () => {
        expect(r('Nestle-Aland')).toBe('Nestle-Aland');
        expect(r('Hebreo-Arameo-Español')).toBe('Hebreo-Arameo-Español');
        // Continuación en mayúscula: es un compuesto partido, no una palabra.
        expect(r('Nestle-\nAland')).toBe('Nestle-\nAland');
    });

    it('NO toca el guion suelto entre espacios', () => {
        expect(r('el texto - que es largo - dice')).toBe('el texto - que es largo - dice');
    });
});

describe('números pegados a la escritura', () => {
    it('despega los números de versículo del griego', () => {
        expect(r('3ΚΑΤΑ')).toBe('3 ΚΑΤΑ');
        expect(r('6Καὶ')).toBe('6 Καὶ');
        expect(r('0Πολλὰ')).toBe('0 Πολλὰ');
    });

    it('despega en el otro orden también', () => {
        expect(r('ἐπήγειραν2')).toBe('ἐπήγειραν 2');
    });

    it('NO toca las siglas del aparato, que son latinas', () => {
        // `565s` significa «565 y siguientes»; `f 1.13` es una familia.
        expect(r('565s. 579. 700 f 1.13 2542 M')).toBe('565s. 579. 700 f 1.13 2542 M');
        expect(r('P75 vgms syh')).toBe('P75 vgms syh');
    });
});

describe('reporte', () => {
    it('cuenta lo que reparó', () => {
        const { report } = repairExtractedLayout('ἔρ- χεται y 3ΚΑΤΑ');
        expect(report.hyphenJoins).toBe(1);
        expect(report.digitSplits).toBe(1);
    });

    it('texto sano no se toca ni se cuenta', () => {
        const sano = 'ἔρχεται ὁ υἱὸς τοῦ ἀνθρώπου';
        const { text, report } = repairExtractedLayout(sano);
        expect(text).toBe(sano);
        expect(report).toEqual({ hyphenJoins: 0, digitSplits: 0 });
    });
});
