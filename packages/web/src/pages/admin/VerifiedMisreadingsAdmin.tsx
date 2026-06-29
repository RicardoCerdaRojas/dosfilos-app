import { useState } from 'react';
import { toast } from 'sonner';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, RefreshCw, ShieldCheck, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { parsePassageReference, type VerifiedMisreadingRecord } from '@dosfilos/domain';
import {
    useVerifiedMisreadings,
    useReviewVerifiedMisreading,
    useIngestVerifiedMisreading,
} from '@/hooks/admin/useVerifiedMisreadings';

/**
 * ADR-036 PR4 — admin del set crítico curado (`verifiedMisreadings/`).
 *
 * Curar (ingest → pending) + revisar la cola (verifica verso + adjudica refuta +
 * resuelve procedencia R3 + aprueba). El gate fail-closed (yes + reviewed) lo
 * aplica el merge runtime (PR5), no esta pantalla. Gate de rol: super_admin
 * (placeholder de `floor-reviewer`).
 */
export function VerifiedMisreadingsAdmin() {
    const pending = useVerifiedMisreadings('pending-pastoral-review');
    const reviewed = useVerifiedMisreadings('reviewed');

    return (
        <div className="p-6 max-w-4xl mx-auto space-y-6">
            <div className="flex items-center gap-2">
                <ShieldCheck className="h-6 w-6 text-primary" />
                <h1 className="text-2xl font-semibold">Lecturas erróneas verificadas</h1>
            </div>
            <p className="text-sm text-muted-foreground">
                Set crítico curado (ADR-036). Las anclas se verifican (verso real + refuta la lectura) y se
                aprueban antes de poder confrontar con ellas. El gate duro se re-evalúa en el sermón.
            </p>

            <IngestForm onIngested={pending.refresh} />

            <Section
                title="Cola de revisión"
                empty="Sin entradas pendientes."
                items={pending.items}
                loading={pending.loading}
                onRefresh={() => { void pending.refresh(); void reviewed.refresh(); }}
                reviewable
                onReviewed={() => { void pending.refresh(); void reviewed.refresh(); }}
            />

            <Section
                title="Revisadas"
                empty="Aún no hay entradas revisadas."
                items={reviewed.items}
                loading={reviewed.loading}
                onRefresh={() => void reviewed.refresh()}
            />
        </div>
    );
}

function Section(props: {
    title: string;
    empty: string;
    items: VerifiedMisreadingRecord[];
    loading: boolean;
    onRefresh: () => void;
    reviewable?: boolean;
    onReviewed?: () => void;
}) {
    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">
                    {props.title} <span className="text-muted-foreground">({props.items.length})</span>
                </h2>
                <Button size="sm" variant="ghost" onClick={props.onRefresh}>
                    <RefreshCw className="h-4 w-4" />
                </Button>
            </div>
            {props.loading ? (
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            ) : props.items.length === 0 ? (
                <p className="text-sm text-muted-foreground">{props.empty}</p>
            ) : (
                props.items.map((item) => (
                    <EntryCard
                        key={item.id}
                        item={item}
                        reviewable={props.reviewable}
                        onReviewed={props.onReviewed}
                    />
                ))
            )}
        </div>
    );
}

function refutesBadge(refutes?: string) {
    if (refutes === 'yes') return <Badge className="bg-success text-success-foreground">refuta ✓</Badge>;
    if (refutes === 'unclear') return <Badge variant="secondary">ambiguo</Badge>;
    if (refutes === 'no') return <Badge variant="destructive">no refuta</Badge>;
    return <Badge variant="outline">sin verificar</Badge>;
}

