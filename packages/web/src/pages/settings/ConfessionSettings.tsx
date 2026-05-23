import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { ArrowLeft, BookOpen, Check, Info, Loader2 } from 'lucide-react';
import { useTranslation } from '@/i18n';
import { useFirebase } from '@/context/firebase-context';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useConfessionList } from '@/hooks/useConfessionList';
import { useDeclaredConfession } from '@/hooks/useDeclaredConfession';
import {
    NON_CONFESSIONAL,
    type ConfessionVisibility,
    type DeclaredConfessionId,
} from '@dosfilos/domain';
import { format } from 'date-fns';
import { es as esLocale, enUS as enLocale } from 'date-fns/locale';

/**
 * Page where the pastor edits their declared confession (ADR-007).
 *
 * Surface for two flows:
 *   1. Backfill — existing users who never went through the new
 *      onboarding wizard reach this page via the persistent
 *      `ConfessionBanner` on the dashboard.
 *   2. Maintenance — any user can revise the declaration later (rare,
 *      but supported with an audit trail).
 *
 * The page shows when the declaration was last affirmed so the pastor
 * knows the system has it on record. Visibility defaults to `private`;
 * the `public-in-profile` toggle is wired but will only have a
 * downstream consumer once the public pastoral profile feature lands.
 */
export function ConfessionSettings() {
    const navigate = useNavigate();
    const { user } = useFirebase();
    const { profile, loading: profileLoading } = useUserProfile();
    const { confessions, loading: catalogLoading } = useConfessionList();
    const { declare, isLoading: saving } = useDeclaredConfession();
    const { t, i18n } = useTranslation('dashboard');
    const dateLocale = i18n.language.startsWith('es') ? esLocale : enLocale;

    const [selected, setSelected] = useState<DeclaredConfessionId | null>(null);
    const [visibility, setVisibility] = useState<ConfessionVisibility>('private');

    useEffect(() => {
        if (profile?.declaredConfession) {
            setSelected(profile.declaredConfession);
            setVisibility(profile.confessionVisibility ?? 'private');
        }
    }, [profile?.declaredConfession, profile?.confessionVisibility]);

    const loading = profileLoading || catalogLoading;
    const dirty =
        selected != null &&
        (selected !== profile?.declaredConfession ||
            visibility !== (profile?.confessionVisibility ?? 'private'));

    const handleSave = async () => {
        if (!user || !selected) return;
        await declare(user.uid, selected, visibility);
    };

    return (
        <div className="p-6 max-w-3xl mx-auto">
            <div className="flex items-center gap-3 mb-6">
                <Button variant="outline" onClick={() => navigate('/dashboard')}>
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    {t('confession.settings.back')}
                </Button>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                    <BookOpen className="h-6 w-6 text-primary" />
                    {t('confession.settings.title')}
                </h1>
            </div>

            <Card className="p-4 mb-6 flex gap-3 bg-card/50">
                <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <p className="text-sm text-muted-foreground leading-relaxed">
                    {t('confession.settings.explainer')}
                </p>
            </Card>

            {profile?.confessionAffirmedAt && (
                <Card className="p-4 mb-6">
                    <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-1">
                        {t('confession.settings.lastAffirmed')}
                    </div>
                    <div className="text-sm">
                        {format(new Date(profile.confessionAffirmedAt), 'PPP', { locale: dateLocale })}
                    </div>
                </Card>
            )}

            {loading ? (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
            ) : (
                <Card className="p-5 mb-6">
                    <Label className="text-sm font-semibold mb-3 block">
                        {t('confession.settings.pickLabel')}
                    </Label>
                    <div className="grid sm:grid-cols-2 gap-2 mb-3">
                        {confessions.map((c) => (
                            <button
                                key={c.id}
                                type="button"
                                onClick={() => setSelected(c.id)}
                                className={`
                                    text-left p-3 rounded-lg border-2 bg-card transition-colors
                                    ${selected === c.id
                                        ? 'border-primary bg-primary/5 shadow-sm'
                                        : 'border-border hover:border-foreground/20'}
                                `}
                            >
                                <div className="flex items-center gap-2">
                                    <BookOpen className="h-4 w-4 text-muted-foreground shrink-0" />
                                    <div className="flex-1 min-w-0">
                                        <div className="text-sm font-semibold truncate">{c.shortTitle}</div>
                                        <div className="text-xs text-muted-foreground">
                                            {c.tradition} · {String(c.year)}
                                        </div>
                                    </div>
                                    {selected === c.id && <Check className="h-4 w-4 text-primary shrink-0" />}
                                </div>
                            </button>
                        ))}
                    </div>
                    <button
                        type="button"
                        onClick={() => setSelected(NON_CONFESSIONAL)}
                        className={`
                            w-full text-left p-3 rounded-lg border-2 bg-card transition-colors
                            ${selected === NON_CONFESSIONAL
                                ? 'border-primary bg-primary/5 shadow-sm'
                                : 'border-border hover:border-foreground/20'}
                        `}
                    >
                        <div className="flex items-center gap-2">
                            <BookOpen className="h-4 w-4 text-muted-foreground shrink-0" />
                            <div className="flex-1 min-w-0">
                                <div className="text-sm font-semibold">
                                    {t('onboarding.confession.nonConfessional.title')}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                    {t('onboarding.confession.nonConfessional.description')}
                                </div>
                            </div>
                            {selected === NON_CONFESSIONAL && (
                                <Check className="h-4 w-4 text-primary shrink-0" />
                            )}
                        </div>
                    </button>
                </Card>
            )}

            <Card className="p-5 mb-6">
                <div className="flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                        <Label className="text-sm font-semibold">
                            {t('confession.settings.visibilityLabel')}
                        </Label>
                        <p className="text-xs text-muted-foreground mt-1">
                            {t('confession.settings.visibilityHelp')}
                        </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        <Badge variant="outline" className="text-xs">
                            {t(`confession.settings.visibility.${visibility}`)}
                        </Badge>
                        <Switch
                            checked={visibility === 'public-in-profile'}
                            onCheckedChange={(next) =>
                                setVisibility(next ? 'public-in-profile' : 'private')
                            }
                        />
                    </div>
                </div>
            </Card>

            <div className="flex items-center justify-end gap-3">
                <Button
                    variant="outline"
                    onClick={() => navigate('/dashboard')}
                    disabled={saving}
                >
                    {t('confession.settings.cancel')}
                </Button>
                <Button onClick={handleSave} disabled={!dirty || saving}>
                    {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    {t('confession.settings.save')}
                </Button>
            </div>
        </div>
    );
}
