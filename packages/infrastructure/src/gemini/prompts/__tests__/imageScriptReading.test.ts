import { describe, it, expect } from 'vitest';
import { buildSystemInstruction, getGlobalBehaviorPrompt } from '../geminiMultiAgentPrompts';
import type { AIAgent } from '@dosfilos/domain';

const agent = { id: '1', systemInstruction: 'Eres un especialista.' } as unknown as AIAgent;

describe('lectura letra por letra', () => {
    it('no viaja en un turno de solo texto', () => {
        // Iba en el prompt global de toda petición. Pedirle en texto la
        // cita exacta de una frase con ἁπλότης bastaba para que
        // deletreara ochenta y un caracteres antes de darla.
        const prompt = buildSystemInstruction(agent, undefined, 'es');

        expect(prompt).not.toContain('Lectura visual');
        expect(prompt).not.toContain('ENUMERAR cada carácter');
    });

    it('viaja cuando el turno lleva imagen', () => {
        const prompt = buildSystemInstruction(agent, undefined, 'es', true);

        expect(prompt).toContain('Lectura visual');
        expect(prompt).toContain('ENUMERAR cada carácter');
    });

    it('tampoco viaja en inglés sin imagen', () => {
        expect(buildSystemInstruction(agent, undefined, 'en')).not.toContain('Visual reading');
        expect(buildSystemInstruction(agent, undefined, 'en', true)).toContain('Visual reading');
    });

    it('el prompt global ya no lo contiene en ningún idioma', () => {
        for (const lang of ['es', 'en'] as const) {
            expect(getGlobalBehaviorPrompt(lang)).not.toMatch(/Lectura visual|Visual reading/);
        }
    });
});
