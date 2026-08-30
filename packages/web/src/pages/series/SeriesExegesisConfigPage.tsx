import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { exegesisService, seriesService } from '@dosfilos/application';
import type { UserRubric, UserStyleGuide } from '@dosfilos/domain';
import { Button } from '@/components/ui/button';
import { useFirebase } from '@/context/firebase-context';
import { ExegesisDefaultsForm } from '@/components/plan/ExegesisDefaultsCard';

/**
 * Configuración exegética de una serie: rúbrica, guía de estilo y corpus base.
 *
 * Era un diálogo, y el usuario lo describió como difícil de leer. Con razón:
 * tres ajustes independientes más un catálogo navegable de siete categorías no
 * entran en un recuadro centrado con scroll interno.
 *
 * La distinción con "Agregar fuente al corpus" —que sigue siendo diálogo— es de
 * forma de tarea, no de nivel: aquello es elegir un archivo y confirmar tres
 * campos, y devuelve al usuario donde estaba. Esto es configurar y explorar.
 */
export function SeriesExegesisConfigPage() {
    const { seriesId } = useParams<{ seriesId: string }>();
    const navigate = useNavigate();
    const { t, i18n } = useTranslation('series');
    const { user } = useFirebase();

    const [series, setSeries] = useState<{ metadata?: Record<string, unknown>; title?: string } | null>(null);
    const [rubrics, setRubrics] = useState<UserRubric[] | null>(null);
    const [styleGuides, setStyleGuides] = useState<UserStyleGuide[] | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user?.uid || !seriesId) return;
        let cancelled = false;
        Promise.all([
            seriesService.getSeries(seriesId),
            exegesisService.listUserRubrics.execute(user.uid),
            exegesisService.listStyleGuides.execute(user.uid),
        ])
            .then(([s, r, g]) => {
                if (cancelled) return;
                setSeries(s as never);
                setRubrics(r);
                setStyleGuides(g);
            })
            .catch(err => {
                console.error('[SeriesExegesisConfig] carga fallida', err);
                toast.error(t('detail.exegesisDefaults.loadFailed') as string);
            })
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, [user?.uid, seriesId, t]);

    const back = () => navigate(`/dashboard/plans/${seriesId}`);

    if (loading) {
        return (
            <div className="flex items-center justify-center gap-2 py-24 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                <span className="text-sm">{t('detail.exegesisDefaults.loading')}</span>
            </div>
        );
    }

    const metadata = (series?.metadata ?? {}) as { exegesisDefaults?: never; expository?: { book?: string } };

    return (
        <div className="flex h-full flex-col overflow-y-auto">
            <header className="flex items-start gap-3 border-b border-border px-5 py-3">
                <Button
                    variant="ghost" size="icon" className="mt-0.5 h-8 w-8 shrink-0"
                    onClick={back}
                    aria-label={t('detail.exegesisDefaults.back')}
                >
                    <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                </Button>
                <h1 className="truncate text-base font-semibold text-foreground">
                    {series?.title ?? ''}
                </h1>
            </header>

            <ExegesisDefaultsForm
                seriesId={seriesId!}
                ownerId={user!.uid}
                initial={metadata.exegesisDefaults}
                rubrics={rubrics ?? []}
                styleGuides={styleGuides ?? []}
                isLoadingOptions={false}
                book={metadata.expository?.book}
                language={i18n.language.startsWith('en') ? 'en' : 'es'}
                onDone={back}
                onSaved={back}
            />
        </div>
    );
}
