import { describe, it, expect } from 'vitest';
import { Timestamp } from 'firebase/firestore';
import { SermonEntity } from '@dosfilos/domain';
import { FirebaseSermonRepository } from '../FirebaseSermonRepository';

// Pure mapper tests against the private serializers — same rationale as
// FirebaseSeriesRepository.test.ts: Firestore rejects undefined, and the
// new optional `sourcePaperId` is the kind of field most likely to leak
// through if a future refactor forgets to map it.
const repo = new FirebaseSermonRepository();
const toFs = (s: SermonEntity) => (repo as any).sermonToFirestore(s);
const fromFs = (id: string, data: any) =>
    (repo as any).firestoreToSermon(id, data);

describe('FirebaseSermonRepository — sourcePaperId round-trip', () => {
    it('serializes sourcePaperId as null when absent', () => {
        const sermon = SermonEntity.create({
            userId: 'u1',
            title: 'Test sermon title',
            content: 'Some content body for the sermon.',
        });

        const fs = toFs(sermon);
        expect(fs.sourcePaperId).toBeNull();
    });

    it('round-trips sourcePaperId when set', () => {
        const sermon = SermonEntity.create({
            userId: 'u1',
            title: 'Test sermon title',
            content: 'Some content body for the sermon.',
            sourcePaperId: 'paper-xyz',
            createdAt: new Date('2026-01-15T10:00:00Z'),
            updatedAt: new Date('2026-01-15T10:00:00Z'),
        });

        const fs = toFs(sermon);
        expect(fs.sourcePaperId).toBe('paper-xyz');

        // Simulate Firestore returning the doc — `updatedAt` is a sentinel
        // on write, but on read we get a real Timestamp, so substitute one.
        const back = fromFs('sermon-1', {
            ...fs,
            updatedAt: Timestamp.fromDate(new Date('2026-01-15T10:00:00Z')),
        });
        expect(back.sourcePaperId).toBe('paper-xyz');
    });
});
