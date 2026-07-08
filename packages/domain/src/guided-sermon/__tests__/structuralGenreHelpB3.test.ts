import { describe, it, expect } from 'vitest';
import { StructuralAnalysisStepPolicy } from '../policies/StructuralAnalysisStepPolicy';
import { STRUCTURAL_SUFFICIENCY_BY_GENRE } from '../structuralSufficiency';
import type { TurnContext } from '../SocraticTurn';

/**
 * Redacción v2 Fase 1 (§4.5) B3 — ayuda estructural sensible al género, FLAG-INERT.
 * Andamiaje formativo: aparece SOLO con enableGenreStructuralHelp on + género
 * confirmado; sin flag el prompt clásico queda intacto.
 */
const policy = new StructuralAnalysisStepPolicy();

function ctx(over: Partial<TurnContext>): TurnContext {
    return {
        passage: 'Romanos 8:1-4',
        currentStep: 'structuralAnalysis',
        pastorDraft: '',
        attemptIndex: 0,
        genre: 'epistle',
        ...over,
    };
}

describe('StructuralAnalysisStepPolicy — ayuda sensible al género (B3, flag-inert)', () => {
    it('flag OFF → prompt clásico, sin la guía por género (inerte)', () => {
        const prompt = policy.buildSystemPrompt(ctx({ enableGenreStructuralHelp: false }));
        expect(prompt).not.toContain('AYUDA SENSIBLE AL GÉNERO');
        expect(prompt).not.toContain(STRUCTURAL_SUFFICIENCY_BY_GENRE.epistle.guidance);
    });

    it('flag ON + género confirmado → inyecta la guía del género', () => {
        const prompt = policy.buildSystemPrompt(ctx({ enableGenreStructuralHelp: true }));
        expect(prompt).toContain('AYUDA SENSIBLE AL GÉNERO');
        expect(prompt).toContain(STRUCTURAL_SUFFICIENCY_BY_GENRE.epistle.guidance);
    });

    it('flag ON pero sin género confirmado → sin guía (fail-safe, no inventa)', () => {
        const prompt = policy.buildSystemPrompt(ctx({ enableGenreStructuralHelp: true, genre: undefined }));
        expect(prompt).not.toContain('AYUDA SENSIBLE AL GÉNERO');
    });

    it('flag ON + género sin guía deterministas (fuera del catálogo) → sin guía', () => {
        const prompt = policy.buildSystemPrompt(ctx({ enableGenreStructuralHelp: true, genre: 'parable' }));
        expect(prompt).not.toContain('AYUDA SENSIBLE AL GÉNERO');
    });
});
