import { useRef, useState } from 'react';
import { Loader2, Upload, FileText, X, AlertCircle, BookOpenText } from 'lucide-react';
import { toast } from 'sonner';
import { libraryService } from '@dosfilos/application';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/i18n';
import { useFirebase } from '@/context/firebase-context';
import { CITABLE_SOURCE_ROLES, type ProjectSourceRole } from '@dosfilos/domain';

/**
 * A pending source in the wizard's local state — uploaded to the library
 * (so we have a `corpusId`) but not yet attached to a paper, because the
 * paper doesn't exist yet during setup. The wizard's create handler
 * walks this list after `createPaper` succeeds and calls `addSource`
 * for each one.
 *
 * If the user abandons the wizard, the underlying library_resources
 * remain in their library — they can clean them up there. v1 accepts
 * this orphan-on-abandon risk; a Cloud Function cleanup pass is future
 * work.
 */
export interface PendingSource {
    /** Generated client-side; just a UI key, NOT used as the eventual ProjectSource id. */
    localId: string;
    corpusId: string;
    role: ProjectSourceRole;
    displayLabel: string;
    citationKey: string;
    fileName: string;
    fileSizeBytes: number;
}

interface SourcesStepProps {
    sources: PendingSource[];
    onChange: (next: PendingSource[]) => void;
}

/**
 * Wizard step 3 — Project corpus.
 *
 * Drives a list of project-scoped sources. Each entry holds an already-
 * uploaded library_resource id (`corpusId`) plus its role, label and
 * optional citation key. Uploads happen inline as the user picks files,
 * so progress is visible per-file.
 *
 * Different from style guides:
 *   - Multiple sources per paper (vs one active guide per user).
 *   - Each source has a role tag that drives prompt instructions and
 *     citation discipline downstream.
 *   - Sources are project-scoped — they're attached to the paper but
 *     the underlying file lives in the user's library and CAN be reused
 *     elsewhere.
 */
export function SourcesStep({ sources, onChange }: SourcesStepProps) {
    const { t } = useTranslation('exegesis');
    const [showForm, setShowForm] = useState(sources.length === 0);

    const handleAdded = (s: PendingSource) => {
        onChange([...sources, s]);
        setShowForm(false);
    };

    const handleRemove = (localId: string) => {
        onChange(sources.filter(s => s.localId !== localId));
    };

    const handleEdit = (localId: string, patch: Partial<Pick<PendingSource, 'role' | 'displayLabel' | 'citationKey'>>) => {
        onChange(sources.map(s => (s.localId === localId ? { ...s, ...patch } : s)));
    };

    return (
        <div className="space-y-3">
            {sources.length > 0 && (
                <ul className="space-y-2">
                    {sources.map(s => (
                        <SourceRow
                            key={s.localId}
                            source={s}
                            onRemove={() => handleRemove(s.localId)}
                            onEdit={(patch) => handleEdit(s.localId, patch)}
                            t={t}
                        />
                    ))}
                </ul>
            )}

            {showForm ? (
                <UploadForm
                    onAdded={handleAdded}
                    onCancel={sources.length > 0 ? () => setShowForm(false) : undefined}
                />
            ) : (
                <button
                    type="button"
                    onClick={() => setShowForm(true)}
                    className="inline-flex items-center gap-2 text-xs font-medium text-emerald-700 dark:text-emerald-300 hover:underline"
                >
                    <Upload className="h-3.5 w-3.5" />
                    {t('setup.sources.addAnother')}
                </button>
            )}

            <p className="text-[11px] text-slate-500 dark:text-slate-400 inline-flex items-start gap-1.5">
                <AlertCircle className="h-3 w-3 mt-0.5 shrink-0" />
                <span>{t('setup.sources.scopeHint')}</span>
            </p>
        </div>
    );
}

interface SourceRowProps {
    source: PendingSource;
    onRemove: () => void;
    onEdit: (patch: Partial<Pick<PendingSource, 'role' | 'displayLabel' | 'citationKey'>>) => void;
    t: (key: string) => string;
}

function SourceRow({ source, onRemove, onEdit, t }: SourceRowProps) {
    const isCitable = CITABLE_SOURCE_ROLES.has(source.role);
    return (
        <li className="rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-3 space-y-2">
            <div className="flex items-start gap-2.5">
                <FileText className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">{source.displayLabel}</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                        {source.fileName} · {(source.fileSizeBytes / 1024 / 1024).toFixed(1)} MB
                    </p>
                </div>
                <button
                    type="button"
                    onClick={onRemove}
                    className="p-1 rounded text-slate-400 hover:text-rose-500 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
                    aria-label={t('setup.sources.remove')}
                    title={t('setup.sources.remove')}
                >
                    <X className="h-3.5 w-3.5" />
                </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-[1fr_120px] gap-2">
                <select
                    value={source.role}
                    onChange={(e) => onEdit({ role: e.target.value as ProjectSourceRole })}
                    className="rounded-md border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-2 py-1.5 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500"
                >
                    {ROLE_OPTIONS.map(r => (
                        <option key={r} value={r}>{t(`setup.sources.roles.${r}`)}</option>
                    ))}
                </select>
                <input
                    type="text"
                    value={source.citationKey}
                    onChange={(e) => onEdit({ citationKey: e.target.value })}
                    placeholder={t('setup.sources.citationKeyPlaceholder')}
                    disabled={!isCitable}
                    className="rounded-md border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-2 py-1.5 text-xs text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 disabled:opacity-50"
                />
            </div>
            {!isCitable && (
                <p className="text-[10px] text-amber-700 dark:text-amber-300 inline-flex items-center gap-1">
                    <BookOpenText className="h-3 w-3" />
                    {t('setup.sources.modelPaperHint')}
                </p>
            )}
        </li>
    );
}

