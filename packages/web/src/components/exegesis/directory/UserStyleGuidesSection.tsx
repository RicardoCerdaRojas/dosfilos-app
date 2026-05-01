import { useRef, useState } from 'react';
import { BookOpen, CheckCircle2, Trash2, Loader2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/i18n';
import { useFirebase } from '@/context/firebase-context';
import { useUserStyleGuides } from '@/hooks/exegesis/useUserStyleGuides';
import type { UserStyleGuide } from '@dosfilos/domain';

/**
 * Directory section listing the user's style guides + inline upload
 * form.
 *
 * Style guides are referenced LIVE by papers (paper.styleGuideId →
 * userStyleGuides/{id}). Editing the guide → all papers using it
 * pick up the new mechanics. Setting a different guide as active
 * makes new papers default to it; existing papers keep whichever
 * guide id they were created with until manually re-pinned.
 *
 * Upload is collapsed behind a CTA button to keep the directory
 * page tidy when the user already has a guide. Same flow as the
 * deleted Phase-2 wizard's StyleGuideStep — file → libraryService
 * upload → userStyleGuides doc create.
 */
export function UserStyleGuidesSection() {
    const { t } = useTranslation('exegesis');
    const { guides, isLoading, uploadGuide, setActive, deleteGuide } = useUserStyleGuides();
    const [showUploadForm, setShowUploadForm] = useState(false);

    const handleSetActive = async (guideId: string) => {
        try {
            await setActive.mutateAsync(guideId);
            toast.success(t('directory.styleGuides.toast.activated'));
        } catch (err) {
            console.error('[exegesis] activate guide failed:', err);
            toast.error(t('directory.styleGuides.toast.activateFailed'));
        }
    };

    const handleDelete = async (guide: UserStyleGuide) => {
        if (!window.confirm(t('directory.styleGuides.deleteConfirm', { name: guide.displayName }))) return;
        try {
            await deleteGuide.mutateAsync(guide.id);
            toast.success(t('directory.styleGuides.toast.deleted'));
        } catch (err) {
            console.error('[exegesis] delete guide failed:', err);
            toast.error(t('directory.styleGuides.toast.deleteFailed'));
        }
    };

    return (
        <section className="rounded-2xl border border-border bg-card p-4">
            <header className="flex items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2 min-w-0">
                    <BookOpen className="h-4 w-4 text-success shrink-0" />
                    <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground truncate">
                        {t('directory.styleGuides.title')}
                    </h2>
                </div>
                {!isLoading && guides.length > 0 && (
                    <button
                        type="button"
                        onClick={() => setShowUploadForm(s => !s)}
                        className="text-[11px] text-muted-foreground hover:text-foreground inline-flex items-center gap-0.5"
                        title={showUploadForm ? t('setup.cancel') : t('directory.styleGuides.uploadAnother')}
                    >
                        <Upload className="h-3 w-3" />
                    </button>
                )}
            </header>

            {isLoading ? (
                <div className="rounded-lg border border-dashed border-border bg-muted/30 px-4 py-5 text-center text-xs text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin mx-auto mb-1.5 text-success" />
                    {t('directory.styleGuides.loading')}
                </div>
            ) : guides.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border bg-muted/30 px-4 py-5 text-center">
                    <h3 className="text-xs font-semibold text-foreground mb-1">
                        {t('directory.styleGuides.empty.title')}
                    </h3>
                    <p className="text-[11px] text-muted-foreground mx-auto mb-3 leading-snug">
                        {t('directory.styleGuides.empty.body')}
                    </p>
                    <Button
                        type="button"
                        onClick={() => setShowUploadForm(true)}
                        size="sm"
                        className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs h-7"
                    >
                        <Upload className="h-3 w-3 mr-1" />
                        {t('directory.styleGuides.uploadCta')}
                    </Button>
                </div>
            ) : (
                <ul className="space-y-1.5">
                    {guides.map(g => (
                        <li
                            key={g.id}
                            className="rounded-lg border border-border bg-background px-2.5 py-2 flex items-center gap-2"
                        >
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5">
                                    <h3 className="text-xs font-semibold text-foreground truncate">
                                        {g.displayName}
                                    </h3>
                                    {g.isActive && (
                                        <CheckCircle2 className="h-3 w-3 text-success shrink-0" aria-label={t('directory.styleGuides.activeBadge')} />
                                    )}
                                </div>
                                <p className="text-[10px] text-muted-foreground truncate">
                                    {g.version ? `v${g.version} · ` : ''}
                                    {g.manifest
                                        ? t('directory.styleGuides.manifestExtracted')
                                        : t('directory.styleGuides.manifestPending')}
                                </p>
                            </div>
                            <div className="flex items-center gap-0.5 shrink-0">
                                {!g.isActive && (
                                    <button
                                        type="button"
                                        onClick={() => handleSetActive(g.id)}
                                        disabled={setActive.isPending}
                                        className="p-1 rounded text-muted-foreground hover:text-success hover:bg-accent disabled:opacity-50"
                                        title={t('directory.styleGuides.setActive')}
                                        aria-label={t('directory.styleGuides.setActive')}
                                    >
                                        <CheckCircle2 className="h-3 w-3" />
                                    </button>
                                )}
                                <button
                                    type="button"
                                    onClick={() => handleDelete(g)}
                                    disabled={deleteGuide.isPending}
                                    className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-accent disabled:opacity-50"
                                    title={t('directory.styleGuides.delete')}
                                    aria-label={t('directory.styleGuides.delete')}
                                >
                                    <Trash2 className="h-3 w-3" />
                                </button>
                            </div>
                        </li>
                    ))}
                </ul>
            )}

            {showUploadForm && (
                <div className="mt-3">
                    <UploadGuideForm
                        onUploaded={() => setShowUploadForm(false)}
                        firstGuide={guides.length === 0}
                        uploadGuide={uploadGuide}
                    />
                </div>
            )}
        </section>
    );
}

