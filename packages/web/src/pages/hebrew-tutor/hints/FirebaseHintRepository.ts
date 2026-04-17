/**
 * FirebaseHintRepository
 *
 * Manages the hint catalog in Firestore.
 * Collection path: `hebrewTutor/config/hints`
 *
 * Local defaults (default-hints.ts) are always used as the base catalog.
 * Firestore entries are merged on top: a remote entry with the same base ID
 * (stripped of 'local_' prefix) overrides the local one. Purely remote entries
 * are appended.
 *
 * If Firestore is unavailable the repository silently returns the local catalog,
 * so the wizard always has hints regardless of network state.
 */

import {
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@dosfilos/infrastructure';
import type { HintDefinition } from '@dosfilos/domain';
import { DEFAULT_HINTS } from './default-hints';

const COLLECTION_PATH = 'hebrewTutor/config/hints';

// ── Firestore document shape ───────────────────────────────────────────────

interface HintDocument {
  phase: number | 'ALL';
  severity: 'info' | 'warning' | 'tip';
  title?: string;
  body: string;
  conditions: string[];
  excludeConditions: string[];
  enabled: boolean;
  order: number;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

function docToHint(id: string, data: HintDocument): HintDefinition {
  return {
    id,
    phase: data.phase,
    severity: data.severity,
    title: data.title,
    body: data.body,
    conditions: (data.conditions ?? []) as HintDefinition['conditions'],
    excludeConditions: (data.excludeConditions ?? []) as HintDefinition['excludeConditions'],
    enabled: data.enabled ?? true,
    order: data.order ?? 0,
  };
}

// ── Repository ────────────────────────────────────────────────────────────

export class FirebaseHintRepository {
  private readonly col = collection(db, COLLECTION_PATH);

  /**
   * Returns the merged catalog: local defaults + Firestore overrides.
   * Remote entries with matching base IDs replace local ones.
   */
  async listAll(): Promise<HintDefinition[]> {
    let remoteHints: HintDefinition[] = [];

    try {
      const snapshot = await getDocs(this.col);
      remoteHints = snapshot.docs.map(d =>
        docToHint(d.id, d.data() as HintDocument),
      );
    } catch (err) {
      console.warn('[FirebaseHintRepository] Firestore unavailable — using local catalog.', err);
    }

    // Merge: remote overrides matching local entries (by base ID)
    const remoteIds = new Set(remoteHints.map(h => h.id));
    const localFallbacks = DEFAULT_HINTS.filter(h => {
      const baseId = h.id.replace(/^local_/, '');
      return !remoteIds.has(baseId) && !remoteIds.has(h.id);
    });

    return [...localFallbacks, ...remoteHints].sort((a, b) => a.order - b.order);
  }

  async create(hint: Omit<HintDefinition, 'id'>): Promise<HintDefinition> {
    const ref = await addDoc(this.col, {
      ...hint,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return { id: ref.id, ...hint };
  }

  async update(id: string, patch: Partial<Omit<HintDefinition, 'id'>>): Promise<void> {
    await updateDoc(doc(this.col, id), {
      ...patch,
      updatedAt: serverTimestamp(),
    });
  }

  async delete(id: string): Promise<void> {
    await deleteDoc(doc(this.col, id));
  }

  async toggleEnabled(id: string, enabled: boolean): Promise<void> {
    await this.update(id, { enabled });
  }
}

/** Singleton instance for use across the app. */
export const hintRepository = new FirebaseHintRepository();