const ROLE_OPTIONS: ProjectSourceRole[] = [
    'primary-commentary',
    'secondary-commentary',
    'lexicon',
    'critical-apparatus',
    'historical-context',
    'theological-context',
    'model-paper',
    'misc',
];

interface UploadFormProps {
    onAdded: (s: PendingSource) => void;
    onCancel?: () => void;
}

function UploadForm({ onAdded, onCancel }: UploadFormProps) {
    const { t } = useTranslation('exegesis');
    const { user } = useFirebase();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [file, setFile] = useState<File | null>(null);
    const [displayName, setDisplayName] = useState('');
    const [role, setRole] = useState<ProjectSourceRole>('primary-commentary');
    const [citationKey, setCitationKey] = useState('');
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState<number | null>(null);

    const canSubmit = !!file && displayName.trim().length >= 3 && !!user?.uid && !uploading;

    const handleFile = (f: File | null) => {
        setFile(f);
        if (f && !displayName) {
            setDisplayName(f.name.replace(/\.[^/.]+$/, ''));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!canSubmit || !file || !user?.uid) return;
        setUploading(true);
        setProgress(0);
        try {
            // Upload through the library pipeline. Same `type: 'other'`
            // pragmatism as the style guide path — the relationship to the
            // paper is captured by the ProjectSource doc downstream.
            const resource = await libraryService.uploadResource(
                user.uid,
                file,
                {
                    title: displayName.trim(),
                    author: '',
                    type: 'other',
                },
                (p) => setProgress(p)
            );

            onAdded({
                localId: crypto.randomUUID(),
                corpusId: resource.id,
                role,
                displayLabel: displayName.trim(),
                citationKey: citationKey.trim(),
                fileName: file.name,
                fileSizeBytes: file.size,
            });

            // Reset for "add another" repeat use.
            setFile(null);
            setDisplayName('');
            setCitationKey('');
            setRole('primary-commentary');
            if (fileInputRef.current) fileInputRef.current.value = '';
            toast.success(t('setup.sources.toast.uploaded'));
        } catch (err) {
            console.error('[exegesis] source upload failed:', err);
            toast.error(t('setup.sources.toast.uploadFailed'));
        } finally {
            setUploading(false);
            setProgress(null);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="rounded-lg border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900/40 p-4 space-y-3">
            <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    {t('setup.sources.fileLabel')}
                </label>
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="application/pdf,.pdf,application/epub+zip,.epub"
                    onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
                    disabled={uploading}
                    className="block w-full text-sm text-slate-700 dark:text-slate-200 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-medium file:bg-emerald-100 file:text-emerald-700 dark:file:bg-emerald-900/30 dark:file:text-emerald-300 hover:file:bg-emerald-200 dark:hover:file:bg-emerald-900/50"
                />
                {file && (
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                        {file.name} · {(file.size / 1024 / 1024).toFixed(1)} MB
                    </p>
                )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-[1fr_180px] gap-2">
                <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                        {t('setup.sources.displayNameLabel')}
                    </label>
                    <input
                        type="text"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        disabled={uploading}
                        placeholder={t('setup.sources.displayNamePlaceholder')}
                        className="w-full rounded-md border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-2.5 py-1.5 text-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500"
                    />
                </div>
                <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                        {t('setup.sources.roleLabel')}
                    </label>
                    <select
                        value={role}
                        onChange={(e) => setRole(e.target.value as ProjectSourceRole)}
                        disabled={uploading}
                        className="w-full rounded-md border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-2.5 py-1.5 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500"
                    >
                        {ROLE_OPTIONS.map(r => (
                            <option key={r} value={r}>{t(`setup.sources.roles.${r}`)}</option>
                        ))}
                    </select>
                </div>
            </div>

            {CITABLE_SOURCE_ROLES.has(role) && (
                <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                        {t('setup.sources.citationKeyLabel')}
                    </label>
                    <input
                        type="text"
                        value={citationKey}
                        onChange={(e) => setCitationKey(e.target.value)}
                        disabled={uploading}
                        placeholder={t('setup.sources.citationKeyPlaceholder')}
                        className="w-full rounded-md border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-2.5 py-1.5 text-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500"
                    />
                </div>
            )}

            {uploading && progress !== null && (
                <div className="text-xs text-slate-500 dark:text-slate-400 inline-flex items-center gap-2">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    {t('setup.sources.uploading', { progress: Math.round(progress) })}
                </div>
            )}

            <div className="flex items-center gap-2 pt-1">
                <Button
                    type="submit"
                    disabled={!canSubmit}
                    className="bg-emerald-500 hover:bg-emerald-400 text-slate-900 disabled:opacity-50"
                >
                    {uploading ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Upload className="h-4 w-4 mr-1.5" />}
                    {t('setup.sources.uploadCta')}
                </Button>
                {onCancel && (
                    <Button type="button" variant="ghost" onClick={onCancel} disabled={uploading}>
                        {t('setup.cancel')}
                    </Button>
                )}
            </div>
        </form>
    );
}
