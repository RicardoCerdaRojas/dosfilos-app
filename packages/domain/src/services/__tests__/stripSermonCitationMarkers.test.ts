import { describe, it, expect } from 'vitest';
import { stripSermonCitationMarkers } from '../stripSermonCitationMarkers';
import type { SermonContent } from '../../entities/SermonGenerator';

function content(over: Partial<SermonContent>): SermonContent {
    return {
        introduction: 'intro',
        body: [{ point: 'P1', content: 'c', scriptureReferences: [] }],
        conclusion: 'concl',
        ...over,
    } as SermonContent;
}

describe('stripSermonCitationMarkers (ADR-030)', () => {
    it('removes [cite: S3] leaked into prose, keeping narrative attribution', () => {
        const out = stripSermonCitationMarkers(
            content({
                introduction:
                    "Como el pastor Subukjian nos recuerda, Dios es veraz [cite: S3]. Confía.",
            }),
        );
        expect(out.introduction).toBe('Como el pastor Subukjian nos recuerda, Dios es veraz. Confía.');
    });

    it('strips S-prefixed junk but KEEPS valid numeric [N] anchors (ADR-031)', () => {
        const out = stripSermonCitationMarkers(
            content({
                introduction: 'Uno [S3]. Dos [3]. Tres [1, 3].',
            }),
        );
        // [S3] (unvalidated) stripped; [3] and [1, 3] (validated anchors) kept.
        expect(out.introduction).toBe('Uno. Dos [3]. Tres [1, 3].');
    });

    it('strips labelled junk ([fuente:], [source:], [ref:]) too', () => {
        const out = stripSermonCitationMarkers(
            content({ introduction: 'A [fuente: 1]. B [source: S2]. C [ref: 3].' }),
        );
        expect(out.introduction).toBe('A. B. C.');
    });

    it('preserves bible reference links', () => {
        const ref = 'Lee [📖 Juan 1:1](#bible-juan-1-1) hoy.';
        const out = stripSermonCitationMarkers(content({ introduction: ref }));
        expect(out.introduction).toBe(ref);
    });

    it('strips junk across body content, illustration, transition, conclusion and callToAction; keeps [N]', () => {
        const out = stripSermonCitationMarkers(
            content({
                conclusion: 'Cierre [S1].',
                callToAction: 'Actúa [cite: S2].',
                body: [
                    {
                        point: 'P1',
                        content: 'Cuerpo [1].',
                        illustration: 'Ilustración [S2].',
                        transition: 'Transición [cite: S1].',
                        scriptureReferences: [],
                    },
                ],
            }),
        );
        expect(out.conclusion).toBe('Cierre.');
        expect(out.callToAction).toBe('Actúa.');
        expect(out.body[0].content).toBe('Cuerpo [1].'); // valid anchor kept
        expect(out.body[0].illustration).toBe('Ilustración.');
        expect(out.body[0].transition).toBe('Transición.');
    });

    it('leaves clean prose untouched', () => {
        const clean = content({ introduction: 'Sin marcadores aquí.' });
        const out = stripSermonCitationMarkers(clean);
        expect(out.introduction).toBe('Sin marcadores aquí.');
    });
});
