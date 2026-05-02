import { LibraryResourceEntity, LibraryCategory, WorkflowPhase } from '@dosfilos/domain';
import { useTranslation } from '@/i18n';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Book, FileText, MessageSquare, Languages, FileQuestion,
    Trash2, Edit2, Loader2, CheckCircle2, AlertCircle, Eye,
    BookOpen, Mic2, Library, PenTool, Settings2, RefreshCw,
    MoreHorizontal, Sparkles, Wand2, FileWarning,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type IndexStatus = 'unknown' | 'indexed' | 'not-indexed' | 'checking';
type ViewMode = 'grid' | 'list';

interface ResourceCardProps {
    resource: LibraryResourceEntity;
    categories: LibraryCategory[];
    indexStatus: IndexStatus;
    isIndexing: boolean;
    viewMode?: ViewMode;
    onEdit: () => void;
    onDelete: () => void;
    onIndex: () => void;
    onReindex?: () => void;
    onPreview: () => void;
    onSetPhases?: () => void;
    onConfigureCoreStores?: () => void; // Admin: assigns the resource to Core Library stores
}

// Icon mapping for category icons
const iconMap: Record<string, typeof Book> = {
    Book,
    Languages,
    MessageSquare,
    FileText,
    FileQuestion,
};

// ── Category icon palette (data-driven decoration) ─────────────────────────
// `LibraryCategory.color` is a user/admin-defined preset (one of: blue, purple,
// green, orange, red, yellow, pink, gray). Each maps to a soft icon background.
//
// DOCUMENTED EXCEPTION to the no-literals theming rule: this is an explicit
// **data palette** (a preset enum exposed to authors), NOT a theme token.
// Notion, Linear and similar tools expose the same kind of fixed colour
// palette for content tagging. We intentionally keep the Tailwind palette
// here (lower saturation `-50/600/950` levels) because:
//   - The category colour IS the visual identity of each category type
//   - Adding 8 semantic tokens (`category-blue`, `category-pink`...) bloats
//     the design system without semantic gain — they're just colour presets
//   - Centralised here in one place rather than scattered as ad-hoc literals
const colorMap: Record<string, string> = {
    blue: 'text-blue-600 bg-blue-50 dark:bg-blue-950/30',
    purple: 'text-purple-600 bg-purple-50 dark:bg-purple-950/30',
    green: 'text-green-600 bg-green-50 dark:bg-green-950/30',
    orange: 'text-orange-600 bg-orange-50 dark:bg-orange-950/30',
    red: 'text-red-600 bg-red-50 dark:bg-red-950/30',
    yellow: 'text-yellow-600 bg-yellow-50 dark:bg-yellow-950/30',
    pink: 'text-pink-600 bg-pink-50 dark:bg-pink-950/30',
    gray: 'text-gray-600 bg-gray-50 dark:bg-gray-900/40',
};

// Phase + Store visual metadata — labels translated at render time via i18n,
// brand colours sourced from `phase-*` semantic tokens (see tailwind.config).
const PHASE_META = {
    [WorkflowPhase.EXEGESIS]: { icon: BookOpen, i18nKey: 'exegesis' as const, color: 'text-phase-exegesis' },
    [WorkflowPhase.HOMILETICS]: { icon: Mic2, i18nKey: 'homiletics' as const, color: 'text-phase-homiletics' },
    [WorkflowPhase.DRAFTING]: { icon: PenTool, i18nKey: 'drafting' as const, color: 'text-phase-drafting' },
} as const;

// Store badge tones — same semantic token system + foreground for legibility on
// the soft background. `/15` opacity yields a tinted chip; foreground stays
// consistent across light/dark via the token system.
const STORE_META = {
    exegesis: { icon: BookOpen, i18nKey: 'exegesis' as const, tone: 'bg-phase-exegesis/15 text-phase-exegesis' },
    homiletics: { icon: Mic2, i18nKey: 'homiletics' as const, tone: 'bg-phase-homiletics/15 text-phase-homiletics' },
    generic: { icon: Library, i18nKey: 'generic' as const, tone: 'bg-phase-generic/15 text-phase-generic' },
} as const;

