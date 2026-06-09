import { describe, it, expect } from 'vitest';
import {
    appendDoubt,
    buildDoubtRoutingNote,
    detectRaisedDoubt,
    makeRaisedDoubt,
    routeDoubt,
    MAX_OPEN_DOUBTS,
    type RaisedDoubt,
} from '../doubtRouting';

describe('detectRaisedDoubt (ADR-034)', () => {
    it('returns the sentence carrying a question mark', () => {
        const msg = 'El texto habla de juicio. ¿"Rescató" significa que eran salvos?';
        expect(detectRaisedDoubt(msg)).toBe('¿"Rescató" significa que eran salvos?');
    });

    it('detects an uncertainty phrase without a question mark', () => {
        expect(detectRaisedDoubt('No estoy seguro de qué quiere decir esto.')).toContain('No estoy seguro');
    });

    it('returns null for a plain declarative statement', () => {
        expect(detectRaisedDoubt('El autor advierte contra los falsos maestros.')).toBeNull();
    });

    it('returns null for empty input', () => {
        expect(detectRaisedDoubt('')).toBeNull();
        expect(detectRaisedDoubt('   ')).toBeNull();
    });

    it('caps very long doubts', () => {
        const long = `${'¿' + 'a'.repeat(400)}?`;
        const out = detectRaisedDoubt(long)!;
        expect(out.length).toBeLessThanOrEqual(241);
        expect(out.endsWith('…')).toBe(true);
    });
});

describe('routeDoubt (ADR-034)', () => {
    it('routes word/doctrine doubts to Paso 4 + 5', () => {
        const r = routeDoubt('¿Qué significa la palabra "rescató"?');
        expect(r.steps).toEqual(['wordStudies', 'recognition']);
        expect(r.label).toContain('Paso 4');
    });

    it('routes structural doubts to Paso 3', () => {
        const r = routeDoubt('¿Cómo conecta este versículo con el argumento previo?');
        expect(r.steps).toEqual(['structuralAnalysis']);
    });

    it('routes application doubts to Paso 6 + 8', () => {
        const r = routeDoubt('¿Cómo aplico esto hoy a mi congregación?');
        expect(r.steps).toEqual(['function', 'insight']);
    });

    it('defaults to word/doctrine when nothing matches', () => {
        const r = routeDoubt('¿Y esto?');
        expect(r.steps).toEqual(['wordStudies', 'recognition']);
    });
});

describe('appendDoubt (ADR-034)', () => {
    const base = makeRaisedDoubt('reading', '¿Qué significa rescató?');

    it('appends a new doubt', () => {
        expect(appendDoubt([], base)).toHaveLength(1);
    });

    it('dedupes by normalized text (case + whitespace insensitive)', () => {
        const dup = makeRaisedDoubt('contextGenre', '¿QUÉ   significa   RESCATÓ?');
        expect(appendDoubt([base], dup)).toHaveLength(1);
    });

    it('caps at MAX_OPEN_DOUBTS keeping the most recent', () => {
        let list: RaisedDoubt[] = [];
        for (let i = 0; i < MAX_OPEN_DOUBTS + 5; i++) {
            list = appendDoubt(list, makeRaisedDoubt('reading', `duda número ${i}?`));
        }
        expect(list).toHaveLength(MAX_OPEN_DOUBTS);
        expect(list[list.length - 1].text).toContain(`${MAX_OPEN_DOUBTS + 4}`);
    });
});

describe('buildDoubtRoutingNote (ADR-034)', () => {
    it('emits a reminder when the doubt routes to a FUTURE step', () => {
        // On reading (step 1), a word doubt routes to Paso 4+5 (future).
        const doubt = makeRaisedDoubt('reading', '¿Qué significa rescató?');
        const note = buildDoubtRoutingNote(doubt, 'reading');
        expect(note).toContain('📌');
        expect(note).toContain('Paso 4');
    });

    it('returns null when the doubt routes only to the current/past step', () => {
        // On wordStudies (step 4), a word doubt routes to 4+5; 4 is current,
        // 5 is future → still a note. Use a structural doubt while ON structural.
        const doubt = makeRaisedDoubt('structuralAnalysis', '¿Cómo conecta el párrafo?');
        expect(buildDoubtRoutingNote(doubt, 'structuralAnalysis')).toBeNull();
    });

    it('never contains an answer — only a pin to the resolving step', () => {
        const doubt = makeRaisedDoubt('reading', '¿Qué significa rescató?');
        const note = buildDoubtRoutingNote(doubt, 'reading')!;
        expect(note.toLowerCase()).not.toContain('significa que');
        expect(note).toMatch(/guarda/i);
    });
});
