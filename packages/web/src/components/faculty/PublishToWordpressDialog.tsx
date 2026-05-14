import { useState, useEffect } from 'react';
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Globe, Loader2, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useFirebase } from '@/context/firebase-context';
import { extractionShareService, userIntegrationsService } from '@dosfilos/application';
import type { Extraction, WordpressIntegration } from '@dosfilos/domain';
import { useTranslation } from '@/i18n';
import { toast } from 'sonner';
import { track } from '@/lib/analytics/track';

interface PublishToWordpressDialogProps {
    extraction: Extraction | null;
    onClose: () => void;
}

/**
 * Dialog that publishes an Extraction to the user's WordPress site.
 * Requires WP integration configured first — if missing, shows a
 * "go to settings" CTA instead of the publish form.
 *
 * Surfaces: title override, excerpt, status (draft/publish). Defaults
 * pull from the WP integration config; user can override per-publish.
 */
export function PublishToWordpressDialog({ extraction, onClose }: PublishToWordpressDialogProps) {
    const { user } = useFirebase();
    const { t } = useTranslation('faculty');
    const navigate = useNavigate();
    const [config, setConfig] = useState<WordpressIntegration | null>(null);
    const [loadingConfig, setLoadingConfig] = useState(true);
    const [title, setTitle] = useState('');
    const [excerpt, setExcerpt] = useState('');
    const [status, setStatus] = useState<'draft' | 'publish'>('draft');
    const [publishing, setPublishing] = useState(false);

    useEffect(() => {
        if (!extraction || !user?.uid) return;
        setLoadingConfig(true);
        setTitle(extraction.title);
        setExcerpt('');
        userIntegrationsService.getWordpress(user.uid)
            .then(c => {
                setConfig(c);
                if (c) setStatus(c.defaultStatus);
            })
            .catch(err => {
                toast.error(`Couldn't load WP config: ${err?.message ?? err}`);
            })
            .finally(() => setLoadingConfig(false));
    }, [extraction, user?.uid]);

    if (!extraction) return null;

    const handlePublish = async () => {
        setPublishing(true);
        try {
            const result = await extractionShareService.publishToWordpress({
                extractionId: extraction.id,
                title: title.trim() || undefined,
                excerpt: excerpt.trim() || undefined,
                status,
            });
            track('faculty_artifact_published_wordpress', {
                type: extraction.type,
                status: result.status,
            });
            toast.success(
                t(`publishWordpressDialog.success.${result.status}`),
                {
                    action: {
                        label: t('publishWordpressDialog.openInWordpress'),
                        onClick: () => window.open(result.postUrl, '_blank', 'noopener,noreferrer'),
                    },
                },
            );
            onClose();
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            toast.error(t('publishWordpressDialog.error', { message: msg }));
        } finally {
            setPublishing(false);
        }
    };

    return (
        <Dialog open={!!extraction} onOpenChange={open => !open && onClose()}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Globe className="w-4 h-4 text-amber-600" />
                        {t('publishWordpressDialog.title')}
                    </DialogTitle>
                    <DialogDescription>
                        {t('publishWordpressDialog.description', { title: extraction.title })}
                    </DialogDescription>
                </DialogHeader>

                {loadingConfig ? (
                    <div className="py-12 flex items-center justify-center">
                        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                    </div>
                ) : !config ? (
                    <div className="py-6 space-y-4">
                        <p className="text-sm text-muted-foreground">{t('publishWordpressDialog.notConfigured')}</p>
                        <Button
                            onClick={() => {
                                onClose();
                                navigate('/dashboard/settings/integrations');
                            }}
                            className="w-full"
                        >
                            <ExternalLink className="w-4 h-4 mr-2" />
                            {t('publishWordpressDialog.configureCta')}
                        </Button>
                    </div>
                ) : (
                    <div className="space-y-4 py-2">
                        <div className="text-xs text-muted-foreground bg-muted/30 rounded p-2.5">
                            {t('publishWordpressDialog.connectedTo', { url: config.siteUrl })}
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="wp-pub-title">{t('publishWordpressDialog.titleLabel')}</Label>
                            <Input
                                id="wp-pub-title"
                                value={title}
                                onChange={e => setTitle(e.target.value)}
                                disabled={publishing}
                            />
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="wp-pub-excerpt">{t('publishWordpressDialog.excerptLabel')}</Label>
                            <Textarea
                                id="wp-pub-excerpt"
                                value={excerpt}
                                onChange={e => setExcerpt(e.target.value)}
                                placeholder={t('publishWordpressDialog.excerptPlaceholder')}
                                rows={2}
                                disabled={publishing}
                            />
                            <p className="text-xs text-muted-foreground">{t('publishWordpressDialog.excerptHint')}</p>
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="wp-pub-status">{t('publishWordpressDialog.statusLabel')}</Label>
                            <Select value={status} onValueChange={v => setStatus(v as 'draft' | 'publish')} disabled={publishing}>
                                <SelectTrigger id="wp-pub-status">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="draft">{t('publishWordpressDialog.statusDraft')}</SelectItem>
                                    <SelectItem value="publish">{t('publishWordpressDialog.statusPublish')}</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                )}

                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={publishing}>
                        {t('publishWordpressDialog.cancel')}
                    </Button>
                    {config && (
                        <Button onClick={handlePublish} disabled={publishing || !title.trim()}>
                            {publishing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            {status === 'draft'
                                ? t('publishWordpressDialog.publishDraft')
                                : t('publishWordpressDialog.publishLive')}
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
