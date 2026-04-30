import { useEffect, useRef, useState } from 'react';
import { Loader2, Upload, CheckCircle2, FileText, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/i18n';
import { useUserStyleGuides } from '@/hooks/exegesis/useUserStyleGuides';
import type { UserStyleGuide } from '@dosfilos/domain';

interface StyleGuideStepProps {
    /** The currently-selected guide for this paper. Null until the user picks one. */
    selectedGuideId: string | null;
    onSelect: (guideId: string | null) => void;
}

/**
 * Wizard step 2 — Style guide.
 *
 * Two modes:
 *   - List: when the user has at least one guide. Active guide is
 *     auto-selected initially; user can pick a different one or upload
 *     a new one. The active guide is also marked visually so the user
 *     knows what gets injected by default.
 *   - Upload-first: when the user has none, the inline upload form is
 *     shown directly. First-uploaded guide auto-activates.
 *
 * The upload uses the existing library pipeline (Firebase Storage +
 * LlamaParse extraction). The wizard does NOT block on extraction
 * completion — the orchestrator checks `textExtractionStatus` later
 * when it tries to inject the guide into a prompt.
 */
export function StyleGuideStep({ selectedGuideId, onSelect }: StyleGuideStepProps) {
    const { t } = useTranslation('exegesis');
    const { guides, activeGuide, isLoading, uploadGuide, setActive } = useUserStyleGuides();

    // Auto-select the active guide on first load. The parent owns the
    // value, so we only push a default — never override an explicit pick.
    useEffect(() => {
        if (!selectedGuideId && activeGuide) {
            onSelect(activeGuide.id);
        }
    }, [selectedGuideId, activeGuide, onSelect]);

    const [showUploadForm, setShowUploadForm] = useState(false);

    if (isLoading) {
        return (
            <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                <Loader2 className="h-4 w-4 animate-spin" />
                {t('setup.styleGuide.loading')}
            </div>
        );
    }

    const showUpload = guides.length === 0 || showUploadForm;

    return (
        <div className="space-y-3">
            {guides.length > 0 && (
                <ul className="space-y-2">
                    {guides.map(g => (
                        <GuideRow
                            key={g.id}
                            guide={g}
                            selected={selectedGuideId === g.id}
                            onSelect={() => onSelect(g.id)}
                            onSetActive={async () => {
                                try {
                                    await setActive.mutateAsync(g.id);
                                    toast.success(t('setup.styleGuide.toast.activated'));
                                } catch (err) {
                                    console.error('[exegesis] setActive failed:', err);
                                    toast.error(t('setup.styleGuide.toast.activateFailed'));
                                }
                            }}
                        />
                    ))}
                </ul>
            )}

            {showUpload ? (
                <UploadForm
                    isFirstGuide={guides.length === 0}
                    onUploaded={(guideId) => {
                        onSelect(guideId);
                        setShowUploadForm(false);
                    }}
                    onCancel={guides.length > 0 ? () => setShowUploadForm(false) : undefined}
                    upload={uploadGuide}
                />
            ) : (
                <button
                    type="button"
                    onClick={() => setShowUploadForm(true)}
                    className="inline-flex items-center gap-2 text-xs font-medium text-emerald-700 dark:text-emerald-300 hover:underline"
                >
                    <Upload className="h-3.5 w-3.5" />
                    {t('setup.styleGuide.uploadAnother')}
                </button>
            )}
        </div>
    );
}

function GuideRow({
    guide,
    selected,
    onSelect,
    onSetActive,
}: {
    guide: UserStyleGuide;
    selected: boolean;
    onSelect: () => void;
    onSetActive: () => void;
}) {
    const { t } = useTranslation('exegesis');
    return (
        <li>
            <div
                className={cn(
                    'flex items-center gap-3 rounded-lg border px-3 py-2.5 transition-colors',
                    selected
                        ? 'border-emerald-400 bg-emerald-50/60 dark:border-emerald-700 dark:bg-emerald-950/30'
                        : 'border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-slate-300 dark:hover:border-zinc-700'
                )}
            >
                <button
                    type="button"
                    onClick={onSelect}
                    className="flex-1 flex items-center gap-3 text-left min-w-0"
                >
                    <FileText className="h-4 w-4 shrink-0 text-slate-400" />
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">
                                {guide.displayName}
                            </span>
                            {guide.isActive && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300 uppercase tracking-wider">
                                    <CheckCircle2 className="h-3 w-3" />
                                    {t('setup.styleGuide.activeBadge')}
                                </span>
                            )}
                        </div>
                        {guide.version && (
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                                v{guide.version}
                            </p>
                        )}
                    </div>
                </button>
                {!guide.isActive && (
                    <button
                        type="button"
                        onClick={onSetActive}
                        className="text-[11px] font-medium text-slate-500 hover:text-emerald-700 dark:text-slate-400 dark:hover:text-emerald-300"
                    >
                        {t('setup.styleGuide.setActive')}
                    </button>
                )}
            </div>
        </li>
    );
}

