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
                navigate('/series');
                return;
            }
            setSeries(seriesData);

            const items: SermonItem[] = [];

            // Load planned sermons
            const plannedSermons = seriesData.metadata?.plannedSermons || [];
            for (const planned of plannedSermons) {
                if (planned.draftId) {
                    const draft = await sermonService.getSermon(planned.draftId);
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
                }
            }

            // Load completed sermons
            for (const sermonId of seriesData.sermonIds) {
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
                status: 'draft' as const,
                tags: [series.title],
                seriesId: series.id,
                scheduledDate: item.scheduledDate,
                wizardProgress: {
                    currentStep: item.passage ? 1 : 0,
                    passage: item.passage || '',
                    lastSaved: new Date()
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
            navigate(`/sermons/generate?id=${newSermon.id}`);
        } catch (error) {
            console.error('Error starting draft:', error);
            toast.error('Error al iniciar sermón');
        }
    };

    const handleContinueEditing = (draftId: string) => {
        navigate(`/sermons/generate?id=${draftId}`);
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
        reloadData: loadData
    };
}
