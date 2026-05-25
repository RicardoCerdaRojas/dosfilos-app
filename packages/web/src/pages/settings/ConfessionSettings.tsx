import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, BookOpen, Info, Loader2, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useTranslation } from '@/i18n';
import { useFirebase } from '@/context/firebase-context';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useConfessionList } from '@/hooks/useConfessionList';
import { useUpdateConfessionalWitnesses } from '@/hooks/useUpdateConfessionalWitnesses';
import { confessionDisplayName, traditionDisplay, yearDisplay } from '@/lib/confessions/displayNames';

/**
 * `/settings/confession` (ADR-010).
 *
 * Single toggle: do you want all confessional traditions in the catalog
 * to act as Testigo 3 historical witnesses? Default ON because the
 * manifesto declares historical theology as constitutive of the method,
 * not opt-in.
 *
 * Opt-out requires a written justification (≥50 chars) recorded in the
 * audit log so a future reviewer can see why the pastor chose to silence
 * a component of the three-witness mechanism.
 *
 * The 14 catalog confessions are shown as a read-only roster so the
 * pastor can see exactly which traditions are speaking when the toggle
 * is ON. They are not selectable — the model is "all or none", not
 * single anchor (ADR-001 retired).
 */
export function ConfessionSettings() {
    const navigate = useNavigate();
    const { user } = useFirebase();
    const { profile, loading: profileLoading } = useUserProfile();
    const { confessions, loading: catalogLoading } = useConfessionList();
    const { update, isLoading: saving } = useUpdateConfessionalWitnesses();
    const { t, i18n } = useTranslation('dashboard');

    const currentValue = profile?.useConfessionalWitnesses !== false;
    const [enabled, setEnabled] = useState<boolean>(currentValue);
    const [justification, setJustification] = useState('');

    useEffect(() => {
        setEnabled(profile?.useConfessionalWitnesses !== false);
    }, [profile?.useConfessionalWitnesses]);

    const dirty = enabled !== currentValue;
    const optingOut = !enabled && dirty;
    const justificationValid = justification.trim().length >= 50;
    const canSave = dirty && (!optingOut || justificationValid) && !saving;

    const handleSave = async () => {
        if (!user || !dirty) return;
        const ok = await update(user.uid, {
            useConfessionalWitnesses: enabled,
            justification: optingOut ? justification.trim() : undefined,
        });
        if (ok) setJustification('');
    };

    const loading = profileLoading || catalogLoading;

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

            <Card className="p-5 mb-6">
                <div className="flex items-center justify-between gap-4 mb-4">
                    <div className="flex-1 min-w-0">
                        <Label className="text-sm font-semibold flex items-center gap-2">
                            {t('confession.settings.toggleLabel')}
                            {currentValue ? (
                                <Badge variant="outline" className="text-xs bg-success/15 text-success border-success/30">
                                    <CheckCircle2 className="h-3 w-3 mr-1" />
                                    {t('confession.settings.statusOn')}
                                </Badge>
                            ) : (
                                <Badge variant="outline" className="text-xs bg-warning/15 text-warning border-warning/30">
                                    <AlertTriangle className="h-3 w-3 mr-1" />
                                    {t('confession.settings.statusOff')}
                                </Badge>
                            )}
                        </Label>
                        <p className="text-xs text-muted-foreground mt-1">
                            {t('confession.settings.toggleHelp')}
                        </p>
                    </div>
                    <Switch
                        checked={enabled}
                        onCheckedChange={setEnabled}
                        disabled={saving}
                    />
                </div>

                {optingOut && (
                    <div className="mt-4 p-4 rounded-lg border border-warning/30 bg-warning/5">
                        <div className="flex items-start gap-2 mb-3">
                            <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
                            <p className="text-xs text-foreground leading-relaxed">
                                {t('confession.settings.optOutWarning')}
                            </p>
                        </div>
                        <Label className="text-xs font-semibold mb-2 block">
                            {t('confession.settings.justificationLabel')}
                        </Label>
                        <Textarea
                            value={justification}
                            onChange={(e) => setJustification(e.target.value)}
                            placeholder={t('confession.settings.justificationPlaceholder')}
                            rows={4}
                            className="text-sm"
                        />
                        <p className="text-[11px] text-muted-foreground mt-1.5 tabular-nums">
                            {justification.trim().length} / 50 {t('confession.settings.charsMin')}
                        </p>
                    </div>
                )}
            </Card>

            <Card className="p-5 mb-6">
                <Label className="text-sm font-semibold mb-2 block">
                    {t('confession.settings.rosterLabel')}
                </Label>
                <p className="text-xs text-muted-foreground mb-4">
                    {t('confession.settings.rosterHelp')}
                </p>
                {loading ? (
                    <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    </div>
                ) : (
                    <div className="grid sm:grid-cols-2 gap-2">
                        {confessions.map((c) => (
                            <div
                                key={c.id}
                                className={`flex items-center gap-2 p-3 rounded-lg border text-sm bg-card ${
                                    currentValue ? '' : 'opacity-50'
                                }`}
                            >
                                <BookOpen className="h-4 w-4 text-muted-foreground shrink-0" />
                                <div className="flex-1 min-w-0">
                                    <div className="text-sm font-semibold truncate">
                                        {confessionDisplayName(c.id, c.shortTitle, i18n.language)}
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                        {traditionDisplay(c.tradition, i18n.language)} · {yearDisplay(c.year, i18n.language)}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </Card>

            <div className="flex items-center justify-end gap-3">
                <Button
                    variant="outline"
                    onClick={() => navigate('/dashboard')}
                    disabled={saving}
                >
                    {t('confession.settings.cancel')}
                </Button>
                <Button onClick={handleSave} disabled={!canSave}>
                    {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    {t('confession.settings.save')}
                </Button>
            </div>
        </div>
    );
}
