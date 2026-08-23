import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { sermonService } from '@dosfilos/application';
import {
    ContraScanGateError,
    deriveContraScanStatus,
    type ContraScanReport,
    type DissentingChunk,
} from '@dosfilos/domain';
import { useFirebase } from '@/context/firebase-context';
import { useContraScanGate } from './usePastoralFidelityGate';
import { useFindDissentingChunks } from './useFindDissentingChunks';

interface Options {
    /**
     * Called once the contra-scan clears (no dissent, or the pastor recorded a
     * consideration / override). The caller chains the actual publish here
     * (e.g. the fidelity publish gate), so contra-scan wraps publish as the
     * first confrontation.
     */
    onCleared: (sermonId: string) => void | Promise<void>;
}

interface Pending {
    sermonId: string;
    centralIdea: string;
    chunks: DissentingChunk[];
}

/**
 * Phase 4 PR 1 (ADR-033) — orchestrates the contra-scan pre-publish
 * confrontation (P3, Acts 20:27).
 *
 * Flow when the `contra_scan` flag is on:
 *   1. Scan the pastor's library for chunks that DISSENT from his central idea.
 *   2. Open `ContraScanModal` — ALWAYS, as a visible confrontation step:
 *        - dissent found → pastor must record a consideration note (≥100 chars)
 *          or override with a justification (≥100 chars, audit-logged).
 *        - no dissent     → "no contrary positions in your library" + invite to
 *          add sources, then a plain "publish".
 *   3. Persist the `ContraScanReport` (P3 audit trail) → call `onCleared`,
 *      which runs the downstream publish.
 *
 * Flag off → `attempt` calls `onCleared` directly (blast radius 0).
 */
export function useSermonContraScan({ onCleared }: Options) {
    const { t } = useTranslation('sermonDetail');
    const { user } = useFirebase();
    const gate = useContraScanGate();
    const { scan } = useFindDissentingChunks();

    const [scanning, setScanning] = useState(false);
    const [persisting, setPersisting] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const [pending, setPending] = useState<Pending | null>(null);

    const attempt = useCallback(
        async (sermonId: string, centralIdea: string) => {
            if (!gate.enabled) {
                await onCleared(sermonId);
                return;
            }
            setScanning(true);
            try {
                const chunks = await scan(centralIdea);
                setPending({ sermonId, centralIdea, chunks });
                setModalOpen(true);
            } catch (err) {
                // UN FALLO DE LA REVISIÓN NO PUEDE TERMINAR EN SILENCIO.
                //
                // Este `try` tenía `finally` pero NO `catch`: si el escaneo
                // fallaba, la excepción subía a `handlePublish` —que tampoco
                // captura— y moría como promesa rechazada sin manejar. El
                // spinner se apagaba y no pasaba nada: ni aviso, ni modal, ni
                // publicación. El pastor se quedaba mirando un botón normal sin
                // saber si su sermón se publicó.
                //
                // SE AVISA Y SE SIGUE, no se bloquea. La revisión de posiciones
                // contrarias es una red formativa, no un peaje: castigar al
                // pastor por una falla de infraestructura nuestra sería el trato
                // equivocado, y es el mismo criterio con que el verificador de
                // citas deja publicar cuando él mismo no puede correr.
                console.error('[contraScan] el escaneo falló — se avisa y se continúa', err);
                toast.error(t('contraScan.toast.scanFailed'));
                await onCleared(sermonId);
            } finally {
                setScanning(false);
            }
        },
        [gate.enabled, scan, onCleared],
    );

    /** Persist the report, close the modal, and chain the downstream publish. */
    const persistAndClear = useCallback(
        async (report: ContraScanReport, sermonId: string) => {
            setPersisting(true);
            try {
                await sermonService.recordContraScan(sermonId, report);
                setModalOpen(false);
                setPending(null);
                await onCleared(sermonId);
            } catch (err) {
                const key = err instanceof ContraScanGateError ? 'gateError' : 'error';
                toast.error(t(`contraScan.toast.${key}`));
            } finally {
                setPersisting(false);
            }
        },
        [onCleared, t],
    );

    /** No dissent surfaced — record the (empty) scan + proceed. */
    const confirmProceed = useCallback(() => {
        if (!pending) return;
        const report: ContraScanReport = {
            centralIdea: pending.centralIdea,
            scannedAt: new Date(),
            dissentingChunks: pending.chunks,
            status: deriveContraScanStatus(pending.chunks),
        };
        void persistAndClear(report, pending.sermonId);
    }, [pending, persistAndClear]);

    /** Pastor engaged a dissenting chunk with a note. */
    const confirmConsideration = useCallback(
        (chunkId: string, note: string) => {
            if (!pending) return;
            const consideration = { chunkId, note: note.trim(), consideredAt: new Date() };
            const report: ContraScanReport = {
                centralIdea: pending.centralIdea,
                scannedAt: new Date(),
                dissentingChunks: pending.chunks,
                consideration,
                status: deriveContraScanStatus(pending.chunks, consideration),
            };
            void persistAndClear(report, pending.sermonId);
        },
        [pending, persistAndClear],
    );

    /** Pastor proceeded past the soft-block with a justification (audit). */
    const confirmOverride = useCallback(
        (reason: string) => {
            if (!pending) return;
            const override = {
                reason: reason.trim(),
                overriddenAt: new Date(),
                overriddenBy: user?.uid ?? 'unknown',
            };
            const report: ContraScanReport = {
                centralIdea: pending.centralIdea,
                scannedAt: new Date(),
                dissentingChunks: pending.chunks,
                override,
                status: deriveContraScanStatus(pending.chunks, undefined, override),
            };
            void persistAndClear(report, pending.sermonId);
        },
        [pending, user?.uid, persistAndClear],
    );

    return {
        /** True iff contra-scan participates in this publish. */
        enabled: gate.enabled,
        /** Scanning the library — drives the publish-button spinner. */
        scanning,
        /** Persisting the report + publishing. */
        persisting,
        modalOpen,
        setModalOpen,
        /** The pastor's central idea this scan ran against (drives the modal contrast). */
        centralIdea: pending?.centralIdea ?? '',
        /** Dissenting chunks surfaced for the open confrontation (may be []). */
        dissentingChunks: pending?.chunks ?? [],
        attempt,
        confirmProceed,
        confirmConsideration,
        confirmOverride,
    };
}
