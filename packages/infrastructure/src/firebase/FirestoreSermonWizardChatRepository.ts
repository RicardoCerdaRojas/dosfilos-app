import {
    collection,
    doc,
    getDoc,
    setDoc,
    deleteDoc,
    getDocs,
    Timestamp,
    type DocumentData,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import type {
    SermonWorkflowChatMessage,
    ISermonWizardChatRepository,
    SermonWizardChatHistory,
    SermonWizardChatPhase,
    SermonWizardChatSource,
} from '@dosfilos/domain';

type ChatMessage = SermonWorkflowChatMessage;

/**
 * Firestore implementation of `ISermonWizardChatRepository`.
 *
 * Document layout:
 *   sermons/{sermonId}/wizard_chats/{phase}
 *     - sermonId: string
 *     - phase: 'exegesis' | 'homiletics' | 'sermon'
 *     - messages: ChatMessage[]   (inline, capped by Firestore 1MB doc limit
 *                                  ≈ 10k average-size messages — far past any
 *                                  realistic sermon refinement session)
 *     - sourcesPerMessage: Record<msgId, SermonWizardChatSource[]>
 *     - createdAt, updatedAt: Timestamp
 *
 * Why per-document (not per-message subcollection):
 *   - The wizard always loads/saves the FULL conversation per phase
 *     (no pagination, no infinite-scroll). Per-message subcollection
 *     would force N reads on every page load — wasteful when the
 *     whole thing fits in one document.
 *   - 3 phases × 1 doc each = 3 chat docs per sermon, max.
 *   - Atomic save: one setDoc replaces the whole snapshot; no risk
 *     of partial state between turns.
 */
export class FirestoreSermonWizardChatRepository implements ISermonWizardChatRepository {
    private collectionRef(sermonId: string) {
        return collection(db, 'sermons', sermonId, 'wizard_chats');
    }

    private docRef(sermonId: string, phase: SermonWizardChatPhase) {
        return doc(db, 'sermons', sermonId, 'wizard_chats', phase);
    }

    async load(sermonId: string, phase: SermonWizardChatPhase): Promise<SermonWizardChatHistory | null> {
        if (!sermonId) return null;
        try {
            const snap = await getDoc(this.docRef(sermonId, phase));
            if (!snap.exists()) return null;
            return deserialize(snap.data());
        } catch (err) {
            // Read failure is best-effort — caller continues without
            // restored history rather than blocking the wizard mount.
            console.warn('[FirestoreSermonWizardChatRepository] load failed', { sermonId, phase, err });
            return null;
        }
    }

    async save(history: SermonWizardChatHistory): Promise<void> {
        if (!history.sermonId) return;
        try {
            await setDoc(this.docRef(history.sermonId, history.phase), serialize(history));
        } catch (err) {
            // Write failure is best-effort — localStorage in the
            // service still carries the same snapshot, so the
            // conversation isn't lost until the next page reload. The
            // next successful save reconciles state.
            console.warn('[FirestoreSermonWizardChatRepository] save failed', {
                sermonId: history.sermonId,
                phase: history.phase,
                err,
            });
        }
    }

    async clear(sermonId: string, phase?: SermonWizardChatPhase): Promise<void> {
        if (!sermonId) return;
        try {
            if (phase) {
                await deleteDoc(this.docRef(sermonId, phase));
                return;
            }
            // Delete all phases. Three docs max — no batching cost.
            const snap = await getDocs(this.collectionRef(sermonId));
            await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));
        } catch (err) {
            console.warn('[FirestoreSermonWizardChatRepository] clear failed', { sermonId, phase, err });
        }
    }
}

// ── Serialization helpers ──────────────────────────────────────────────

function serialize(history: SermonWizardChatHistory): DocumentData {
    return {
        sermonId: history.sermonId,
        phase: history.phase,
        messages: history.messages.map((m) => ({
            ...m,
            timestamp: m.timestamp instanceof Date ? Timestamp.fromDate(m.timestamp) : m.timestamp,
        })),
        sourcesPerMessage: history.sourcesPerMessage,
        createdAt: history.createdAt instanceof Date
            ? Timestamp.fromDate(history.createdAt)
            : history.createdAt,
        updatedAt: history.updatedAt instanceof Date
            ? Timestamp.fromDate(history.updatedAt)
            : history.updatedAt,
    };
}

function deserialize(data: DocumentData): SermonWizardChatHistory {
    const rawMessages = Array.isArray(data.messages) ? data.messages : [];
    const messages: ChatMessage[] = rawMessages.map((m: any) => ({
        ...m,
        timestamp: m?.timestamp?.toDate?.() ?? new Date(m?.timestamp ?? Date.now()),
    }));
    const rawSources = data.sourcesPerMessage && typeof data.sourcesPerMessage === 'object'
        ? data.sourcesPerMessage
        : {};
    const sourcesPerMessage: Record<string, SermonWizardChatSource[]> = {};
    for (const key of Object.keys(rawSources)) {
        const arr = (rawSources as any)[key];
        if (Array.isArray(arr)) sourcesPerMessage[key] = arr;
    }
    return {
        sermonId: data.sermonId ?? '',
        phase: data.phase ?? 'exegesis',
        messages,
        sourcesPerMessage,
        createdAt: data.createdAt?.toDate?.() ?? new Date(data.createdAt ?? Date.now()),
        updatedAt: data.updatedAt?.toDate?.() ?? new Date(data.updatedAt ?? Date.now()),
    };
}
