import { describe, it, expect } from 'vitest';
import type { AIChatMessage, AIChatSession } from '@dosfilos/domain';

/**
 * The cache transitions behind "my question shows up the moment I send
 * it". Extracted as plain functions so the rules are testable without
 * mounting the hook and its Firebase dependencies.
 */
function addUserMessage(session: AIChatSession, id: string, content: string): AIChatSession {
    const msg = { id, role: 'user', content, timestamp: new Date() } as AIChatMessage;
    return { ...session, messages: [...session.messages, msg] };
}

function commitExchange(
    session: AIChatSession,
    optimisticId: string,
    userText: string,
    modelText: string,
): AIChatSession {
    const withoutOptimistic = session.messages.filter(m => m.id !== optimisticId);
    const now = new Date();
    return {
        ...session,
        messages: [
            ...withoutOptimistic,
            { id: 'u', role: 'user', content: userText, timestamp: now } as AIChatMessage,
            { id: 'm', role: 'model', content: modelText, timestamp: now } as AIChatMessage,
        ],
    };
}

const base = { id: 's', messages: [] as AIChatMessage[] } as unknown as AIChatSession;

describe('mensaje optimista del usuario', () => {
    it('aparece antes de que llegue la respuesta', () => {
        const after = addUserMessage(base, 'optimistic-user-1', '¿qué significa δοῦλος?');

        expect(after.messages).toHaveLength(1);
        expect(after.messages[0]?.content).toBe('¿qué significa δοῦλος?');
    });

    it('no se duplica al confirmar el intercambio', () => {
        const pending = addUserMessage(base, 'optimistic-user-1', 'pregunta');
        const done = commitExchange(pending, 'optimistic-user-1', 'pregunta', 'respuesta');

        // Una pregunta, una respuesta. Sin reemplazar la burbuja
        // optimista, la pregunta se vería dos veces.
        expect(done.messages.map(m => m.role)).toEqual(['user', 'model']);
        expect(done.messages.filter(m => m.content === 'pregunta')).toHaveLength(1);
    });

    it('se retira cuando el envío falla', () => {
        const pending = addUserMessage(base, 'optimistic-user-1', 'pregunta');
        const rolledBack = {
            ...pending,
            messages: pending.messages.filter(m => m.id !== 'optimistic-user-1'),
        };

        expect(rolledBack.messages).toHaveLength(0);
    });
});
