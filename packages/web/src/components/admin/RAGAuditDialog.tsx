import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
    Activity, AlertTriangle, BookOpen, CheckCircle2, Database, FileText,
    GraduationCap, Loader2, PlayCircle, RefreshCw, Search, TriangleAlert
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface StoreAudit {
    key: string;
    displayName: string;
    storeId: string | null;
    resourceCount: number;
    llamaParseCount: number;
    indexedCount: number;
    chunkCount: number;
    pageCount: number;
    tutorCount: number;
}

interface ResourceAudit {
    id: string;
    title: string;
    author: string;
    stores: string[];
    extractionVersion?: string;
    indexingStatus?: string;
    indexedChunkCount?: number;
    actualChunkCount: number;
    /** Ausente = indexado antes de que existiera el saneo. Ver `SaneoCell`. */
    sanitization?: { removed: number; byCategory: Record<string, number> };
    pageCount?: number;
}

interface AuditIssue {
    resourceId: string;
    title: string;
    severity: 'error' | 'warning';
    category: string;
    message: string;
}

interface AuditResponse {
    generatedAt: string;
    summary: {
        totalResources: number;
        totalStores: number;
        totalChunks: number;
        totalPages: number;
        llamaParseCount: number;
        indexedCount: number;
        issuesCount: number;
    };
    stores: StoreAudit[];
    resources: ResourceAudit[];
    issues: AuditIssue[];
}

interface RetrievedChunk {
    id: string;
    resourceId: string;
    resourceTitle: string;
    resourceAuthor: string;
    chunkIndex: number;
    text: string;
    metadata: { page?: number; section?: string; sectionPath?: string[]; chunkType?: string };
    score: number;
    sectionBreadcrumb: string;
}

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    availableStores: Array<{ key: string; displayName: string }>;
}

