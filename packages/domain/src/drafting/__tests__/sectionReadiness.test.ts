import { describe, it, expect } from 'vitest';
import { sectionIsReady, countReadySections } from '../sectionReadiness';
import type { WalkSection } from '../deriveSectionWalk';
import type { SermonElement } from '../SermonElement';

const seccion = (id: string, status: WalkSection['status']): WalkSection =>
    ({ id, status, mode: 'elements', labelKey: `l.${id}`, jobKey: `j.${id}` }) as WalkSection;

const elemento = (provenance: SermonElement['provenance']): SermonElement =>
    ({ id: 'e1', text: 'algo', kind: 'elemento', provenance }) as SermonElement;

describe('sectionIsReady', () => {
    it('una sección cubierta está lista aunque no tenga elementos', () => {
        expect(sectionIsReady(seccion('a', 'cubierta'), [])).toBe(true);
    });

    it('una sección pendiente con una decisión está lista', () => {
        expect(sectionIsReady(seccion('a', 'pendiente'), [elemento('pastor')])).toBe(true);
    });

    it('lo descartado no cuenta como decisión', () => {
        expect(sectionIsReady(seccion('a', 'pendiente'), [elemento('descartado')])).toBe(false);
    });

    it('una sección pendiente y vacía no está lista', () => {
        expect(sectionIsReady(seccion('a', 'pendiente'), [])).toBe(false);
    });
});

describe('countReadySections', () => {
    it('cuenta las listas por ambos caminos y omite el resto', () => {
        const walk = [seccion('a', 'cubierta'), seccion('b', 'pendiente'), seccion('c', 'pendiente')];
        const elements = { b: [elemento('elegido')], c: [elemento('descartado')] };
        expect(countReadySections(walk, elements)).toBe(2);
    });

    it('una sección sin entrada en el mapa de elementos no rompe la cuenta', () => {
        expect(countReadySections([seccion('a', 'pendiente')], {})).toBe(0);
    });
});
