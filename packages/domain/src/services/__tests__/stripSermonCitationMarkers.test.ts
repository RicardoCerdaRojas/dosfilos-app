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

    it('removes [S3], [3] and grouped [1, 3] forms', () => {
        const out = stripSermonCitationMarkers(
            content({
                introduction: 'Uno [S3]. Dos [3]. Tres [1, 3].',
            }),
        );
        expect(out.introduction).toBe('Uno. Dos. Tres.');
    });

    it('preserves bible reference links', () => {
        const ref = 'Lee [📖 Juan 1:1](#bible-juan-1-1) hoy.';
        const out = stripSermonCitationMarkers(content({ introduction: ref }));
        expect(out.introduction).toBe(ref);
    });

    it('strips across body content, illustration, transition, conclusion and callToAction', () => {
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
        expect(out.body[0].content).toBe('Cuerpo.');
        expect(out.body[0].illustration).toBe('Ilustración.');
        expect(out.body[0].transition).toBe('Transición.');
    });

    it('leaves clean prose untouched', () => {
        const clean = content({ introduction: 'Sin marcadores aquí.' });
        const out = stripSermonCitationMarkers(clean);
        expect(out.introduction).toBe('Sin marcadores aquí.');
    });
});
