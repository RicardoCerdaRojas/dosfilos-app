import { describe, it, expect } from 'vitest';
import { diagnosePdfSource, sampleWindow, type PdfEvidence } from '../diagnosePdfSource';

/** Los seis libros reales medidos el 2026-09-05, como evidencia. */
const LIBROS: Record<string, PdfEvidence> = {
    metzger: { pages: 812, fontCount: 1, sampleFromPage: 406, sampleToPage: 435, sampleChars: 53825, greekLetters: 4690, hebrewLetters: 0, diacritics: 1226, garbledTokenRatio: 0.040 },
    na28: { pages: 1006, fontCount: 290, sampleFromPage: 503, sampleToPage: 532, sampleChars: 76887, greekLetters: 36976, hebrewLetters: 0, diacritics: 7940, garbledTokenRatio: 0.041 },
    mayor: { pages: 540, fontCount: 1, sampleFromPage: 270, sampleToPage: 299, sampleChars: 69487, greekLetters: 9272, hebrewLetters: 0, diacritics: 2103, garbledTokenRatio: 0.038 },
    interlinealHebreo: { pages: 2013, fontCount: 2143, sampleFromPage: 1006, sampleToPage: 1035, sampleChars: 155890, greekLetters: 0, hebrewLetters: 0, diacritics: 0, garbledTokenRatio: 0.151 },
    na28Escaneado: { pages: 1020, fontCount: 0, sampleFromPage: 510, sampleToPage: 539, sampleChars: 60, greekLetters: 0, hebrewLetters: 0, diacritics: 0, garbledTokenRatio: 0 },
    homiletica: { pages: 409, fontCount: 5, sampleFromPage: 204, sampleToPage: 233, sampleChars: 48000, greekLetters: 0, hebrewLetters: 0, diacritics: 0, garbledTokenRatio: 0.045 },
};

describe('diagnosePdfSource — sobre los libros reales', () => {
    it('aprueba los tres que sí traen su escritura', () => {
        for (const id of ['metzger', 'na28', 'mayor'] as const) {
            const d = diagnosePdfSource(LIBROS[id]!);
            expect(d.verdict, id).toBe('apto');
            expect(d.diacriticRatio!).toBeGreaterThan(0.15);
        }
    });

    it('rechaza el escaneo antes de que cueste una página', () => {
        const d = diagnosePdfSource(LIBROS.na28Escaneado!);
        expect(d.verdict).toBe('sin-capa-de-texto');
        // El aviso que importa: la cascada estándar lo dejaría VACÍO.
        expect(d.suggestions.join(' ')).toContain('pdf-parse');
    });

    it('marca el interlineal cuyo hebreo son códigos latinos', () => {
        const d = diagnosePdfSource(LIBROS.interlinealHebreo!);
        expect(d.verdict).toBe('escritura-ausente');
        expect(d.reasons.join(' ')).toContain('no son lenguaje');
        expect(d.suggestions.join(' ')).toContain('No lo subas');
    });

    it('no acusa a un libro que legítimamente no usa griego ni hebreo', () => {
        // Un manual de homilética sin griego no tiene ningún defecto.
        const d = diagnosePdfSource(LIBROS.homiletica!);
        expect(d.verdict).toBe('sin-escritura-original');
        expect(d.suggestions.join(' ')).toContain('Si el libro NO los usa, está bien así');
    });

    it('distingue «trae la escritura sin acentos» de «no la trae»', () => {
        const sinAcentos = { ...LIBROS.na28!, diacritics: 0 };
        const d = diagnosePdfSource(sinAcentos);
        expect(d.verdict).toBe('escritura-sin-diacriticos');
        expect(d.suggestions.join(' ')).toContain('no la va a encontrar');
    });

    it('siempre explica de qué páginas salió el número', () => {
        const d = diagnosePdfSource(LIBROS.metzger!);
        expect(d.reasons.join(' ')).toContain('páginas 406-435');
    });
});

describe('el límite de lo que el texto solo puede saber', () => {
    it('un libro sin griego y otro con el griego perdido se ven IGUAL', () => {
        // Dibelius perdió su griego y midió 0,045 de basura; un manual de
        // homilética sano mide 0,045 también. Ninguna heurística sobre el
        // texto los separa: hace falta saber qué DEBERÍA traer el libro.
        // Por eso el veredicto no acusa — describe y pregunta.
        const d = diagnosePdfSource({ ...LIBROS.homiletica!, garbledTokenRatio: 0.045 });
        expect(d.verdict).toBe('sin-escritura-original');
        expect(d.suggestions.join(' ')).toContain('SÍ debería traerlos');
    });
});

describe('sampleWindow', () => {
    it('muestrea el MEDIO, no el principio', () => {
        // Las primeras 40 páginas de un libro de 2.013 son portada: un
        // interlineal hebreo pasó el diagnóstico por mirar sólo eso.
        expect(sampleWindow(2013)).toEqual({ from: 1006, to: 1035 });
    });

    it('un libro corto se lee entero', () => {
        expect(sampleWindow(12)).toEqual({ from: 1, to: 12 });
    });

    it('nunca pide una página que no existe', () => {
        const w = sampleWindow(35);
        expect(w.to).toBeLessThanOrEqual(35);
        expect(w.from).toBeGreaterThanOrEqual(1);
    });
});
