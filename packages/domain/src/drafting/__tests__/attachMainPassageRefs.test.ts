import { describe, it, expect } from 'vitest';
import { attachMainPassageRefs } from '../attachMainPassageRefs';
import type { SermonContent } from '../../entities/SermonGenerator';

const draft = (body: Partial<SermonContent['body'][number]>[]): SermonContent => ({
    title: 'T',
    introduction: 'I',
    body: body.map((b, i) => ({ point: `P${i + 1}`, content: 'c', ...b })),
    conclusion: 'C',
});

describe('attachMainPassageRefs', () => {
    it('deriva la referencia del título del punto — el título que el pastor mantiene gana', () => {
        const out = attachMainPassageRefs(draft([{}]), {
            sermonPassage: 'Jonás 1:1-3',
            points: [{ title: 'I. Dios habla (vv. 1-2)', scriptureReferences: ['Jonás 1:3a'] }],
        });
        expect(out.body[0].mainPassageRef).toBe('Jonás 1:1-2');
    });

    it('sin versículos en el título, cae a la primera referencia del bosquejo', () => {
        const out = attachMainPassageRefs(draft([{}]), {
            sermonPassage: 'Jonás 1:1-3',
            points: [{ title: 'I. Dios habla', scriptureReferences: ['Jonás 1:1-2'] }],
        });
        expect(out.body[0].mainPassageRef).toBe('Jonás 1:1-2');
    });

    it('no pisa una referencia que el borrador ya trae', () => {
        const out = attachMainPassageRefs(draft([{ mainPassageRef: 'Jonás 1:9' }]), {
            sermonPassage: 'Jonás 1:1-3',
            points: [{ title: 'I. Dios habla (vv. 1-2)' }],
        });
        expect(out.body[0].mainPassageRef).toBe('Jonás 1:9');
    });

    it('sin título con versículos ni referencias, el punto queda sin ref — lo que falta, falta', () => {
        const out = attachMainPassageRefs(draft([{}]), {
            sermonPassage: 'Jonás 1:1-3',
            points: [{ title: 'Dios habla' }],
        });
        expect(out.body[0].mainPassageRef).toBeUndefined();
    });

    it('un punto de más en el borrador (sin entrada en el bosquejo) no rompe', () => {
        const out = attachMainPassageRefs(draft([{}, {}]), {
            sermonPassage: 'Jonás 1:1-3',
            points: [{ title: 'I. (vv. 1-2)' }],
        });
        expect(out.body[1].mainPassageRef).toBeUndefined();
    });
});
