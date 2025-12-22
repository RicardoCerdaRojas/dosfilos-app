import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { SermonSeriesEntity, SermonEntity, PlannedSermon } from '@dosfilos/domain';
import { seriesService, sermonService } from '@dosfilos/application';
import { useFirebase } from '@/context/firebase-context';
import { toast } from 'sonner';

export interface SermonItem {
    id: string;
    title: string;
    description: string;
    passage?: string;
    scheduledDate?: Date;
    status: 'planned' | 'in_progress' | 'complete';
    plannedSermonId?: string;
    draftId?: string;
    wizardProgress?: { currentStep: number };
}

export function useSeriesData(seriesId: string | undefined) {
    const navigate = useNavigate();
    const { user } = useFirebase();
    const [series, setSeries] = useState<SermonSeriesEntity | null>(null);
    const [sermonItems, setSermonItems] = useState<SermonItem[]>([]);
    const [loading, setLoading] = useState(true);

    const loadData = async () => {
        if (!seriesId) return;

        try {
            const seriesData = await seriesService.getSeries(seriesId);
            if (!seriesData) {
                navigate('/plans');
                return;
            }
            setSeries(seriesData);

            const items: SermonItem[] = [];

            // Load planned sermons
            const plannedSermons = seriesData.metadata?.plannedSermons || [];
            for (const planned of plannedSermons) {
                if (planned.draftId) {
                    let draft = null;
                    try {
                        draft = await sermonService.getSermon(planned.draftId);
                    } catch (error) {
                        // Draft may have been deleted or permissions changed - treat as no draft (expected for orphaned references)
                    }

                    if (draft) {
                        const isComplete = draft.content && draft.content.length > 100 &&
                            (!draft.wizardProgress || draft.wizardProgress.currentStep >= 4);
                        items.push({
                            id: planned.id,
                            title: planned.title,
                            description: planned.description,
                            passage: planned.passage,
                            scheduledDate: planned.scheduledDate,
                            status: isComplete ? 'complete' : 'in_progress',
                            plannedSermonId: planned.id,
                            draftId: planned.draftId,
                            wizardProgress: draft.wizardProgress
                        });
                    } else {
                        // Draft was deleted or doesn't exist - show as planned
                        items.push({
                            id: planned.id,
                            title: planned.title,
                            description: planned.description,
                            passage: planned.passage,
                            scheduledDate: planned.scheduledDate,
                            status: 'planned',
                            plannedSermonId: planned.id
                        });
                    }
                } else {
                    items.push({
                        id: planned.id,
                        title: planned.title,
                        description: planned.description,
                        passage: planned.passage,
                        scheduledDate: planned.scheduledDate,
                        status: 'planned',
                        plannedSermonId: planned.id
                    });
                }
            }

            // Load additional drafts
            const linkedDraftIds = new Set(plannedSermons.map(p => p.draftId).filter(Boolean));
            for (const draftId of (seriesData.draftIds || [])) {
                if (!linkedDraftIds.has(draftId)) {
                    try {
                        const draft = await sermonService.getSermon(draftId);
                        if (draft) {
                            items.push({
                                id: draft.id,
                                title: draft.title,
                                description: draft.content || '',
                                scheduledDate: draft.scheduledDate,
                                status: 'in_progress',
                                draftId: draft.id,
                                wizardProgress: draft.wizardProgress
                            });
                        }
                    } catch (error) {
                        // Draft may have been deleted or permissions changed - skip (expected for orphaned references)
                    }
                }
            }

            // Load completed sermons
            for (const sermonId of seriesData.sermonIds) {
                try {
                    const sermon = await sermonService.getSermon(sermonId);
                    if (sermon) {
                        items.push({
                            id: sermon.id,
                            title: sermon.title,
                            description: sermon.content?.substring(0, 200) || '',
                            scheduledDate: sermon.scheduledDate,
                            status: 'complete',
                            draftId: sermon.id
                        });
                    }
                } catch (error) {
                    console.warn(`Could not load completed sermon ${sermonId}, skipping:`, error);
                }
            }

            // Sort by scheduledDate
            items.sort((a, b) => {
                if (a.scheduledDate && b.scheduledDate) {
                    return new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime();
                }
                if (a.scheduledDate) return -1;
                if (b.scheduledDate) return 1;
                return 0;
            });

            setSermonItems(items);
        } catch (error) {
            console.error('Error loading series details:', error);
            toast.error('Error al cargar el plan');
        } finally {
            setLoading(false);
        }
    };

    const handleStartDraft = async (item: SermonItem) => {
        if (!series || !item.plannedSermonId || !user) return;

        try {
            const sermonData = {
                userId: user.uid,
                title: item.title,
                content: item.description,
                status: 'draft' as const, // 🎯 FIX: Use 'draft' so sermon appears in "Generar Sermón"
                tags: [series.title],
                seriesId: series.id,
                scheduledDate: item.scheduledDate,
                wizardProgress: {
                    currentStep: item.passage ? 1 : 0,
                    passage: item.passage || '',
                    lastSaved: new Date(),
                    planId: series.id // Track which plan this sermon belongs to
                }
            };

            const newSermon = await sermonService.createSermon(sermonData);

            // Update planned sermon with draftId
            const plannedSermons = series.metadata?.plannedSermons || [];
            const updatedPlanned = plannedSermons.map(p =>
                p.id === item.plannedSermonId ? { ...p, draftId: newSermon.id } : p
            );

            await seriesService.updateSeries(series.id, {
                draftIds: [...(series.draftIds || []), newSermon.id],
                metadata: {
                    ...series.metadata,
                    plannedSermons: updatedPlanned
                }
            } as any);

            toast.success('Sermón iniciado');
            navigate(`/dashboard/sermons/generate?id=${newSermon.id}`);
        } catch (error) {
            console.error('Error starting draft:', error);
            toast.error('Error al iniciar sermón');
        }
    };

    const handleContinueEditing = (draftId: string) => {
        navigate(`/dashboard/sermons/generate?id=${draftId}`);
    };

    const handleUpdateSermonDate = async (sermonId: string, newDate: Date | null) => {
        if (!series) return;

        // Optimistic update - actualiza UI inmediatamente
        setSermonItems(prevItems =>
            prevItems.map(item =>
                item.id === sermonId ? { ...item, scheduledDate: newDate || undefined } : item
            )
        );

        try {
            const plannedSermons = series.metadata?.plannedSermons || [];
            const updatedPlanned = plannedSermons.map(p =>
                p.id === sermonId ? { ...p, scheduledDate: newDate } : p
            );

            // Guarda en background sin esperar
            seriesService.updateSeries(series.id, {
                metadata: {
                    ...series.metadata,
                    plannedSermons: updatedPlanned
                }
            } as any).then(() => {
                toast.success('Fecha actualizada');
            }).catch((error) => {
                console.error('Error updating sermon date:', error);
                toast.error('Error al actualizar fecha');
                // Si falla, recarga para revertir
                loadData();
            });
        } catch (error) {
            console.error('Error updating sermon date:', error);
            toast.error('Error al actualizar fecha');
            // Recarga para revertir el cambio optimista
            await loadData();
        }
    };

    const handleDeleteSermon = async (sermonId: string) => {
        if (!series) return;

        try {
            const plannedSermons = series.metadata?.plannedSermons || [];
            const updatedPlanned = plannedSermons.filter(p => p.id !== sermonId);

            await seriesService.updateSeries(series.id, {
                metadata: {
                    ...series.metadata,
                    plannedSermons: updatedPlanned
                }
            } as any);

            toast.success('Sermón eliminado del plan');
            await loadData();
        } catch (error) {
            console.error('Error deleting sermon:', error);
            toast.error('Error al eliminar sermón');
        }
    };

    const handleMarkComplete = async (sermonId: string) => {
        // Find the sermon item to get its draftId
        const item = sermonItems.find(s => s.id === sermonId);
        if (!item?.draftId) {
            toast.error('Este sermón no tiene un borrador asociado');
            return;
        }

        try {
            // Update sermon wizardProgress to step 4 (complete)
            await sermonService.updateSermon(item.draftId, {
                wizardProgress: {
                    currentStep: 4,
                    lastSaved: new Date()
                }
            } as any);

            toast.success('Sermón marcado como completado');
            await loadData(); // Reload to update status
        } catch (error) {
            console.error('Error marking sermon as complete:', error);
            toast.error('Error al marcar como completado');
        }
    };

    useEffect(() => {
        loadData();
    }, [seriesId]);

    return {
        series,
        sermonItems,
        loading,
        handleStartDraft,
        handleContinueEditing,
        handleUpdateSermonDate,
        handleDeleteSermon,
        handleMarkComplete,
        reloadData: loadData
    };
}
