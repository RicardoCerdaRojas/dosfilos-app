import { describe, it, expect } from 'vitest';
import {
    computeRoleCoverage,
    findMissingRoles,
    resolveSourceRole,
    suggestRoleForType,
} from '../sourceRoleMapping';
import type { ProjectSource } from '../ProjectSource';
import type { SourceRole } from '../StepSourcePlan';
import type { SourceType } from '../SourceType';

/** Lo mínimo que miran el resolvedor y la cobertura. */
const src = (sourceType: SourceType, chosenRole?: SourceRole | null) =>
    ({ sourceType, chosenRole }) as Pick<ProjectSource, 'sourceType' | 'chosenRole'>;

describe('resolveSourceRole — manda el pastor', () => {
    it('usa la sugerencia del tipo cuando el pastor no eligió', () => {
        // Comportamiento histórico intacto: las fuentes anteriores al campo
        // se siguen clasificando exactamente igual que siempre.
        const r = resolveSourceRole(src('commentary-critical'));

        expect(r.role).toBe('contrast');
        expect(r.origin).toBe('suggested');
        expect(r.divergent).toBe(false);
    });

    it('respeta la elección del pastor por encima del tipo', () => {
        // El caso que motivó el campo: McComiskey se llama «exegético Y
        // expositivo». Si el pastor lo quiere de ancla, va de ancla.
        const r = resolveSourceRole(src('commentary-critical', 'anchor'));

        expect(r.role).toBe('anchor');
        expect(r.origin).toBe('chosen');
    });

    it('marca la divergencia para poder avisarle, sin bloquearlo', () => {
        const r = resolveSourceRole(src('commentary-critical', 'anchor'));

        expect(r.divergent).toBe(true);
        expect(r.suggested).toBe('contrast');
        // Y sigue siendo ancla: el aviso informa, no revierte.
        expect(r.role).toBe('anchor');
    });

    it('no reporta divergencia cuando el pastor coincide con el tipo', () => {
        const r = resolveSourceRole(src('commentary-expository', 'anchor'));

        expect(r.divergent).toBe(false);
        expect(r.origin).toBe('chosen');
    });

    it('no inventa divergencia cuando el tipo no tiene opinión', () => {
        // Una plantilla de estilo no sugiere rol: no hay nada que
        // contradecir, así que avisar sería ruido.
        expect(suggestRoleForType('style-template-paper')).toBeNull();

        const r = resolveSourceRole(src('style-template-paper', 'technical'));
        expect(r.role).toBe('technical');
        expect(r.divergent).toBe(false);
    });

    it('trata null y ausente igual: el pastor no se pronunció', () => {
        expect(resolveSourceRole(src('lexicon-technical', null)).origin).toBe('suggested');
        expect(resolveSourceRole(src('lexicon-technical', undefined)).origin).toBe('suggested');
    });
});

describe('computeRoleCoverage — cuenta por rol resuelto, no por tipo', () => {
    it('cuenta la fuente donde el pastor la puso', () => {
        // Antes esto contaba 0 anclas y 1 contraste, y el indicador le
        // discutía al pastor su propia decisión.
        const coverage = computeRoleCoverage([src('commentary-critical', 'anchor')]);

        expect(coverage.anchor).toBe(1);
        expect(coverage.contrast).toBe(0);
        expect(coverage.total).toBe(1);
    });

    it('mezcla elegidas y deducidas sin perder ninguna', () => {
        const coverage = computeRoleCoverage([
            src('commentary-critical', 'anchor'),   // elegida
            src('commentary-expository'),           // deducida → ancla
            src('lexicon-technical'),               // deducida → técnica
            src('style-template-paper'),            // sin rol
        ]);

        expect(coverage).toMatchObject({
            anchor: 2,
            contrast: 0,
            technical: 1,
            unrolled: 1,
            total: 4,
        });
    });

    it('el hueco de contraste se reporta aunque el tipo dijera lo contrario', () => {
        // Corpus de un solo comentario crítico puesto de ancla: al pastor
        // le sigue faltando una voz que lo contradiga, y hay que decirlo.
        const coverage = computeRoleCoverage([src('commentary-critical', 'anchor')]);

        expect(findMissingRoles(coverage)).toEqual(['contrast', 'technical']);
    });
});
