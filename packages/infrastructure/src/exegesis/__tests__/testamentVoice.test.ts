import { describe, expect, it } from 'vitest';
import { voiceFor } from '../testamentVoice';

describe('voiceFor', () => {
    it('da voz hebrea a un libro del Antiguo Testamento', () => {
        // El caso que motivó esto: Jonás analizado con aparato NA28 y
        // participios aoristos era exégesis del libro equivocado.
        const v = voiceFor('JON');
        expect(v.language).toBe('hebreo');
        expect(v.apparatusEs).toContain('BHS');
        expect(v.grammarsEs).toContain('Waltke');
        expect(v.lexiconsEs).toContain('HALOT');
    });

    it('da voz griega a un libro del Nuevo Testamento', () => {
        const v = voiceFor('HEB');
        expect(v.language).toBe('griego');
        expect(v.apparatusEs).toContain('NA28');
        expect(v.grammarsEs).toContain('Wallace');
        expect(v.lexiconsEs).toContain('BDAG');
    });

    it('no nombra manuscritos del NT al hablar del AT', () => {
        // Citar 𝔓⁴⁶ para un texto hebreo es una cita imposible de verificar:
        // ese papiro no contiene el Antiguo Testamento.
        expect(voiceFor('GEN').witnessesEs).not.toContain('𝔓⁴⁶');
        expect(voiceFor('PSA').witnessesEs).toContain('TM');
    });

    it('no usa morfología griega para el hebreo', () => {
        expect(voiceFor('ISA').morphologyEs).toContain('qatal');
        expect(voiceFor('ISA').morphologyEs).not.toContain('aoristo');
    });

    it('cae en la voz griega ante un libro desconocido', () => {
        // Sin libro reconocible no hay testamento; el NT es el default
        // histórico del módulo y no cambia el comportamiento previo.
        expect(voiceFor('XXX').language).toBe('griego');
    });
});
