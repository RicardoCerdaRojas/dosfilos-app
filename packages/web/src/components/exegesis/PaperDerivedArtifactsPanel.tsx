import { Link } from 'react-router-dom';
import {
    BookOpen,
    FileText,
    Layers,
    Loader2,
    Mic,
    NotebookText,
    Sparkles,
} from 'lucide-react';
import { useTranslation } from '@/i18n';
import {
    usePaperDerivedArtifacts,
    type PaperDerivedArtifact,
} from '@/hooks/exegesis/usePaperDerivedArtifacts';
import type { DerivedArtifactKind } from '@dosfilos/application';

/**
 * Sidebar card that aggregates every artifact derived from the paper:
 * sermons created via "Generar sermón", and extractions saved from the
 * academic / ministry composition dialogs. Each row links to the
 * artifact's native surface (sermons → wizard, extractions → Mis
 * Recursos editor).
 *
 * Self-hides the empty state behind a quiet placeholder rather than
 * vanishing — the user benefits from seeing the panel exists ("there
 * IS a place where everything from this paper lives") even when no
 * artifacts have been generated yet.
 */
export function PaperDerivedArtifactsPanel({ paperId }: { paperId: string }) {
    const { t } = useTranslation('exegesis');
    const { data: artifacts, isLoading } = usePaperDerivedArtifacts(paperId);

    return (
        <section className="rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
            <header className="flex items-center gap-2 mb-3">
                <Layers className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                    {t('detail.derived.title')}
                </h3>
                {artifacts && artifacts.length > 0 && (
                    <span className="ml-auto text-[11px] font-medium text-slate-500 dark:text-slate-400">
                        {artifacts.length}
                    </span>
                )}
            </header>

            {isLoading ? (
                <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    <span>{t('detail.derived.loading')}</span>
                </div>
            ) : !artifacts || artifacts.length === 0 ? (
                <p className="text-xs text-slate-500 dark:text-slate-400 italic">
                    {t('detail.derived.empty')}
                </p>
            ) : (
                <ul className="space-y-1.5">
                    {artifacts.map(a => (
                        <ArtifactRow key={`${a.kind}:${a.id}`} artifact={a} />
                    ))}
                </ul>
            )}
        </section>
    );
}

function ArtifactRow({ artifact }: { artifact: PaperDerivedArtifact }) {
    const { t } = useTranslation('exegesis');
    return (
        <li>
            <Link
                to={artifact.openUrl}
                className="group flex items-start gap-2 rounded-md border border-slate-100 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900/60 px-2.5 py-2 hover:border-emerald-300 dark:hover:border-emerald-800/60 transition-colors"
            >
                <KindIcon kind={artifact.kind} />
                <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-slate-800 dark:text-slate-100 truncate group-hover:text-emerald-700 dark:group-hover:text-emerald-300">
                        {artifact.title}
                    </p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">
                        {t(`detail.derived.kind.${artifact.kind}`)}
                        {artifact.isDraft ? ` · ${t('detail.derived.draftBadge')}` : ''}
                    </p>
                </div>
            </Link>
        </li>
    );
}

function KindIcon({ kind }: { kind: DerivedArtifactKind }) {
    const className = 'h-3.5 w-3.5 text-slate-400 mt-0.5 shrink-0';
    switch (kind) {
        case 'sermon':
            return <Mic className={className} />;
        case 'academic-paper':
            return <FileText className={className} />;
        case 'sermon-outline':
            return <NotebookText className={className} />;
        case 'devotional':
            return <Sparkles className={className} />;
        case 'study-guide':
            return <BookOpen className={className} />;
        default:
            return <FileText className={className} />;
    }
}
