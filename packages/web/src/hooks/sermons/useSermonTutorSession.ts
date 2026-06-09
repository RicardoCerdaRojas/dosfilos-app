import { useState } from 'react';
import { sermonService } from '@dosfilos/application';
import type { SermonEntity } from '@dosfilos/domain';
import { useFacultyAgents } from '@/hooks/faculty/useFacultyAgents';
import { useFacultySessions } from '@/hooks/faculty/useFacultySessions';

interface UseSermonTutorSessionResult {
    /** The active tutor session id, or null until one is created. */
    sessionId: string | null;
    /** True while a session is being created. */
    isPreparing: boolean;
    /**
     * Returns the session id to chat against, creating one lazily on first use.
     * Prefers the sermon's origin faculty session; otherwise creates a fresh
     * editor session and persists its id on the sermon (`tutorSessionId`).
     */
    ensureSession: () => Promise<string>;
}

/**
 * Resolves (and lazily creates) the faculty tutor session used by the sermon
 * editor for follow-up questions. Faculty-generated sermons continue their
 * origin conversation; every other sermon gets a fresh editor-scoped session
 * the first time the pastor asks something.
 */
export function useSermonTutorSession(sermon: SermonEntity): UseSermonTutorSessionResult {
    const { data: agents } = useFacultyAgents();
    const { createSession } = useFacultySessions();
    const [sessionId, setSessionId] = useState<string | null>(
        sermon.sourceFacultySessionId ?? sermon.tutorSessionId ?? null,
    );
    const [isPreparing, setIsPreparing] = useState(false);

    const ensureSession = async (): Promise<string> => {
        if (sessionId) return sessionId;

        const agentId = agents?.[0]?.id;
        if (!agentId) {
            throw new Error('No hay tutores disponibles en este momento.');
        }

        setIsPreparing(true);
        try {
            const created = await createSession.mutateAsync({ agentId });
            await sermonService.updateSermon(sermon.id, { tutorSessionId: created.id });
            setSessionId(created.id);
            return created.id;
        } finally {
            setIsPreparing(false);
        }
    };

    return { sessionId, isPreparing, ensureSession };
}
