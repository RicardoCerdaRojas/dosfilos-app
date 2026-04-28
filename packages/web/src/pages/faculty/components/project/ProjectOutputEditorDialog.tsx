import { useState } from 'react';
import { ProjectOutput, ProjectOutputKind } from '@dosfilos/domain';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from '@/i18n';

const OUTPUT_KINDS: ProjectOutputKind[] = ['note', 'draft', 'outline', 'sermon'];

type EditorMode = 'create' | 'edit';

interface ProjectOutputEditorDialogProps {
    mode: EditorMode;
    /** Existing output (only set when `mode === 'edit'`). */
    output?: ProjectOutput;
    onClose: () => void;
    onCreate: (input: { kind: ProjectOutputKind; title: string; content: string }) => void;
    onUpdate: (input: { outputId: string; title?: string; content?: string; kind?: ProjectOutputKind }) => void;
    saving: boolean;
}

/**
 * Modal for creating or editing a project output (note / draft / outline /
 * sermon). Manages local form state; commits via the appropriate callback.
 *
 * Title-required validation is enforced inline (toast) before invoking the
 * callback, so consumers can rely on the input being non-empty.
 */
export function ProjectOutputEditorDialog({
    mode,
    output,
    onClose,
    onCreate,
    onUpdate,
    saving,
}: ProjectOutputEditorDialogProps) {
    const { t } = useTranslation('projects');
    const [title, setTitle] = useState(output?.title ?? '');
    const [content, setContent] = useState(output?.content ?? '');
    const [kind, setKind] = useState<ProjectOutputKind>(output?.kind ?? 'note');

    const handleSave = () => {
        if (!title.trim()) {
            toast.error(t('outputEditor.errorTitleRequired'));
            return;
        }
        if (mode === 'create') {
            onCreate({ kind, title, content });
        } else if (output) {
            onUpdate({ outputId: output.id, title, content, kind });
        }
    };

    return (
        <Dialog open onOpenChange={(o) => !o && onClose()}>
            <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>
                        {mode === 'create'
                            ? t('outputEditor.createTitle')
                            : t('outputEditor.editTitle')}
                    </DialogTitle>
                    <DialogDescription>{t('outputEditor.description')}</DialogDescription>
                </DialogHeader>

                <div className="grid sm:grid-cols-[1fr_180px] gap-3">
                    <div className="space-y-1.5">
                        <Label htmlFor="output-title">{t('outputEditor.fields.titleLabel')}</Label>
                        <Input
                            id="output-title"
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            placeholder={t('outputEditor.fields.titlePlaceholder')}
                        />
                    </div>
                    <div className="space-y-1.5">
                        <Label htmlFor="output-kind">{t('outputEditor.fields.kindLabel')}</Label>
                        <Select value={kind} onValueChange={(v: ProjectOutputKind) => setKind(v)}>
                            <SelectTrigger id="output-kind">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {OUTPUT_KINDS.map(k => (
                                    <SelectItem key={k} value={k}>
                                        {t(`outputEditor.kindOptions.${k}`)}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <div className="flex-1 flex flex-col space-y-1.5 min-h-0">
                    <Label htmlFor="output-content">{t('outputEditor.fields.contentLabel')}</Label>
                    <Textarea
                        id="output-content"
                        value={content}
                        onChange={e => setContent(e.target.value)}
                        placeholder={t('outputEditor.fields.contentPlaceholder')}
                        className="flex-1 min-h-[280px] font-mono text-[13px] leading-relaxed resize-none"
                    />
                    <div className="text-[11px] text-muted-foreground flex items-center gap-3">
                        <span className="font-mono">{content.length.toLocaleString()} chars</span>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={saving}>
                        {t('outputEditor.cancel')}
                    </Button>
                    <Button onClick={handleSave} disabled={saving || !title.trim()}>
                        {saving && <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" />}
                        {saving ? t('outputEditor.saving') : t('outputEditor.save')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