function EntryCard({
    item,
    reviewable,
    onReviewed,
}: {
    item: VerifiedMisreadingRecord;
    reviewable?: boolean;
    onReviewed?: () => void;
}) {
    const { review, busy } = useReviewVerifiedMisreading();

    const runReview = async (approve: boolean) => {
        try {
            const res = await review(item.id, approve);
            toast.success(
                `Verificación: verso ${res.verification.versesExist ? 'existe' : 'NO existe'}, ${res.verification.refutes}` +
                    (approve ? ' · aprobada' : ''),
            );
            onReviewed?.();
        } catch (e) {
            toast.error(e instanceof Error ? e.message : 'Falló la revisión');
        }
    };

    return (
        <Card className="p-4 space-y-3">
            <div className="flex items-start justify-between gap-3">
                <div>
                    <p className="font-medium">{item.claim}</p>
                    <p className="text-xs text-muted-foreground">
                        {item.passageScope.bookId} {item.passageScope.chapterStart}:{item.passageScope.verseStart}
                        {item.passageScope.verseEnd ? `-${item.passageScope.verseEnd}` : ''} · {item.severity}
                    </p>
                </div>
                {refutesBadge(item.verification?.refutes)}
            </div>
            {item.whyWrong && <p className="text-sm text-muted-foreground">{item.whyWrong}</p>}
            <ul className="space-y-1">
                {item.correctiveAnchors.map((a, i) => (
                    <li key={i} className="text-sm flex items-center gap-2">
                        <span className="font-semibold">{a.reference}</span>
                        {a.note && <span className="text-muted-foreground">— {a.note}</span>}
                        {a.provenanceVerified && a.sourceProvenance?.kind === 'chunk' ? (
                            <Badge variant="outline" className="text-xs">
                                {a.sourceProvenance.resourceTitle}
                                {a.sourceProvenance.page ? ` p.${a.sourceProvenance.page}` : ''}
                            </Badge>
                        ) : a.sourceId ? (
                            <Badge variant="secondary" className="text-xs flex items-center gap-1">
                                <AlertTriangle className="h-3 w-3" /> sin fuente trazable
                            </Badge>
                        ) : null}
                    </li>
                ))}
            </ul>
            {reviewable && (
                <div className="flex gap-2 pt-1">
                    <Button size="sm" variant="outline" disabled={busy} onClick={() => void runReview(false)}>
                        {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Verificar'}
                    </Button>
                    <Button size="sm" disabled={busy} onClick={() => void runReview(true)}>
                        <CheckCircle2 className="h-3 w-3 mr-1.5" /> Verificar y aprobar
                    </Button>
                </div>
            )}
        </Card>
    );
}

function IngestForm({ onIngested }: { onIngested: () => void }) {
    const { ingest, busy } = useIngestVerifiedMisreading();
    const [claim, setClaim] = useState('');
    const [whyWrong, setWhyWrong] = useState('');
    const [passageRef, setPassageRef] = useState('');
    const [severity, setSeverity] = useState<'critical' | 'standard'>('critical');
    const [anchorRef, setAnchorRef] = useState('');
    const [anchorSourceId, setAnchorSourceId] = useState('');

    const submit = async () => {
        if (!claim.trim() || !passageRef.trim() || !anchorRef.trim()) {
            toast.error('Claim, pasaje y al menos un ancla son obligatorios');
            return;
        }
        // Parsea el pasaje con el MISMO parser que el merge (PR5) → el bookId
        // canónico coincide por construcción (evita mismatch silencioso).
        const parsed = parsePassageReference(passageRef.trim());
        if (!parsed.ok) {
            toast.error(`Pasaje no reconocido: ${parsed.hint || passageRef}`);
            return;
        }
        try {
            await ingest({
                passageScope: {
                    bookId: parsed.ref.bookId,
                    chapterStart: parsed.ref.chapterStart,
                    verseStart: parsed.ref.verseStart ?? 0,
                    verseEnd: parsed.ref.verseEnd ?? parsed.ref.verseStart ?? 0,
                },
                claim: claim.trim(),
                whyWrong: whyWrong.trim(),
                severity,
                correctiveAnchors: [
                    { reference: anchorRef.trim(), ...(anchorSourceId.trim() ? { sourceId: anchorSourceId.trim() } : {}) },
                ],
            });
            toast.success('Entrada creada (pendiente de revisión)');
            setClaim(''); setWhyWrong(''); setPassageRef(''); setAnchorRef(''); setAnchorSourceId('');
            onIngested();
        } catch (e) {
            toast.error(e instanceof Error ? e.message : 'Falló la ingesta');
        }
    };

    return (
        <Card className="p-4 space-y-3">
            <h2 className="text-lg font-semibold">Curar entrada nueva</h2>
            <Textarea placeholder="Lectura errónea (claim)" value={claim} onChange={(e) => setClaim(e.target.value)} />
            <Textarea placeholder="Por qué es errónea" value={whyWrong} onChange={(e) => setWhyWrong(e.target.value)} />
            <Input
                placeholder="Pasaje donde dispara (ej. 2 Pedro 2:20-22)"
                value={passageRef}
                onChange={(e) => setPassageRef(e.target.value)}
            />
            <div className="grid grid-cols-2 gap-2">
                <Input placeholder="Ancla (ej. Juan 10:28-29)" value={anchorRef} onChange={(e) => setAnchorRef(e.target.value)} />
                <Input placeholder="sourceId del chunk (opcional)" value={anchorSourceId} onChange={(e) => setAnchorSourceId(e.target.value)} />
            </div>
            <div className="flex items-center gap-2">
                <Button
                    size="sm"
                    variant={severity === 'critical' ? 'default' : 'outline'}
                    onClick={() => setSeverity('critical')}
                >
                    critical
                </Button>
                <Button
                    size="sm"
                    variant={severity === 'standard' ? 'default' : 'outline'}
                    onClick={() => setSeverity('standard')}
                >
                    standard
                </Button>
                <div className="flex-1" />
                <Button disabled={busy} onClick={() => void submit()}>
                    {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Crear entrada'}
                </Button>
            </div>
        </Card>
    );
}
