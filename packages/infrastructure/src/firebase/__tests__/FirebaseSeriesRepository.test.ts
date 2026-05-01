import { describe, it, expect } from 'vitest';
import { Timestamp } from 'firebase/firestore';
import { FirebaseSeriesRepository } from '../FirebaseSeriesRepository';

// We exercise the private mapper methods directly via cast — they are
// pure transforms and the alternative (full Firestore round-trip) would
// require live infra. The roadmap (`feature_sermon_series_pericope_pipeline.md`)
// flags this as non-negotiable for every `*Repository.ts` change because
// Firestore rejects payloads that contain `undefined`, and the new
// pericope-assistant fields are all optional.
const repo = new FirebaseSeriesRepository();
const toFs = (m: any) => (repo as any).metadataToFirestore(m);
const fromFs = (m: any) => (repo as any).metadataFromFirestore(m);

describe('FirebaseSeriesRepository — metadata round-trip', () => {
    it('serializes and deserializes legacy metadata (no exegetical fields)', () => {
        const original = {
            expository: { book: '2 Pedro', chapterRange: '1-3' },
            plannedSermons: [
                {
                    id: 'p1',
                    week: 1,
                    title: 'Llamados firmes',
                    description: 'Intro',
                    passage: '2 Pedro 1:1-11',
                },
            ],
        };

        const fs = toFs(original);

        // No `undefined` may reach Firestore.
        for (const key of Object.keys(fs.expository)) {
            expect(fs.expository[key]).not.toBeUndefined();
        }
        const ps = fs.plannedSermons[0];
        for (const key of Object.keys(ps)) {
            expect(ps[key]).not.toBeUndefined();
        }

        const back = fromFs(fs);
        expect(back.expository.book).toBe('2 Pedro');
        expect(back.expository.chapterRange).toBe('1-3');
        expect(back.expository.pericopeAssistantVersion).toBeUndefined();
        expect(back.plannedSermons[0].paperId).toBeUndefined();
        expect(back.plannedSermons[0].syntacticUnit).toBeUndefined();
        expect(back.plannedSermons[0].status).toBeUndefined();
    });

    it('round-trips the new exegetical fields (paperId, syntacticUnit, status, assistant version)', () => {
        const scheduled = new Date('2026-06-01T12:00:00Z');
        const original = {
            expository: {
                book: '2 Pedro',
                chapterRange: '1-3',
                pericopeAssistantVersion: 'gemini-2.5-pro@v1',
                pericopeAssistantStatus: 'reviewed',
            },
            plannedSermons: [
                {
                    id: 'p1',
                    week: 1,
                    title: 'Llamados firmes',
                    description: 'Intro',
                    passage: '2 Pedro 1:1-11',
                    scheduledDate: scheduled,
                    paperId: 'paper-abc',
                    status: 'paper-done',
                    syntacticUnit: {
                        book: '2 Pedro',
                        chapterStart: 1,
                        verseStart: 1,
                        chapterEnd: 1,
                        verseEnd: 11,
                        originalLanguage: 'greek',
                        justification: 'Inclusio enmarcada por κλῆσις',
                    },
                },
            ],
        };

        const fs = toFs(original);

        // Date became Timestamp on the way to Firestore.
        expect(fs.plannedSermons[0].scheduledDate).toBeInstanceOf(Timestamp);
        expect(fs.expository.pericopeAssistantVersion).toBe('gemini-2.5-pro@v1');
        expect(fs.plannedSermons[0].syntacticUnit.justification).toBe(
            'Inclusio enmarcada por κλῆσις',
        );

        const back = fromFs(fs);
        expect(back.expository.pericopeAssistantStatus).toBe('reviewed');
        expect(back.plannedSermons[0].paperId).toBe('paper-abc');
        expect(back.plannedSermons[0].status).toBe('paper-done');
        expect(back.plannedSermons[0].syntacticUnit.chapterStart).toBe(1);
        expect(back.plannedSermons[0].syntacticUnit.verseEnd).toBe(11);
        expect(back.plannedSermons[0].syntacticUnit.originalLanguage).toBe('greek');
        // Date came back as a Date (Timestamp.toDate() called in mapper).
        expect(back.plannedSermons[0].scheduledDate).toBeInstanceOf(Date);
        expect((back.plannedSermons[0].scheduledDate as Date).toISOString()).toBe(
            scheduled.toISOString(),
        );
    });

    it('keeps syntacticUnit absent (not null) when omitted on input', () => {
        const fs = toFs({
            plannedSermons: [
                {
                    id: 'p1',
                    week: 1,
                    title: 't',
                    description: 'd',
                    passage: '2 Pedro 1:1',
                },
            ],
        });
        // For Firestore we use null (undefined would be rejected),
        expect(fs.plannedSermons[0].syntacticUnit).toBeNull();

        const back = fromFs(fs);
        // but on the way back to the domain we collapse to undefined to
        // honour the optional `?:` field shape.
        expect(back.plannedSermons[0].syntacticUnit).toBeUndefined();
    });
});