// ── Inline upload form ─────────────────────────────────────────────────

interface UploadGuideFormProps {
    onUploaded: () => void;
    firstGuide: boolean;
    uploadGuide: ReturnType<typeof useUserStyleGuides>['uploadGuide'];
}

function UploadGuideForm({ onUploaded, firstGuide, uploadGuide }: UploadGuideFormProps) {
    const { t } = useTranslation('exegesis');
    const { user } = useFirebase();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [file, setFile] = useState<File | null>(null);
    const [displayName, setDisplayName] = useState('');
    const [version, setVersion] = useState('');
    const [progress, setProgress] = useState<number | null>(null);
    const uploading = uploadGuide.isPending;
    const canSubmit = !!file && displayName.trim().length >= 3 && !!user?.uid && !uploading;

    const handleFile = (f: File | null) => {
        setFile(f);
        if (f && !displayName) {
            setDisplayName(f.name.replace(/\.[^/.]+$/, ''));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!canSubmit || !file) return;
        setProgress(0);
        try {
            await uploadGuide.mutateAsync({
                file,
                displayName: displayName.trim(),
                version: version.trim() || undefined,
                setActive: firstGuide,
                onProgress: (p) => setProgress(p),
            });
            toast.success(t('directory.styleGuides.toast.uploaded'));
            setFile(null);
            setDisplayName('');
            setVersion('');
            if (fileInputRef.current) fileInputRef.current.value = '';
            onUploaded();
        } catch (err) {
            console.error('[exegesis] upload guide failed:', err);
            toast.error(t('directory.styleGuides.toast.uploadFailed'));
        } finally {
            setProgress(null);
        }
    };

    return (
        <form
            onSubmit={handleSubmit}
            className="rounded-lg border border-border bg-muted/40 p-4 space-y-3"
        >
            <h3 className="text-sm font-semibold text-foreground">
                {t('directory.styleGuides.uploadTitle')}
            </h3>
            <div>
                <label className="block text-xs font-medium text-foreground mb-1">
                    {t('directory.styleGuides.fileLabel')}
                </label>
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="application/pdf,.pdf,application/epub+zip,.epub"
                    onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
                    disabled={uploading}
                    className="block w-full text-sm text-foreground file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-medium file:bg-success-subtle file:text-success-subtle-foreground hover:file:bg-success/20"
                />
                {file && (
                    <p className="text-[11px] text-muted-foreground mt-1">
                        {file.name} · {(file.size / 1024 / 1024).toFixed(1)} MB
                    </p>
                )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-[1fr_140px] gap-2">
                <div>
                    <label className="block text-xs font-medium text-foreground mb-1">
                        {t('directory.styleGuides.nameLabel')}
                    </label>
                    <input
                        type="text"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        disabled={uploading}
                        placeholder={t('directory.styleGuides.namePlaceholder')}
                        className="w-full rounded-md border border-border bg-card px-2.5 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
                    />
                </div>
                <div>
                    <label className="block text-xs font-medium text-foreground mb-1">
                        {t('directory.styleGuides.versionLabel')}
                    </label>
                    <input
                        type="text"
                        value={version}
                        onChange={(e) => setVersion(e.target.value)}
                        disabled={uploading}
                        placeholder={t('directory.styleGuides.versionPlaceholder')}
                        className="w-full rounded-md border border-border bg-card px-2.5 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
                    />
                </div>
            </div>
            {uploading && progress !== null && (
                <p className="text-xs text-muted-foreground">
                    {t('directory.styleGuides.uploading', { progress })}
                </p>
            )}
            <div className="flex justify-end">
                <Button
                    type="submit"
                    disabled={!canSubmit}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs"
                >
                    {uploading ? (
                        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                    ) : (
                        <Upload className="h-3 w-3 mr-1" />
                    )}
                    {t('directory.styleGuides.uploadSubmit')}
                </Button>
            </div>
        </form>
    );
}
