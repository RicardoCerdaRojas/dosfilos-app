import { useState, useEffect } from 'react';
import { useFirebase } from '@/context/firebase-context';
import { userIntegrationsService } from '@dosfilos/application';
import type { WordpressIntegration } from '@dosfilos/domain';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Globe, Loader2, CheckCircle2, AlertCircle, Trash2, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useTranslation } from '@/i18n';

/**
 * Settings page for 3rd-party integrations. v1 ships WordPress; the
 * page is structured so future integrations (Mailchimp, Substack,
 * Beehiiv) drop in as additional cards.
 *
 * The WordPress card walks the user through:
 *   1. Site URL.
 *   2. WP username (or email).
 *   3. App password (generated in WP admin → Profile → Application
 *      Passwords). Stored per-user-Firestore-doc; revocable from WP
 *      side at any time without touching this UI.
 *   4. Default post status (draft = safest, recommended).
 *
 * Status badge shows last-publish or last-error so the user
 * immediately sees if their connection is healthy without sending
 * a real post.
 */
export function IntegrationsSettings() {
    const { user } = useFirebase();
    const { t } = useTranslation('settings');
    const [config, setConfig] = useState<WordpressIntegration | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Form state. Seeded from saved config on load; stays local so
    // the user can edit without overwriting saved state until they
    // hit Save.
    const [siteUrl, setSiteUrl] = useState('');
    const [username, setUsername] = useState('');
    const [appPassword, setAppPassword] = useState('');
    const [defaultStatus, setDefaultStatus] = useState<'draft' | 'publish'>('draft');
    const [testing, setTesting] = useState(false);
    const [testResult, setTestResult] = useState<{
        ok: boolean;
        roles?: string[];
        canEditPosts?: boolean;
        message: string;
    } | null>(null);

    useEffect(() => {
        if (!user?.uid) return;
        let cancelled = false;
        userIntegrationsService.getWordpress(user.uid)
            .then(c => {
                if (cancelled) return;
                setConfig(c);
                if (c) {
                    setSiteUrl(c.siteUrl);
                    setUsername(c.username);
                    setAppPassword(c.appPassword);
                    setDefaultStatus(c.defaultStatus);
                }
            })
            .catch(err => {
                if (cancelled) return;
                toast.error(`Couldn't load WordPress config: ${err?.message ?? err}`);
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => { cancelled = true; };
    }, [user?.uid]);

    const handleSave = async () => {
        if (!user?.uid) return;
        setSaving(true);
        try {
            await userIntegrationsService.saveWordpress(user.uid, {
                siteUrl: siteUrl.trim(),
                username: username.trim(),
                appPassword: appPassword.trim(),
                defaultStatus,
            });
            const fresh = await userIntegrationsService.getWordpress(user.uid);
            setConfig(fresh);
            toast.success(t('integrations.wordpress.saved'));
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            toast.error(t('integrations.wordpress.saveError', { message: msg }));
        } finally {
            setSaving(false);
        }
    };

    const handleTest = async () => {
        setTesting(true);
        setTestResult(null);
        try {
            const r = await userIntegrationsService.testWordpressConnection();
            if (r.ok && r.resolvedUser) {
                setTestResult({
                    ok: r.resolvedUser.canEditPosts,
                    roles: r.resolvedUser.roles,
                    canEditPosts: r.resolvedUser.canEditPosts,
                    message: r.resolvedUser.canEditPosts
                        ? `OK — autenticado como "${r.resolvedUser.name}" (${(r.resolvedUser.roles || []).join(', ')}). Puede crear posts.`
                        : `Auth OK pero el rol "${(r.resolvedUser.roles || []).join(', ')}" no puede crear posts. Asigna Author o superior en WP.`,
                });
            } else {
                setTestResult({
                    ok: false,
                    message: `${r.code ?? 'Error'}: ${r.message ?? 'Sin detalle'}`,
                });
            }
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            setTestResult({ ok: false, message: msg });
        } finally {
            setTesting(false);
        }
    };

    const handleDisconnect = async () => {
        if (!user?.uid) return;
        if (!window.confirm(t('integrations.wordpress.disconnectConfirm'))) return;
        try {
            await userIntegrationsService.deleteWordpress(user.uid);
            setConfig(null);
            setSiteUrl('');
            setUsername('');
            setAppPassword('');
            setDefaultStatus('draft');
            toast.success(t('integrations.wordpress.disconnected'));
        } catch (err) {
            toast.error(`Disconnect failed: ${err instanceof Error ? err.message : String(err)}`);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[40vh]">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto p-6 space-y-6">
            <header className="space-y-1">
                <h1 className="text-2xl font-semibold">{t('integrations.title')}</h1>
                <p className="text-sm text-muted-foreground">{t('integrations.subtitle')}</p>
            </header>

            <Card className="p-6 space-y-5">
                <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-amber-50 dark:bg-amber-950/30 flex items-center justify-center shrink-0">
                        <Globe className="w-5 h-5 text-amber-600" />
                    </div>
                    <div className="flex-1">
                        <h2 className="font-semibold text-base">{t('integrations.wordpress.title')}</h2>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            {t('integrations.wordpress.description')}
                        </p>
                    </div>
                    {config && (
                        <ConnectionStatusBadge config={config} />
                    )}
                </div>

                <div className="space-y-4">
                    <div className="space-y-1.5">
                        <Label htmlFor="wp-site">{t('integrations.wordpress.siteUrlLabel')}</Label>
                        <Input
                            id="wp-site"
                            type="url"
                            placeholder="https://miblog.com"
                            value={siteUrl}
                            onChange={e => setSiteUrl(e.target.value)}
                            disabled={saving}
                        />
                        <p className="text-xs text-muted-foreground">{t('integrations.wordpress.siteUrlHint')}</p>
                    </div>

                    <div className="space-y-1.5">
                        <Label htmlFor="wp-user">{t('integrations.wordpress.usernameLabel')}</Label>
                        <Input
                            id="wp-user"
                            type="text"
                            placeholder="pastor.cerda"
                            value={username}
                            onChange={e => setUsername(e.target.value)}
                            disabled={saving}
                            autoComplete="username"
                        />
                    </div>

                    <div className="space-y-1.5">
                        <Label htmlFor="wp-pass">{t('integrations.wordpress.appPasswordLabel')}</Label>
                        <Input
                            id="wp-pass"
                            type="password"
                            placeholder="aaaa bbbb cccc dddd eeee ffff"
                            value={appPassword}
                            onChange={e => setAppPassword(e.target.value)}
                            disabled={saving}
                            autoComplete="off"
                        />
                        <p className="text-xs text-muted-foreground">
                            {t('integrations.wordpress.appPasswordHint')}{' '}
                            <a
                                href="https://wordpress.org/documentation/article/application-passwords/"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-amber-600 underline"
                            >
                                {t('integrations.wordpress.howToGenerate')}
                            </a>
                        </p>
                    </div>

                    <div className="space-y-1.5">
                        <Label htmlFor="wp-status">{t('integrations.wordpress.defaultStatusLabel')}</Label>
                        <Select value={defaultStatus} onValueChange={v => setDefaultStatus(v as 'draft' | 'publish')}>
                            <SelectTrigger id="wp-status">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="draft">{t('integrations.wordpress.statusDraft')}</SelectItem>
                                <SelectItem value="publish">{t('integrations.wordpress.statusPublish')}</SelectItem>
                            </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">{t('integrations.wordpress.defaultStatusHint')}</p>
                    </div>
                </div>

                {config && (
                    <div className="space-y-2 pt-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleTest}
                            disabled={testing}
                            className="w-full"
                        >
                            {testing ? <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" /> : <Activity className="w-3.5 h-3.5 mr-2" />}
                            Probar conexión
                        </Button>
                        {testResult && (
                            <div className={cn(
                                'text-xs p-3 rounded border',
                                testResult.ok
                                    ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-300'
                                    : 'bg-destructive/10 border-destructive/30 text-destructive'
                            )}>
                                {testResult.message}
                            </div>
                        )}
                    </div>
                )}

                <div className="flex items-center justify-between pt-2 border-t">
                    {config ? (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={handleDisconnect}
                            disabled={saving}
                        >
                            <Trash2 className="w-3.5 h-3.5 mr-2" />
                            {t('integrations.wordpress.disconnect')}
                        </Button>
                    ) : (
                        <span className="text-xs text-muted-foreground">{t('integrations.wordpress.notConnected')}</span>
                    )}
                    <Button onClick={handleSave} disabled={saving || !siteUrl.trim() || !username.trim() || !appPassword.trim()}>
                        {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        {config ? t('integrations.wordpress.saveChanges') : t('integrations.wordpress.connect')}
                    </Button>
                </div>
            </Card>
        </div>
    );
}

function ConnectionStatusBadge({ config }: { config: WordpressIntegration }) {
    const { t } = useTranslation('settings');
    if (config.lastError) {
        return (
            <div className="flex items-center gap-1.5 text-xs text-destructive shrink-0" title={config.lastError}>
                <AlertCircle className="w-4 h-4" />
                {t('integrations.wordpress.lastError')}
            </div>
        );
    }
    if (config.lastPublishedAt) {
        return (
            <div className="flex items-center gap-1.5 text-xs text-emerald-600 shrink-0">
                <CheckCircle2 className="w-4 h-4" />
                {t('integrations.wordpress.connected')}
            </div>
        );
    }
    return (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground shrink-0">
            <CheckCircle2 className="w-4 h-4" />
            {t('integrations.wordpress.connectedNoPublishYet')}
        </div>
    );
}
