import { describe, it, expect } from 'vitest';
import { ISO_DATE_STRING } from '../SermonService';

/**
 * El caso que corrompió datos reales: el saneador del autosave convertía en
 * fecha cualquier string con una "T" que el parser laxo de V8 tragara. La
 * cita "…A Literary and Theological Commentary, p. 194" se guardó como
 * timestamp del año 194 y la decisión del pastor se perdió.
 */
describe('ISO_DATE_STRING — sólo fechas de verdad', () => {
    it('acepta ISO 8601 completo', () => {
        expect(ISO_DATE_STRING.test('2026-08-26T13:19:34.393Z')).toBe(true);
        expect(ISO_DATE_STRING.test('2026-08-26T13:19:34Z')).toBe(true);
        expect(ISO_DATE_STRING.test('2026-08-26T13:19:34+02:00')).toBe(true);
    });

    it('rechaza las citas que V8 parseaba como año', () => {
        expect(
            ISO_DATE_STRING.test(
                '"Jonah does testify…" — Terence E. Fretheim, Reading Hosea–Micah - A Literary and Theological Commentary, p. 194',
            ),
        ).toBe(false);
        expect(
            ISO_DATE_STRING.test(
                '"there is no escape…" — Jack M. Sasson, Jonah A New Translation with Introduction, and Commentary, p. 98',
            ),
        ).toBe(false);
    });

    it('rechaza fechas parciales y texto con T', () => {
        expect(ISO_DATE_STRING.test('2026-08-26')).toBe(false);
        expect(ISO_DATE_STRING.test('Tarsis, p. 3')).toBe(false);
    });
});
