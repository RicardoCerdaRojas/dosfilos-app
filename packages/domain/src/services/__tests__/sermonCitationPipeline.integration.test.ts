import { describe, it, expect } from 'vitest';
import {
    selectSermonCitationChunks,
    buildCitationManifest,
    validateCitations,
    stripSermonCitationMarkers,
    type RetrievedCitationChunk,
    type SermonContent,
} from '../../index';

/**
 * ADR-031 — END-TO-END pipeline proof (deterministic).
 *
 * Composes the REAL pipeline functions exactly as production wires them,
 * mocking ONLY the two external systems this layer cannot reach in a unit
 * test: the `retrieveChunks` Firestore vector search and the Gemini draft.
 *
 * Flow proven:
 *   retrieved chunks (personal + CORE)
 *     → selectSermonCitationChunks   (personal priority, CORE fallback)
 *     → buildCitationManifest        (verifiable entries: book + page + text)
 *     → [LLM draft with narrative + [S1] anchor + ragSources]   (mocked output)
 *     → validateCitations            ([S1] → [1], renumber, drop unknowns)
 *     → stripSermonCitationMarkers   (keep valid [N], strip junk)
 *   ⇒ a sermon that cites narratively, with a VALID [N] anchor that maps to a
 *     manifest entry carrying the precise, verifiable citation.
 */

// ── Mock external system #1: retrieveChunks (Firestore vector search) ────────
const personalChunks: RetrievedCitationChunk[] = [
    {
        id: 'p-chunk-1',
        resourceId: 'user-subukjian',
        resourceTitle: 'Volvamos a la predicación Bíblica',
        resourceAuthor: 'Donald R. Subukjian',
        text: 'La doctrina es el negocio principal del predicador.',
        metadata: { page: '102' },
        score: 0.82,
        publiclyCitable: false, // the pastor's own copy
    },
];
const coreChunks: RetrievedCitationChunk[] = [
    {
        id: 'core-chunk-1',
        resourceId: 'core-chapell',
        resourceTitle: 'Cómo usar ilustraciones para predicar con poder',
        resourceAuthor: 'Bryan Chapell',
        text: 'Una ilustración bien usada ilumina la verdad, no la reemplaza.',
        metadata: { page: '232' },
        score: 0.95, // higher raw score than the personal hit — must still rank below it
        publiclyCitable: true,
    },
];

// ── Mock external system #2: the Gemini draft (narrative + [S1]/[S2] anchors) ─
function mockLlmDraft(): SermonContent {
    return {
        introduction: 'Hoy confiamos en la Palabra escrita.',
        body: [
            {
                point: 'I. La autoridad de la Escritura',
                content:
                    'Como enseña el pastor Subukjian, la doctrina es el corazón de la predicación [S1].',
                scriptureReferences: [],
            },
            {
                point: 'II. La fuerza de una buena ilustración',
                content:
                    'Como observa Chapell, una ilustración ilumina la verdad sin reemplazarla [S2]. ' +
                    'Y nunca debemos apoyarnos en una fuente inexistente [S9].', // [S9] is hallucinated → must be dropped
                scriptureReferences: [],
            },
        ],
        conclusion: 'Anclémonos en lo que Dios ha dicho.',
        ragSources: [
            { sourceId: 'S1', title: 'Volvamos a la predicación Bíblica' },
            { sourceId: 'S2', title: 'Cómo usar ilustraciones para predicar con poder' },
            { sourceId: 'S9', title: 'Fuente inventada' }, // hallucinated → dropped
        ],
    } as SermonContent;
}

describe('sermon citation pipeline — end to end (ADR-031)', () => {
    it('cites narratively with a valid [N] anchor mapping to the precise source; personal ranks before CORE', () => {
        // 1. Selection — personal priority, CORE fills.
        const selected = selectSermonCitationChunks(personalChunks, coreChunks, { maxChunks: 10 });
        expect(selected.map((c) => c.id)).toEqual(['p-chunk-1', 'core-chunk-1']); // personal first despite lower score

        // 2. Manifest — verifiable entries (book + page + exact text).
        const manifest = buildCitationManifest(selected);
        expect(manifest.entries[0].title).toBe('Volvamos a la predicación Bíblica'); // personal = S1
        expect(manifest.entries[0].page).toBe('102');
        expect(manifest.entries[0].excerpt).toContain('La doctrina es el negocio principal del predicador.');
        expect(manifest.entries[1].title).toBe('Cómo usar ilustraciones para predicar con poder'); // CORE = S2

        // 3. LLM draft (mocked) → 4. validateCitations: [S1]/[S2] → [1]/[2]; [S9] dropped.
        const validated = validateCitations(mockLlmDraft(), manifest);

        // 5. strip junk, keep valid [N] anchors.
        const final = stripSermonCitationMarkers(validated.content);

        const p1 = final.body[0].content;
        const p2 = final.body[1].content;

        // Narrative attribution survives.
        expect(p1).toContain('Como enseña el pastor Subukjian');
        expect(p2).toContain('Como observa Chapell');

        // Valid anchors renumbered to bare ordinals and kept.
        expect(p1).toContain('[1]');
        expect(p2).toContain('[2]');

        // Never invent: the hallucinated [S9] is gone (no fabricated citation).
        expect(p2).not.toContain('[S9]');
        expect(p2).not.toContain('[3]');
        expect(p2).not.toContain('inexistente [');

        // The kept anchor [1] resolves to the personal Subukjian source — the
        // verifiable, precise citation a reader can check (book + page + text).
        const entryForAnchor1 = validated.manifest.entries[0];
        expect(entryForAnchor1.title).toBe('Volvamos a la predicación Bíblica');
        expect(entryForAnchor1.page).toBe('102');
    });

    it('every point that uses a source ends with a verifiable anchor (≥1 citation per point)', () => {
        const manifest = buildCitationManifest(
            selectSermonCitationChunks(personalChunks, coreChunks),
        );
        const final = stripSermonCitationMarkers(validateCitations(mockLlmDraft(), manifest).content);
        for (const point of final.body) {
            expect(point.content).toMatch(/\[\d+\]/); // at least one [N] anchor
        }
    });

    it('falls back to CORE when the personal library is empty', () => {
        const selected = selectSermonCitationChunks([], coreChunks);
        const manifest = buildCitationManifest(selected);
        expect(manifest.entries).toHaveLength(1);
        expect(manifest.entries[0].title).toBe('Cómo usar ilustraciones para predicar con poder');
    });

    it('produces no citations (never invents) when neither library returns a chunk', () => {
        const selected = selectSermonCitationChunks([], []);
        expect(selected).toHaveLength(0);
        // With an empty manifest, validateCitations strips any [Sn] the model
        // emitted — the sermon carries no fabricated anchors.
        const validated = validateCitations(mockLlmDraft(), { version: '1', entries: [] });
        const final = stripSermonCitationMarkers(validated.content);
        expect(final.body[0].content).not.toContain('[S1]');
        expect(final.body[0].content).not.toMatch(/\[\d+\]/);
    });
});