interface UploadFormProps {
    isFirstGuide: boolean;
    onUploaded: (guideId: string) => void;
    onCancel?: () => void;
    upload: ReturnType<typeof useUserStyleGuides>['uploadGuide'];
}

function UploadForm({ isFirstGuide, onUploaded, onCancel, upload }: UploadFormProps) {
    const { t } = useTranslation('exegesis');
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [file, setFile] = useState<File | null>(null);
    const [displayName, setDisplayName] = useState('');
    const [version, setVersion] = useState('');
    const [progress, setProgress] = useState<number | null>(null);
    const isUploading = upload.isPending;
    const canSubmit = !!file && displayName.trim().length >= 3 && !isUploading;

    const handleFile = (f: File | null) => {
        setFile(f);
        if (f && !displayName) {
            // Auto-fill displayName from filename, stripping extension
            setDisplayName(f.name.replace(/\.[^/.]+$/, ''));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!canSubmit || !file) return;
        try {
            const guide = await upload.mutateAsync({
                file,
                displayName: displayName.trim(),
                version: version.trim() || undefined,
                setActive: isFirstGuide ? undefined : false,
                onProgress: (p) => setProgress(p),
            });
            toast.success(t('setup.styleGuide.toast.uploaded'));
            onUploaded(guide.id);
        } catch (err) {
            console.error('[exegesis] style guide upload failed:', err);
            toast.error(t('setup.styleGuide.toast.uploadFailed'));
        } finally {
            setProgress(null);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="rounded-lg border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900/40 p-4 space-y-3">
            <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    {t('setup.styleGuide.fileLabel')}
                </label>
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="application/pdf,.pdf,application/epub+zip,.epub"
                    onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
                    disabled={isUploading}
                    className="block w-full text-sm text-slate-700 dark:text-slate-200 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-medium file:bg-emerald-100 file:text-emerald-700 dark:file:bg-emerald-900/30 dark:file:text-emerald-300 hover:file:bg-emerald-200 dark:hover:file:bg-emerald-900/50"
                />
                {file && (
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                        {file.name} · {(file.size / 1024 / 1024).toFixed(1)} MB
                    </p>
                )}
            </div>

            <div className="grid grid-cols-2 gap-2">
                <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                        {t('setup.styleGuide.displayNameLabel')}
                    </label>
                    <input
                        type="text"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        disabled={isUploading}
                        placeholder={t('setup.styleGuide.displayNamePlaceholder')}
                        className="w-full rounded-md border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-2.5 py-1.5 text-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500"
                    />
                </div>
                <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                        {t('setup.styleGuide.versionLabel')}
                    </label>
                    <input
                        type="text"
                        value={version}
                        onChange={(e) => setVersion(e.target.value)}
                        disabled={isUploading}
                        placeholder={t('setup.styleGuide.versionPlaceholder')}
                        className="w-full rounded-md border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-2.5 py-1.5 text-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500"
                    />
                </div>
            </div>

            {isUploading && progress !== null && (
                <div className="text-xs text-slate-500 dark:text-slate-400 inline-flex items-center gap-2">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    {t('setup.styleGuide.uploading', { progress: Math.round(progress) })}
                </div>
            )}

            <div className="flex items-center gap-2 pt-1">
                <Button
                    type="submit"
                    disabled={!canSubmit}
                    className="bg-emerald-500 hover:bg-emerald-400 text-slate-900 disabled:opacity-50"
                >
                    {isUploading ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Upload className="h-4 w-4 mr-1.5" />}
                    {t('setup.styleGuide.uploadCta')}
                </Button>
                {onCancel && (
                    <Button type="button" variant="ghost" onClick={onCancel} disabled={isUploading}>
                        {t('setup.cancel')}
                    </Button>
                )}
            </div>

            <p className="text-[11px] text-slate-500 dark:text-slate-400 inline-flex items-start gap-1.5">
                <AlertCircle className="h-3 w-3 mt-0.5 shrink-0" />
                <span>{t('setup.styleGuide.extractionHint')}</span>
            </p>
        </form>
    );
}

