import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFirebase } from '@/context/firebase-context';
import { leadMagnetSubmissionsService } from '@dosfilos/application';
import { ArrowLeft, Mail, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const ADMIN_EMAIL = 'rdocerda@gmail.com';

type Stage = 'day1' | 'day3' | 'day5' | 'day7';
type Locale = 'es' | 'en';

const STAGES: ReadonlyArray<{
    id: Stage;
    es: { label: string; description: string };
    en: { label: string; description: string };
}> = [
    {
        id: 'day1',
        es: { label: 'Día 1 — Error común', description: 'El error estructural más común al predicar expositivo.' },
        en: { label: 'Day 1 — Common mistake', description: 'The most common structural mistake in expository preaching.' },
    },
    {
        id: 'day3',
        es: { label: 'Día 3 — Elegir libro', description: 'Framework de 3 preguntas para elegir el próximo libro a predicar.' },
        en: { label: 'Day 3 — Pick book', description: '3-question framework for picking the next book to preach.' },
    },
    {
        id: 'day5',
        es: { label: 'Día 5 — Flujo 90 min', description: 'Cómo preparar un sermón en 90 min con Preach.' },
        en: { label: 'Day 5 — 90 min flow', description: 'How to prep a sermon in 90 minutes with Preach.' },
    },
    {
        id: 'day7',
        es: { label: 'Día 7 — Trial CTA', description: 'Invitación final al trial. Recap de la serie.' },
        en: { label: 'Day 7 — Trial CTA', description: 'Final trial invitation. Series recap.' },
    },
];

interface PreviewResult {
    stage: Stage;
    locale: Locale;
    subject: string;
    html: string;
}

/**
 * Super-admin preview page for the lead-magnet nurture templates.
 *
 * Live at /admin/email-previews. Calls the previewLeadMagnetNurture
 * Cloud Function (gated to ADMIN_EMAIL) with sample inputs and
 * iframes the returned HTML so the operator can validate copy +
 * design before they go out to real leads.
 *
 * Iframe is sandboxed and rendered via `srcDoc` so the template
 * markup runs in isolation — same way it'll render in a real email
 * client (no parent CSS bleed, no script execution).
 */
export function AdminEmailPreviews() {
    const { user } = useFirebase();
    const navigate = useNavigate();
    const [activeStage, setActiveStage] = useState<Stage>('day1');
    const [locale, setLocale] = useState<Locale>('es');
    const [name, setName] = useState('Ricardo');
    const [preview, setPreview] = useState<PreviewResult | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (user && user.email !== ADMIN_EMAIL) {
            navigate('/dashboard');
        }
    }, [user, navigate]);

    useEffect(() => {
        if (!user || user.email !== ADMIN_EMAIL) return;
        let cancelled = false;
        setLoading(true);
        setError(null);
        leadMagnetSubmissionsService
            .previewNurtureTemplate({
                stage: activeStage,
                locale,
                name: name.trim() || (locale === 'en' ? 'Preacher' : 'Predicador'),
            })
            .then(result => {
                if (cancelled) return;
                setPreview(result as PreviewResult);
            })
            .catch(err => {
                if (cancelled) return;
                const msg = err?.message ?? String(err);
                setError(msg);
                toast.error(`Preview failed: ${msg}`);
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, [activeStage, locale, name, user]);

    if (!user || user.email !== ADMIN_EMAIL) {
        return (
            <div className="min-h-svh flex items-center justify-center">
                <p className="text-muted-foreground">Acceso restringido a super-admin.</p>
            </div>
        );
    }

    const activeMeta = STAGES.find(s => s.id === activeStage)!;

    return (
        <div className="min-h-svh bg-muted/30">
            <header className="bg-background border-b">
                <div className="max-w-7xl mx-auto px-6 py-4 flex items-center gap-3">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => navigate('/dashboard')}
                        aria-label="Volver"
                    >
                        <ArrowLeft className="w-4 h-4" />
                    </Button>
                    <Mail className="w-5 h-5 text-indigo-500" />
                    <div>
                        <h1 className="text-lg font-semibold">Preview · Nurture Emails</h1>
                        <p className="text-xs text-muted-foreground">
                            Lead-magnet drip sequence. Cambios en los templates requieren redeploy de functions.
                        </p>
                    </div>
                </div>
            </header>

            <div className="max-w-7xl mx-auto px-6 py-6 grid grid-cols-12 gap-6">
                {/* Stage picker */}
                <aside className="col-span-3 space-y-2">
                    {STAGES.map(s => {
                        const meta = s[locale];
                        const isActive = s.id === activeStage;
                        return (
                            <Card
                                key={s.id}
                                onClick={() => setActiveStage(s.id)}
                                className={cn(
                                    'p-4 cursor-pointer transition-colors',
                                    isActive
                                        ? 'border-indigo-500 bg-indigo-50/60 dark:bg-indigo-950/30'
                                        : 'hover:bg-accent/40',
                                )}
                            >
                                <div className="font-semibold text-sm">{meta.label}</div>
                                <p className="text-xs text-muted-foreground mt-1">{meta.description}</p>
                            </Card>
                        );
                    })}

                    <Card className="p-4 mt-4 space-y-3">
                        <div className="space-y-1.5">
                            <Label htmlFor="locale-select" className="text-xs">Idioma</Label>
                            <div className="flex gap-1.5">
                                <Button
                                    variant={locale === 'es' ? 'default' : 'outline'}
                                    size="sm"
                                    className="flex-1"
                                    onClick={() => setLocale('es')}
                                >
                                    ES
                                </Button>
                                <Button
                                    variant={locale === 'en' ? 'default' : 'outline'}
                                    size="sm"
                                    className="flex-1"
                                    onClick={() => setLocale('en')}
                                >
                                    EN
                                </Button>
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="name-input" className="text-xs">Nombre de prueba</Label>
                            <Input
                                id="name-input"
                                value={name}
                                onChange={e => setName(e.target.value)}
                                placeholder="Ricardo"
                            />
                        </div>
                    </Card>
                </aside>

                {/* Preview pane */}
                <main className="col-span-9 space-y-3">
                    <Card className="p-4">
                        <div className="flex items-center justify-between gap-3">
                            <div>
                                <div className="text-xs uppercase tracking-wide text-muted-foreground">Subject</div>
                                <div className="text-base font-semibold mt-0.5">
                                    {preview?.subject ?? '—'}
                                </div>
                            </div>
                            {loading && (
                                <Loader2 className="w-5 h-5 animate-spin text-indigo-500 shrink-0" />
                            )}
                        </div>
                    </Card>

                    <Card className="overflow-hidden">
                        {error ? (
                            <div className="p-8 text-center text-destructive text-sm">
                                {error}
                            </div>
                        ) : (
                            <iframe
                                title={`Preview ${activeStage} ${locale}`}
                                sandbox=""
                                srcDoc={preview?.html ?? ''}
                                className="w-full h-[80vh] bg-white"
                            />
                        )}
                    </Card>
                </main>
            </div>
        </div>
    );
}
