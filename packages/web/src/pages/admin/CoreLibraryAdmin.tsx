import { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { libraryService, categoryService } from '@dosfilos/application';
import { LibraryCategory, ResourceType } from '@dosfilos/domain';
import { Upload } from 'lucide-react';
import { doc, getDoc, getFirestore, collection, query, where, getDocs, writeBatch, arrayUnion, updateDoc, setDoc } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { getStorage, ref as storageRef, getDownloadURL } from 'firebase/storage';
import { RefreshCw, Database, FileText, CheckCircle, AlertTriangle, Loader2, BookOpen, Mic2, Library, Wand2, HelpCircle, ChevronDown, ChevronRight, GraduationCap, Folder, Sparkles, Activity } from 'lucide-react';
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
import { Textarea } from '@/components/ui/textarea';
import { Plus, Trash2, Settings } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';

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

// ── Small UI helpers ──────────────────────────────────────────────────────────

function MetricCard({
    icon: Icon, label, value, subtitle, highlight,
}: {
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    value: string | number;
    subtitle?: string;
    highlight?: boolean;
}) {
    return (
        <div className={cn(
            "rounded-lg border bg-card p-4 flex items-start gap-3",
            highlight && "border-emerald-300 bg-emerald-50/50 dark:bg-emerald-950/20 dark:border-emerald-900"
        )}>
            <div className={cn(
                "h-10 w-10 rounded-md flex items-center justify-center shrink-0 bg-muted",
                highlight && "bg-emerald-100 dark:bg-emerald-900/40"
            )}>
                <Icon className={cn(
                    "h-5 w-5 text-muted-foreground",
                    highlight && "text-emerald-600 dark:text-emerald-400"
                )} />
            </div>
            <div className="min-w-0 flex-1">
                <div className="text-xs text-muted-foreground uppercase tracking-wide">{label}</div>
                <div className="text-xl font-bold leading-tight">{value}</div>
                {subtitle && (
                    <div className="text-xs text-muted-foreground mt-0.5 truncate" title={subtitle}>
                        {subtitle}
                    </div>
                )}
            </div>
        </div>
    );
}

// ── Annotation helpers ────────────────────────────────────────────────────────

function annotateDocumentText(rawText: string, author: string, title: string): string {
    // Character-based strategy with UNIQUE markers — each marker includes an incremental
    // segment number so Gemini can't dedup them as repeated boilerplate. This is critical:
    // identical markers repeated thousands of times get filtered during indexing.
    const INTERVAL = 350;
    let segmentCounter = 0;
    const marker = (page: number) => {
        segmentCounter++;
        return ` Fragmento ${segmentCounter} · ${author} · "${title}" · p. ${page}. `;
    };

    // First pass: split by page markers (if present) to track page numbers
    const pageRegex = /---\s*PAGE\s*(\d+)\s*---/g;
    const segments: Array<{ text: string; page: number }> = [];
    let lastIndex = 0;
    let currentPage = 1;
    let match: RegExpExecArray | null;

    while ((match = pageRegex.exec(rawText)) !== null) {
        segments.push({ text: rawText.substring(lastIndex, match.index), page: currentPage });
        currentPage = parseInt(match[1]);
        lastIndex = match.index + match[0].length;
    }
    segments.push({ text: rawText.substring(lastIndex), page: currentPage });

    // Second pass: for each page segment, insert markers every INTERVAL chars at word boundaries
    let out = '';
    for (const { text, page } of segments) {
        if (!text.trim()) continue;
        let i = 0;
        while (i < text.length) {
            out += marker(page);
            let end = Math.min(i + INTERVAL, text.length);
            if (end < text.length) {
                const lastSpace = text.lastIndexOf(' ', end);
                if (lastSpace > i + INTERVAL / 2) end = lastSpace;
            }
            out += text.substring(i, end);
            i = end;
        }
    }

    return out;
}

async function uploadAnnotatedTextToGemini(
    text: string,
    displayName: string,
    apiKey: string
): Promise<{ uri: string; name: string }> {
    const blob = new Blob([text], { type: 'text/plain' });
    const init = await fetch(
        `https://generativelanguage.googleapis.com/upload/v1beta/files?key=${apiKey}`,
        {
            method: 'POST',
            headers: {
                'X-Goog-Upload-Protocol': 'resumable',
                'X-Goog-Upload-Command': 'start',
                'X-Goog-Upload-Header-Content-Length': String(blob.size),
                'X-Goog-Upload-Header-Content-Type': 'text/plain',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ file: { displayName } }),
        }
    );
    if (!init.ok) throw new Error(`Gemini init upload failed: ${init.statusText}`);
    const uploadUrl = init.headers.get('x-goog-upload-url');
    if (!uploadUrl) throw new Error('No upload URL from Gemini');

    const upload = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
            'X-Goog-Upload-Protocol': 'resumable',
            'X-Goog-Upload-Command': 'upload, finalize',
            'X-Goog-Upload-Offset': '0',
            'Content-Length': String(blob.size),
        },
        body: blob,
    });
    if (!upload.ok) throw new Error(`Gemini upload failed: ${upload.statusText}`);
    const r = await upload.json() as { file: { uri: string; name: string } };
    return { uri: r.file.uri, name: r.file.name };
}

