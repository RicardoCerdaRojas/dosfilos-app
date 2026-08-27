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

            /**
             * LOS TRES GRUPOS SE LEEN EN PARALELO, Y EL ORDEN SE CONSERVA.
             *
             * Antes cada sermón de la serie se pedía en su propio `await` dentro
             * de un `for`: abrir una serie de doce sermones costaba DOCE VIAJES
             * A FIRESTORE EN FILA, y el pastor miraba una pantalla de carga
             * mientras la red hacía uno detrás de otro algo que puede hacer a la
             * vez. Ninguna lectura necesita el resultado de la anterior.
             *
             * EL ORDEN DE INSERCIÓN IMPORTA aunque después se ordene por fecha:
             * el comparador devuelve 0 cuando NINGUNO de los dos tiene fecha
             * programada, y `sort` en JavaScript es estable — así que en ese
             * caso manda el orden en que entraron. Por eso los grupos se
             * concatenan en la misma secuencia de antes (planificados, después
             * borradores sueltos, después completados) y dentro de cada grupo se
             * respeta el orden original: `Promise.all` conserva las posiciones.
             */
            const leerSermon = async (id: string) => {
                try {
                    // Un sermón borrado o sin permiso NO es un error: la serie
                    // guarda referencias que pueden quedar huérfanas, y eso ya se
                    // trataba como "no hay borrador".
                    return await sermonService.getSermon(id);
                } catch {
                    return null;
                }
            };

            const plannedSermons = seriesData.metadata?.plannedSermons || [];
            const linkedDraftIds = new Set(plannedSermons.map(p => p.draftId).filter(Boolean));
            const extraDraftIds = (seriesData.draftIds || []).filter(id => !linkedDraftIds.has(id));

            const [borradoresPlanificados, borradoresSueltos, completados] = await Promise.all([
                Promise.all(plannedSermons.map(p => (p.draftId ? leerSermon(p.draftId) : Promise.resolve(null)))),
                Promise.all(extraDraftIds.map(leerSermon)),
                Promise.all(seriesData.sermonIds.map(leerSermon)),
            ]);

            const items: SermonItem[] = [];

            plannedSermons.forEach((planned, i) => {
                const draft = planned.draftId ? borradoresPlanificados[i] : null;
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
                    // Sin borrador, o con uno que ya no existe: sigue siendo un
                    // sermón planificado, no uno perdido.
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
            });

            for (const draft of borradoresSueltos) {
                if (!draft) continue;
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

            for (const sermon of completados) {
                if (!sermon) continue;
                items.push({
                    id: sermon.id,
                    title: sermon.title,
                    description: sermon.content?.substring(0, 200) || '',
                    scheduledDate: sermon.scheduledDate,
                    status: 'complete',
                    draftId: sermon.id
                });
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
