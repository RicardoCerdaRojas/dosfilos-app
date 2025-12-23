import React, { useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Loader2, Plus, AlertCircle, ArrowLeft } from 'lucide-react';
import { SessionCard } from './components/SessionCard';
import { useSessionList } from './hooks/useSessionList';
import { useResumeSession } from './hooks/useResumeSession';
import { GetUserSessionsUseCase } from '@dosfilos/application/src/greek-tutor/use-cases/GetUserSessionsUseCase';
import { DeleteSessionUseCase } from '@dosfilos/application/src/greek-tutor/use-cases/DeleteSessionUseCase';

interface GreekTutorDashboardProps {
    userId: string;
    getUserSessionsUseCase: GetUserSessionsUseCase;
    deleteSessionUseCase: DeleteSessionUseCase;
    onCreateNew: () => void;
}

/**
 * Main dashboard view for Greek Tutor sessions
 * Displays list of user's study sessions with filtering options
 */
export const GreekTutorDashboard: React.FC<GreekTutorDashboardProps> = ({
    userId,
    getUserSessionsUseCase,
    deleteSessionUseCase,
    onCreateNew
}) => {
    const { resumeSession } = useResumeSession();
    const [deletingId, setDeletingId] = useState<string | null>(null);

    // Fetch sessions
    const { sessions, isLoading, error, refetch } = useSessionList({
        userId,
        getUserSessions: (userId, filters) => getUserSessionsUseCase.execute(userId, filters)
    });

    /**
     * Handle session deletion with confirmation
     */
    const handleDelete = async (sessionId: string) => {
        if (!userId) return;
        
        const confirmed = window.confirm(
            '¿Estás seguro de que deseas eliminar esta sesión de estudio? Esta acción no se puede deshacer.'
        );
        
        if (!confirmed) return;

        setDeletingId(sessionId);
        try {
            await deleteSessionUseCase.execute(sessionId, userId);
            await refetch(); // Refresh list
        } catch (error) {
            console.error('[GreekTutorDashboard] Error deleting session:', error);
            alert('Error al eliminar la sesión. Por favor intenta de nuevo.');
        } finally {
            setDeletingId(null);
        }
    };

    // Loading state
    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="ml-3 text-muted-foreground">Cargando sesiones...</span>
            </div>
        );
    }

    // Error state
    if (error) {
        return (
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                    Error al cargar las sesiones: {error}
                </AlertDescription>
            </Alert>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <div className="flex items-center gap-3">
                        <Button
                            onClick={() => window.history.back()}
                            variant="ghost"
                            size="icon"
                        >
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                        <h2 className="text-3xl font-bold tracking-tight">Mis Sesiones de Estudio</h2>
                    </div>
                    <p className="text-muted-foreground mt-1 ml-12">
                        Gestiona y continúa tus sesiones de Greek Tutor
                    </p>
                </div>
                <Button onClick={onCreateNew}>
                    <Plus className="mr-2 h-4 w-4" />
                    Nueva Sesión
                </Button>
            </div>

            {/* Sessions Grid */}
            {sessions.length === 0 ? (
                <div className="text-center py-12">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
                        <AlertCircle className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">No hay sesiones de estudio</h3>
                    <p className="text-muted-foreground mb-4">
                        Comienza tu primera sesión de estudio del griego bíblico
                    </p>
                    <Button onClick={onCreateNew}>
                        <Plus className="mr-2 h-4 w-4" />
                        Crear Nueva Sesión
                    </Button>
                </div>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {sessions.map((session) => (
                        <SessionCard
                            key={session.id}
                            session={session}
                            onResume={resumeSession}
                            onDelete={deletingId === session.id ? undefined : handleDelete}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};
