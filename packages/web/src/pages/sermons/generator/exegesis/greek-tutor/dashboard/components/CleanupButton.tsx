import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Trash2, Loader2 } from 'lucide-react';
import { StudySession } from '@dosfilos/domain';
import { calculateSessionProgress } from '../utils/sessionUtils';

interface CleanupButtonProps {
    sessions: StudySession[];
    onCleanup: (sessionIds: string[]) => Promise<void>;
}

/**
 * CleanupButton - Allows users to bulk delete empty sessions (0% progress)
 * Sessions are considered empty if they have 0 completed units and were created more than 24h ago
 */
export const CleanupButton: React.FC<CleanupButtonProps> = ({ sessions, onCleanup }) => {
    const [isDeleting, setIsDeleting] = useState(false);

    // Find empty sessions (0% progress and older than 24 hours)
    const emptySessionsOlderThan24h = sessions.filter(session => {
        const progress = calculateSessionProgress(session);
        const isOld = Date.now() - session.createdAt.getTime() > 24 * 60 * 60 * 1000; // 24 hours
        return progress === 0 && isOld;
    });

    const handleCleanup = async () => {
        if (emptySessionsOlderThan24h.length === 0) return;

        const confirmed = window.confirm(
            `¿Estás seguro de que deseas eliminar ${emptySessionsOlderThan24h.length} sesión(es) vacía(s)?\n\n` +
            `Estas sesiones tienen 0% de progreso y fueron creadas hace más de 24 horas.\n\n` +
            `Esta acción no se puede deshacer.`
        );

        if (!confirmed) return;

        setIsDeleting(true);
        try {
            const sessionIds = emptySessionsOlderThan24h.map(s => s.id);
            await onCleanup(sessionIds);
        } catch (error) {
            console.error('[CleanupButton] Error cleaning up sessions:', error);
            alert('Error al limpiar sesiones. Por favor intenta de nuevo.');
        } finally {
            setIsDeleting(false);
        }
    };

    // Don't show button if there are no empty sessions
    if (emptySessionsOlderThan24h.length === 0) {
        return null;
    }

    return (
        <Button
            variant="outline"
            size="sm"
            onClick={handleCleanup}
            disabled={isDeleting}
            className="gap-2"
        >
            {isDeleting ? (
                <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Limpiando...
                </>
            ) : (
                <>
                    <Trash2 className="h-4 w-4" />
                    Limpiar sesiones vacías ({emptySessionsOlderThan24h.length})
                </>
            )}
        </Button>
    );
};
