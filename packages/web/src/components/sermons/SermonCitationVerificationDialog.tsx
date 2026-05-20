import { AlertTriangle, CheckCircle2, ExternalLink, FileQuestion, Loader2 } from 'lucide-react';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useTranslation } from '@/i18n';
import type {
    SermonCitationStatus,
    VerifiedSermonCitation,
    VerifySermonCitationsOutput,
} from '@dosfilos/application';

interface SermonCitationVerificationDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    /** Verifier output. Null when verification is in flight. */
    result: VerifySermonCitationsOutput | null;
    /** True while the verifier is running (after publish click). */
    loading: boolean;
    /** User chose to publish anyway despite warnings. */
    onProceedAnyway: () => void;
    /** User chose to go back and edit before publishing. */
    onEditSermon: () => void;
}

/**
 * Pre-publish verification dialog. Surfaces author-attributed quotes
 * that could not be verified against the sermon's source material
 * (originating paper or Faculty conversation) so the pastor can
 * remove or correct fabricated citations before they reach the
 * pulpit.
 *
 * Three render modes:
 *   - Loading: spinner while verifier runs (~50 ms typical).
 *   - All clean: green "todo verificado" + "Publicar ahora" CTA.
 *   - Has issues: lists each questionable citation with verdict
 *     badge + explanation. Two CTAs: "Editar sermón" (recommended)
 *     vs "Publicar de todos modos" (proceed with explicit consent).
 *
 * When the sermon has no source corpus (standalone wizard sermon
 * with no paper / Faculty origin), the dialog shows an "unavailable"
 * notice instead of false confidence — the user knows verification
 * couldn't run and decides whether to publish without it.
 */
export function SermonCitationVerificationDialog({
    open,
    onOpenChange,
    result,
    loading,
    onProceedAnyway,
    onEditSermon,
}: SermonCitationVerificationDialogProps) {
    const { t } = useTranslation('generator');

    const hasIssues = !!result && result.citations.some(
        (c) => c.status === 'not-found' || c.status === 'fuzzy-low',
    );
    const allClean = !!result && result.citations.length > 0 && !hasIssues;
    const noCitations = !!result && result.citations.length === 0;
    const sourceUnavailable = !!result && result.sourceKind === null;

    return (
        <AlertDialog open={open} onOpenChange={onOpenChange}>
            <AlertDialogContent className="max-w-2xl">
                <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2">
                        {loading ? (
                            <>
                                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                                {t('citationVerification.titleVerifying')}
                            </>
                        ) : hasIssues ? (
                            <>
                                <AlertTriangle className="h-5 w-5 text-amber-600" />
                                {t('citationVerification.titleIssues')}
                            </>
                        ) : sourceUnavailable ? (
                            <>
                                <FileQuestion className="h-5 w-5 text-muted-foreground" />
                                {t('citationVerification.titleUnavailable')}
                            </>
                        ) : (
                            <>
                                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                                {t('citationVerification.titleClean')}
                            </>
                        )}
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                        {loading
                            ? t('citationVerification.descVerifying')
                            : sourceUnavailable
                                ? t('citationVerification.descUnavailable')
                                : noCitations
                                    ? t('citationVerification.descNoCitations')
                                    : hasIssues
                                        ? t('citationVerification.descIssues', { count: countIssues(result!.citations) })
                                        : t('citationVerification.descClean', { count: result!.citations.length })}
                    </AlertDialogDescription>
                </AlertDialogHeader>

                {!loading && hasIssues && result && (
                    <div className="max-h-[50vh] overflow-y-auto space-y-2 my-3">
                        {result.citations
                            .filter((c) => c.status !== 'verified')
                            .map((c, idx) => (
                                <CitationRow key={`${c.citation.offset}-${idx}`} citation={c} />
                            ))}
                    </div>
                )}

                {!loading && allClean && result && (
                    <div className="rounded-md border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/60 dark:bg-emerald-950/20 px-3 py-2 my-2 text-sm text-emerald-800 dark:text-emerald-200">
                        ✓ {t('citationVerification.allCleanDetail', { count: result.citations.length })}
                    </div>
                )}

                <AlertDialogFooter>
                    {loading ? null : hasIssues ? (
                        <>
                            <AlertDialogCancel onClick={onEditSermon}>
                                {t('citationVerification.editSermon')}
                            </AlertDialogCancel>
                            <AlertDialogAction
                                onClick={onProceedAnyway}
                                className="bg-amber-600 hover:bg-amber-700"
                            >
                                {t('citationVerification.publishAnyway')}
                            </AlertDialogAction>
                        </>
                    ) : (
                        <>
                            <AlertDialogCancel onClick={onEditSermon}>
                                {t('citationVerification.cancel')}
                            </AlertDialogCancel>
                            <AlertDialogAction
                                onClick={onProceedAnyway}
                                className="bg-emerald-600 hover:bg-emerald-700"
                            >
                                {t('citationVerification.publishNow')}
                            </AlertDialogAction>
                        </>
                    )}
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}

function CitationRow({ citation }: { citation: VerifiedSermonCitation }) {
    const { t } = useTranslation('generator');
    const statusStyles = STATUS_STYLES[citation.status];
    return (
        <div className={`rounded-md border px-3 py-2 ${statusStyles.container}`}>
            <div className="flex items-start gap-2 mb-1.5">
                <statusStyles.Icon className={`h-4 w-4 mt-0.5 shrink-0 ${statusStyles.iconColor}`} />
                <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-foreground">
                        {t(`citationVerification.status.${citation.status}`)}
                        <span className="ml-2 text-muted-foreground font-normal">
                            — {citation.citation.author}
                        </span>
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground italic line-clamp-2">
                        "{citation.citation.quote}"
                    </p>
                </div>
            </div>
            <p className="text-xs text-foreground/80 pl-6">{citation.note}</p>
        </div>
    );
}

const STATUS_STYLES: Record<SermonCitationStatus, { container: string; iconColor: string; Icon: typeof AlertTriangle }> = {
    verified: {
        container: 'border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/60 dark:bg-emerald-950/20',
        iconColor: 'text-emerald-600 dark:text-emerald-400',
        Icon: CheckCircle2,
    },
    'fuzzy-low': {
        container: 'border-amber-200 dark:border-amber-800/60 bg-amber-50/60 dark:bg-amber-950/20',
        iconColor: 'text-amber-600 dark:text-amber-400',
        Icon: AlertTriangle,
    },
    'not-found': {
        container: 'border-rose-200 dark:border-rose-800/60 bg-rose-50/60 dark:bg-rose-950/20',
        iconColor: 'text-rose-600 dark:text-rose-400',
        Icon: ExternalLink,
    },
};

function countIssues(citations: VerifiedSermonCitation[]): number {
    return citations.filter((c) => c.status === 'not-found' || c.status === 'fuzzy-low').length;
}
