import { getFunctions, httpsCallable } from 'firebase/functions';
import type { DraftShadowSignal } from '../use-cases/exegesis/sermonDraftSignals';

/**
 * Redacción v2 — fachada del recorder de sombra del draft. Ambos colectores
 * (determinista y juez) emiten bajo el mismo contrato (`DraftShadowSignal[]`) a
 * esta única función. Mantiene el firebase SDK fuera de web/src (compliance C7.3).
 */

export interface RecordSermonDraftShadowArgs {
    sermonId: string;
    passage?: string;
    approachType?: string;
    principlePresent?: boolean;
    collector: 'deterministic' | 'judged';
    signals: DraftShadowSignal[];
}

export class SermonDraftShadowService {
    async record(args: RecordSermonDraftShadowArgs): Promise<void> {
        const fn = httpsCallable<RecordSermonDraftShadowArgs, { recorded: boolean }>(
            getFunctions(),
            'recordSermonDraftShadow',
        );
        await fn(args);
    }
}

export const sermonDraftShadowService = new SermonDraftShadowService();
