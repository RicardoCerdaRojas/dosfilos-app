/**
 * FirebaseLexiconRepository
 *
 * Implements ILexicalRepository and provides full CRUD for the administrable
 * Hebrew lexical glossary.
 *
 * Collection path: `hebrewTutor/config/lexicon`
 *
 * Unlike the HintRepository, the lexicon has NO local defaults — it starts empty
 * and is populated entirely by the SuperAdmin via the admin UI.
 *
 * If Firestore is unavailable, getAll() silently returns an empty array so that
 * verse analysis always proceeds, just without lexical enrichment.
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
  orderBy,
  query,
  where,
} from 'firebase/firestore';
import { db } from '@dosfilos/infrastructure';
import type { ILexicalRepository, LexicalEntry, LexicalEntryType } from '@dosfilos/domain';

const COLLECTION_PATH = 'hebrewTutor/config/lexicon';

// ── Firestore document shape ──────────────────────────────────────────────────

interface LexicalDocument {
  hebrewPhrase: string;
  matchLemmas: string[];
  verseRefs?: string[];
  chainId?: string;
  type: LexicalEntryType;
  literalMeaning: string;
  idiomaticMeaning: string;
  explanation: string;
  source?: string;
  enabled: boolean;
  order: number;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

function docToEntry(id: string, data: LexicalDocument): LexicalEntry {
  return {
    id,
    hebrewPhrase: data.hebrewPhrase ?? '',
    matchLemmas: Array.isArray(data.matchLemmas) ? data.matchLemmas : [],
    verseRefs: Array.isArray(data.verseRefs) ? data.verseRefs : undefined,
    chainId: data.chainId || undefined,
    type: data.type ?? 'idiom',
    literalMeaning: data.literalMeaning ?? '',
    idiomaticMeaning: data.idiomaticMeaning ?? '',
    explanation: data.explanation ?? '',
    source: data.source,
    enabled: data.enabled ?? true,
    order: data.order ?? 0,
    createdAt: data.createdAt?.toDate().toISOString() ?? new Date().toISOString(),
    updatedAt: data.updatedAt?.toDate().toISOString() ?? new Date().toISOString(),
  };
}

// ── Repository ────────────────────────────────────────────────────────────────

export class FirebaseLexiconRepository implements ILexicalRepository {
  private readonly col = collection(db, COLLECTION_PATH);

  /**
   * Returns all enabled lexical entries ordered by `order` ascending.
   * Used at analysis time for prompt injection.
   */
  async getAll(): Promise<readonly LexicalEntry[]> {
    try {
      const q = query(this.col, where('enabled', '==', true), orderBy('order', 'asc'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map((d) => docToEntry(d.id, d.data() as LexicalDocument));
    } catch (error) {
      console.warn('FirebaseLexiconRepository.getAll() failed:', error);
      return [];
    }
  }

  /**
   * Returns ALL entries (including disabled) for the admin catalog UI.
   */
  async getForAdmin(): Promise<LexicalEntry[]> {
    const q = query(this.col, orderBy('order', 'asc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => docToEntry(d.id, d.data() as LexicalDocument));
  }

  async create(
    payload: Omit<LexicalEntry, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<void> {
    await addDoc(this.col, {
      ...payload,
      matchLemmas: payload.matchLemmas as string[],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }

  async update(
    id: string,
    payload: Partial<Omit<LexicalEntry, 'id' | 'createdAt' | 'updatedAt'>>,
  ): Promise<void> {
    await updateDoc(doc(this.col, id), {
      ...payload,
      updatedAt: serverTimestamp(),
    });
  }

  async toggle(id: string, enabled: boolean): Promise<void> {
    await updateDoc(doc(this.col, id), { enabled, updatedAt: serverTimestamp() });
  }

  async delete(id: string): Promise<void> {
    await deleteDoc(doc(this.col, id));
  }
}