// ─────────────────────────────────────────────────────────────────────────────

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

    const handleIndexDocument = async (resourceId: string, title: string) => {
        setIndexing(prev => ({ ...prev, [resourceId]: true }));
        try {
            const functions = getFunctions();
            const indexFn = httpsCallable(functions, 'indexStructuredDocument', {
                timeout: 900_000,
            });
            const result = await indexFn({ resourceId, force: true }) as any;
            const data = result.data ?? {};
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
                const functions = getFunctions();
                const indexFn = httpsCallable(functions, 'indexStructuredDocument', {
                    timeout: 900_000,
                });
                // force: false → server skips docs with current indexerVersion (already indexed)
                const result = await indexFn({ resourceId: doc.id, force: false }) as any;
                const data = result.data ?? {};
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
            const functions = getFunctions();
            const reprocessFn = httpsCallable(functions, 'reprocessWithLlamaParse', {
                timeout: 900_000,  // 15 minutes — LlamaParse can take several minutes for large PDFs
            });
            const result = await reprocessFn({ resourceId, force: true }) as any;
            const data = result.data ?? {};
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
                const functions = getFunctions();
                const reprocessFn = httpsCallable(functions, 'reprocessWithLlamaParse', {
                timeout: 900_000,  // 15 minutes — LlamaParse can take several minutes for large PDFs
            });
                await reprocessFn({ resourceId: doc.id, force: false });
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
        const loadAgents = async () => {
            const db = getFirestore();
            const snap = await getDocs(collection(db, 'ai_agents'));
            setAgents(snap.docs.map(d => ({ id: d.id, ...(d.data() as any) })));
        };
        loadAgents().catch(err => console.error('Failed to load agents:', err));
    }, []);

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
        const apiKey = (import.meta as any).env?.VITE_GEMINI_API_KEY;
        if (!apiKey) { toast.error('API key de Gemini no configurada'); return; }

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
        const db = getFirestore();
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
                    // textContentUrl is a gs:// URI — must convert to HTTPS via Firebase Storage SDK
                    const storage = getStorage();
                    const fileRef = storageRef(storage, r.textContentUrl);
                    const httpsUrl = await getDownloadURL(fileRef);
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
                    apiKey
                );
                console.log(`[Annotate]   Uploaded → uri: ${uri}, name: ${name}`);

                // Save annotated URIs — Cloud Function will prefer these over PDF URIs
                await updateDoc(doc(db, 'library_resources', r.id), {
                    'metadata.annotatedGeminiUri': uri,
                    'metadata.annotatedGeminiName': name,
                });

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
            // Save old store ID before sync — the Cloud Function may create a new one
            const oldStoreId = config?.stores?.[storeKey] ?? null;

            const functions = getFunctions();
            const syncFn = httpsCallable(functions, 'syncCoreLibraryStore');
            const result = await syncFn({ context: storeKey }) as any;

            if (!result.data?.success) throw new Error('Cloud Function returned unsuccessful');

            // Step 3: Reload config to get the NEW store ID assigned by the Cloud Function
            const db = getFirestore();
            const configSnap = await getDoc(doc(db, 'config/coreLibraryStores'));
            const newStoreId: string | null = configSnap.data()?.stores?.[storeKey] ?? null;

            // Step 4: Update any agents whose corpusIds still reference the OLD store ID
            if (newStoreId && oldStoreId && newStoreId !== oldStoreId) {
                setAnnotationProgress(prev => ({ ...prev, [storeKey]: 'Actualizando tutores con nuevo store ID…' }));
                const agentsSnap = await getDocs(collection(db, 'ai_agents'));
                const batch = writeBatch(db);
                let agentsUpdated = 0;

                agentsSnap.forEach(agentDoc => {
                    const data = agentDoc.data();
                    const ids: string[] = data.corpusIds || [];
                    if (ids.includes(oldStoreId)) {
                        const updated = ids.map((id: string) => id === oldStoreId ? newStoreId : id);
                        batch.update(agentDoc.ref, { corpusIds: updated });
                        agentsUpdated++;
                    }
                });

                if (agentsUpdated > 0) {
                    await batch.commit();
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
            description: `Este documento será desvinculado del store "${context}". Deberás sincronizar después para que Gemini aplique el cambio.`,
            confirmLabel: 'Desvincular',
            variant: 'destructive',
        });
        if (!ok) return;
        
        try {
            setIsUnlinking(docTitle);
            
            // 1. Find the document Id in Firestore by querying the title
            const db = getFirestore();
            const libraryRef = collection(db, 'library_resources');
            const q = query(
                libraryRef,
                where('userId', '==', firebase!.user!.uid),
                where('title', '==', docTitle),
                where('coreStores', 'array-contains', context)
            );
            const snapshot = await getDocs(q);
            
            if (snapshot.empty) {
                toast.error('No se pudo encontrar el documento original en tu biblioteca.');
                return;
            }
            
            const docId = snapshot.docs[0]!.id;
            
            // 2. Call cloud function
            const functions = getFunctions();
            const unlinkFn = httpsCallable(functions, 'removeFileFromStore');
            const result = await unlinkFn({ documentId: docId, context });
            const data = result.data as any;
            
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
            const db = getFirestore();
            const docRef = doc(db, 'library_resources', resource.id);
            const batch = writeBatch(db);
            batch.update(docRef, {
                coreStores: arrayUnion(contextKey)
            });
            await batch.commit();

            toast.success(`Documento subido y añadido a ${contextKey}. Procesando IA en segundo plano...`);
            setUploadFile(null);
            setFileSizeWarning(false);
            setUploadMetadata({ title: '', author: '', type: 'theology' });
            setIsAddDocsOpen(false);
            await loadConfig();

            // Trigger background sync to generate Gemini URI immediately
            try {
                const functions = getFunctions();
                const syncResourceFn = httpsCallable(functions, 'syncResourceToGemini');
                // We don't await this so it runs in the background and doesn't block UI
                syncResourceFn({ resourceId: resource.id }).catch(err => {
                    console.error("Background sync resource to gemini failed:", err);
                });
            } catch(e) { 
                console.error("Failed to trigger background sync:", e);
            }

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
            const db = getFirestore();
            const libraryRef = collection(db, 'library_resources');
            const q = query(
                libraryRef,
                where('userId', '==', firebase!.user!.uid)
            );
            const snapshot = await getDocs(q);
            
            // Filter out docs already in this store
            const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as any);
            const currentFiles = config?.files?.[contextKey] || [];
            const currentUris = new Set(currentFiles.map(f => f.geminiUri));

            const available = docs.filter(d => 
                d.metadata?.geminiUri && 
                !currentUris.has(d.metadata.geminiUri) && 
                !d.coreStores?.includes(contextKey)
            );
            
            setAvailableDocs(available);
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
            const db = getFirestore();
            const batch = writeBatch(db);
            
            selectedDocs.forEach(docId => {
                const docRef = doc(db, 'library_resources', docId);
                batch.update(docRef, {
                    coreStores: arrayUnion(contextKey)
                });
            });
            
            await batch.commit();
            
            toast.success(`${selectedDocs.size} documentos añadidos al store`);
            setIsAddDocsOpen(false);
            
            // Reload config to update the frontend
            await loadConfig();
            
            // Reload available docs to remove them from the list
            if (firebase?.user) {
                const db = getFirestore();
                const libraryRef = collection(db, 'library_resources');
                const q = query(libraryRef, where('userId', '==', firebase.user.uid));
                const snapshot = await getDocs(q);
                const docs = snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }) as any);
                const currentUris = new Set((config?.files?.[contextKey] || []).map((f: any) => f.geminiUri));
                setAvailableDocs(docs.filter((d: any) => d.metadata?.geminiUri && !currentUris.has(d.metadata.geminiUri) && !d.coreStores?.includes(contextKey)));
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
            toast.info(`Iniciando procesamiento manual para "${title}"...`);
            const functions = getFunctions();
            const syncResourceFn = httpsCallable(functions, 'syncResourceToGemini');
            
            // Wait for it because user triggered it manually
            const result = await syncResourceFn({ resourceId }) as any;
            
            if (result.data?.success) {
                toast.success(`Documento procesado correctamente.`);
                await loadConfig();
            } else {
                toast.error(`Error procesando documento: ${result.data?.error || 'Desconocido'}`);
            }
        } catch (error: any) {
            console.error('Manual sync error:', error);
            toast.error(`Error: ${error.message}`);
        } finally {
            setIsRetrying(null);
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
            const functions = getFunctions();
            const updateStoreFn = httpsCallable(functions, 'updateCoreLibraryStore');
            
            await updateStoreFn({
                key: editingStoreKey,
                displayName: editStoreName.trim(),
                description: editStoreDesc.trim()
            });

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

            const db = getFirestore();
            const docRef = doc(db, 'config/coreLibraryStores');
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                const data = docSnap.data();
                setConfig({
                    stores: data.stores || {},
                    files: data.files || {},
                    descriptions: data.descriptions || {},
                    createdAt: data.createdAt?.toDate() || new Date(),
                    lastValidatedAt: data.lastValidatedAt?.toDate() || new Date()
                });

                // Initialize sync state for all stores (only on first load)
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
        
        const db = getFirestore();
        const contexts = Object.keys(configData.stores || {});
        
        const newSyncStatus: Record<string, SyncStatus> = {};
        const newStoreResources: Record<string, any[]> = {};

        for (const context of contexts) {
            try {
                // Get desired state from library
                const libraryRef = collection(db, 'library_resources');
                const q = query(
                    libraryRef,
                    where('userId', '==', firebase.user.uid),
                    where('coreStores', 'array-contains', context)
                );
                const snapshot = await getDocs(q);
                
                const allDocs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
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
            
            const functions = getFunctions();
            const syncFn = httpsCallable(functions, 'syncCoreLibraryStore');
            const result = await syncFn({ context });
            const data = result.data as any;

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
            const functions = getFunctions();
            const createFn = httpsCallable(functions, 'createCoreLibraryStore');
            
            await createFn({
                key: newStoreKey,
                displayName: newStoreName,
                description: newStoreDesc
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
        const meta = defaultMeta[key] || {
            name: config?.displayNames?.[key] || key.charAt(0).toUpperCase() + key.slice(1).replace(/-/g, ' '),
            icon: Folder,
            description: config?.descriptions?.[key] || 'Contexto personalizado',
        };
        return {
            ...meta,
            key 
        };
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
                                        <li>• Los stores son contextos permanentes indexados por Gemini File Search.</li>
                                        <li>• Crea contextos específicos (Exégesis, Homilética, etc.) para organizar el conocimiento.</li>
                                        <li>• Al desvincular un documento, pulsa "Sincronizar" para que Gemini recree el store sin él.</li>
                                        <li>• "Anotar y Recrear" inyecta marcadores <code className="text-xs bg-muted px-1 rounded">[FUENTE:]</code> en los documentos para que los tutores puedan citar autor, título y página.</li>
                                    </ul>
                                </div>
                            </PopoverContent>
                        </Popover>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                        Contextos de conocimiento teológico para tutores IA
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
                                    Crea un nuevo contexto de archivos para el asistente de IA.
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

                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleAnnotateAll(false)}
                        disabled={!!batchOperation.type || storeContexts.length === 0}
                        title="Anota todos los stores — salta los documentos ya anotados"
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
                        title="Forzar re-anotación de TODOS los stores y documentos (incluso los ya anotados). Usa esto cuando cambió el formato de anotación."
                    >
                        <RefreshCw className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleSyncAll}
                        disabled={!!batchOperation.type || storeContexts.length === 0}
                        title="Sincroniza TODOS los stores secuencialmente"
                    >
                        {batchOperation.type === 'sync'
                            ? <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            : <RefreshCw className="h-4 w-4 mr-2" />}
                        Sincronizar todos
                    </Button>
                    <Button onClick={() => setIsAuditOpen(true)} variant="outline" size="sm" disabled={!!batchOperation.type}>
                        <Activity className="h-4 w-4 mr-2" />
                        Auditoría RAG
                    </Button>
                    <Button onClick={loadConfig} variant="outline" size="sm" disabled={!!batchOperation.type}>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Actualizar
                    </Button>
                </div>
            </div>

            {/* Dashboard — Key metrics */}
            {config && (() => {
                const allResources = Object.values(storeResources).flat();
                const uniqueDocs = new Map<string, any>();
                allResources.forEach((r: any) => { if (r.id) uniqueDocs.set(r.id, r); });
                const uniqueDocsList = Array.from(uniqueDocs.values());
                const annotatedCount = uniqueDocsList.filter((r: any) => r.metadata?.annotatedGeminiUri).length;
                const totalPages = uniqueDocsList.reduce((sum: number, r: any) => sum + (r.pageCount || 0), 0);
                const storeIds = Object.values(config.stores).filter(Boolean) as string[];
                const connectedTutors = agents.filter(a =>
                    a.isActive && a.corpusIds?.some(id => storeIds.includes(id))
                );
                const annotationPct = uniqueDocsList.length > 0
                    ? Math.round((annotatedCount / uniqueDocsList.length) * 100)
                    : 0;

                return (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <MetricCard icon={Library} label="Stores" value={storeContexts.length} />
                        <MetricCard icon={FileText} label="Documentos" value={uniqueDocsList.length} subtitle={`${totalPages.toLocaleString()} págs`} />
                        <MetricCard icon={Sparkles} label="Anotados" value={`${annotatedCount}/${uniqueDocsList.length}`} subtitle={`${annotationPct}%`} highlight={annotationPct === 100} />
                        <MetricCard icon={GraduationCap} label="Tutores conectados" value={connectedTutors.length} subtitle={connectedTutors.length > 0 ? connectedTutors.map(t => t.name).join(' · ') : '—'} />
                    </div>
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

            {/* Master-Detail Layout */}
            <div className="flex flex-col lg:flex-row gap-6 items-start">
                
                {/* LEFTSIDE (MASTER) */}
                <div className="w-full lg:w-72 flex flex-col gap-3 shrink-0">
                    <div className="font-semibold text-sm text-foreground px-1 border-b pb-2 mb-1 flex items-center justify-between">
                        <span>Stores Configurados</span>
                        <Badge variant="secondary">{storeContexts.length}</Badge>
                    </div>
                    {config ? (
                        storeContexts.map(context => {
                        const status = syncStatus[context.key];
                        const files = config.files[context.key] || [];
                        const Icon = context.icon;
                        const isSynced = status?.isSynced ?? true;

                        const storeDocs = storeResources[context.key] || [];
                        const docCount = storeDocs.length;
                        const annotatedInStore = storeDocs.filter((d: any) => d.metadata?.annotatedGeminiUri).length;
                        const storePages = storeDocs.reduce((sum: number, d: any) => sum + (d.pageCount || 0), 0);
                        const storeTutors = tutorsForStoreId(config?.stores?.[context.key]);

                        return (
                            <Card
                                key={context.key}
                                className={cn(
                                    "cursor-pointer transition-all hover:shadow-md",
                                    activeTab === context.key && "ring-2 ring-primary"
                                )}
                                onClick={() => setActiveTab(context.key)}
                            >
                                <CardContent className="p-4 space-y-2.5">
                                    {/* Row 1: name + sync indicator */}
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2 min-w-0">
                                            <Icon className="h-4 w-4 shrink-0" />
                                            <span className="text-sm font-medium truncate">{context.name}</span>
                                        </div>
                                        {isSynced ? (
                                            <CheckCircle className="h-4 w-4 text-green-600 shrink-0" title="Sincronizado" />
                                        ) : (
                                            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" title="Desincronizado" />
                                        )}
                                    </div>

                                    {/* Row 2: stats */}
                                    <div className="text-xs text-muted-foreground leading-relaxed">
                                        <div>
                                            <span className="font-medium text-foreground">{docCount}</span> doc{docCount !== 1 ? 's' : ''}
                                            {storePages > 0 && <> · <span className="font-medium text-foreground">{storePages.toLocaleString()}</span> págs</>}
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Wand2 className="h-3 w-3" />
                                            <span className={cn(
                                                "font-medium",
                                                annotatedInStore === docCount && docCount > 0 ? "text-emerald-600" : "text-amber-600"
                                            )}>
                                                {annotatedInStore}/{docCount}
                                            </span>
                                            <span>anotados</span>
                                        </div>
                                    </div>

                                    {/* Row 3: tutor chips */}
                                    {storeTutors.length > 0 && (
                                        <div className="flex flex-wrap gap-1 pt-1 border-t">
                                            {storeTutors.slice(0, 3).map(t => (
                                                <Badge key={t.id} variant="secondary" className="text-[10px] px-1.5 py-0 h-4 font-normal">
                                                    {t.name}
                                                </Badge>
                                            ))}
                                            {storeTutors.length > 3 && (
                                                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 font-normal">
                                                    +{storeTutors.length - 3}
                                                </Badge>
                                            )}
                                        </div>
                                    )}

                                    {/* Row 4: sync button */}
                                    <div className="flex items-center justify-end pt-1">
                                        <Button
                                            onClick={(e) => { e.stopPropagation(); handleSyncStore(context.key); }}
                                            disabled={syncing[context.key]}
                                            size="icon"
                                            className="h-7 w-7"
                                            variant={isSynced ? "ghost" : "secondary"}
                                            title="Sincronizar Store"
                                        >
                                            {syncing[context.key]
                                                ? <Loader2 className="h-3 w-3 animate-spin" />
                                                : <RefreshCw className="h-3 w-3" />}
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })
                    ) : (
                        <div className="text-sm text-muted-foreground p-4 text-center border rounded-md border-dashed">
                            Cargando stores...
                        </div>
                    )}
                </div>

                {/* RIGHTSIDE (DETAIL) */}
                <div className="w-full flex-1 min-w-0">
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
                                                <span className="text-xs text-emerald-600 animate-pulse">
                                                    {reprocessProgress[`__store__${context.key}`]}
                                                </span>
                                            )}
                                            {indexProgress[`__store__${context.key}`] && (
                                                <span className="text-xs text-indigo-600 animate-pulse">
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
                                                    : <Database className="h-4 w-4 mr-2 text-indigo-600" />}
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
                                                    : <Sparkles className="h-4 w-4 mr-2 text-emerald-600" />}
                                                Reprocesar con LlamaParse
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handleAnnotateStore(context.key)}
                                                disabled={annotating[context.key]}
                                                title="Anota cada documento con marcadores [FUENTE:] y recrea el store para que las citas aparezcan en las respuestas del tutor"
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
                                                title="Forzar re-anotación de TODOS los documentos (incluso los ya anotados). Usa esto si cambió el formato de anotación."
                                            >
                                                <RefreshCw className="h-3 w-3" />
                                            </Button>
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
                                            <Table className="min-w-[960px]">
                                                <TableHeader className="bg-muted/30">
                                                    <TableRow>
                                                        <TableHead>Documento</TableHead>
                                                        <TableHead>Autor</TableHead>
                                                        <TableHead className="w-[100px]">Páginas</TableHead>
                                                        <TableHead className="w-[100px]">Estado</TableHead>
                                                        <TableHead className="w-[110px]">Extracción</TableHead>
                                                        <TableHead className="w-[100px]">Indexing</TableHead>
                                                        <TableHead className="w-[90px]">Citación</TableHead>
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
                                                                <TableCell>
                                                                    {isSynced ? (
                                                                        <div className="flex items-center gap-1">
                                                                            <Badge variant="secondary" className="bg-green-100 text-green-800 hover:bg-green-100 border-transparent">
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
                                                                                Procesando IA
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
                                                                            <Badge variant="secondary" className="bg-blue-100 text-blue-800 hover:bg-blue-100 border-transparent">
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
                                                                <TableCell>
                                                                    {file.extractionVersion === '3.0-llamaparse' ? (
                                                                        <Badge variant="secondary" className="bg-emerald-100 text-emerald-800 border-transparent text-xs" title="Extraído con LlamaParse — páginas reales, estructura preservada">
                                                                            LlamaParse
                                                                        </Badge>
                                                                    ) : file.extractionVersion === '2.0-gemini' ? (
                                                                        <Badge variant="secondary" className="bg-blue-100 text-blue-800 border-transparent text-xs" title="Extraído con Gemini 2.0 Flash (legacy)">
                                                                            Gemini
                                                                        </Badge>
                                                                    ) : file.extractionVersion === 'fallback-pdfparse' ? (
                                                                        <Badge variant="secondary" className="bg-amber-100 text-amber-800 border-transparent text-xs" title="Extraído con pdf-parse (fallback básico)">
                                                                            pdf-parse
                                                                        </Badge>
                                                                    ) : (
                                                                        <span className="text-xs text-muted-foreground">—</span>
                                                                    )}
                                                                </TableCell>
                                                                <TableCell>
                                                                    {file.indexingStatus === 'ready' ? (
                                                                        <Badge variant="secondary" className="bg-indigo-100 text-indigo-800 border-transparent text-xs" title={`Indexado con ${file.indexedChunkCount ?? '?'} chunks`}>
                                                                            <Database className="h-2.5 w-2.5 mr-1" />
                                                                            Indexado
                                                                        </Badge>
                                                                    ) : file.indexingStatus === 'processing' ? (
                                                                        <Badge variant="secondary" className="bg-amber-100 text-amber-800 border-transparent text-xs">
                                                                            <Loader2 className="h-2.5 w-2.5 mr-1 animate-spin" />
                                                                            Procesando
                                                                        </Badge>
                                                                    ) : file.indexingStatus === 'failed' ? (
                                                                        <Badge variant="secondary" className="bg-red-100 text-red-800 border-transparent text-xs" title={file.indexingError}>
                                                                            Error
                                                                        </Badge>
                                                                    ) : (
                                                                        <span className="text-xs text-muted-foreground">—</span>
                                                                    )}
                                                                </TableCell>
                                                                <TableCell>
                                                                    {file.metadata?.annotatedGeminiUri ? (
                                                                        <Badge variant="secondary" className="bg-violet-100 text-violet-800 border-transparent text-xs" title="Documento anotado con marcadores [FUENTE:] para citar documentos individuales">
                                                                            <Wand2 className="h-2.5 w-2.5 mr-1" />
                                                                            Anotado
                                                                        </Badge>
                                                                    ) : (
                                                                        <span className="text-xs text-muted-foreground">—</span>
                                                                    )}
                                                                </TableCell>
                                                                <TableCell className="text-right">
                                                                    <div className="flex items-center justify-end gap-1">
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="icon"
                                                                            className="h-8 w-8"
                                                                            onClick={() => handleReprocessDocument(file.id, file.title || file.name)}
                                                                            disabled={!!reprocessing[file.id]}
                                                                            title={file.extractionVersion === '3.0-llamaparse'
                                                                                ? "Re-extraer con LlamaParse (forzar)"
                                                                                : "Extraer con LlamaParse (recomendado)"}
                                                                        >
                                                                            {reprocessing[file.id]
                                                                                ? <Loader2 className="h-4 w-4 animate-spin" />
                                                                                : <Sparkles className={cn("h-4 w-4", file.extractionVersion === '3.0-llamaparse' ? "text-emerald-600" : "text-muted-foreground")} />}
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
                                                                                : <Database className={cn("h-4 w-4", file.indexingStatus === 'ready' ? "text-indigo-600" : "text-muted-foreground")} />}
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
                        <p className="text-sm mt-1">Selecciona un store de la izquierda para ver y gestionar sus documentos.</p>
                    </div>
                </div>
            )}
            </div>
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
                <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col">
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
                                        <Alert variant="destructive" className="bg-amber-50 border-amber-200 py-2">
                                            <AlertTriangle className="h-3 w-3 text-amber-600" />
                                            <AlertDescription className="text-amber-700 text-xs">
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
