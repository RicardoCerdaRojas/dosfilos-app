import React, { useState, useMemo } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Loader2, Plus, AlertCircle, ArrowLeft, Play } from 'lucide-react';
import { SessionCard } from './components/SessionCard';
import { StatisticsPanel } from './components/StatisticsPanel';
import { SearchBar } from './components/SearchBar';
import { SessionFilters, ProgressFilter, SortBy } from './components/SessionFilters';
import { CleanupButton } from './components/CleanupButton';
import { EmptyState } from './components/EmptyState';
import { useSessionList } from './hooks/useSessionList';
import { useResumeSession } from './hooks/useResumeSession';
import { GetUserSessionsUseCase } from '@dosfilos/application/src/greek-tutor/use-cases/GetUserSessionsUseCase';
import { DeleteSessionUseCase } from '@dosfilos/application/src/greek-tutor/use-cases/DeleteSessionUseCase';
import { calculateSessionProgress, getSessionLastActivity } from './utils/sessionUtils';

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
    
    // Filter and sort states
    const [searchQuery, setSearchQuery] = useState('');
    const [progressFilter, setProgressFilter] = useState<ProgressFilter>('all');
    const [sortBy, setSortBy] = useState<SortBy>('date-desc');

    // Fetch sessions
    const { sessions, isLoading, error, refetch } = useSessionList({
        userId,
        getUserSessions: (userId, filters) => getUserSessionsUseCase.execute(userId, filters)
    });

    /**
     * Filter and sort sessions based on user selections
     */
    const filteredAndSortedSessions = useMemo(() => {
        let filtered = [...sessions];

        // Apply search filter
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase().trim();
            filtered = filtered.filter(session =>
                session.passage.toLowerCase().includes(query)
            );
        }

        // Apply progress filter
        switch (progressFilter) {
            case 'empty':
                filtered = filtered.filter(s => calculateSessionProgress(s) === 0);
                break;
            case 'started':
                filtered = filtered.filter(s => {
                    const progress = calculateSessionProgress(s);
                    return progress > 0 && progress <= 50;
                });
                break;
            case 'half':
                filtered = filtered.filter(s => {
                    const progress = calculateSessionProgress(s);
                    return progress > 50 && progress < 100;
                });
                break;
            case 'complete':
                filtered = filtered.filter(s => calculateSessionProgress(s) === 100);
                break;
            // 'all' doesn't filter
        }

        // Apply sorting
        switch (sortBy) {
            case 'date-desc':
                filtered.sort((a, b) => {
                    const dateA = getSessionLastActivity(a);
                    const dateB = getSessionLastActivity(b);
                    return dateB.getTime() - dateA.getTime();
                });
                break;
            case 'date-asc':
                filtered.sort((a, b) => {
                    const dateA = getSessionLastActivity(a);
                    const dateB = getSessionLastActivity(b);
                    return dateA.getTime() - dateB.getTime();
                });
                break;
            case 'az':
                filtered.sort((a, b) => a.passage.localeCompare(b.passage));
                break;
            case 'progress':
                filtered.sort((a, b) => calculateSessionProgress(b) - calculateSessionProgress(a));
                break;
        }

        return filtered;
    }, [sessions, searchQuery, progressFilter, sortBy]);

    // Find most recent active session for "Continue where you left off"
    // Must be before any conditional returns to satisfy React hooks rules
    const mostRecentActive = useMemo(() => {
        // Get sessions that are active and have some activity
        const activeSessions = sessions.filter(s => s.status === 'ACTIVE');
        
        if (activeSessions.length === 0) return null;
        
        // Find the most recently active one
        return activeSessions.reduce((latest, session) => {
            const sessionActivity = getSessionLastActivity(session);
            const latestActivity = getSessionLastActivity(latest);
            return sessionActivity > latestActivity ? session : latest;
        });
    }, [sessions]);

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

    /**
     * Handle bulk cleanup of empty sessions
     */
    const handleBulkCleanup = async (sessionIds: string[]) => {
        if (!userId) return;
        
        try {
            // Delete all sessions in parallel
            await Promise.all(
                sessionIds.map(sessionId => deleteSessionUseCase.execute(sessionId, userId))
            );
            await refetch(); // Refresh list after cleanup
        } catch (error) {
            console.error('[GreekTutorDashboard] Error cleaning up sessions:', error);
            throw error; // Re-throw to let CleanupButton handle the error
        }
    };

    /**
     * Handle session duplication - creates a new session with the same passage
     */
    const handleDuplicate = (session: typeof sessions[0]) => {
        // Navigate to create new session with the passage pre-filled
        // This uses the existing onCreateNew callback but with context
        // Duplicating session
        
        // For now, just trigger onCreateNew
        // In the future, we could pass the passage to onCreateNew if the API supports it
        onCreateNew();
        
        // TODO: Once backend supports duplicate prevention, 
        // we should check if a session already exists for this passage
        alert(`Creando nueva sesión para ${session.passage}. Podrás seleccionar el pasaje en el siguiente paso.`);
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

    const hasNoSessions = sessions.length === 0;
    const hasNoResults = !hasNoSessions && filteredAndSortedSessions.length === 0;

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

            {/* Statistics Panel - only show if there are sessions */}
            {!hasNoSessions && (
                <StatisticsPanel sessions={sessions} />
            )}

            {/* Search and Filters - only show if there are sessions */}
            {!hasNoSessions && (
                <div className="flex flex-col lg:flex-row gap-4">
                    <div className="flex-1">
                        <SearchBar
                            value={searchQuery}
                            onChange={setSearchQuery}
                            placeholder="Buscar pasaje (ej: Romanos, Juan 3:16)..."
                        />
                    </div>
                    <div className="flex items-center gap-3">
                        <SessionFilters
                            progressFilter={progressFilter}
                            sortBy={sortBy}
                            onProgressFilterChange={setProgressFilter}
                            onSortByChange={setSortBy}
                        />
                        <CleanupButton
                            sessions={sessions}
                            onCleanup={handleBulkCleanup}
                        />
                    </div>
                </div>
            )}

            {/* Continue Where You Left Off - Featured Session */}
            {mostRecentActive && !hasNoSessions && (
                <div className="space-y-3">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                        <Play className="h-5 w-5 text-primary" />
                        Continuar donde lo dejaste
                    </h3>
                    <div className="max-w-md">
                        <SessionCard
                            session={mostRecentActive}
                            onResume={resumeSession}
                            onDelete={deletingId === mostRecentActive.id ? undefined : handleDelete}
                            onDuplicate={handleDuplicate}
                            featured={true}
                        />
                    </div>
                </div>
            )}

            {/* Sessions Grid or Empty State */}
            {hasNoSessions ? (
                <EmptyState 
                    onCreateNew={onCreateNew}
                    onQuickStart={(passage) => {
                        // Quick start with passage
                        // For now, just trigger onCreateNew
                        // In the future, we could pre-fill the passage selector
                        onCreateNew();
                        alert(`Iniciando nueva sesión con ${passage}. Podrás confirmar el pasaje en el siguiente paso.`);
                    }}
                />
            ) : hasNoResults ? (
                <div className="text-center py-12">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
                        <AlertCircle className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">No se encontraron resultados</h3>
                    <p className="text-muted-foreground mb-4">
                        Intenta ajustar los filtros o la búsqueda
                    </p>
                    <Button
                        variant="outline"
                        onClick={() => {
                            setSearchQuery('');
                            setProgressFilter('all');
                            setSortBy('date-desc');
                        }}
                    >
                        Limpiar filtros
                    </Button>
                </div>
            ) : (
                <>
                    <div className="text-sm text-muted-foreground">
                        Mostrando {filteredAndSortedSessions.length} de {sessions.length} sesiones
                    </div>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {filteredAndSortedSessions.map((session) => (
                            <SessionCard
                                key={session.id}
                                session={session}
                                onResume={resumeSession}
                                onDelete={deletingId === session.id ? undefined : handleDelete}
                                onDuplicate={handleDuplicate}
                            />
                        ))}
                    </div>
                </>
            )}
        </div>
    );
};