export function ResourceCard({
    resource,
    categories,
    indexStatus,
    isIndexing,
    viewMode = 'grid',
    onEdit,
    onDelete,
    onIndex,
    onReindex,
    onPreview,
    onSetPhases,
    onConfigureCoreStores,
}: ResourceCardProps) {
    const { t } = useTranslation('library');
    const category = categories.find(c => c.id === resource.type);
    // Category label comes from the user's category definitions which already
    // store localised display strings — no need to translate here.
    const label = category?.label || t('editModal.categoryOptions.other');
    const colorClasses = colorMap[category?.color || 'gray'] || colorMap.gray;
    const Icon = iconMap[category?.icon || 'FileQuestion'] || FileQuestion;
    const fileSizeMB = (resource.sizeBytes / (1024 * 1024)).toFixed(2);
    const pageCount = resource.pageCount || resource.metadata?.pageCount;
    const isProcessing = resource.textExtractionStatus === 'processing' || resource.textExtractionStatus === 'pending';

    // ── Status pill: a single source of truth combining extraction + indexing.
    // User-facing wording avoids the technical "indexar" verb in favour of a
    // simple ready/pending model. The underlying action is the same vector
    // chunking pipeline, but the user just needs to know whether the resource
    // is ready to be searched / cited from a project.
    const statusPill = (() => {
        switch (resource.textExtractionStatus) {
            case 'pending':
                return { tone: 'bg-muted text-muted-foreground', icon: Loader2, iconClass: '', text: t('status.pending') };
            case 'processing':
                return { tone: 'bg-info-subtle text-info-subtle-foreground', icon: Loader2, iconClass: 'animate-spin', text: t('status.processing') };
            case 'failed':
                return { tone: 'bg-destructive/10 text-destructive', icon: AlertCircle, iconClass: '', text: t('status.failed') };
            case 'ready':
            default:
                if (indexStatus === 'checking') return { tone: 'bg-muted text-muted-foreground', icon: Loader2, iconClass: 'animate-spin', text: t('status.verifying') };
                if (indexStatus === 'indexed') return { tone: 'bg-success-subtle text-success-subtle-foreground', icon: CheckCircle2, iconClass: '', text: t('status.ready') };
                if (indexStatus === 'not-indexed') return { tone: 'bg-warning-subtle text-warning-subtle-foreground', icon: AlertCircle, iconClass: '', text: t('status.notReady') };
                return null;
        }
    })();

    const StatusIcon = statusPill?.icon;

    // ── Inline action buttons (visible) — kept to a max of three per card so the
    //    visual weight of each card stays controlled. The overflow menu below
    //    holds the rest.
    const inlineActions = (
        <>
            <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                onClick={onPreview}
                title={t('card.actions.preview')}
            >
                <Eye className="h-4 w-4" />
            </Button>
            <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                onClick={onEdit}
                title={t('card.actions.edit')}
            >
                <Edit2 className="h-4 w-4" />
            </Button>
            {indexStatus === 'indexed' && onReindex ? (
                <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-muted-foreground hover:text-primary"
                    onClick={onReindex}
                    disabled={isIndexing}
                    title={t('card.actions.reprocess')}
                >
                    {isIndexing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                </Button>
            ) : indexStatus === 'not-indexed' && resource.textExtractionStatus === 'ready' ? (
                <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-warning-subtle-foreground hover:text-warning"
                    onClick={onIndex}
                    disabled={isIndexing}
                    title={t('card.actions.process')}
                >
                    {isIndexing ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                </Button>
            ) : null}
        </>
    );

    // ── Overflow menu: secondary actions. Items are gated on resource state +
    //    admin context; if no items remain visible, the trigger is hidden.
    const hasPhasesAction = onSetPhases && indexStatus === 'indexed';
    const hasCoreStoresAction = !!onConfigureCoreStores;
    const showOverflow = hasPhasesAction || hasCoreStoresAction || true; // delete always available

    const overflowMenu = showOverflow ? (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                    title={t('card.actions.moreActions')}
                >
                    <MoreHorizontal className="h-4 w-4" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
                {hasPhasesAction && (
                    <DropdownMenuItem onClick={onSetPhases} className="cursor-pointer">
                        <Settings2 className="h-4 w-4 mr-2" />
                        {t('card.actions.configurePhases')}
                    </DropdownMenuItem>
                )}
                {hasCoreStoresAction && (
                    <DropdownMenuItem onClick={onConfigureCoreStores} className="cursor-pointer">
                        <Library className="h-4 w-4 mr-2" />
                        {t('card.actions.assignToCore')}
                    </DropdownMenuItem>
                )}
                {(hasPhasesAction || hasCoreStoresAction) && <DropdownMenuSeparator />}
                <DropdownMenuItem
                    onClick={onDelete}
                    className="cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10"
                >
                    <Trash2 className="h-4 w-4 mr-2" />
                    {t('card.actions.delete')}
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    ) : null;

    // ── Status / metadata badges shared between layouts
    const statusBadge = statusPill && StatusIcon ? (
        <span className={cn('inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full font-medium', statusPill.tone)}>
            <StatusIcon className={cn('h-3 w-3', statusPill.iconClass)} />
            {statusPill.text}
        </span>
    ) : null;

    // Engine badge — surfaces which extractor produced the text
    // (LlamaParse premium, Gemini standard, or pdf-parse fallback). Only
    // shown once extraction is `ready`; pre-ready the user only needs to
    // see "processing", and the extractor isn't decided yet anyway.
    const enginePill = (() => {
        if (resource.textExtractionStatus !== 'ready') return null;
        switch (resource.extractionVersion) {
            case '3.0-llamaparse':
                return {
                    tone: 'bg-success-subtle text-success-subtle-foreground border border-success/30',
                    icon: Sparkles,
                    text: t('engine.llamaparse'),
                    title: t('engine.llamaparseHint'),
                };
            case '4.0-gemini-standard':
            case '2.0-gemini':
                return {
                    tone: 'bg-info-subtle text-info-subtle-foreground border border-info/30',
                    icon: Wand2,
                    text: t('engine.gemini'),
                    title: t('engine.geminiHint'),
                };
            case 'fallback-pdfparse':
                return {
                    tone: 'bg-warning-subtle text-warning-subtle-foreground border border-warning/30',
                    icon: FileWarning,
                    text: t('engine.pdfparse'),
                    title: t('engine.pdfparseHint'),
                };
            default:
                return null;
        }
    })();
    const EngineIcon = enginePill?.icon;
    const engineBadge = enginePill && EngineIcon ? (
        <span
            className={cn('inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full font-medium', enginePill.tone)}
            title={enginePill.title}
        >
            <EngineIcon className="h-2.5 w-2.5" />
            {enginePill.text}
        </span>
    ) : null;

    const coreStoreBadges = resource.coreStores && resource.coreStores.length > 0 ? (
        <>
            {(resource.coreStores as Array<keyof typeof STORE_META>).map(key => {
                const meta = STORE_META[key];
                if (!meta) return null;
                const StoreIcon = meta.icon;
                const storeLabel = t(`stores.${meta.i18nKey}`);
                return (
                    <span
                        key={key}
                        className={cn('inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full font-medium', meta.tone)}
                        title={t(`stores.${meta.i18nKey}Title`)}
                    >
                        <StoreIcon className="h-3 w-3" />
                        {storeLabel}
                    </span>
                );
            })}
        </>
    ) : null;

    const phaseBadges = resource.preferredForPhases && resource.preferredForPhases.length > 0 ? (
        <>
            {resource.preferredForPhases.map(phase => {
                const meta = PHASE_META[phase];
                if (!meta) return null;
                const PhaseIcon = meta.icon;
                return (
                    <span
                        key={phase}
                        className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border border-border/60 text-muted-foreground"
                    >
                        <PhaseIcon className={cn('h-3 w-3', meta.color)} />
                        {t(`phases.${meta.i18nKey}`)}
                    </span>
                );
            })}
        </>
    ) : null;

    // ── List layout: dense horizontal row, optimized for scanning many resources
    if (viewMode === 'list') {
        return (
            <article
                className={cn(
                    'group bg-card border border-border/60 rounded-xl px-4 py-3 transition-colors hover:border-foreground/30',
                    isProcessing && 'border-info/70'
                )}
            >
                <div className="flex items-center gap-4">
                    <div className={cn('h-10 w-10 rounded-lg flex items-center justify-center shrink-0', colorClasses)}>
                        <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-2 flex-wrap">
                            <h3 className="font-medium text-[14px] text-foreground truncate">{resource.title}</h3>
                            <span className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground shrink-0">{label}</span>
                        </div>
                        <div className="text-[12.5px] text-muted-foreground truncate">
                            {resource.author}
                            <span className="mx-1.5 text-border">·</span>
                            {fileSizeMB} MB
                            <span className="mx-1.5 text-border">·</span>
                            {pageCount
                                ? t('card.metaPagesActual', { count: pageCount })
                                : t('card.metaPagesEstimated', { count: Math.ceil(resource.sizeBytes / 2000) })}
                        </div>
                    </div>
                    <div className="hidden md:flex items-center gap-1.5 flex-wrap justify-end max-w-[40%]">
                        {statusBadge}
                        {engineBadge}
                        {coreStoreBadges}
                        {phaseBadges}
                    </div>
                    <div className="flex items-center gap-0.5 shrink-0">
                        {inlineActions}
                        {overflowMenu}
                    </div>
                </div>
            </article>
        );
    }

    // ── Grid layout: card with clear hierarchy — icon → title → meta → actions
    return (
        <article
            className={cn(
                'group bg-card border border-border/60 rounded-xl p-4 flex flex-col gap-3 transition-colors hover:border-foreground/30',
                isProcessing && 'border-info/70'
            )}
        >
            {/* Header: category icon + label */}
            <div className="flex items-start justify-between gap-2">
                <div className={cn('h-10 w-10 rounded-lg flex items-center justify-center shrink-0', colorClasses)}>
                    <Icon className="h-5 w-5" />
                </div>
                <span className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground font-medium pt-1">
                    {label}
                </span>
            </div>

            {/* Title + author */}
            <div className="space-y-0.5 flex-1 min-h-0">
                <h3 className="font-medium text-[14px] leading-snug text-foreground line-clamp-2">
                    {resource.title}
                </h3>
                <p className="text-[12.5px] text-muted-foreground truncate">
                    {resource.author}
                </p>
            </div>

            {/* Status + assignment badges (single row, wraps if needed) */}
            {(statusBadge || engineBadge || coreStoreBadges || phaseBadges) && (
                <div className="flex items-center gap-1.5 flex-wrap">
                    {statusBadge}
                    {engineBadge}
                    {coreStoreBadges}
                    {phaseBadges}
                </div>
            )}

            {/* Meta: size + page count, single line, mono for numeric anchor */}
            <div className="text-[12px] text-muted-foreground font-mono">
                {fileSizeMB} MB
                <span className="mx-1.5 text-border">·</span>
                {pageCount
                    ? t('card.metaPagesActual', { count: pageCount })
                    : t('card.metaPagesEstimated', { count: Math.ceil(resource.sizeBytes / 2000) })}
            </div>

            {/* Action bar */}
            <div className="flex items-center gap-0.5 pt-1 border-t border-border/40 -mx-1 px-1">
                {inlineActions}
                <span className="ml-auto" />
                {overflowMenu}
            </div>
        </article>
    );
}
