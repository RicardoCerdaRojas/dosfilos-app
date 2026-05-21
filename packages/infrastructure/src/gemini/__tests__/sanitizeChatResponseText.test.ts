import { describe, it, expect } from 'vitest';
import { sanitizeChatResponseText } from '../GeminiSermonGenerator';

describe('sanitizeChatResponseText', () => {
    it('returns empty input untouched', () => {
        expect(sanitizeChatResponseText('')).toBe('');
    });

    it('passes clean prose through unchanged', () => {
        const text = 'Estimado pastor, es un placer colaborar en esta mesa de trabajo.';
        expect(sanitizeChatResponseText(text)).toBe(text);
    });

    it('strips a leading `print(file_search.query("…"))` line', () => {
        const text = `print(file_search.query("relación Juan 1:1 Génesis 1:1"))

Estimado pastor, la relación entre Juan 1:1 y Génesis 1:1 es profunda.`;
        expect(sanitizeChatResponseText(text)).toBe(
            'Estimado pastor, la relación entre Juan 1:1 y Génesis 1:1 es profunda.',
        );
    });

    it('strips a leading bare `file_search.query(…)` line', () => {
        const text = `file_search.query("Juan 1:1")

La respuesta pastoral va aquí.`;
        expect(sanitizeChatResponseText(text)).toBe('La respuesta pastoral va aquí.');
    });

    it('strips a leading `default_api.file_search.query(…)` line', () => {
        const text = `default_api.file_search.query("Génesis 1:1")

Respuesta.`;
        expect(sanitizeChatResponseText(text)).toBe('Respuesta.');
    });

    it('strips a leading fenced code block containing the tool call', () => {
        const text = '```python\nprint(file_search.query("Juan 1:1"))\n```\n\nLa respuesta pastoral.';
        expect(sanitizeChatResponseText(text)).toBe('La respuesta pastoral.');
    });

    it('strips multiple consecutive leaked invocations', () => {
        const text = `print(file_search.query("a"))
file_search.query("b")

Respuesta limpia.`;
        expect(sanitizeChatResponseText(text)).toBe('Respuesta limpia.');
    });

    it('does NOT strip tool-call mentions deep inside the response prose', () => {
        // A legitimate explanation that mentions file_search shouldn't
        // be touched — only leading leakage is the concern.
        const text = `Estimado pastor, su pregunta es sobre file_search.query como concepto.

La respuesta sigue aquí.`;
        expect(sanitizeChatResponseText(text)).toBe(text);
    });

    it('does NOT strip a markdown code block that is part of the answer', () => {
        const text = '```javascript\nconsole.log("Hola");\n```\n\nEste es un ejemplo.';
        expect(sanitizeChatResponseText(text)).toBe(text);
    });
});
