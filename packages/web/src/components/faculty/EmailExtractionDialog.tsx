import { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Mail, Loader2 } from 'lucide-react';
import { extractionShareService } from '@dosfilos/application';
import { useTranslation } from '@/i18n';
import { toast } from 'sonner';
import { track } from '@/lib/analytics/track';
import type { Extraction } from '@dosfilos/domain';

interface EmailExtractionDialogProps {
    extraction: Extraction | null;
    onClose: () => void;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_RECIPIENTS = 50;

/**
 * Modal that lets the pastor email any persisted Extraction to a list
 * of recipients. v1: ad-hoc addresses (comma/newline separated). v2
 * will plug saved audiences.
 *
 * The send is server-validated (ownership, rate limit, email shape).
 * UI parses the recipients string client-side too so we can surface
 * counts + invalid entries before the network round-trip.
 */
export function EmailExtractionDialog({ extraction, onClose }: EmailExtractionDialogProps) {
    const { t } = useTranslation('faculty');
    const [recipientsRaw, setRecipientsRaw] = useState('');
    const [subject, setSubject] = useState('');
    const [note, setNote] = useState('');
    const [sending, setSending] = useState(false);

    if (!extraction) return null;

    const parsedRecipients = recipientsRaw
        .split(/[\s,;]+/)
        .map(r => r.trim().toLowerCase())
        .filter(Boolean);
    const validRecipients = parsedRecipients.filter(r => EMAIL_RE.test(r));
    const invalidRecipients = parsedRecipients.filter(r => !EMAIL_RE.test(r));

    const canSend = validRecipients.length > 0
        && validRecipients.length <= MAX_RECIPIENTS
        && invalidRecipients.length === 0
        && !sending;

    const handleSend = async () => {
        setSending(true);
        try {
            const result = await extractionShareService.sendByEmail({
                extractionId: extraction.id,
                recipients: validRecipients,
                subject: subject.trim() || undefined,
                senderNote: note.trim() || undefined,
            });
            track('faculty_artifact_emailed', {
                type: extraction.type,
                recipientCount: result.sent,
                failureCount: result.failures,
            });
            if (result.failures > 0) {
                toast.warning(t('emailDialog.partialSuccess', {
                    sent: result.sent,
                    failed: result.failures,
                }));
            } else {
                toast.success(t('emailDialog.success', { count: result.sent }));
            }
            onClose();
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            toast.error(t('emailDialog.error', { message: msg }));
        } finally {
            setSending(false);
        }
    };

    return (
        <Dialog open={!!extraction} onOpenChange={open => !open && onClose()}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-amber-600" />
                        {t('emailDialog.title')}
                    </DialogTitle>
                    <DialogDescription>
                        {t('emailDialog.description', { title: extraction.title })}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-2">
                    <div className="space-y-1.5">
                        <Label htmlFor="email-recipients">
                            {t('emailDialog.recipientsLabel')}
                        </Label>
                        <Textarea
                            id="email-recipients"
                            value={recipientsRaw}
                            onChange={e => setRecipientsRaw(e.target.value)}
                            placeholder="pastor@iglesia.com, hermano@example.com"
                            rows={3}
                            disabled={sending}
                        />
                        <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">
                                {t('emailDialog.recipientsHint', { max: MAX_RECIPIENTS })}
                            </span>
                            {validRecipients.length > 0 && (
                                <span className="text-emerald-600">
                                    {t('emailDialog.recipientsValid', { count: validRecipients.length })}
                                </span>
                            )}
                            {invalidRecipients.length > 0 && (
                                <span className="text-destructive">
                                    {t('emailDialog.recipientsInvalid', {
                                        count: invalidRecipients.length,
                                        sample: invalidRecipients[0],
                                    })}
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <Label htmlFor="email-subject">
                            {t('emailDialog.subjectLabel')}
                        </Label>
                        <Input
                            id="email-subject"
                            value={subject}
                            onChange={e => setSubject(e.target.value)}
                            placeholder={extraction.title}
                            disabled={sending}
                        />
                        <span className="text-xs text-muted-foreground">
                            {t('emailDialog.subjectHint')}
                        </span>
                    </div>

                    <div className="space-y-1.5">
                        <Label htmlFor="email-note">
                            {t('emailDialog.noteLabel')}
                        </Label>
                        <Textarea
                            id="email-note"
                            value={note}
                            onChange={e => setNote(e.target.value)}
                            placeholder={t('emailDialog.notePlaceholder')}
                            rows={2}
                            disabled={sending}
                        />
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={sending}>
                        {t('emailDialog.cancel')}
                    </Button>
                    <Button onClick={handleSend} disabled={!canSend}>
                        {sending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        {t('emailDialog.send', { count: validRecipients.length })}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