export function RAGAuditDialog({ open, onOpenChange, availableStores }: Props) {
    const [activeTab, setActiveTab] = useState<'audit' | 'playground'>('audit');

    // Audit state
    const [audit, setAudit] = useState<AuditResponse | null>(null);
    const [loadingAudit, setLoadingAudit] = useState(false);

    // Playground state
    const [query, setQuery] = useState('');
    const [selectedStore, setSelectedStore] = useState<string>('all');
    const [chunks, setChunks] = useState<RetrievedChunk[]>([]);
    const [loadingQuery, setLoadingQuery] = useState(false);

    const runAudit = async () => {
        setLoadingAudit(true);
        try {
            const functions = getFunctions();
            const auditFn = httpsCallable(functions, 'auditIndexing', { timeout: 300_000 });
            const result = await auditFn({});
            setAudit(result.data as AuditResponse);
        } catch (err: any) {
            console.error('[RAGAudit]', err);
            toast.error(`Error ejecutando auditoría: ${err.message}`);
        } finally {
            setLoadingAudit(false);
        }
    };

    const runQuery = async () => {
        if (!query.trim()) return;
        setLoadingQuery(true);
        setChunks([]);
        try {
            const functions = getFunctions();
            const retrieveFn = httpsCallable(functions, 'retrieveChunks', { timeout: 30_000 });
            const result = await retrieveFn({
                query,
                stores: selectedStore === 'all' ? [] : [selectedStore],
                topK: 10,
                minSimilarity: 0,
            });
            const data = result.data as { chunks: RetrievedChunk[] };
            setChunks(data.chunks ?? []);
        } catch (err: any) {
            console.error('[RAGAudit Playground]', err);
            toast.error(`Error en la búsqueda: ${err.message}`);
        } finally {
            setLoadingQuery(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Activity className="h-5 w-5" />
                        Auditoría y Diagnóstico RAG
                    </DialogTitle>
                    <DialogDescription>
                        Inspecciona el estado del índice vectorial y prueba el retrieval en vivo.
                    </DialogDescription>
                </DialogHeader>

                {/* Tabs */}
                <div className="flex gap-1 border-b">
                    <button
                        onClick={() => setActiveTab('audit')}
                        className={cn(
                            "px-4 py-2 text-sm font-medium border-b-2 transition-colors",
                            activeTab === 'audit'
                                ? "border-primary text-foreground"
                                : "border-transparent text-muted-foreground hover:text-foreground"
                        )}
                    >
                        <Database className="h-4 w-4 inline mr-1.5" />
                        Auditoría
                    </button>
                    <button
                        onClick={() => setActiveTab('playground')}
                        className={cn(
                            "px-4 py-2 text-sm font-medium border-b-2 transition-colors",
                            activeTab === 'playground'
                                ? "border-primary text-foreground"
                                : "border-transparent text-muted-foreground hover:text-foreground"
                        )}
                    >
                        <PlayCircle className="h-4 w-4 inline mr-1.5" />
                        Playground de Retrieval
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto pr-2 -mr-2">
                    {activeTab === 'audit' ? (
                        <AuditView audit={audit} loading={loadingAudit} onRun={runAudit} />
                    ) : (
                        <PlaygroundView
                            query={query}
                            setQuery={setQuery}
                            selectedStore={selectedStore}
                            setSelectedStore={setSelectedStore}
                            chunks={chunks}
                            loading={loadingQuery}
                            onSearch={runQuery}
                            availableStores={availableStores}
                        />
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}

// ── Audit View ─────────────────────────────────────────────────────────────

function AuditView({ audit, loading, onRun }: { audit: AuditResponse | null; loading: boolean; onRun: () => void }) {
    const { t: tAdmin } = useTranslation('admin');
    if (!audit && !loading) {
        return (
            <div className="flex flex-col items-center justify-center py-12 text-center">
                <Activity className="h-12 w-12 text-muted-foreground/40 mb-4" />
                <p className="text-sm text-muted-foreground mb-4">Ejecuta la auditoría para ver el estado del índice</p>
                <Button onClick={onRun}>
                    <Activity className="h-4 w-4 mr-2" />
                    Ejecutar Auditoría
                </Button>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-12 text-center">
                <Loader2 className="h-12 w-12 text-primary animate-spin mb-4" />
                <p className="text-sm text-muted-foreground">Analizando el índice…</p>
            </div>
        );
    }

    if (!audit) return null;

    const s = audit.summary;
    const indexHealthPct = s.totalResources > 0 ? Math.round((s.indexedCount / s.totalResources) * 100) : 0;

    return (
        <div className="space-y-5">
            {/* Summary metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <MetricTile icon={Database} label="Total chunks" value={s.totalChunks.toLocaleString()} />
                <MetricTile icon={FileText} label="Documentos" value={`${s.indexedCount}/${s.totalResources}`} subtitle={`${indexHealthPct}% indexados`} highlight={indexHealthPct === 100} />
                <MetricTile icon={BookOpen} label="Páginas" value={s.totalPages.toLocaleString()} />
                <MetricTile icon={AlertTriangle} label="Issues" value={s.issuesCount} highlight={s.issuesCount === 0} alert={s.issuesCount > 0} />
            </div>

            {/* Issues list */}
            {audit.issues.length > 0 && (
                <section>
                    <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                        <TriangleAlert className="h-4 w-4 text-amber-600" />
                        Problemas detectados ({audit.issues.length})
                    </h3>
                    <div className="border rounded-md divide-y">
                        {audit.issues.map((issue, i) => (
                            <div key={i} className="p-3 text-sm flex items-start gap-3">
                                <Badge variant={issue.severity === 'error' ? 'destructive' : 'secondary'} className="shrink-0">
                                    {issue.severity === 'error' ? 'Error' : 'Warning'}
                                </Badge>
                                <div className="min-w-0 flex-1">
                                    <div className="font-medium truncate">{issue.title}</div>
                                    <div className="text-xs text-muted-foreground">{issue.message}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {s.issuesCount === 0 && (
                <div className="border border-emerald-300 bg-emerald-50/50 dark:bg-emerald-950/20 dark:border-emerald-900 rounded-md p-3 text-sm flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                    <span className="text-emerald-800 dark:text-emerald-300 font-medium">
                        Sin problemas detectados — todo el índice está saludable.
                    </span>
                </div>
            )}

            {/* Stores breakdown */}
            <section>
                <h3 className="text-sm font-semibold mb-2">Por Store</h3>
                <div className="border rounded-md overflow-hidden">
                    <table className="w-full text-sm">
                        <thead className="bg-muted/50 text-xs text-muted-foreground">
                            <tr>
                                <th className="text-left px-3 py-2 font-medium">Store</th>
                                <th className="text-right px-3 py-2 font-medium">Docs</th>
                                <th className="text-right px-3 py-2 font-medium">LlamaParse</th>
                                <th className="text-right px-3 py-2 font-medium">Indexados</th>
                                <th className="text-right px-3 py-2 font-medium">Chunks</th>
                                <th className="text-right px-3 py-2 font-medium">Páginas</th>
                                <th className="text-right px-3 py-2 font-medium">Tutores</th>
                            </tr>
                        </thead>
                        <tbody>
                            {audit.stores.map(store => (
                                <tr key={store.key} className="border-t">
                                    <td className="px-3 py-2">
                                        <div className="font-medium">{store.displayName}</div>
                                        <div className="text-xs text-muted-foreground">{store.key}</div>
                                    </td>
                                    <td className="text-right px-3 py-2 tabular-nums">{store.resourceCount}</td>
                                    <td className={cn("text-right px-3 py-2 tabular-nums", store.llamaParseCount < store.resourceCount && "text-amber-600")}>
                                        {store.llamaParseCount}/{store.resourceCount}
                                    </td>
                                    <td className={cn("text-right px-3 py-2 tabular-nums", store.indexedCount < store.llamaParseCount && "text-amber-600", store.indexedCount === store.resourceCount && store.resourceCount > 0 && "text-emerald-600")}>
                                        {store.indexedCount}/{store.resourceCount}
                                    </td>
                                    <td className="text-right px-3 py-2 tabular-nums font-medium">{store.chunkCount.toLocaleString()}</td>
                                    <td className="text-right px-3 py-2 tabular-nums text-muted-foreground">{store.pageCount.toLocaleString()}</td>
                                    <td className="text-right px-3 py-2">
                                        <Badge variant="outline" className="font-normal">
                                            <GraduationCap className="h-3 w-3 mr-1" />
                                            {store.tutorCount}
                                        </Badge>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>

            {/* Resources breakdown */}
            <section>
                <h3 className="text-sm font-semibold mb-2">Por Documento</h3>
                <div className="border rounded-md overflow-hidden max-h-96 overflow-y-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-muted/50 text-xs text-muted-foreground sticky top-0">
                            <tr>
                                <th className="text-left px-3 py-2 font-medium">Documento</th>
                                <th className="text-left px-3 py-2 font-medium">Autor</th>
                                <th className="text-right px-3 py-2 font-medium">Págs</th>
                                <th className="text-right px-3 py-2 font-medium">Chunks</th>
                                <th className="text-left px-3 py-2 font-medium">{tAdmin('ragAudit.sanitization.column')}</th>
                                <th className="text-left px-3 py-2 font-medium">Stores</th>
                            </tr>
                        </thead>
                        <tbody>
                            {audit.resources.map(r => (
                                <tr key={r.id} className="border-t">
                                    <td className="px-3 py-2 font-medium">{r.title}</td>
                                    <td className="px-3 py-2 text-muted-foreground">{r.author}</td>
                                    <td className="text-right px-3 py-2 tabular-nums">{r.pageCount ?? '—'}</td>
                                    <td className={cn(
                                        "text-right px-3 py-2 tabular-nums font-medium",
                                        r.actualChunkCount === 0 && "text-red-600",
                                        r.actualChunkCount > 0 && "text-emerald-600"
                                    )}>
                                        {r.actualChunkCount}
                                    </td>
                                    <td className="px-3 py-2">
                                        <SaneoCell sanitization={r.sanitization} />
                                    </td>
                                    <td className="px-3 py-2">
                                        <div className="flex flex-wrap gap-1">
                                            {r.stores.map(s => (
                                                <Badge key={s} variant="outline" className="text-[10px] px-1 py-0 h-4 font-normal">
                                                    {s}
                                                </Badge>
                                            ))}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>

            <div className="flex items-center justify-between pt-2 border-t">
                <span className="text-xs text-muted-foreground">
                    Generado: {new Date(audit.generatedAt).toLocaleString('es')}
                </span>
                <Button variant="outline" size="sm" onClick={onRun}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Re-ejecutar
                </Button>
            </div>
        </div>
    );
}

// ── Playground View ────────────────────────────────────────────────────────

function PlaygroundView({
    query, setQuery, selectedStore, setSelectedStore, chunks, loading, onSearch, availableStores,
}: {
    query: string;
    setQuery: (s: string) => void;
    selectedStore: string;
    setSelectedStore: (s: string) => void;
    chunks: RetrievedChunk[];
    loading: boolean;
    onSearch: () => void;
    availableStores: Array<{ key: string; displayName: string }>;
}) {
    return (
        <div className="space-y-4">
            <div className="space-y-2">
                <label className="text-sm font-medium">Query de prueba</label>
                <Textarea
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    placeholder="¿Qué dice Wallace sobre el aoristo indicativo?"
                    rows={2}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                            e.preventDefault();
                            onSearch();
                        }
                    }}
                />
                <p className="text-xs text-muted-foreground">⌘/Ctrl + Enter para ejecutar</p>
            </div>

            <div className="flex items-end gap-2">
                <div className="flex-1 space-y-1">
                    <label className="text-xs text-muted-foreground">Store</label>
                    <Select value={selectedStore} onValueChange={setSelectedStore}>
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todos los stores</SelectItem>
                            {availableStores.map(s => (
                                <SelectItem key={s.key} value={s.key}>{s.displayName}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <Button onClick={onSearch} disabled={loading || !query.trim()}>
                    {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Search className="h-4 w-4 mr-2" />}
                    Buscar
                </Button>
            </div>

            {/* Results */}
            <div className="space-y-3">
                {!loading && chunks.length === 0 && query && (
                    <div className="text-center py-8 text-sm text-muted-foreground border rounded-md border-dashed">
                        Sin resultados. Prueba con otra pregunta o cambia de store.
                    </div>
                )}
                {chunks.map((c, i) => (
                    <ChunkCard key={c.id} chunk={c} rank={i + 1} />
                ))}
            </div>
        </div>
    );
}

function ChunkCard({ chunk, rank }: { chunk: RetrievedChunk; rank: number }) {
    const scorePct = Math.round(chunk.score * 100);
    return (
        <div className="border rounded-md p-3 hover:bg-muted/30 transition-colors">
            <div className="flex items-start justify-between gap-3 mb-2">
                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 text-sm font-semibold">
                        <span className="text-muted-foreground">#{rank}</span>
                        <BookOpen className="h-3.5 w-3.5 text-indigo-500" />
                        <span className="truncate">{chunk.resourceTitle}</span>
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                        {chunk.resourceAuthor}
                        {chunk.metadata.page !== undefined && <> · <span className="font-medium">p. {chunk.metadata.page}</span></>}
                        {chunk.sectionBreadcrumb && <> · <span>§ {chunk.sectionBreadcrumb}</span></>}
                    </div>
                </div>
                <Badge
                    variant="secondary"
                    className={cn(
                        "shrink-0 tabular-nums",
                        scorePct >= 70 && "bg-emerald-100 text-emerald-800",
                        scorePct < 70 && scorePct >= 50 && "bg-amber-100 text-amber-800",
                        scorePct < 50 && "bg-slate-100 text-slate-700"
                    )}
                >
                    {scorePct}%
                </Badge>
            </div>
            <p className="text-xs text-muted-foreground line-clamp-4 leading-relaxed">
                {chunk.text}
            </p>
        </div>
    );
}

// ── Small pieces ───────────────────────────────────────────────────────────

function MetricTile({
    icon: Icon, label, value, subtitle, highlight, alert,
}: {
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    value: string | number;
    subtitle?: string;
    highlight?: boolean;
    alert?: boolean;
}) {
    return (
        <div className={cn(
            "rounded-lg border bg-card p-3",
            highlight && "border-emerald-300 bg-emerald-50/40 dark:bg-emerald-950/10 dark:border-emerald-900",
            alert && "border-amber-300 bg-amber-50/40 dark:bg-amber-950/10 dark:border-amber-900"
        )}>
            <div className="flex items-start gap-2">
                <div className={cn(
                    "h-8 w-8 rounded-md flex items-center justify-center shrink-0 bg-muted",
                    highlight && "bg-emerald-100 dark:bg-emerald-900/40",
                    alert && "bg-amber-100 dark:bg-amber-900/40"
                )}>
                    <Icon className={cn(
                        "h-4 w-4 text-muted-foreground",
                        highlight && "text-emerald-600",
                        alert && "text-amber-600"
                    )} />
                </div>
                <div className="min-w-0 flex-1">
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</div>
                    <div className="text-lg font-bold leading-tight">{value}</div>
                    {subtitle && <div className="text-xs text-muted-foreground truncate">{subtitle}</div>}
                </div>
            </div>
        </div>
    );
}

/**
 * Estado de saneo de un documento indexado.
 *
 * Los tres estados NO son dos. "Sin dato" (campo ausente) significa que el
 * documento se indexó antes de que el saneo existiera: su índice puede
 * contener invisibles y, peor, sus embeddings se calcularon sobre el texto
 * sucio — eso la lectura no lo arregla, sólo lo arregla reindexar. "Limpio"
 * significa que se revisó y no había nada, que es una afirmación distinta.
 */
function SaneoCell({ sanitization }: { sanitization?: { removed: number; byCategory: Record<string, number> } }) {
    const { t } = useTranslation('admin');
    if (!sanitization) {
        return (
            <Badge
                variant="outline"
                className="text-[10px] px-1 py-0 h-4 font-normal text-warning-subtle-foreground border-warning"
                title={t('ragAudit.sanitization.missingHint')}
            >
                {t('ragAudit.sanitization.missing')}
            </Badge>
        );
    }
    if (sanitization.removed === 0) {
        return (
            <span className="text-xs text-muted-foreground" title={t('ragAudit.sanitization.cleanHint')}>
                {t('ragAudit.sanitization.clean')}
            </span>
        );
    }
    const detalle = Object.entries(sanitization.byCategory)
        .sort((a, b) => b[1] - a[1])
        .map(([categoria, cuenta]) => `${categoria}=${cuenta}`)
        .join(' · ');
    return (
        <span className="text-xs tabular-nums text-success-subtle-foreground" title={detalle}>
            −{sanitization.removed.toLocaleString()}
        </span>
    );
}

// Suppress unused-import warning for `Input` (reserved for future single-line query use)
export const _reserved = { Input };
