import { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { libraryService, categoryService, coreLibraryAdminService } from '@dosfilos/application';
import { LibraryCategory, ResourceType } from '@dosfilos/domain';
import { Upload } from 'lucide-react';
import { RefreshCw, Database, FileText, CheckCircle, AlertTriangle, Loader2, BookOpen, Mic2, Library, Wand2, HelpCircle, ChevronDown, ChevronRight, GraduationCap, Folder, Sparkles, Activity, Pencil } from 'lucide-react';
import { RAGAuditDialog } from '@/components/admin/RAGAuditDialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { useFirebase } from '@/context/firebase-context';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Trash2, Settings } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { MetricCard } from './core-library/MetricCard';
import { annotateDocumentText, uploadAnnotatedTextToGemini } from './core-library/annotateDocument';

// Spanish display labels for the rights-aware enum vocab that the
// `core-library-seed.json` brings in. Kept local to this admin page
// because the source-of-truth lives in `@dosfilos/domain` as raw enum
// strings — adding i18n keys per value would over-couple the catalog.
const INGESTION_STATUS_LABELS_ES: Record<string, string> = {
    approved_full_ingestion: 'Ingesta completa',
    approved_full_ingestion_with_attribution: 'Ingesta completa con atribución',
    approved_full_ingestion_for_historical_text_only: 'Ingesta solo texto histórico',
    approved_metadata_only: 'Solo metadata',
    requires_manual_review: 'Requiere revisión manual',
};

const RISK_LEVEL_LABELS_ES: Record<string, string> = {
    low: 'Bajo',
    low_to_medium: 'Medio bajo',
    medium: 'Medio',
    high_for_full_ingestion: 'Alto (ingesta completa)',
};

/**
 * Renders a long license string in a compact form. The seed JSON ships
 * sentence-style license clauses for `_for_historical_text_only`
 * sources (e.g. "Public Domain for historical text; edition may
 * include additional permissions or restrictions."). The admin table
 * gets unreadable when those expand a column, so we surface a short
 * label + the full string as a tooltip.
 */
function compactLicenseLabel(license: string | undefined | null): string {
    if (!license) return 'Sin clasificar';
    if (license === 'unknown') return 'Sin clasificar';
    if (license.startsWith('Public Domain for historical text')) {
        return 'Public Domain (histórico)';
    }
    if (license.startsWith('All rights reserved')) {
        return 'Reservados';
    }
    return license;
}

interface StoreConfig {
    stores: Record<string, string | null>;
    files: Record<string, any[]>;
    descriptions?: Record<string, string>;
    displayNames?: Record<string, string>;
    createdAt: Date;
    lastValidatedAt: Date;
}

interface SyncStatus {
    isSynced: boolean;
    desiredCount: number;
    currentCount: number;
    missing: string[];
}

type StoreContext = string;

export default function CoreLibraryAdmin() {
    const firebase = useFirebase();
    const [config, setConfig] = useState<StoreConfig | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<StoreContext>('exegesis');
    
    // Create Store State
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [newStoreKey, setNewStoreKey] = useState('');
    const [newStoreName, setNewStoreName] = useState('');
    const [newStoreDesc, setNewStoreDesc] = useState('');
    const [isCreating, setIsCreating] = useState(false);

    // Dynamic Sync Status State
    const [syncStatus, setSyncStatus] = useState<Record<string, SyncStatus>>({});
    const [syncing, setSyncing] = useState<Record<string, boolean>>({});
    const [storeResources, setStoreResources] = useState<Record<string, any[]>>({});

    // Unlink file state
    const [isUnlinking, setIsUnlinking] = useState<string | null>(null);

    // Manual Retry state
    const [isRetrying, setIsRetrying] = useState<string | null>(null);

    // Annotation state
    const [annotating, setAnnotating] = useState<Record<string, boolean>>({});
    const [annotationProgress, setAnnotationProgress] = useState<Record<string, string>>({});

    // Reprocess (LlamaParse) state
    const [reprocessing, setReprocessing] = useState<Record<string, boolean>>({});
    const [reprocessProgress, setReprocessProgress] = useState<Record<string, string>>({});

    // Index (Phase 2 vector search) state
    const [indexing, setIndexing] = useState<Record<string, boolean>>({});
    const [indexProgress, setIndexProgress] = useState<Record<string, string>>({});

    // Audit dialog state
    const [isAuditOpen, setIsAuditOpen] = useState(false);

    // CORE seed ingest + system-source resources surfacing (Phase 0 deuda).
    // Loaded separately from the per-store tabs because system sources are
    // not bound to user-assigned `coreStores` keys.
    const [isIngestingSeed, setIsIngestingSeed] = useState(false);
    const [systemSources, setSystemSources] = useState<any[]>([]);
    const [systemSourcesLoading, setSystemSourcesLoading] = useState(false);

    const loadSystemSources = async () => {
        try {
            setSystemSourcesLoading(true);
            const docs = await coreLibraryAdminService.getSystemSourceResources();
            setSystemSources(docs);
        } catch (err: any) {
            console.error('[CoreLibraryAdmin] failed to load system sources:', err);
        } finally {
            setSystemSourcesLoading(false);
        }
    };

    const handleIngestSeed = async () => {
        const ok = await askConfirm({
            title: 'Ingestar seed CORE Library',
            description:
                'Escribe los 8 recursos no-confesionales del JSON canónico (SBLGNT, Schaff x3, Chicago x3) en library_resources. Idempotente — re-ejecutar es seguro. Las 14 confesiones ya viven en /confessions/ y se omiten aquí.',
            confirmLabel: 'Ingestar seed',
        });
        if (!ok) return;
        try {
            setIsIngestingSeed(true);
            const result = await coreLibraryAdminService.ingestLibrarySeedSources();
            toast.success(
                `Seed ingest completo — ${result.written} recursos escritos, ${result.skipped} omitidos (ya en /confessions/)`,
            );
            await loadSystemSources();
            await loadConfig();
        } catch (err: any) {
            console.error('[ingestLibrarySeed] error:', err);
            toast.error(`Error: ${err.message}`);
        } finally {
            setIsIngestingSeed(false);
        }
    };

    // Backfill state — client-side classification of legacy library_resources
    // docs that pre-date PR 0.3 (no callable; admin owns the docs and writes
    // directly via Firestore rules).
    const [isBackfilling, setIsBackfilling] = useState(false);

    const handleBackfillRights = async () => {
        if (!firebase?.user) return;
        const ok = await askConfirm({
            title: 'Backfill licencias de docs legacy',
            description:
                'Clasifica heurísticamente los library_resources con license=unknown asignando Public Domain a autores conocidos (Hodge, Spurgeon, Calvin, etc.). Solo toca docs sin clasificar previa. Idempotente.',
            confirmLabel: 'Ejecutar backfill',
        });
        if (!ok) return;
        try {
            setIsBackfilling(true);
            const result = await coreLibraryAdminService.backfillLegacyRightsByAuthor(firebase.user.uid);
            console.log('[backfill]', result);
            toast.success(
                `Backfill completo — ${result.classified} clasificados, ${result.skipped} ya tenían licencia, ${result.unknown} sin match heurístico`,
            );
            await loadConfig();
        } catch (err: any) {
            console.error('[backfill] error:', err);
            toast.error(`Error: ${err.message}`);
        } finally {
            setIsBackfilling(false);
        }
    };

    // Legacy Gemini File Search controls have been retired. Kept as a const false so
    // all `{advancedMode && ...}` branches compile out to nothing without requiring
    // invasive edits (Fase B/C will delete those branches entirely).
    const advancedMode = false;

    const handleIndexDocument = async (resourceId: string, title: string) => {
        setIndexing(prev => ({ ...prev, [resourceId]: true }));
        try {
            const data = await coreLibraryAdminService.indexDocument(resourceId, true);
            if (data.skipped) {
                toast.info(`"${title}" ya estaba indexado`);
            } else if (data.success) {
                const range = data.pageRange ? ` (págs ${data.pageRange.min}–${data.pageRange.max})` : '';
                toast.success(`"${title}": ${data.chunkCount} chunks indexados${range}`);
            }
            await loadConfig();
        } catch (err: any) {
            console.error('[Index]', err);
            toast.error(`Error indexando "${title}": ${err.message}`);
        } finally {
            setIndexing(prev => ({ ...prev, [resourceId]: false }));
        }
    };

    const handleIndexStore = async (storeKey: string) => {
        const docs = (storeResources[storeKey] ?? []) as any[];
        const indexable = docs.filter(d => d.extractionVersion === '3.0-llamaparse');
        const alreadyIndexed = indexable.filter(d => d.indexingStatus === 'ready').length;
        const pending = indexable.length - alreadyIndexed;

        if (indexable.length === 0) {
            toast.warning('Ningún documento con LlamaParse en este store. Reprocesa primero.');
            return;
        }
        if (pending === 0) {
            toast.info(`Los ${indexable.length} documentos ya están indexados. Usa el botón individual para re-indexar uno específico.`);
            return;
        }

        const ok = await askConfirm({
            title: `Indexar ${pending} documentos pendientes (Phase 2)`,
            description: alreadyIndexed > 0
                ? `Se procesarán ${pending} documentos. ${alreadyIndexed} ya están indexados y se saltarán automáticamente.`
                : `Se indexarán ${pending} documentos generando chunks semánticos + embeddings para el retrieval de los tutores. Puede tardar varios minutos.`,
            confirmLabel: 'Indexar pendientes',
        });
        if (!ok) return;

        setIndexing(prev => ({ ...prev, [`__store__${storeKey}`]: true }));
        let done = 0;
        let skipped = 0;
        let failed = 0;
        for (const doc of indexable) {
            setIndexProgress(prev => ({
                ...prev,
                [`__store__${storeKey}`]: `Indexando "${doc.title}" (${done + skipped + 1}/${indexable.length})…`
            }));
            try {
                const data = await coreLibraryAdminService.indexDocument(doc.id, false);
                if (data.skipped) {
                    skipped++;
                } else {
                    done++;
                }
                // Pause between docs to give Gemini embedding quota time to replenish
                await new Promise(resolve => setTimeout(resolve, 3000));
            } catch (err: any) {
                console.error(`[Index ${doc.title}]`, err);
                failed++;
                // If rate limited, wait longer before next doc
                const msg = err?.message ?? '';
                if (/429|RESOURCE_EXHAUSTED/i.test(msg)) {
                    console.log('[Index] Rate limited, waiting 30s before next doc...');
                    await new Promise(resolve => setTimeout(resolve, 30_000));
                }
            }
        }
        setIndexing(prev => ({ ...prev, [`__store__${storeKey}`]: false }));
        setIndexProgress(prev => ({ ...prev, [`__store__${storeKey}`]: '' }));

        if (failed > 0) {
            toast.warning(`Indexados: ${done} · Saltados: ${skipped} · Fallidos: ${failed}`);
        } else if (skipped > 0) {
            toast.success(`✅ ${done} nuevos indexados · ${skipped} ya estaban listos.`);
        } else {
            toast.success(`✅ ${done} documentos indexados. Los tutores ya pueden citar con páginas reales.`);
        }
        await loadConfig();
    };

    const handleReprocessDocument = async (resourceId: string, title: string) => {
        setReprocessing(prev => ({ ...prev, [resourceId]: true }));
        try {
            const data = await coreLibraryAdminService.reprocessWithLlamaParse(resourceId, true);
            if (data.skipped) {
                toast.info(`"${title}" ya estaba procesado con LlamaParse`);
            } else if (data.success) {
                toast.success(`"${title}": ${data.pageCount} páginas · ${data.creditsUsed} créditos usados`);
            }
            await loadConfig();
        } catch (err: any) {
            console.error('[Reprocess]', err);
            toast.error(`Error en "${title}": ${err.message}`);
        } finally {
            setReprocessing(prev => ({ ...prev, [resourceId]: false }));
        }
    };

    const handleProcessDocumentStandard = async (resourceId: string, title: string) => {
        setReprocessing(prev => ({ ...prev, [resourceId]: true }));
        try {
            const data = await coreLibraryAdminService.processWithGemini(resourceId, true);
            if (data.skipped) {
                toast.info(`"${title}" ya estaba procesado con Gemini estándar`);
            } else if (data.success) {
                toast.success(`"${title}": ${data.pageCount} páginas extraídas (Gemini estándar)`);
            }
            await loadConfig();
        } catch (err: any) {
            console.error('[ProcessGemini]', err);
            toast.error(`Error en "${title}": ${err.message}`);
        } finally {
            setReprocessing(prev => ({ ...prev, [resourceId]: false }));
        }
    };

    const handleReprocessStore = async (storeKey: string) => {
        const docs = (storeResources[storeKey] ?? []) as any[];
        if (docs.length === 0) return;

        const ok = await askConfirm({
            title: `Reprocesar ${docs.length} documentos con LlamaParse`,
            description: `Se reprocesarán todos los documentos del store "${storeKey}" con LlamaParse (fast mode, ~1 crédito por página). Los documentos ya en LlamaParse se saltan. Esta operación puede tardar varios minutos.`,
            confirmLabel: 'Reprocesar todos',
        });
        if (!ok) return;

        setReprocessing(prev => ({ ...prev, [`__store__${storeKey}`]: true }));
        let done = 0;
        let skipped = 0;
        let failed = 0;

        for (const doc of docs) {
            if (doc.extractionVersion === '3.0-llamaparse') {
                skipped++;
                continue;
            }
            setReprocessProgress(prev => ({
                ...prev,
                [`__store__${storeKey}`]: `Procesando "${doc.title}" (${done + 1}/${docs.length - skipped})…`
            }));
            try {
                await coreLibraryAdminService.reprocessWithLlamaParse(doc.id, false);
                done++;
            } catch (err: any) {
                console.error(`[Reprocess ${doc.title}]`, err);
                failed++;
            }
        }

        setReprocessing(prev => ({ ...prev, [`__store__${storeKey}`]: false }));
        setReprocessProgress(prev => ({ ...prev, [`__store__${storeKey}`]: '' }));

        if (failed > 0) {
            toast.warning(`Reprocesados: ${done} · Saltados: ${skipped} · Fallidos: ${failed}`);
        } else {
            toast.success(`Reprocesados: ${done} · Saltados: ${skipped}`);
        }
        await loadConfig();
    };

    // Agents (tutors) — used to show which tutors reference each store
    const [agents, setAgents] = useState<Array<{ id: string; name: string; icon?: string; isActive?: boolean; corpusIds?: string[] }>>([]);

    useEffect(() => {
        coreLibraryAdminService
            .getAgents()
            .then(setAgents)
            .catch(err => console.error('Failed to load agents:', err));
        loadSystemSources();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Live subscription to the active store's resources. The initial load +
    // sync validation still come from loadConfig/validateAllStores; this
    // listener keeps the *active tab's* `indexingStatus` fresh so a backend
    // index job finishing flips the "Procesando" badge to "Listo" without a
    // manual reload. Re-subscribes when the tab changes; unsubscribes on
    // cleanup so listeners don't leak across switches.
    const activeStoreExists = !!config?.stores?.[activeTab];
    useEffect(() => {
        const uid = firebase?.user?.uid;
        if (!uid || !activeTab || !activeStoreExists) return;
        const unsubscribe = coreLibraryAdminService.subscribeResourcesInStore(
            uid,
            activeTab,
            (docs) => setStoreResources(prev => ({ ...prev, [activeTab]: docs })),
        );
        return () => unsubscribe();
    }, [firebase?.user?.uid, activeTab, activeStoreExists]);

    const tutorsForStoreId = (storeId: string | null | undefined) =>
        storeId ? agents.filter(a => a.corpusIds?.includes(storeId)) : [];

    // Batch operation state
    const [batchOperation, setBatchOperation] = useState<{ type: 'annotate' | 'sync' | null; current: number; total: number; storeKey: string | null }>({
        type: null, current: 0, total: 0, storeKey: null,
    });

    // Reusable promise-based confirmation dialog
    type ConfirmState = {
        open: boolean;
        title: string;
        description: string;
        confirmLabel?: string;
        variant?: 'default' | 'destructive';
    };
    const [confirmState, setConfirmState] = useState<ConfirmState>({
        open: false, title: '', description: '',
    });
    const confirmResolveRef = useRef<((v: boolean) => void) | null>(null);

    const askConfirm = (opts: Omit<ConfirmState, 'open'>): Promise<boolean> =>
        new Promise(resolve => {
            confirmResolveRef.current = resolve;
            setConfirmState({ ...opts, open: true });
        });

    const settleConfirm = (result: boolean) => {
        confirmResolveRef.current?.(result);
        confirmResolveRef.current = null;
        setConfirmState(s => ({ ...s, open: false }));
    };

    const handleAnnotateAll = async (force: boolean = false) => {
        const keys = config?.stores ? Object.keys(config.stores).sort((a, b) => a.localeCompare(b, 'es')) : [];
        if (keys.length === 0) return;
        const ok = await askConfirm({
            title: force
                ? `Forzar re-anotación de ${keys.length} stores`
                : `Anotar y recrear ${keys.length} stores`,
            description: force
                ? 'Esto RE-ANOTA TODOS los documentos con el formato actual, incluidos los que ya estaban anotados, y recrea todos los stores. Puede tardar varios minutos.'
                : 'Esta operación procesa todos los stores secuencialmente. Los documentos ya anotados se saltan automáticamente.',
            confirmLabel: force ? 'Forzar re-anotar todos' : 'Anotar todos',
        });
        if (!ok) return;

        for (let i = 0; i < keys.length; i++) {
            setBatchOperation({ type: 'annotate', current: i + 1, total: keys.length, storeKey: keys[i] });
            // Pass force through — but skip the inner per-store confirm since we already confirmed globally
            await handleAnnotateStore(keys[i], force, true);
        }
        setBatchOperation({ type: null, current: 0, total: 0, storeKey: null });
        toast.success(`${keys.length} stores procesados`);
    };

    const handleSyncAll = async () => {
        const keys = config?.stores ? Object.keys(config.stores).sort((a, b) => a.localeCompare(b, 'es')) : [];
        if (keys.length === 0) return;
        const ok = await askConfirm({
            title: `Sincronizar ${keys.length} stores`,
            description: 'Esto sincroniza cada store con su estado deseado en Firestore. Puede tardar varios minutos.',
            confirmLabel: 'Sincronizar todos',
        });
        if (!ok) return;

        for (let i = 0; i < keys.length; i++) {
            setBatchOperation({ type: 'sync', current: i + 1, total: keys.length, storeKey: keys[i] });
            await handleSyncStore(keys[i]);
        }
        setBatchOperation({ type: null, current: 0, total: 0, storeKey: null });
        toast.success(`${keys.length} stores sincronizados`);
    };

    const handleAnnotateStore = async (storeKey: string, force: boolean = false, skipConfirm: boolean = false) => {
        if (force && !skipConfirm) {
            const ok = await askConfirm({
                title: 'Forzar re-anotación de todos los documentos',
                description: 'Esto volverá a generar las anotaciones con el formato actualizado. Los documentos serán re-subidos a Gemini.',
                confirmLabel: 'Re-anotar todos',
            });
            if (!ok) return;
        }

        const resources = (storeResources[storeKey] || []) as any[];
        // Include docs with textContent OR textContentUrl (large docs stored in Cloud Storage)
        const candidates = resources.filter(
            (r: any) => (r.textContent && r.textContent.length > 100) || r.textContentUrl
        );

        if (candidates.length === 0) {
            toast.warning('Ningún documento tiene texto extraído. Espera a que se completen las extracciones.');
            return;
        }

        setAnnotating(prev => ({ ...prev, [storeKey]: true }));
        let done = 0;
        let failed = 0;

        // Step 1: Upload annotated text files to Gemini (browser-compatible endpoint)
        for (const r of candidates) {
            setAnnotationProgress(prev => ({
                ...prev,
                [storeKey]: `Anotando "${r.title}" (${done + 1}/${candidates.length})…`
            }));
            try {
                // Reuse if already annotated (unless forcing re-annotation)
                if (!force && r.metadata?.annotatedGeminiUri && r.metadata?.annotatedGeminiName) {
                    done++;
                    continue;
                }

                // Get text — prefer inline textContent, fallback to textContentUrl (large docs)
                let rawText: string = r.textContent || '';
                if ((!rawText || rawText.length < 100) && r.textContentUrl) {
                    setAnnotationProgress(prev => ({
                        ...prev,
                        [storeKey]: `Descargando texto de "${r.title}"…`
                    }));
                    const httpsUrl = await coreLibraryAdminService.getDownloadUrl(r.textContentUrl);
                    const res = await fetch(httpsUrl);
                    if (!res.ok) throw new Error(`Failed to fetch text: ${res.statusText}`);
                    rawText = await res.text();
                }

                if (!rawText || rawText.length < 100) {
                    throw new Error('Texto insuficiente para anotar');
                }

                const annotated = annotateDocumentText(
                    rawText,
                    r.author || 'Autor desconocido',
                    r.title
                );

                // Diagnostic logs to verify annotation
                const markerCount = (annotated.match(/\(Fuente:/g) ?? []).length;
                console.log(`[Annotate] "${r.title}"`);
                console.log(`[Annotate]   rawText length: ${rawText.length}`);
                console.log(`[Annotate]   annotated length: ${annotated.length} (delta: +${annotated.length - rawText.length})`);
                console.log(`[Annotate]   "(Fuente:" markers inserted: ${markerCount}`);
                console.log(`[Annotate]   First 400 chars of annotated:`, annotated.substring(0, 400));
                console.log(`[Annotate]   Middle 400 chars:`, annotated.substring(Math.floor(annotated.length / 2), Math.floor(annotated.length / 2) + 400));

                const { uri, name } = await uploadAnnotatedTextToGemini(
                    annotated,
                    `${r.title} [anotado]`,
                );
                console.log(`[Annotate]   Uploaded → uri: ${uri}, name: ${name}`);

                // Save annotated URIs — Cloud Function will prefer these over PDF URIs
                await coreLibraryAdminService.setAnnotatedGeminiInfo(r.id, uri, name);

                done++;
            } catch (err: any) {
                console.error(`Error annotating "${r.title}":`, err);
                failed++;
            }
        }

        if (done === 0 && failed > 0) {
            toast.error('No se pudo anotar ningún documento. Revisa la consola.');
            setAnnotating(prev => ({ ...prev, [storeKey]: false }));
            setAnnotationProgress(prev => ({ ...prev, [storeKey]: '' }));
            return;
        }

        // Step 2: Trigger Cloud Function to recreate the store using annotated files
        // (Store operations require server-side execution — CORS not allowed from browser)
        setAnnotationProgress(prev => ({ ...prev, [storeKey]: 'Recreando store en Gemini (Cloud Function)…' }));
        try {
            const oldStoreId = config?.stores?.[storeKey] ?? null;
            const syncResult = await coreLibraryAdminService.syncStore(storeKey);
            if (!syncResult.success) throw new Error('Cloud Function returned unsuccessful');

            // Pick up the (possibly new) store id assigned by the Cloud Function.
            const newStoreId = await coreLibraryAdminService.getStoreIdForKey(storeKey);

            if (newStoreId && oldStoreId && newStoreId !== oldStoreId) {
                setAnnotationProgress(prev => ({ ...prev, [storeKey]: 'Actualizando tutores con nuevo store ID…' }));
                const agentsUpdated = await coreLibraryAdminService.replaceAgentCorpusReference(oldStoreId, newStoreId);
                if (agentsUpdated > 0) {
                    console.log(`[Annotation] Updated ${agentsUpdated} agent(s) with new store ID: ${newStoreId}`);
                }
            }

            if (failed > 0) {
                toast.warning(`${done} anotados, ${failed} fallaron. Store recreado y tutores actualizados.`);
            } else {
                toast.success(`${done} documentos anotados. Store recreado y tutores actualizados. Las citas aparecerán en futuras respuestas.`);
            }

            await loadConfig();
        } catch (err: any) {
            toast.error(`Anotación completada pero error en store: ${err.message}. Usa "Sincronizar" manualmente y actualiza los tutores.`);
        } finally {
            setAnnotating(prev => ({ ...prev, [storeKey]: false }));
            setAnnotationProgress(prev => ({ ...prev, [storeKey]: '' }));
        }
    };

    const handleUnlinkFile = async (docTitle: string, context: string) => {
        const ok = await askConfirm({
            title: `Desvincular "${docTitle}"`,
            description: `Este documento será desvinculado del store "${context}". El archivo permanece en tu biblioteca y sus chunks indexados dejarán de aparecer en las búsquedas de este store.`,
            confirmLabel: 'Desvincular',
            variant: 'destructive',
        });
        if (!ok) return;
        
        try {
            setIsUnlinking(docTitle);

            const found = await coreLibraryAdminService.findResourceByTitleInStore(
                firebase!.user!.uid,
                docTitle,
                context,
            );

            if (!found) {
                toast.error('No se pudo encontrar el documento original en tu biblioteca.');
                return;
            }

            const data = await coreLibraryAdminService.unlinkFileFromStore(found.id, context);

            if (data.success) {
                toast.success(data.message);
                // We purposefully DO NOT auto-sync to avoid slow UI, admin will click Sync.
                // But we reload config to show it as Missing (pending sync out)
                await loadConfig();
            }
        } catch (error: any) {
            toast.error(`Error al desvincular: ${error.message}`);
        } finally {
            setIsUnlinking(null);
        }
    };

    // Edit Store State
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [editingStoreKey, setEditingStoreKey] = useState<string | null>(null);
    const [editStoreName, setEditStoreName] = useState('');
    const [editStoreDesc, setEditStoreDesc] = useState('');
    const [isEditing, setIsEditing] = useState(false);

    // Add Documents State
    const [isAddDocsOpen, setIsAddDocsOpen] = useState(false);
    const [availableDocs, setAvailableDocs] = useState<any[]>([]);
    const [selectedDocs, setSelectedDocs] = useState<Set<string>>(new Set());
    const [isAddingDocs, setIsAddingDocs] = useState(false);
    const [isLoadingDocs, setIsLoadingDocs] = useState(false);

    // Direct Upload State
    const [categories, setCategories] = useState<LibraryCategory[]>([]);
    const [uploadFile, setUploadFile] = useState<File | null>(null);
    const [uploadMetadata, setUploadMetadata] = useState({ title: '', author: '', type: 'theology' as ResourceType });
    const [isUploading, setIsUploading] = useState(false);
    const [fileSizeWarning, setFileSizeWarning] = useState(false);
    const MAX_OPTIMAL_SIZE_MB = 50;

    useEffect(() => {
        if (firebase?.user) {
            categoryService.getCategories(firebase.user.uid).then(setCategories).catch(console.error);
        }
    }, [firebase?.user]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const selectedFile = e.target.files[0];
            const validTypes = ['application/pdf', 'application/epub+zip'];
            if (!validTypes.includes(selectedFile.type) && !selectedFile.name.match(/\.(pdf|epub)$/i)) {
                toast.error('Solo se permiten archivos PDF o EPUB');
                return;
            }
            
            const fileSizeMB = selectedFile.size / (1024 * 1024);
            setFileSizeWarning(fileSizeMB > MAX_OPTIMAL_SIZE_MB);
            setUploadFile(selectedFile);
            setUploadMetadata(prev => ({ 
                ...prev, 
                title: selectedFile.name.replace(/\.[^/.]+$/, "") || "" 
            }));
        }
    };

    const handleUploadSubmit = async (e: React.FormEvent, contextKey: string) => {
        e.preventDefault();
        if (!firebase?.user || !uploadFile) return;

        setIsUploading(true);
        try {
            const resource = await libraryService.uploadResource(firebase.user.uid, uploadFile, uploadMetadata);
            await coreLibraryAdminService.addResourceToStore(resource.id, contextKey);

            toast.success(`Documento subido y añadido a ${contextKey}. Procesando en segundo plano...`);
            setUploadFile(null);
            setFileSizeWarning(false);
            setUploadMetadata({ title: '', author: '', type: 'theology' });
            setIsAddDocsOpen(false);
            await loadConfig();

            // Phase 2: extraction + indexing fires automatically via Storage trigger
            // (extractPdfWithGemini → autoIndexOnExtractionReady). No manual sync needed.

        } catch (error: any) {
            console.error('Upload error:', error);
            toast.error('Error al subir el recurso: ' + error.message);
        } finally {
            setIsUploading(false);
        }
    };

    const handleOpenAddDocs = async (contextKey: string) => {
        setIsAddDocsOpen(true);
        setSelectedDocs(new Set());
        setIsLoadingDocs(true);
        try {
            const docs = await coreLibraryAdminService.getUserResources(firebase!.user!.uid);
            // Phase 2 RAG does not require a Gemini File Search URI — any doc in the
            // user's library is eligible, as long as it isn't already linked here.
            setAvailableDocs(docs.filter(d => !d.coreStores?.includes(contextKey)));
        } catch (error: any) {
            toast.error('Error cargando documentos: ' + error.message);
        } finally {
            setIsLoadingDocs(false);
        }
    };

    const handleAddSelectedDocs = async (contextKey: string) => {
        if (selectedDocs.size === 0) return;
        setIsAddingDocs(true);
        try {
            await coreLibraryAdminService.addResourcesToStore(Array.from(selectedDocs), contextKey);

            toast.success(`${selectedDocs.size} documentos añadidos al store`);
            setIsAddDocsOpen(false);
            await loadConfig();

            if (firebase?.user) {
                const docs = await coreLibraryAdminService.getUserResources(firebase.user.uid);
                setAvailableDocs(docs.filter(d => !d.coreStores?.includes(contextKey)));
            }
            
        } catch (error: any) {
            toast.error('Error al añadir documentos: ' + error.message);
        } finally {
            setIsAddingDocs(false);
        }
    };

    const handleRetrySync = async (resourceId: string, title: string) => {
        setIsRetrying(resourceId);
        try {
            toast.info(`Re-procesando "${title}" con LlamaParse...`);
            const data = await coreLibraryAdminService.reprocessWithLlamaParse(resourceId, true);
            if (data.success) {
                toast.success(`"${title}" reprocesado: ${data.pageCount ?? '?'} pp.`);
                await loadConfig();
            } else if (data.skipped) {
                toast.info(`"${title}" ya estaba procesado.`);
            } else {
                toast.error(`Error: ${data.error || 'Desconocido'}`);
            }
        } catch (error: any) {
            console.error('Reprocess error:', error);
            toast.error(`Error: ${error.message}`);
        } finally {
            setIsRetrying(null);
        }
    };

    const [deletingStore, setDeletingStore] = useState<string | null>(null);
    const [migratingCitableFlag, setMigratingCitableFlag] = useState(false);

    /**
     * One-shot migration: find all core library docs where `publiclyCitable` is
     * missing/undefined and set it to `false` (safe default — admin opts docs into
     * public citation manually, one by one).
     *
     * Runs client-side using the admin user's Firestore credentials. Reusable in
     * case new docs land without the flag (e.g. via direct Firestore imports).
     */
    const handleMigrateCitableFlag = async (unsetDocs: any[]) => {
        if (unsetDocs.length === 0) return;
        const ok = await askConfirm({
            title: `Marcar ${unsetDocs.length} documento(s) como restringidos`,
            description: `Los documentos sin estado de cita definido se marcarán como "Restringidos" (solo admin ve sus citas). Es el valor seguro por defecto — después podrás cambiar a "Pública" uno a uno los documentos que estén en dominio público o con licencia firmada.`,
            confirmLabel: 'Marcar como restringidos',
            variant: 'default',
        });
        if (!ok) return;

        try {
            setMigratingCitableFlag(true);
            const total = await coreLibraryAdminService.markResourcesAsRestrictedCitable(
                unsetDocs.map((d: any) => d.id),
            );
            toast.success(`${total} documento(s) marcado(s) como restringidos`);
            await loadConfig();
        } catch (error: any) {
            toast.error(`Error en la migración: ${error.message}`);
        } finally {
            setMigratingCitableFlag(false);
        }
    };

    // Edit document metadata state
    const [editDocOpen, setEditDocOpen] = useState(false);
    const [editingDocId, setEditingDocId] = useState<string | null>(null);
    const [editDocTitle, setEditDocTitle] = useState('');
    const [editDocAuthor, setEditDocAuthor] = useState('');
    const [editDocPubliclyCitable, setEditDocPubliclyCitable] = useState(false);
    const [isSavingDoc, setIsSavingDoc] = useState(false);

    const handleOpenEditDoc = (doc: any) => {
        setEditingDocId(doc.id);
        setEditDocTitle(doc.title ?? '');
        setEditDocAuthor(doc.author ?? '');
        setEditDocPubliclyCitable(doc.publiclyCitable === true);
        setEditDocOpen(true);
    };

    const handleSaveDocMetadata = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingDocId || !editDocTitle.trim()) {
            toast.error('El título es obligatorio');
            return;
        }
        try {
            setIsSavingDoc(true);
            await coreLibraryAdminService.updateResourceMetadata(editingDocId, {
                title: editDocTitle.trim(),
                author: editDocAuthor.trim(),
                publiclyCitable: editDocPubliclyCitable,
            });
            toast.success('Metadata actualizada');
            setEditDocOpen(false);
            setEditingDocId(null);
            await loadConfig();
        } catch (error: any) {
            toast.error(`Error actualizando metadata: ${error.message}`);
        } finally {
            setIsSavingDoc(false);
        }
    };

    const handleDeleteStore = async (key: string, name: string, fileCount: number) => {
        const ok = await askConfirm({
            title: `Eliminar store "${name}"`,
            description: `Esta acción es irreversible. Se eliminará el store y todos sus datos asociados:\n\n• ${fileCount} documento(s) serán desvinculados (los archivos permanecen en tu biblioteca)\n• Todos los chunks indexados (Phase 2 RAG) de este store serán eliminados\n• El store en Gemini File Search será eliminado\n\nLos tutores que usen este store dejarán de recibir contexto de él.`,
            confirmLabel: 'Eliminar Store',
            variant: 'destructive',
        });
        if (!ok) return;

        try {
            setDeletingStore(key);
            const data = await coreLibraryAdminService.deleteStore(key);

            if (data?.success) {
                toast.success(data.message || `Store '${name}' eliminado`);
                // Switch to a remaining store (or clear selection)
                const remaining = Object.keys(config?.stores ?? {}).filter(k => k !== key);
                setActiveTab(remaining[0] ?? '');
                await loadConfig();
            }
        } catch (error: any) {
            toast.error(`Error eliminando store: ${error.message}`);
        } finally {
            setDeletingStore(null);
        }
    };

    const handleEditStore = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingStoreKey || !editStoreName.trim()) {
            toast.error('El nombre es obligatorio');
            return;
        }

        try {
            setIsEditing(true);
            await coreLibraryAdminService.updateStore(
                editingStoreKey,
                editStoreName.trim(),
                editStoreDesc.trim(),
            );

            toast.success('Store actualizado exitosamente');
            setIsEditOpen(false);
            await loadConfig();
        } catch (error: any) {
            toast.error(`Error al actualizar store: ${error.message}`);
        } finally {
            setIsEditing(false);
            setEditingStoreKey(null);
        }
    };

    const [isRefreshing, setIsRefreshing] = useState(false);

    const loadConfig = async () => {
        // Only show full-screen loader on initial mount (no config yet).
        // Subsequent refreshes use a subtle indicator so the UI stays visible.
        const isInitialLoad = !config;
        try {
            if (isInitialLoad) setLoading(true);
            else setIsRefreshing(true);

            const data = await coreLibraryAdminService.getStoreConfig();
            if (data) {
                setConfig({
                    stores: data.stores,
                    files: data.files,
                    descriptions: data.descriptions ?? {},
                    displayNames: data.displayNames ?? {},
                    createdAt: data.createdAt ?? new Date(),
                    lastValidatedAt: data.lastValidatedAt ?? new Date(),
                });

                if (isInitialLoad) {
                    const keys = Object.keys(data.stores || {});
                    if (keys.length > 0 && !keys.includes(activeTab)) {
                        setActiveTab(keys[0] as string);
                    }
                }

                await validateAllStores(data);
            } else {
                setConfig(null);
            }
        } catch (err: any) {
            toast.error('Error cargando configuración: ' + err.message);
        } finally {
            setLoading(false);
            setIsRefreshing(false);
        }
    };

    const validateAllStores = async (configData: any) => {
        if (!firebase?.user) return;

        const contexts = Object.keys(configData.stores || {});
        const newSyncStatus: Record<string, SyncStatus> = {};
        const newStoreResources: Record<string, any[]> = {};

        for (const context of contexts) {
            try {
                const allDocs = await coreLibraryAdminService.getResourcesInStore(firebase.user.uid, context);
                newStoreResources[context] = allDocs;

                const desiredDocs = allDocs.filter((d: any) => d.metadata?.geminiUri);
                
                const currentFiles = configData.files?.[context] || [];
                const currentUris = new Set(currentFiles.map((f: any) => f.geminiUri));
                
                // Missing files are now only docs that actually have Gemini URI and are not in store
                const missing = desiredDocs
                    .filter((d: any) => !currentUris.has(d.metadata.geminiUri))
                    .map((d: any) => d.title || d.name);
                
                // Calculate missing because they are totally new (No Gemini URI)
                const pendingProcessing = allDocs.filter((d: any) => !d.metadata?.geminiUri);
                
                newSyncStatus[context] = {
                    isSynced: missing.length === 0 && desiredDocs.length === currentFiles.length && allDocs.length === currentFiles.length,
                    desiredCount: allDocs.length, // use total associated docs, not just valid for Gemini ones
                    currentCount: currentFiles.length,
                    missing: [...missing, ...pendingProcessing.map((d: any) => d.title || d.name)] 
                };
            } catch (error) {
                console.error(`Error validating ${context}:`, error);
            }
        }
        setSyncStatus(newSyncStatus);
        setStoreResources(newStoreResources);
    };

    const handleSyncStore = async (context: StoreContext) => {
        try {
            setSyncing(prev => ({ ...prev, [context]: true }));
            toast.info(`Sincronizando ${context}...`);

            const data = await coreLibraryAdminService.syncStore(context) as any;

            if (data.success) {
                if (data.alreadySynced) {
                    toast.success(`${context} ya estaba sincronizado`);
                } else if (data.storeCreated) {
                    toast.success(`Store ${context} creado con ${data.filesAdded} archivos`);
                } else {
                    toast.success(`${context} sincronizado: +${data.filesAdded} archivos`);
                }
                await loadConfig();
            } else {
                throw new Error('Sync failed');
            }
        } catch (err: any) {
            toast.error(`Error: ${err.message}`);
        } finally {
            setSyncing(prev => ({ ...prev, [context]: false }));
        }
    };

    const handleCreateStore = async () => {
        if (!newStoreKey || !newStoreName) {
            toast.error("Clave y Nombre son requeridos");
            return;
        }

        // Basic validation for key (slug format)
        if (!/^[a-z0-9-]+$/.test(newStoreKey)) {
            toast.error("La clave debe contener solo letras minúsculas, números y guiones");
            return;
        }

        try {
            setIsCreating(true);
            await coreLibraryAdminService.createStore({
                key: newStoreKey,
                displayName: newStoreName,
                description: newStoreDesc,
            });

            toast.success(`Store '${newStoreName}' creado correctamente`);
            setIsCreateOpen(false);
            setNewStoreKey('');
            setNewStoreName('');
            setNewStoreDesc('');
            
            await loadConfig();
            setActiveTab(newStoreKey); // Switch to new tab
            
        } catch (error: any) {
            console.error("Error creating store:", error);
            toast.error(`Error al crear store: ${error.message}`);
        } finally {
            setIsCreating(false);
        }
    };

    useEffect(() => {
        loadConfig();
    }, [firebase?.user]);

    if (loading) {
        return (
            <div className="flex items-center justify-center p-8">
                <div className="text-center">
                    <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
                    <p>Cargando configuración...</p>
                </div>
            </div>
        );
    }

    const defaultMeta: Record<string, { name: string, icon: any, description: string }> = {
        exegesis: { name: 'Exégesis', icon: BookOpen, description: 'Léxicos griego/hebreo, hermenéutica, gramática' },
        homiletics: { name: 'Homilética', icon: Mic2, description: 'Predicación, teología sistemática' },
        generic: { name: 'Genérico', icon: Library, description: 'Recursos de uso general' }
    };

    // Generate dynamic contexts from config — sorted alphabetically for stable UI order.
    // (Firestore merges reassign keys to the end, which would otherwise shuffle the list.)
    const storeKeys = config?.stores
        ? Object.keys(config.stores).sort((a, b) => a.localeCompare(b, 'es'))
        : [];

    const displayKeys = storeKeys;

    const storeContexts = displayKeys.map(key => {
        const defaults = defaultMeta[key];
        // Config is the source of truth for name/description; defaultMeta only
        // provides the built-in icon + fallback name.
        const name = config?.displayNames?.[key]
            ?? defaults?.name
            ?? (key.charAt(0).toUpperCase() + key.slice(1).replace(/-/g, ' '));
        const description = config?.descriptions?.[key]
            ?? defaults?.description
            ?? 'Contexto personalizado';
        const icon = defaults?.icon ?? Folder;
        return { key, name, description, icon };
    });

    const activeStoreData = storeContexts.find(c => c.key === activeTab);

    return (
        <div className="p-6 max-w-[95%] mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <div className="flex items-center gap-3">
                        <h1 className="text-3xl font-bold tracking-tight">Biblioteca Core</h1>
                        {isRefreshing && (
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                <span>Actualizando…</span>
                            </div>
                        )}
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                                    <HelpCircle className="h-4 w-4" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-96 text-sm" side="bottom" align="start">
                                <div className="space-y-2">
                                    <p className="font-semibold">Cómo funciona</p>
                                    <ul className="space-y-1.5 text-muted-foreground">
                                        <li>• Los stores organizan el conocimiento en contextos (Exégesis, Homilética, etc.) que los tutores consultan.</li>
                                        <li>• <strong>Reprocesar con LlamaParse</strong> extrae el contenido con páginas reales y estructura preservada.</li>
                                        <li>• <strong>Indexar (Phase 2)</strong> genera chunks semánticos + embeddings para RAG con citación precisa.</li>
                                        <li>• Usa <strong>Auditoría RAG</strong> para verificar la salud del índice y probar queries.</li>
                                        <li>• El <strong>Modo Avanzado</strong> revela controles legacy de Gemini File Search (anotación, sincronización de stores).</li>
                                    </ul>
                                </div>
                            </PopoverContent>
                        </Popover>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                        Contextos de conocimiento teológico para tutores
                    </p>
                </div>
                <div className="flex gap-2">
                    <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                        <DialogTrigger asChild>
                            <Button variant="default" size="sm">
                                <Plus className="h-4 w-4 mr-2" />
                                Nuevo Store
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Crear Nuevo Store</DialogTitle>
                                <DialogDescription>
                                    Crea un nuevo contexto de archivos para el asistente.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                    <Label>Nombre (Display Name)</Label>
                                    <Input 
                                        placeholder="Ej: Historia de la Iglesia" 
                                        value={newStoreName}
                                        onChange={(e) => {
                                            setNewStoreName(e.target.value);
                                            // Auto-generate slug if empty
                                            if (!newStoreKey && e.target.value) {
                                                setNewStoreKey(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '-'));
                                            }
                                        }}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Clave (Key ID)</Label>
                                    <Input 
                                        placeholder="ej: historia-iglesia" 
                                        value={newStoreKey}
                                        onChange={(e) => setNewStoreKey(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                                    />
                                    <p className="text-xs text-muted-foreground">Identificador único (slug) usado internamente.</p>
                                </div>
                                <div className="space-y-2">
                                    <Label>Descripción</Label>
                                    <Textarea 
                                        placeholder="Descripción breve del contenido de este store..."
                                        value={newStoreDesc}
                                        onChange={(e) => setNewStoreDesc(e.target.value)}
                                    />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancelar</Button>
                                <Button onClick={handleCreateStore} disabled={isCreating}>
                                    {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Crear Store
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>

                    {advancedMode && (
                        <>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleAnnotateAll(false)}
                                disabled={!!batchOperation.type || storeContexts.length === 0}
                                title="Legacy — Anota todos los stores con marcadores [FUENTE:] para Gemini File Search"
                            >
                                {batchOperation.type === 'annotate'
                                    ? <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    : <Wand2 className="h-4 w-4 mr-2" />}
                                Anotar todos
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-9 w-9"
                                onClick={() => handleAnnotateAll(true)}
                                disabled={!!batchOperation.type || storeContexts.length === 0}
                                title="Legacy — Forzar re-anotación de TODOS los documentos"
                            >
                                <RefreshCw className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleSyncAll}
                                disabled={!!batchOperation.type || storeContexts.length === 0}
                                title="Legacy — Sincroniza TODOS los stores de Gemini File Search"
                            >
                                {batchOperation.type === 'sync'
                                    ? <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    : <RefreshCw className="h-4 w-4 mr-2" />}
                                Sincronizar todos
                            </Button>
                        </>
                    )}
                    <Button onClick={() => setIsAuditOpen(true)} variant="outline" size="sm" disabled={!!batchOperation.type}>
                        <Activity className="h-4 w-4 mr-2" />
                        Auditoría RAG
                    </Button>
                    <Button
                        onClick={async () => {
                            const ok = await askConfirm({
                                title: 'Migrar sermones legacy a proyectos',
                                description: 'Asigna cada sermón sin proyecto a un proyecto "Material previo" por usuario. Idempotente — seguro re-ejecutar.',
                                confirmLabel: 'Ejecutar migración',
                            });
                            if (!ok) return;
                            try {
                                toast.info('Migrando sermones legacy...');
                                const data = (await coreLibraryAdminService.runMigration('migrateLegacySermons')) as any;
                                console.log('[migrateLegacySermons]', data);
                                if (data?.success) {
                                    toast.success(
                                        `Migración completa — ${data.usersProcessed} usuarios, ${data.projectsCreated} proyectos creados, ${data.sermonsAssigned} sermones asignados, ${data.sermonsSkipped} ya estaban`
                                    );
                                } else {
                                    toast.warning(
                                        `Completada con ${data.errors?.length ?? 0} errores — ver consola`
                                    );
                                }
                            } catch (err: any) {
                                console.error('[migrateLegacySermons] error:', err);
                                toast.error(`Error: ${err.message}`);
                            }
                        }}
                        variant="outline"
                        size="sm"
                        disabled={!!batchOperation.type}
                        title="One-shot: asigna sermones huérfanos al proyecto 'Material previo'. Idempotente."
                    >
                        <Database className="h-4 w-4 mr-2" />
                        Migrar sermones
                    </Button>
                    <Button
                        onClick={async () => {
                            const ok = await askConfirm({
                                title: 'Migrar semillas pastorales a 8 pasos',
                                description:
                                    'Renombra syntax→structuralAnalysis y morphology→wordStudies, crea los pasos Contexto/Género y Principio Atemporal vacíos, y marca las semillas legacy como incompletas (el pastor completa los 2 pasos nuevos al retomar). Idempotente — seguro re-ejecutar.',
                                confirmLabel: 'Ejecutar migración',
                            });
                            if (!ok) return;
                            try {
                                toast.info('Migrando semillas pastorales a 8 pasos...');
                                const data = (await coreLibraryAdminService.runMigration(
                                    'migratePastoralSeedsEightStep',
                                )) as any;
                                console.log('[migratePastoralSeedsEightStep]', data);
                                if (data?.success) {
                                    toast.success(
                                        `Migración completa — ${data.seedsScanned} escaneadas, ${data.seedsMigrated} migradas, ${data.seedsSkipped} ya estaban`,
                                    );
                                } else {
                                    toast.warning(
                                        `Completada con ${data.errors?.length ?? 0} errores — ver consola`,
                                    );
                                }
                            } catch (err: any) {
                                console.error('[migratePastoralSeedsEightStep] error:', err);
                                toast.error(`Error: ${err.message}`);
                            }
                        }}
                        variant="outline"
                        size="sm"
                        disabled={!!batchOperation.type}
                        title="One-shot: migra pastoralSeeds del six-step al eight-step (ADR-022). Idempotente."
                    >
                        <Database className="h-4 w-4 mr-2" />
                        Migrar semillas (8 pasos)
                    </Button>
                    {advancedMode && (
                        <Button
                            onClick={async () => {
                                try {
                                    toast.info('Ejecutando migración de quotas...');
                                    const data = (await coreLibraryAdminService.runMigration('migratePlanQuotas')) as any;
                                    console.log('[migratePlanQuotas]', data);
                                    if (data?.success) {
                                        const summary = (data.results ?? [])
                                            .map((r: any) => `${r.planId}: ${r.action}`)
                                            .join(', ');
                                        toast.success(`Migración completa — ${summary}`);
                                    } else {
                                        toast.error('Migración completada sin success:true');
                                    }
                                } catch (err: any) {
                                    console.error('[migratePlanQuotas] error:', err);
                                    toast.error(`Error: ${err.message}`);
                                }
                            }}
                            variant="outline"
                            size="sm"
                            title="Legacy — Actualiza Firestore plans con las quotas de biblioteca personal (basic/pro/team)"
                        >
                            <Database className="h-4 w-4 mr-2" />
                            Migrar Quotas
                        </Button>
                    )}
                    <Button
                        onClick={handleIngestSeed}
                        variant="outline"
                        size="sm"
                        disabled={isIngestingSeed || !!batchOperation.type}
                        title="Ingesta los recursos no-confesionales del JSON canónico de CORE Library (SBLGNT, Schaff, Chicago) en /library_resources. Idempotente."
                    >
                        {isIngestingSeed
                            ? <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            : <Sparkles className="h-4 w-4 mr-2" />}
                        Ingestar seed CORE
                    </Button>
                    <Button
                        onClick={handleBackfillRights}
                        variant="outline"
                        size="sm"
                        disabled={isBackfilling || !!batchOperation.type}
                        title="Clasifica heurísticamente library_resources con license=unknown asignando Public Domain a autores conocidos. Solo afecta docs sin clasificar."
                    >
                        {isBackfilling
                            ? <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            : <Wand2 className="h-4 w-4 mr-2" />}
                        Backfill licencias
                    </Button>
                    <Button onClick={loadConfig} variant="outline" size="sm" disabled={!!batchOperation.type}>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Actualizar
                    </Button>
                </div>
            </div>

            {/* Compact KPI bar */}
            {config && (() => {
                const allResources = Object.values(storeResources).flat();
                const uniqueDocs = new Map<string, any>();
                allResources.forEach((r: any) => { if (r.id) uniqueDocs.set(r.id, r); });
                const uniqueDocsList = Array.from(uniqueDocs.values());
                const annotatedCount = uniqueDocsList.filter((r: any) => r.metadata?.annotatedGeminiUri).length;
                const totalPages = uniqueDocsList.reduce((sum: number, r: any) => sum + (r.pageCount || 0), 0);
                const publicCount = uniqueDocsList.filter((r: any) => r.publiclyCitable === true).length;
                const storeIds = Object.values(config.stores).filter(Boolean) as string[];
                const connectedTutors = agents.filter(a =>
                    a.isActive && a.corpusIds?.some(id => storeIds.includes(id))
                );
                const annotationPct = uniqueDocsList.length > 0
                    ? Math.round((annotatedCount / uniqueDocsList.length) * 100)
                    : 0;

                return (
                    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3 rounded-md border bg-muted/20 text-sm">
                        <div className="flex items-center gap-2">
                            <Library className="h-4 w-4 text-muted-foreground" />
                            <span className="text-muted-foreground">Stores</span>
                            <span className="font-semibold">{storeContexts.length}</span>
                        </div>
                        <div className="h-4 w-px bg-border" />
                        <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            <span className="text-muted-foreground">Documentos</span>
                            <span className="font-semibold">{uniqueDocsList.length}</span>
                            <span className="text-xs text-muted-foreground">· {totalPages.toLocaleString()} págs</span>
                        </div>
                        <div className="h-4 w-px bg-border" />
                        <div className="flex items-center gap-2" title="Documentos cuyas citas son visibles para usuarios regulares (publiclyCitable=true)">
                            <BookOpen className="h-4 w-4 text-muted-foreground" />
                            <span className="text-muted-foreground">Públicos</span>
                            <span className="font-semibold text-success">{publicCount}</span>
                            <span className="text-xs text-muted-foreground">/ {uniqueDocsList.length}</span>
                        </div>
                        {advancedMode && (
                            <>
                                <div className="h-4 w-px bg-border" />
                                <div className="flex items-center gap-2">
                                    <Sparkles className={cn("h-4 w-4", annotationPct === 100 ? "text-success" : "text-muted-foreground")} />
                                    <span className="text-muted-foreground">Anotados</span>
                                    <span className="font-semibold">{annotatedCount}/{uniqueDocsList.length}</span>
                                    <span className="text-xs text-muted-foreground">· {annotationPct}%</span>
                                </div>
                            </>
                        )}
                        <div className="h-4 w-px bg-border" />
                        <div className="flex items-center gap-2 min-w-0">
                            <GraduationCap className="h-4 w-4 text-muted-foreground shrink-0" />
                            <span className="text-muted-foreground shrink-0">Tutores</span>
                            <span className="font-semibold shrink-0">{connectedTutors.length}</span>
                            {connectedTutors.length > 0 && (
                                <span className="text-xs text-muted-foreground truncate">· {connectedTutors.map(t => t.name).join(' · ')}</span>
                            )}
                        </div>
                    </div>
                );
            })()}

            {/* Migration banner — appears only when some docs have undefined publiclyCitable */}
            {config && (() => {
                const allResources = Object.values(storeResources).flat();
                const unsetDocs = allResources.filter((r: any) => r.publiclyCitable === undefined);
                if (unsetDocs.length === 0) return null;
                return (
                    <Alert className="bg-warning/5 border-warning/30">
                        <AlertTriangle className="h-4 w-4 text-warning" />
                        <AlertDescription className="flex items-center justify-between gap-3 flex-wrap">
                            <span className="text-warning">
                                Hay <strong>{unsetDocs.length}</strong> documento(s) sin estado de cita definido.
                                Márcalos como <strong>Restringidos</strong> (default seguro) — podrás cambiar a Pública
                                los que sean de dominio público desde el botón de editar cada uno.
                            </span>
                            <Button
                                size="sm"
                                onClick={() => handleMigrateCitableFlag(unsetDocs)}
                                disabled={migratingCitableFlag}
                                className="shrink-0"
                            >
                                {migratingCitableFlag
                                    ? <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />
                                    : null}
                                Marcar como restringidos
                            </Button>
                        </AlertDescription>
                    </Alert>
                );
            })()}

            {/* Batch operation progress */}
            {batchOperation.type && (
                <Alert>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <AlertDescription>
                        {batchOperation.type === 'annotate' ? 'Anotando' : 'Sincronizando'} store{' '}
                        <strong>{batchOperation.storeKey}</strong> ({batchOperation.current}/{batchOperation.total})…
                    </AlertDescription>
                </Alert>
            )}

            {/* Store tabs + detail — stacked vertically, detail full-width */}
            <div className="space-y-4">

                {/* Store tabs (horizontal scrollable) */}
                {config ? (
                    <div className="border-b">
                        <div className="flex gap-1 overflow-x-auto pb-px scrollbar-thin">
                            {storeContexts.map(context => {
                                const status = syncStatus[context.key];
                                const Icon = context.icon;
                                const isSynced = status?.isSynced ?? true;
                                const storeDocs = storeResources[context.key] || [];
                                const docCount = storeDocs.length;
                                const storePages = storeDocs.reduce((sum: number, d: any) => sum + (d.pageCount || 0), 0);
                                const isActive = activeTab === context.key;
                                const isSyncing = syncing[context.key];

                                return (
                                    <button
                                        key={context.key}
                                        onClick={() => setActiveTab(context.key)}
                                        className={cn(
                                            "group relative flex items-center gap-2 px-4 py-2.5 rounded-t-md border-b-2 transition-all whitespace-nowrap shrink-0",
                                            "hover:bg-muted/50",
                                            isActive
                                                ? "border-primary bg-muted/30 text-foreground"
                                                : "border-transparent text-muted-foreground"
                                        )}
                                    >
                                        <Icon className={cn("h-4 w-4 shrink-0", isActive && "text-primary")} />
                                        <span className={cn("text-sm", isActive && "font-semibold text-foreground")}>
                                            {context.name}
                                        </span>
                                        <span className="text-xs text-muted-foreground tabular-nums">
                                            {docCount}
                                            {storePages > 0 && ` · ${storePages.toLocaleString()}p`}
                                        </span>
                                        {isSyncing ? (
                                            <Loader2 className="h-3 w-3 animate-spin text-muted-foreground shrink-0" />
                                        ) : isSynced ? (
                                            <span className="h-1.5 w-1.5 rounded-full bg-success shrink-0" title="Sincronizado" />
                                        ) : (
                                            <AlertTriangle className="h-3 w-3 text-warning shrink-0" />
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                ) : (
                    <div className="text-sm text-muted-foreground p-4 text-center border rounded-md border-dashed">
                        Cargando stores...
                    </div>
                )}

                {/* Detail panel — full width */}
                <div className="w-full min-w-0">
                    {/* Active Store Details Area */}
                    {activeStoreData ? (() => {
                const context = activeStoreData;
                const storeId = config?.stores?.[context.key];
                const activeSyncdFiles = config?.files?.[context.key] || [];
                // Use the database resources to show ALL intended files, including pending ones
                const files = storeResources[context.key] || [];
                const totalPages = files.reduce((sum: number, f: any) => sum + (f.pageCount || f.pages || 0), 0);
                
                return (
                    <div className="space-y-4 animate-in fade-in duration-300">
                        {/* Store Info Card */}
                        <Card>
                            <CardHeader>
                                <div className="flex items-start justify-between gap-4">
                                    <div className="min-w-0 flex-1">
                                        <CardTitle className="flex items-center gap-2 flex-wrap">
                                            <context.icon className="h-5 w-5 text-muted-foreground" />
                                            {context.name}
                                            <Badge variant="secondary">
                                                {files.length} archivo{files.length !== 1 ? 's' : ''}
                                            </Badge>
                                        </CardTitle>
                                        <CardDescription className="mt-2 text-base">
                                            {context.description}
                                        </CardDescription>
                                        {/* Tutor badges */}
                                        {(() => {
                                            const detailTutors = tutorsForStoreId(storeId);
                                            if (detailTutors.length === 0) {
                                                return (
                                                    <div className="mt-3 text-xs text-muted-foreground italic">
                                                        Ningún tutor tiene este store asignado todavía.
                                                    </div>
                                                );
                                            }
                                            return (
                                                <div className="mt-3 flex items-center gap-1.5 flex-wrap">
                                                    <span className="text-xs text-muted-foreground mr-1">Usado por:</span>
                                                    {detailTutors.map(t => (
                                                        <Badge
                                                            key={t.id}
                                                            variant="outline"
                                                            className={cn(
                                                                "font-normal flex items-center gap-1",
                                                                !t.isActive && "opacity-50"
                                                            )}
                                                            title={t.isActive ? 'Tutor activo' : 'Tutor inactivo'}
                                                        >
                                                            <GraduationCap className="h-3 w-3" />
                                                            {t.name}
                                                        </Badge>
                                                    ))}
                                                </div>
                                            );
                                        })()}
                                    </div>
                                    <div className="text-right flex flex-col items-end gap-2 shrink-0">
                                        <div>
                                            <div className="text-sm font-medium">{totalPages.toLocaleString()} páginas</div>
                                            <div className="text-xs text-muted-foreground">Total indexado</div>
                                        </div>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {/* Store actions + collapsible technical details */}
                                <div className="flex items-center justify-between">
                                    {storeId ? (
                                        <Collapsible>
                                            <CollapsibleTrigger asChild>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-8 text-xs text-muted-foreground hover:text-foreground -ml-2"
                                                >
                                                    <ChevronRight className="h-3.5 w-3.5 mr-1 transition-transform data-[state=open]:rotate-90 group-data-[state=open]:rotate-90" />
                                                    Detalles técnicos
                                                </Button>
                                            </CollapsibleTrigger>
                                            <CollapsibleContent className="mt-2">
                                                <div className="bg-muted/50 p-3 rounded-md">
                                                    <div className="text-xs font-medium text-muted-foreground mb-1">
                                                        ID de Store (Google Gemini)
                                                    </div>
                                                    <code className="text-xs text-primary break-all">{storeId}</code>
                                                </div>
                                            </CollapsibleContent>
                                        </Collapsible>
                                    ) : <div />}
                                    <div className="flex items-center gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="h-8"
                                            onClick={() => {
                                                setEditingStoreKey(context.key);
                                                setEditStoreName(context.name);
                                                setEditStoreDesc(context.description || '');
                                                setIsEditOpen(true);
                                            }}
                                        >
                                            <Settings className="h-4 w-4 mr-2" />
                                            Editar Store
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="h-8 text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/30"
                                            onClick={() => handleDeleteStore(context.key, context.name, files.length)}
                                            disabled={!!deletingStore}
                                            title="Eliminar Store permanentemente"
                                        >
                                            {deletingStore === context.key
                                                ? <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                                : <Trash2 className="h-4 w-4 mr-2" />}
                                            Eliminar
                                        </Button>
                                    </div>
                                </div>

                                {/* Files Table */}
                                <div>
                                    <div className="flex items-center justify-between mb-3 border-b pb-2">
                                        <div className="text-sm font-medium flex items-center gap-2">
                                            <FileText className="h-4 w-4" />
                                            Documentos Exclusivos de este Store
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {reprocessProgress[`__store__${context.key}`] && (
                                                <span className="text-xs text-success animate-pulse">
                                                    {reprocessProgress[`__store__${context.key}`]}
                                                </span>
                                            )}
                                            {indexProgress[`__store__${context.key}`] && (
                                                <span className="text-xs text-primary animate-pulse">
                                                    {indexProgress[`__store__${context.key}`]}
                                                </span>
                                            )}
                                            {annotationProgress[context.key] && (
                                                <span className="text-xs text-muted-foreground animate-pulse">
                                                    {annotationProgress[context.key]}
                                                </span>
                                            )}
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handleIndexStore(context.key)}
                                                disabled={!!indexing[`__store__${context.key}`] || !!reprocessing[`__store__${context.key}`] || annotating[context.key]}
                                                title="Genera embeddings + chunks semánticos (Phase 2 RAG). Requiere LlamaParse previo."
                                            >
                                                {indexing[`__store__${context.key}`]
                                                    ? <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                                    : <Database className="h-4 w-4 mr-2 text-primary" />}
                                                Indexar (Phase 2)
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handleReprocessStore(context.key)}
                                                disabled={!!reprocessing[`__store__${context.key}`] || annotating[context.key]}
                                                title="Re-extrae todos los documentos con LlamaParse (mejor calidad, páginas reales, estructura preservada). Salta los que ya estén procesados."
                                            >
                                                {reprocessing[`__store__${context.key}`]
                                                    ? <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                                    : <Sparkles className="h-4 w-4 mr-2 text-success" />}
                                                Reprocesar con LlamaParse
                                            </Button>
                                            {advancedMode && (
                                                <>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => handleAnnotateStore(context.key)}
                                                        disabled={annotating[context.key]}
                                                        title="Legacy — Anota cada documento con marcadores [FUENTE:] y recrea el store Gemini File Search (reemplazado por Phase 2 RAG)"
                                                    >
                                                        {annotating[context.key]
                                                            ? <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                                            : <Wand2 className="h-4 w-4 mr-2" />}
                                                        Anotar y Recrear
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleAnnotateStore(context.key, true)}
                                                        disabled={annotating[context.key]}
                                                        title="Legacy — Forzar re-anotación de TODOS los documentos (incluso los ya anotados)"
                                                    >
                                                        <RefreshCw className="h-3 w-3" />
                                                    </Button>
                                                </>
                                            )}
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handleOpenAddDocs(context.key)}
                                            >
                                                <Plus className="h-4 w-4 mr-2" />
                                                Añadir Archivos
                                            </Button>
                                        </div>
                                    </div>
                                    
                                    {files.length > 0 ? (
                                        <div className="border rounded-md bg-background overflow-x-auto">
                                            <Table>
                                                <TableHeader className="bg-muted/30">
                                                    <TableRow>
                                                        <TableHead>Documento</TableHead>
                                                        <TableHead>Autor</TableHead>
                                                        <TableHead className="w-[100px]">Páginas</TableHead>
                                                        {advancedMode && <TableHead className="w-[100px]">Estado</TableHead>}
                                                        <TableHead className="w-[110px]">Extracción</TableHead>
                                                        <TableHead className="w-[100px]">Indexing</TableHead>
                                                        <TableHead className="w-[110px]">Cita pública</TableHead>
                                                        {advancedMode && <TableHead className="w-[90px]">Citación</TableHead>}
                                                        <TableHead className="text-right w-[180px]">Acciones</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {files.map((file: any, idx: number) => {
                                                        const hasGeminiUri = !!file.metadata?.geminiUri;
                                                        const isSynced = hasGeminiUri && activeSyncdFiles.some((f: any) => f.geminiUri === file.metadata.geminiUri);

                                                        return (
                                                            <TableRow key={idx}>
                                                                <TableCell className="font-medium">{file.title || file.name}</TableCell>
                                                                <TableCell className="text-muted-foreground">{file.author || '---'}</TableCell>
                                                                <TableCell>
                                                                    <Badge variant="outline">{file.pageCount || file.pages || '?'} pág</Badge>
                                                                </TableCell>
                                                                {advancedMode && (
                                                                    <TableCell>
                                                                        {isSynced ? (
                                                                            <div className="flex items-center gap-1">
                                                                                <Badge variant="secondary" className="bg-success/15 text-success hover:bg-success/15 border-transparent">
                                                                                    Activo
                                                                                </Badge>
                                                                                <Button
                                                                                    variant="ghost"
                                                                                    size="icon"
                                                                                    className="h-6 w-6 text-muted-foreground hover:text-foreground"
                                                                                    title="Re-indexar con marcadores de página"
                                                                                    onClick={() => handleRetrySync(file.id, file.title || file.name)}
                                                                                    disabled={isRetrying === file.id}
                                                                                >
                                                                                    <RefreshCw className={`h-3 w-3 ${isRetrying === file.id ? 'animate-spin' : ''}`} />
                                                                                </Button>
                                                                            </div>
                                                                        ) : !hasGeminiUri ? (
                                                                            <div className="flex items-center gap-2">
                                                                                <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100 border-transparent">
                                                                                    Procesando
                                                                                </Badge>
                                                                                <Button
                                                                                    variant="ghost"
                                                                                    size="icon"
                                                                                    className="h-6 w-6"
                                                                                    title="Reintentar Procesamiento"
                                                                                    onClick={() => handleRetrySync(file.id, file.title || file.name)}
                                                                                    disabled={isRetrying === file.id}
                                                                                >
                                                                                    <RefreshCw className={`h-3 w-3 ${isRetrying === file.id ? 'animate-spin' : ''}`} />
                                                                                </Button>
                                                                            </div>
                                                                        ) : (
                                                                            <div className="flex items-center gap-1">
                                                                                <Badge variant="secondary" className="bg-info/15 text-info hover:bg-info/15 border-transparent">
                                                                                    Pendiente Sync
                                                                                </Badge>
                                                                                <Button
                                                                                    variant="ghost"
                                                                                    size="icon"
                                                                                    className="h-6 w-6"
                                                                                    title="Reintentar Procesamiento"
                                                                                    onClick={() => handleRetrySync(file.id, file.title || file.name)}
                                                                                    disabled={isRetrying === file.id}
                                                                                >
                                                                                    <RefreshCw className={`h-3 w-3 ${isRetrying === file.id ? 'animate-spin' : ''}`} />
                                                                                </Button>
                                                                            </div>
                                                                        )}
                                                                    </TableCell>
                                                                )}
                                                                <TableCell>
                                                                    {file.extractionVersion === '3.0-llamaparse' ? (
                                                                        <Badge variant="secondary" className="bg-success/15 text-success border-transparent text-xs" title="Extraído con LlamaParse — páginas reales, estructura preservada">
                                                                            LlamaParse
                                                                        </Badge>
                                                                    ) : file.extractionVersion === '2.0-gemini' ? (
                                                                        <Badge variant="secondary" className="bg-info/15 text-info border-transparent text-xs" title="Extraído con Gemini 2.0 Flash (legacy)">
                                                                            Gemini
                                                                        </Badge>
                                                                    ) : file.extractionVersion === 'fallback-pdfparse' ? (
                                                                        <Badge variant="secondary" className="bg-warning/15 text-warning border-transparent text-xs" title="Extraído con pdf-parse (fallback básico)">
                                                                            pdf-parse
                                                                        </Badge>
                                                                    ) : (
                                                                        <span className="text-xs text-muted-foreground">—</span>
                                                                    )}
                                                                </TableCell>
                                                                <TableCell>
                                                                    {file.indexingStatus === 'ready' ? (
                                                                        <Badge variant="secondary" className="bg-primary/15 text-primary border-transparent text-xs" title={`Indexado con ${file.indexedChunkCount ?? '?'} chunks`}>
                                                                            <Database className="h-2.5 w-2.5 mr-1" />
                                                                            Indexado
                                                                        </Badge>
                                                                    ) : file.indexingStatus === 'processing' ? (
                                                                        <Badge variant="secondary" className="bg-warning/15 text-warning border-transparent text-xs">
                                                                            <Loader2 className="h-2.5 w-2.5 mr-1 animate-spin" />
                                                                            Procesando
                                                                        </Badge>
                                                                    ) : file.indexingStatus === 'failed' ? (
                                                                        <Badge variant="secondary" className="bg-destructive/15 text-destructive border-transparent text-xs" title={file.indexingError}>
                                                                            Error
                                                                        </Badge>
                                                                    ) : (
                                                                        <span className="text-xs text-muted-foreground">—</span>
                                                                    )}
                                                                </TableCell>
                                                                <TableCell>
                                                                    <div className="flex flex-col items-start gap-1">
                                                                        {file.publiclyCitable === true ? (
                                                                            <Badge variant="secondary" className="bg-success/15 text-success border-transparent text-xs" title="Las citas de este documento son visibles para usuarios regulares (dominio público / licencia firmada)">
                                                                                Pública
                                                                            </Badge>
                                                                        ) : (
                                                                            <Badge variant="secondary" className="bg-warning/15 text-warning border-transparent text-xs" title="Solo admin ve las citas de este documento (licencia pendiente)">
                                                                                Restringida
                                                                            </Badge>
                                                                        )}
                                                                        {(file as any).license && (file as any).license !== 'unknown' && (
                                                                            <Badge
                                                                                variant="outline"
                                                                                className="text-[10px] px-1.5 py-0 font-mono"
                                                                                title={`Licencia: ${(file as any).license}${(file as any).licenseUrl ? ` — ${(file as any).licenseUrl}` : ''}`}
                                                                            >
                                                                                {(file as any).license}
                                                                            </Badge>
                                                                        )}
                                                                        {(file as any).ingestionStatus === 'requires_manual_review' && (
                                                                            <Badge
                                                                                variant="secondary"
                                                                                className="bg-warning/15 text-warning border-transparent text-[10px] px-1.5 py-0"
                                                                                title="Sin clasificar — admin debe revisar licencia + ingestion status"
                                                                            >
                                                                                Sin clasificar
                                                                            </Badge>
                                                                        )}
                                                                        {(file as any).ingestionStatus === 'approved_metadata_only' && (
                                                                            <Badge
                                                                                variant="secondary"
                                                                                className="bg-destructive/15 text-destructive border-transparent text-[10px] px-1.5 py-0"
                                                                                title="Solo metadata + summary interno. No indexar texto completo."
                                                                            >
                                                                                Solo metadata
                                                                            </Badge>
                                                                        )}
                                                                        {(file as any).riskLevel && (file as any).riskLevel !== 'low' && (
                                                                            <Badge
                                                                                variant="secondary"
                                                                                className={cn(
                                                                                    'text-[10px] px-1.5 py-0 border-transparent',
                                                                                    (file as any).riskLevel === 'high_for_full_ingestion'
                                                                                        ? 'bg-destructive/15 text-destructive'
                                                                                        : 'bg-warning/15 text-warning'
                                                                                )}
                                                                                title={`Risk level: ${(file as any).riskLevel}`}
                                                                            >
                                                                                {(file as any).riskLevel === 'high_for_full_ingestion'
                                                                                    ? 'Riesgo alto'
                                                                                    : (file as any).riskLevel === 'low_to_medium'
                                                                                        ? 'Riesgo medio'
                                                                                        : (file as any).riskLevel}
                                                                            </Badge>
                                                                        )}
                                                                        {(file as any).doctrineLevel && (
                                                                            <Badge
                                                                                variant="outline"
                                                                                className="text-[10px] px-1.5 py-0"
                                                                                title={`Doctrine level: ${(file as any).doctrineLevel}`}
                                                                            >
                                                                                {(file as any).doctrineLevel}
                                                                            </Badge>
                                                                        )}
                                                                        {Array.isArray((file as any).requiredAttribution) && (file as any).requiredAttribution.length > 0 && (
                                                                            <Badge
                                                                                variant="outline"
                                                                                className="text-[10px] px-1.5 py-0"
                                                                                title={`Attribution requerida: ${(file as any).requiredAttribution.length} requisitos`}
                                                                            >
                                                                                Attrib ({(file as any).requiredAttribution.length})
                                                                            </Badge>
                                                                        )}
                                                                    </div>
                                                                </TableCell>
                                                                {advancedMode && (
                                                                    <TableCell>
                                                                        {file.metadata?.annotatedGeminiUri ? (
                                                                            <Badge variant="secondary" className="bg-primary/15 text-primary border-transparent text-xs" title="Documento anotado con marcadores [FUENTE:] para citar documentos individuales">
                                                                                <Wand2 className="h-2.5 w-2.5 mr-1" />
                                                                                Anotado
                                                                            </Badge>
                                                                        ) : (
                                                                            <span className="text-xs text-muted-foreground">—</span>
                                                                        )}
                                                                    </TableCell>
                                                                )}
                                                                <TableCell className="text-right">
                                                                    <div className="flex items-center justify-end gap-1">
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="icon"
                                                                            className="h-8 w-8"
                                                                            onClick={() => handleOpenEditDoc(file)}
                                                                            title="Editar título y autor"
                                                                        >
                                                                            <Pencil className="h-4 w-4" />
                                                                        </Button>
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="icon"
                                                                            className="h-8 w-8"
                                                                            onClick={() => handleProcessDocumentStandard(file.id, file.title || file.name)}
                                                                            disabled={!!reprocessing[file.id]}
                                                                            title={file.extractionVersion === '4.0-gemini-standard'
                                                                                ? "Re-extraer con Gemini estándar (forzar)"
                                                                                : "Extraer con Gemini estándar (bajo costo)"}
                                                                        >
                                                                            {reprocessing[file.id]
                                                                                ? <Loader2 className="h-4 w-4 animate-spin" />
                                                                                : <Wand2 className={cn("h-4 w-4", file.extractionVersion === '4.0-gemini-standard' ? "text-info" : "text-muted-foreground")} />}
                                                                        </Button>
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="icon"
                                                                            className="h-8 w-8"
                                                                            onClick={() => handleReprocessDocument(file.id, file.title || file.name)}
                                                                            disabled={!!reprocessing[file.id]}
                                                                            title={file.extractionVersion === '3.0-llamaparse'
                                                                                ? "Re-extraer con LlamaParse premium (forzar)"
                                                                                : "Extraer con LlamaParse premium (alta calidad, costo elevado)"}
                                                                        >
                                                                            {reprocessing[file.id]
                                                                                ? <Loader2 className="h-4 w-4 animate-spin" />
                                                                                : <Sparkles className={cn("h-4 w-4", file.extractionVersion === '3.0-llamaparse' ? "text-success" : "text-muted-foreground")} />}
                                                                        </Button>
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="icon"
                                                                            className="h-8 w-8"
                                                                            onClick={() => handleIndexDocument(file.id, file.title || file.name)}
                                                                            disabled={!!indexing[file.id] || file.extractionVersion !== '3.0-llamaparse'}
                                                                            title={file.extractionVersion !== '3.0-llamaparse'
                                                                                ? "Requiere extracción con LlamaParse primero"
                                                                                : file.indexingStatus === 'ready'
                                                                                    ? "Re-indexar (Phase 2)"
                                                                                    : "Indexar con Phase 2 (chunks + embeddings)"}
                                                                        >
                                                                            {indexing[file.id]
                                                                                ? <Loader2 className="h-4 w-4 animate-spin" />
                                                                                : <Database className={cn("h-4 w-4", file.indexingStatus === 'ready' ? "text-primary" : "text-muted-foreground")} />}
                                                                        </Button>
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="icon"
                                                                            className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                                                                            onClick={() => handleUnlinkFile(file.title || file.name, context.key)}
                                                                            disabled={isUnlinking === (file.title || file.name)}
                                                                            title="Desvincular del Store"
                                                                        >
                                                                            {isUnlinking === (file.title || file.name) ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                                                                        </Button>
                                                                    </div>
                                                                </TableCell>
                                                            </TableRow>
                                                        );
                                                    })}
                                                </TableBody>
                                            </Table>
                                        </div>
                                    ) : (
                                        <div className="text-center py-12 border rounded-md border-dashed text-muted-foreground bg-muted/10">
                                            <Database className="h-10 w-10 mx-auto mb-3 opacity-20" />
                                            <p className="font-medium text-foreground">El store está vacío</p>
                                            <p className="text-sm mt-1">Sube archivos a "Mi Biblioteca" y márcalos con el contexto <b>{context.name}</b></p>
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                );
            })()
            : (
                <div className="h-full flex items-center justify-center p-12 border rounded-md border-dashed">
                    <div className="text-center text-muted-foreground">
                        <Database className="h-10 w-10 mx-auto mb-3 opacity-20" />
                        <p className="font-medium text-foreground">Ningún Store Seleccionado</p>
                        <p className="text-sm mt-1">Selecciona un store en la barra superior para ver y gestionar sus documentos.</p>
                    </div>
                </div>
            )}
            </div>

            {/* CORE Seed (sistema) — recursos canónicos del JSON seed
                que viven en library_resources con isSystemSource=true.
                Independiente de los stores (un mismo recurso puede no estar
                asignado a ningún store y aún así formar parte del catálogo
                canónico).  */}
            <Card className="mt-6">
                <CardHeader>
                    <div className="flex items-center justify-between gap-4">
                        <div>
                            <CardTitle className="flex items-center gap-2 text-base">
                                <Sparkles className="h-4 w-4 text-primary" />
                                CORE Seed (sistema)
                            </CardTitle>
                            <CardDescription>
                                Recursos del JSON canónico de CORE Library ingestados con metadata rights-aware completa.
                                Las 14 confesiones viven en /confessions/ y se omiten aquí.
                            </CardDescription>
                        </div>
                        <Button
                            size="sm"
                            variant="ghost"
                            onClick={loadSystemSources}
                            disabled={systemSourcesLoading}
                            title="Recargar recursos sistema"
                        >
                            {systemSourcesLoading
                                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                : <RefreshCw className="h-3.5 w-3.5" />}
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    {systemSources.length === 0 ? (
                        <div className="text-sm text-muted-foreground py-6 text-center">
                            {systemSourcesLoading ? 'Cargando…' : 'Ningún recurso sistema ingestado todavía. Click "Ingestar seed CORE" para poblar.'}
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Recurso</TableHead>
                                    <TableHead>Tradición</TableHead>
                                    <TableHead className="w-[140px]">Licencia</TableHead>
                                    <TableHead className="w-[180px]">Ingestion status</TableHead>
                                    <TableHead className="w-[110px]">Riesgo</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {systemSources.map((doc: any) => (
                                    <TableRow key={doc.id}>
                                        <TableCell>
                                            <div className="font-medium text-sm">{doc.title}</div>
                                            <div className="text-xs text-muted-foreground">
                                                {doc.author ?? '—'} · {doc.year ?? '—'}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-xs text-muted-foreground">
                                            {doc.tradition ?? '—'}
                                        </TableCell>
                                        <TableCell>
                                            <Badge
                                                variant="outline"
                                                className="text-[10px] font-mono"
                                                title={doc.license ?? 'unknown'}
                                            >
                                                {compactLicenseLabel(doc.license)}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <Badge
                                                variant="secondary"
                                                className={cn(
                                                    'text-[10px]',
                                                    doc.ingestionStatus === 'approved_metadata_only'
                                                        ? 'bg-destructive/15 text-destructive border-transparent'
                                                        : doc.ingestionStatus === 'requires_manual_review'
                                                            ? 'bg-warning/15 text-warning border-transparent'
                                                            : 'bg-success/15 text-success border-transparent'
                                                )}
                                                title={doc.ingestionStatus ?? '—'}
                                            >
                                                {INGESTION_STATUS_LABELS_ES[doc.ingestionStatus] ?? doc.ingestionStatus ?? '—'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <Badge
                                                variant="outline"
                                                className="text-[10px]"
                                                title={doc.riskLevel ?? '—'}
                                            >
                                                {RISK_LEVEL_LABELS_ES[doc.riskLevel] ?? doc.riskLevel ?? '—'}
                                            </Badge>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
            </div>

            {/* Reusable confirmation dialog */}
            <AlertDialog
                open={confirmState.open}
                onOpenChange={(open) => { if (!open) settleConfirm(false); }}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{confirmState.title}</AlertDialogTitle>
                        <AlertDialogDescription>{confirmState.description}</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => settleConfirm(false)}>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => settleConfirm(true)}
                            className={cn(
                                confirmState.variant === 'destructive' && "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            )}
                        >
                            {confirmState.confirmLabel ?? 'Confirmar'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* RAG Audit + Playground Dialog */}
            <RAGAuditDialog
                open={isAuditOpen}
                onOpenChange={setIsAuditOpen}
                availableStores={storeContexts.map(c => ({ key: c.key, displayName: c.name }))}
            />

            {/* Edit Document Metadata Dialog */}
            <Dialog open={editDocOpen} onOpenChange={(open) => { if (!open) { setEditDocOpen(false); setEditingDocId(null); } }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Editar metadata del documento</DialogTitle>
                        <DialogDescription>
                            Corrige el título y autor si fueron extraídos incorrectamente. No afecta el contenido indexado.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSaveDocMetadata} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="editDocTitle">Título <span className="text-destructive">*</span></Label>
                            <Input
                                id="editDocTitle"
                                value={editDocTitle}
                                onChange={e => setEditDocTitle(e.target.value)}
                                placeholder="Título del documento"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="editDocAuthor">Autor</Label>
                            <Input
                                id="editDocAuthor"
                                value={editDocAuthor}
                                onChange={e => setEditDocAuthor(e.target.value)}
                                placeholder="Nombre del autor"
                            />
                        </div>
                        <div className="flex items-start justify-between gap-4 rounded-lg border p-4 bg-muted/30">
                            <div className="space-y-1 flex-1 min-w-0">
                                <Label htmlFor="editDocPubliclyCitable" className="text-sm font-semibold">
                                    Citable públicamente
                                </Label>
                                <p className="text-xs text-muted-foreground leading-relaxed">
                                    Activa este switch SOLO para material de dominio público (Calvino, Spurgeon,
                                    Matthew Henry, patrística, Gesenius, etc.) o con licencia explícita firmada.
                                    Cuando está apagado, los usuarios regulares NO ven las citas de este documento
                                    aunque se use para RAG interno.
                                </p>
                            </div>
                            <Switch
                                id="editDocPubliclyCitable"
                                checked={editDocPubliclyCitable}
                                onCheckedChange={setEditDocPubliclyCitable}
                            />
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setEditDocOpen(false)} disabled={isSavingDoc}>
                                Cancelar
                            </Button>
                            <Button type="submit" disabled={isSavingDoc}>
                                {isSavingDoc && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Guardar
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Edit Store Dialog */}
            <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Editar Store</DialogTitle>
                        <DialogDescription>
                            Actualiza el nombre y descripción del store. Cambiar el nombre actualizará el Display Name en la API de Gemini.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleEditStore} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="editKey">Clave del Contexto (No editable)</Label>
                            <Input
                                id="editKey"
                                value={editingStoreKey || ''}
                                disabled
                                className="bg-muted"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="editName">Nombre para Mostrar <span className="text-destructive">*</span></Label>
                            <Input
                                id="editName"
                                placeholder="Ej: Teología Sistemática"
                                value={editStoreName}
                                onChange={e => setEditStoreName(e.target.value)}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="editDesc">Descripción</Label>
                            <Textarea
                                id="editDesc"
                                placeholder="Breve descripción del propósito de este store..."
                                value={editStoreDesc}
                                onChange={e => setEditStoreDesc(e.target.value)}
                                rows={3}
                            />
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)} disabled={isEditing}>
                                Cancelar
                            </Button>
                            <Button type="submit" disabled={isEditing}>
                                {isEditing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                                Guardar Cambios
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Add Docs Dialog */}
            <Dialog open={isAddDocsOpen} onOpenChange={setIsAddDocsOpen}>
                <DialogContent className="sm:max-w-4xl max-h-[85vh] flex flex-col">
                    <DialogHeader>
                        <DialogTitle>Añadir Documentos al Store</DialogTitle>
                        <DialogDescription>
                            Selecciona documentos existentes de tu biblioteca o sube uno nuevo.
                        </DialogDescription>
                    </DialogHeader>
                    
                    <Tabs defaultValue="select" className="flex-1 flex flex-col min-h-0 mt-4">
                        <TabsList className="grid w-full grid-cols-2 mb-4">
                            <TabsTrigger value="select">Seleccionar de Biblioteca</TabsTrigger>
                            <TabsTrigger value="upload">Subir Nuevo Documento</TabsTrigger>
                        </TabsList>
                        
                        <TabsContent value="select" className="flex-1 overflow-hidden flex flex-col mt-0 data-[state=inactive]:hidden">
                            <div className="flex-1 overflow-y-auto border rounded-md">
                                {isLoadingDocs ? (
                                    <div className="flex items-center justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
                                ) : availableDocs.length === 0 ? (
                                    <div className="text-center py-12 text-muted-foreground">No hay documentos disponibles en tu biblioteca para añadir.</div>
                                ) : (
                                    <Table>
                                        <TableHeader className="bg-muted/50 sticky top-0 z-10">
                                            <TableRow>
                                                <TableHead className="w-[50px] text-center">
                                                    <CheckCircle className="h-4 w-4 mx-auto text-muted-foreground" />
                                                </TableHead>
                                                <TableHead>Nombre</TableHead>
                                                <TableHead>Autor</TableHead>
                                                <TableHead>Páginas</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {availableDocs.map(doc => {
                                                const isSelected = selectedDocs.has(doc.id);
                                                return (
                                                    <TableRow 
                                                        key={doc.id}
                                                        className={cn("cursor-pointer", isSelected && "bg-primary/5")}
                                                        onClick={() => {
                                                            const newSet = new Set(selectedDocs);
                                                            if (isSelected) newSet.delete(doc.id);
                                                            else newSet.add(doc.id);
                                                            setSelectedDocs(newSet);
                                                        }}
                                                    >
                                                        <TableCell className="text-center">
                                                            <div className={cn("h-4 w-4 mx-auto rounded-sm border flex items-center justify-center shrink-0", isSelected ? "bg-primary border-primary text-primary-foreground" : "border-muted-foreground")}>
                                                                {isSelected && <CheckCircle className="h-3 w-3" />}
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="font-medium">{doc.title}</TableCell>
                                                        <TableCell className="text-muted-foreground">{doc.author || '---'}</TableCell>
                                                        <TableCell>
                                                            <Badge variant="outline">{doc.metadata?.pages || 0} pág</Badge>
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })}
                                        </TableBody>
                                    </Table>
                                )}
                            </div>

                            <div className="flex justify-end pt-4 mt-auto">
                                <Button variant="outline" className="mr-2" onClick={() => setIsAddDocsOpen(false)}>Cancelar</Button>
                                <Button 
                                    onClick={() => handleAddSelectedDocs(activeTab)} 
                                    disabled={isAddingDocs || selectedDocs.size === 0}
                                >
                                    {isAddingDocs && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Añadir {selectedDocs.size > 0 ? `(${selectedDocs.size})` : ''} Documentos
                                </Button>
                            </div>
                        </TabsContent>

                        <TabsContent value="upload" className="flex-1 overflow-y-auto mt-0 data-[state=inactive]:hidden px-1">
                            <form onSubmit={(e) => handleUploadSubmit(e, activeTab)} className="space-y-4 pt-2">
                                <div className="space-y-2">
                                    <Label htmlFor="file">Archivo</Label>
                                    <Input 
                                        id="file" 
                                        type="file" 
                                        accept=".pdf,.epub"
                                        onChange={handleFileChange}
                                        required
                                    />
                                    {fileSizeWarning && (
                                        <Alert variant="destructive" className="bg-warning/5 border-warning/30 py-2">
                                            <AlertTriangle className="h-3 w-3 text-warning" />
                                            <AlertDescription className="text-warning text-xs">
                                                Archivo &gt;50MB: calidad reducida o posible rechazo de la API de IA.
                                            </AlertDescription>
                                        </Alert>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="title">Título</Label>
                                    <Input 
                                        id="title" 
                                        value={uploadMetadata.title}
                                        onChange={e => setUploadMetadata({...uploadMetadata, title: e.target.value})}
                                        placeholder="Título del documento"
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="author">Autor</Label>
                                    <Input 
                                        id="author" 
                                        value={uploadMetadata.author}
                                        onChange={e => setUploadMetadata({...uploadMetadata, author: e.target.value})}
                                        placeholder="Nombre del autor"
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="type">Categoría</Label>
                                    <Select 
                                        value={uploadMetadata.type} 
                                        onValueChange={(v: ResourceType) => setUploadMetadata({...uploadMetadata, type: v})}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Selecciona una categoría" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {categories.map((cat) => (
                                                <SelectItem key={cat.id} value={cat.id}>{cat.label}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                
                                <div className="flex justify-end pt-4 border-t mt-4">
                                    <Button type="button" variant="outline" className="mr-2" onClick={() => setIsAddDocsOpen(false)}>Cancelar</Button>
                                    <Button type="submit" disabled={isUploading || !uploadFile}>
                                        {isUploading ? (
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        ) : (
                                            <Upload className="mr-2 h-4 w-4" />
                                        )}
                                        Subir y Añadir a Store
                                    </Button>
                                </div>
                            </form>
                        </TabsContent>
                    </Tabs>
                </DialogContent>
            </Dialog>

        </div>
    );
}
