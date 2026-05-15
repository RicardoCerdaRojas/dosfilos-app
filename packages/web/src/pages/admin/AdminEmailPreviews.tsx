import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFirebase } from '@/context/firebase-context';
import { leadMagnetSubmissionsService, extractionShareService, welcomeEmailService } from '@dosfilos/application';
import { ArrowLeft, Mail, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const ADMIN_EMAIL = 'rdocerda@gmail.com';

type NurtureStage = 'day1' | 'day3' | 'day5' | 'day7';
type Locale = 'es' | 'en';
type WelcomeFlow = 'free' | 'paid';
/** Discriminated key for the active template card. */
type ActiveTemplate =
    | { kind: 'nurture'; stage: NurtureStage }
    | { kind: 'welcome'; flow: WelcomeFlow }
    | { kind: 'share' };

const NURTURE_STAGES: ReadonlyArray<{
    id: NurtureStage;
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
    subject: string;
    html: string;
}

/**
 * Super-admin email preview page. Two template families:
 *
 *   - Nurture sequence (4 lead-magnet drip emails, locale-aware
 *     copy, name-only sample inputs).
 *   - Extraction share (the pastor-as-sender layout used by every
 *     "send by email" action — sample sender + note + markdown so
 *     we can validate the canonical chrome end-to-end).
 *
 * Adding a new template = add a card to the sidebar + extend the
 * ActiveTemplate union. The render path normalizes both shapes
 * into a `PreviewResult` so the iframe pane stays template-agnostic.
 */
export function AdminEmailPreviews() {
    const { user } = useFirebase();
    const navigate = useNavigate();
    const [active, setActive] = useState<ActiveTemplate>({ kind: 'nurture', stage: 'day1' });
    const [locale, setLocale] = useState<Locale>('es');
    const [name, setName] = useState('Ricardo');
    const [shareTitle, setShareTitle] = useState('');
    const [shareSenderName, setShareSenderName] = useState('');
    const [shareSenderNote, setShareSenderNote] = useState('');
    const [shareMarkdown, setShareMarkdown] = useState('');
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

        const promise: Promise<PreviewResult> =
            active.kind === 'nurture'
                ? leadMagnetSubmissionsService
                      .previewNurtureTemplate({
                          stage: active.stage,
                          locale,
                          name: name.trim() || (locale === 'en' ? 'Preacher' : 'Predicador'),
                      })
                      .then((r) => ({ subject: r.subject, html: r.html }))
                : active.kind === 'welcome'
                  ? welcomeEmailService
                        .previewWelcomeEmail({
                            flow: active.flow,
                            locale,
                            name: name.trim() || (locale === 'en' ? 'Preacher' : 'Predicador'),
                        })
                        .then((r) => ({ subject: r.subject, html: r.html }))
                  : extractionShareService.previewShareEmail({
                        title: shareTitle.trim() || undefined,
                        senderName: shareSenderName.trim() || undefined,
                        senderNote: shareSenderNote.trim() || undefined,
                        markdown: shareMarkdown.trim() || undefined,
                    });

        promise
            .then(result => {
                if (cancelled) return;
                setPreview(result);
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
    }, [active, locale, name, shareTitle, shareSenderName, shareSenderNote, shareMarkdown, user]);

    if (!user || user.email !== ADMIN_EMAIL) {
        return (
            <div className="min-h-svh flex items-center justify-center">
                <p className="text-muted-foreground">Acceso restringido a super-admin.</p>
            </div>
        );
    }

    const isNurtureActive = active.kind === 'nurture';
    const isWelcomeActive = active.kind === 'welcome';
    const isShareActive = active.kind === 'share';

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
                    <Mail className="w-5 h-5 text-amber-600" />
                    <div>
                        <h1 className="text-lg font-semibold">Preview · Email Templates</h1>
                        <p className="text-xs text-muted-foreground">
                            Cambios en los templates requieren redeploy de functions.
                        </p>
                    </div>
                </div>
            </header>

            <div className="max-w-7xl mx-auto px-6 py-6 grid grid-cols-12 gap-6">
                <aside className="col-span-3 space-y-4">
                    {/* Nurture sequence section */}
                    <div>
                        <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-2 px-1">
                            Lead Magnet Nurture
                        </div>
                        <div className="space-y-2">
                            {NURTURE_STAGES.map(s => {
                                const meta = s[locale];
                                const isActive = isNurtureActive && active.stage === s.id;
                                return (
                                    <Card
                                        key={s.id}
                                        onClick={() => setActive({ kind: 'nurture', stage: s.id })}
                                        className={cn(
                                            'p-3 cursor-pointer transition-colors',
                                            isActive
                                                ? 'border-amber-500 bg-amber-50/60 dark:bg-amber-950/30'
                                                : 'hover:bg-accent/40',
                                        )}
                                    >
                                        <div className="font-semibold text-sm">{meta.label}</div>
                                        <p className="text-xs text-muted-foreground mt-1">{meta.description}</p>
                                    </Card>
                                );
                            })}
                        </div>
                    </div>

                    {/* Onboarding section */}
                    <div>
                        <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-2 px-1">
                            Onboarding
                        </div>
                        <div className="space-y-2">
                            {(['free', 'paid'] as const).map((flow) => {
                                const isActive = isWelcomeActive && active.flow === flow;
                                const meta =
                                    flow === 'free'
                                        ? {
                                              label: 'Welcome — Free flow',
                                              description: 'Email post-signup gratuito. Incluye gate de verificación.',
                                          }
                                        : {
                                              label: 'Welcome — Paid flow',
                                              description: 'Email post-checkout Stripe. Incluye link para crear contraseña.',
                                          };
                                return (
                                    <Card
                                        key={flow}
                                        onClick={() => setActive({ kind: 'welcome', flow })}
                                        className={cn(
                                            'p-3 cursor-pointer transition-colors',
                                            isActive
                                                ? 'border-amber-500 bg-amber-50/60 dark:bg-amber-950/30'
                                                : 'hover:bg-accent/40',
                                        )}
                                    >
                                        <div className="font-semibold text-sm">{meta.label}</div>
                                        <p className="text-xs text-muted-foreground mt-1">{meta.description}</p>
                                    </Card>
                                );
                            })}
                        </div>
                    </div>

                    {/* Share extraction section */}
                    <div>
                        <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-2 px-1">
                            Compartir recurso
                        </div>
                        <Card
                            onClick={() => setActive({ kind: 'share' })}
                            className={cn(
                                'p-3 cursor-pointer transition-colors',
                                isShareActive
                                    ? 'border-amber-500 bg-amber-50/60 dark:bg-amber-950/30'
                                    : 'hover:bg-accent/40',
                            )}
                        >
                            <div className="font-semibold text-sm">Share Email</div>
                            <p className="text-xs text-muted-foreground mt-1">
                                Layout pastor-as-sender. Usado al enviar cualquier recurso por email.
                            </p>
                        </Card>
                    </div>

                    {/* Inputs vary per template family */}
                    {isNurtureActive || isWelcomeActive ? (
                        <Card className="p-4 space-y-3">
                            <div className="space-y-1.5">
                                <Label className="text-xs">Idioma</Label>
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
                    ) : (
                        <Card className="p-4 space-y-3">
                            <div className="space-y-1.5">
                                <Label htmlFor="share-title" className="text-xs">Título del recurso</Label>
                                <Input
                                    id="share-title"
                                    value={shareTitle}
                                    onChange={e => setShareTitle(e.target.value)}
                                    placeholder="Auto"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="share-sender" className="text-xs">Nombre del remitente</Label>
                                <Input
                                    id="share-sender"
                                    value={shareSenderName}
                                    onChange={e => setShareSenderName(e.target.value)}
                                    placeholder="Pastor Ricardo Cerda"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="share-note" className="text-xs">Nota personal</Label>
                                <Textarea
                                    id="share-note"
                                    value={shareSenderNote}
                                    onChange={e => setShareSenderNote(e.target.value)}
                                    placeholder="Auto"
                                    rows={3}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="share-md" className="text-xs">Markdown body (opcional)</Label>
                                <Textarea
                                    id="share-md"
                                    value={shareMarkdown}
                                    onChange={e => setShareMarkdown(e.target.value)}
                                    placeholder="Sample auto"
                                    rows={6}
                                    className="font-mono text-xs"
                                />
                            </div>
                        </Card>
                    )}
                </aside>

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
                                <Loader2 className="w-5 h-5 animate-spin text-amber-500 shrink-0" />
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
                                title="Preview"
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
