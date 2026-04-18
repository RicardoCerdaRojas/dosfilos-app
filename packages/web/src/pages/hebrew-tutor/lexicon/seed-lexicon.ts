/**
 * seedLexicon — One-shot function to populate the Hebrew lexicon with curated
 * exegetical entries for Genesis 1–11.
 *
 * Designed to be called from a temporary admin button or browser console.
 * Skips entries whose `hebrewPhrase` already exists to avoid duplicates.
 */

import {
  collection,
  getDocs,
  addDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@dosfilos/infrastructure';
import { GENESIS_SEED_ENTRIES } from './lexicon-seed-data';

const COLLECTION_PATH = 'hebrewTutor/config/lexicon';

export async function seedLexicon(): Promise<{ created: number; skipped: number }> {
  const col = collection(db, COLLECTION_PATH);

  // Load existing entries to avoid duplicates
  const snapshot = await getDocs(col);
  const existingPhrases = new Set(
    snapshot.docs.map((d) => d.data().hebrewPhrase as string),
  );

  let created = 0;
  let skipped = 0;

  for (const entry of GENESIS_SEED_ENTRIES) {
    if (existingPhrases.has(entry.hebrewPhrase)) {
      console.log(`⏭️  Skipped (already exists): ${entry.hebrewPhrase}`);
      skipped++;
      continue;
    }

    await addDoc(col, {
      ...entry,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    console.log(`✅  Created: ${entry.hebrewPhrase}`);
    created++;
  }

  console.log(`\n📊 Seed complete: ${created} created, ${skipped} skipped.`);
  return { created, skipped };
}
