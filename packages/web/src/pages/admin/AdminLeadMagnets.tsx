import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFirebase } from '@/context/firebase-context';
import {
    ArrowLeft,
    CheckCircle2,
    Download,
    Mail,
    RefreshCw,
    Search,
    XCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import {
    leadMagnetSubmissionsService,
    type LeadMagnetSubmission,
} from '@dosfilos/application';

const ADMIN_EMAIL = 'rdocerda@gmail.com';

/**
 * Super-admin dashboard for the lead-magnet funnel submissions.
 *
 * Lives at `/admin/lead-magnets`. Reads the
 * `lead_magnet_submissions` Firestore collection live via
 * `onSnapshot` (gated by Firestore security rules to the admin email),
 * surfaces stats, lets the operator filter, re-send the delivery
 * email, and export the visible rows to CSV for nurture / CRM import.
 *
 * Separate from the existing `/admin/leads` page which serves the
 * `contact_leads` collection (contact-form submissions) — different
 * funnels, different lifecycle, different data shape.
 */
export function AdminLeadMagnets() {
    const { user } = useFirebase();
    const navigate = useNavigate();
    const [submissions, setSubmissions] = useState<LeadMagnetSubmission[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [magnetFilter, setMagnetFilter] = useState('all');
    const [deliveryFilter, setDeliveryFilter] = useState('all');
    const [utmSourceFilter, setUtmSourceFilter] = useState('all');
    const [resending, setResending] = useState<string | null>(null);

    useEffect(() => {
        if (user && user.email !== ADMIN_EMAIL) {
            toast.error('Acceso denegado');
            navigate('/dashboard');
        }
    }, [user, navigate]);

    useEffect(() => {
        if (!user || user.email !== ADMIN_EMAIL) return;
        const unsubscribe = leadMagnetSubmissionsService.subscribeAll(
            (data) => {
                setSubmissions(data);
                setLoading(false);
            },
            (error) => {
                console.error('[AdminLeadMagnets] subscribe error:', error);
                toast.error('No se pudieron cargar los leads');
                setLoading(false);
            },
        );
        return () => unsubscribe();
    }, [user]);

    // Derive filter options from the data so adding a new magnet or
    // a new UTM source doesn't require editing this component.
    const availableMagnets = useMemo(() => {
        const set = new Set(submissions.map(s => s.leadMagnet));
        return Array.from(set).sort();
    }, [submissions]);

    const availableUtmSources = useMemo(() => {
        const set = new Set<string>();
        for (const s of submissions) {
            if (s.utm.utm_source) set.add(s.utm.utm_source);
        }
        return Array.from(set).sort();
    }, [submissions]);

    const filtered = useMemo(() => {
        return submissions.filter((s) => {
            const matchesSearch =
                s.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (s.name ?? '').toLowerCase().includes(searchTerm.toLowerCase());

            const matchesMagnet = magnetFilter === 'all' || s.leadMagnet === magnetFilter;

            const matchesDelivery =
                deliveryFilter === 'all' ||
                (deliveryFilter === 'delivered' && s.emailDelivered) ||
                (deliveryFilter === 'failed' && !s.emailDelivered);

            const matchesUtm =
                utmSourceFilter === 'all' ||
                (utmSourceFilter === 'none' && !s.utm.utm_source) ||
                s.utm.utm_source === utmSourceFilter;

            return matchesSearch && matchesMagnet && matchesDelivery && matchesUtm;
        });
    }, [submissions, searchTerm, magnetFilter, deliveryFilter, utmSourceFilter]);

    const stats = useMemo(() => {
        const total = submissions.length;
        const delivered = submissions.filter(s => s.emailDelivered).length;
        const failed = total - delivered;
        // Last 7 days = leads with createdAt > now - 7d. Timestamp.toMillis
        // gives epoch ms; some legacy docs may have lost the timestamp
        // during a restore, so guard.
        const sevenDaysAgoMs = Date.now() - 7 * 24 * 60 * 60 * 1000;
        const recent = submissions.filter(s => {
            const ms = s.createdAt?.toMillis?.();
            return typeof ms === 'number' && ms >= sevenDaysAgoMs;
        }).length;
        return { total, delivered, failed, recent };
    }, [submissions]);

    const handleResend = async (id: string) => {
        if (resending) return;
        setResending(id);
        try {
            await leadMagnetSubmissionsService.resendDeliveryEmail(id);
            toast.success('Email reenviado');
        } catch (err: any) {
            console.error('[AdminLeadMagnets] resend failed:', err);
            toast.error(err?.message ?? 'No se pudo reenviar el email');
        } finally {
            setResending(null);
        }
    };

    const handleExportCsv = () => {
        if (filtered.length === 0) {
            toast.info('No hay registros para exportar con los filtros actuales');
            return;
        }
        const csv = buildCsv(filtered);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `lead-magnets-${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success(`${filtered.length} registros exportados`);
    };

    if (!user || user.email !== ADMIN_EMAIL) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-muted">
                <Card className="p-8 text-center">
                    <XCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
                    <h1 className="text-xl font-bold text-foreground">Acceso denegado</h1>
                    <p className="text-muted-foreground mt-2">Esta página solo está disponible para el super administrador.</p>
                    <Button className="mt-4" onClick={() => navigate('/')}>Volver al inicio</Button>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-muted p-6">
            <div className="max-w-7xl mx-auto">
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                        <Button variant="outline" onClick={() => navigate('/dashboard')}>
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Volver al dashboard
                        </Button>
                        <div>
                            <h1 className="text-3xl font-bold text-foreground">Lead magnets</h1>
                            <p className="text-muted-foreground">
                                Suscripciones al manual de predicación + futuros recursos descargables.
                            </p>
                        </div>
                    </div>
                    <Button onClick={handleExportCsv} variant="outline">
                        <Download className="h-4 w-4 mr-2" />
                        Exportar CSV
                    </Button>
                </div>

                {/* Stats cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    <Card className="p-4">
                        <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Total</p>
                        <p className="text-2xl font-bold text-foreground">{stats.total}</p>
                    </Card>
                    <Card className="p-4">
                        <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Últimos 7 días</p>
                        <p className="text-2xl font-bold text-foreground">{stats.recent}</p>
                    </Card>
                    <Card className="p-4">
                        <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Email entregado</p>
                        <p className="text-2xl font-bold text-success">{stats.delivered}</p>
                    </Card>
                    <Card className="p-4">
                        <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Envío fallido</p>
                        <p className="text-2xl font-bold text-destructive">{stats.failed}</p>
                    </Card>
                </div>

                {/* Filter bar */}
                <Card className="p-4 mb-6">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                        <div className="relative md:col-span-2">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Buscar por email o nombre..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-9"
                            />
                        </div>
                        <Select value={magnetFilter} onValueChange={setMagnetFilter}>
                            <SelectTrigger>
                                <SelectValue placeholder="Magnet" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todos los magnets</SelectItem>
                                {availableMagnets.map(m => (
                                    <SelectItem key={m} value={m}>{m}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Select value={deliveryFilter} onValueChange={setDeliveryFilter}>
                            <SelectTrigger>
                                <SelectValue placeholder="Estado de envío" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todos los estados</SelectItem>
                                <SelectItem value="delivered">Entregado</SelectItem>
                                <SelectItem value="failed">Fallido</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    {availableUtmSources.length > 0 && (
                        <div className="mt-3">
                            <Select value={utmSourceFilter} onValueChange={setUtmSourceFilter}>
                                <SelectTrigger className="md:max-w-xs">
                                    <SelectValue placeholder="UTM source" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todas las fuentes</SelectItem>
                                    <SelectItem value="none">Sin UTM</SelectItem>
                                    {availableUtmSources.map(s => (
                                        <SelectItem key={s} value={s}>{s}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}
                </Card>

                {/* Submissions list */}
                {loading ? (
                    <Card className="p-8 text-center text-muted-foreground">Cargando...</Card>
                ) : filtered.length === 0 ? (
                    <Card className="p-8 text-center text-muted-foreground">
                        {submissions.length === 0
                            ? 'Aún no hay suscripciones. Los nuevos leads aparecerán aquí en tiempo real.'
                            : 'Ningún registro coincide con los filtros aplicados.'}
                    </Card>
                ) : (
                    <div className="space-y-3">
                        {filtered.map((s) => (
                            <SubmissionRow
                                key={s.id}
                                submission={s}
                                onResend={handleResend}
                                isResending={resending === s.id}
                            />
                        ))}
                    </div>
                )}

                <p className="mt-6 text-xs text-muted-foreground text-center">
                    Mostrando {filtered.length} de {submissions.length} registros · Datos en vivo
                </p>
            </div>
        </div>
    );
}

interface SubmissionRowProps {
    submission: LeadMagnetSubmission;
    onResend: (id: string) => void;
    isResending: boolean;
}

function SubmissionRow({ submission, onResend, isResending }: SubmissionRowProps) {
    const { id, email, name, leadMagnet, utm, createdAt, lastEmailedAt, requestCount, emailDelivered, lastEmailError } = submission;

    const created = createdAt?.toDate?.();
    const emailed = lastEmailedAt?.toDate?.();

    return (
        <Card className="p-4">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-semibold text-foreground truncate">{email}</span>
                        {emailDelivered ? (
                            <span className="inline-flex items-center gap-1 text-xs bg-success-subtle text-success-subtle-foreground px-2 py-0.5 rounded">
                                <CheckCircle2 className="h-3 w-3" /> Entregado
                            </span>
                        ) : (
                            <span className="inline-flex items-center gap-1 text-xs bg-destructive/10 text-destructive px-2 py-0.5 rounded">
                                <XCircle className="h-3 w-3" /> Fallido
                            </span>
                        )}
                        {requestCount > 1 && (
                            <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded">
                                ×{requestCount} reintentos
                            </span>
                        )}
                    </div>
                    {name && (
                        <p className="text-sm text-foreground mb-1">{name}</p>
                    )}
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        <span><strong>Magnet:</strong> {leadMagnet}</span>
                        {created && <span><strong>Capturado:</strong> {created.toLocaleString()}</span>}
                        {emailed && <span><strong>Último envío:</strong> {emailed.toLocaleString()}</span>}
                    </div>
                    {(utm.utm_source || utm.utm_campaign) && (
                        <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
                            {utm.utm_source && (
                                <span className="bg-muted px-1.5 py-0.5 rounded">
                                    src: {utm.utm_source}
                                </span>
                            )}
                            {utm.utm_medium && (
                                <span className="bg-muted px-1.5 py-0.5 rounded">
                                    med: {utm.utm_medium}
                                </span>
                            )}
                            {utm.utm_campaign && (
                                <span className="bg-muted px-1.5 py-0.5 rounded">
                                    camp: {utm.utm_campaign}
                                </span>
                            )}
                            {utm.utm_content && (
                                <span className="bg-muted px-1.5 py-0.5 rounded">
                                    ctnt: {utm.utm_content}
                                </span>
                            )}
                        </div>
                    )}
                    {lastEmailError && (
                        <p className="mt-2 text-xs text-destructive">
                            Último error: {lastEmailError}
                        </p>
                    )}
                </div>
                <div className="flex flex-row sm:flex-col gap-2 shrink-0">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onResend(id)}
                        disabled={isResending}
                    >
                        {isResending ? (
                            <RefreshCw className="h-3.5 w-3.5 mr-1 animate-spin" />
                        ) : (
                            <Mail className="h-3.5 w-3.5 mr-1" />
                        )}
                        Reenviar
                    </Button>
                </div>
            </div>
        </Card>
    );
}

/**
 * CSV builder for nurture / CRM import. Columns chosen to match
 * what most email tools (Mailchimp, ConvertKit, Resend audiences)
 * expect on a CSV upload — email first, name second, and the
 * attribution columns afterwards for segmentation.
 */
function buildCsv(rows: LeadMagnetSubmission[]): string {
    const header = [
        'email',
        'name',
        'lead_magnet',
        'created_at',
        'email_delivered',
        'request_count',
        'utm_source',
        'utm_medium',
        'utm_campaign',
        'utm_content',
        'utm_term',
    ];

    const csvRows = rows.map(r => [
        r.email,
        r.name ?? '',
        r.leadMagnet,
        r.createdAt?.toDate?.().toISOString() ?? '',
        r.emailDelivered ? 'yes' : 'no',
        String(r.requestCount),
        r.utm.utm_source ?? '',
        r.utm.utm_medium ?? '',
        r.utm.utm_campaign ?? '',
        r.utm.utm_content ?? '',
        r.utm.utm_term ?? '',
    ]);

    return [header, ...csvRows]
        .map(cols => cols.map(escapeCsv).join(','))
        .join('\n');
}

function escapeCsv(value: string): string {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
        return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
}
