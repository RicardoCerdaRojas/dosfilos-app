import { describe, it, expect } from 'vitest';
import { APPROACH_TYPES } from '../../entities/HomileticalApproach';
import { SENTINEL_GENRES } from '../../exegesis/expository/BookPanorama';
import {
    APPROACH_COMPLIANCE_CATALOG,
    APPROACH_COMPLIANCE_FORMS,
    DESCALIFICADORES_GLOBALES,
} from '../approachComplianceCatalog';
import {
    GENRE_COMPLIANCE_CATALOG,
    GENRE_COMPLIANCE_GENRES,
    genreDisqualifiersFor,
} from '../genreComplianceCatalog';
import { resolveSeveridad } from '../complianceTypes';

/**
 * Redacción v2 Fase 2 (§9) — invariantes de los catálogos hermanos del juez.
 * Si un enum gana un valor y su catálogo no, el juez queda SIN VARA para ese
 * valor y adjudicaría libre — exactamente lo que la disciplina 036 prohíbe.
 */
const ALL_GENRES = ['epistle', 'narrative', 'parable', 'poetry', 'prophecy', 'wisdom', 'gospel', 'apocalypse', 'law', 'mixed'];
const SENTINELS: readonly string[] = SENTINEL_GENRES;

describe('catálogo de FORMA (approach)', () => {
    it('llaves ≡ enum ApproachType', () => {
        expect([...APPROACH_COMPLIANCE_FORMS].sort()).toEqual([...APPROACH_TYPES].sort());
    });

    it('cada forma trae promesa, criterios y descalificadores propios', () => {
        for (const f of APPROACH_COMPLIANCE_FORMS) {
            const e = APPROACH_COMPLIANCE_CATALOG[f];
            expect(e.promise.trim().length).toBeGreaterThan(10);
            expect(e.criteriosCumplimiento.length).toBeGreaterThan(0);
            expect(e.descalificadoresEspecificos.length).toBeGreaterThan(0);
        }
    });

    it('ids únicos dentro de cada forma (el juez adjudica contra el id)', () => {
        for (const f of APPROACH_COMPLIANCE_FORMS) {
            const e = APPROACH_COMPLIANCE_CATALOG[f];
            const cs = e.criteriosCumplimiento.map(c => c.id);
            const ds = e.descalificadoresEspecificos.map(d => d.id);
            expect(new Set(cs).size).toBe(cs.length);
            expect(new Set(ds).size).toBe(ds.length);
        }
    });

    it('§9.7 — los CUATRO globales son crítica, y son exactamente G1..G4', () => {
        expect(DESCALIFICADORES_GLOBALES.map(g => g.id)).toEqual(['G1', 'G2', 'G3', 'G4']);
        for (const g of DESCALIFICADORES_GLOBALES) {
            expect(g.severidad).toBe('critica');
        }
    });

    it('§9.7 — G2 es CRISTOTÉLICO: exige el telos donde la trayectoria canónica lo sostiene', () => {
        const g2 = DESCALIFICADORES_GLOBALES.find(g => g.id === 'G2')!;
        // La cláusula condicional es lo que impide que G2 dispare contra un
        // pastor que respeta que su texto no tiene conexión cristológica directa
        // (forzarla sería violar G3). Sin ella el global empuja a eisegesis.
        expect(g2.text).toMatch(/trayectoria canónica lo sostiene/i);
    });

    it('INVARIANTE §9.6 — ningún criterio esencial sin ayuda formativa upstream', () => {
        for (const f of APPROACH_COMPLIANCE_FORMS) {
            for (const c of APPROACH_COMPLIANCE_CATALOG[f].criteriosCumplimiento) {
                if (c.severidad !== 'esencial') continue;
                // Un esencial descalifica. Si el sistema no acompañó antes, el
                // juez se vuelve un MURO — prohibido por diseño.
                expect(c.ayudaUpstream, `${f}/${c.id} es esencial y no declara ayuda upstream`).toBeTruthy();
            }
        }
    });

    it('§9.6 — C4 narrativo (redención) es el esencial sellado', () => {
        const c4 = APPROACH_COMPLIANCE_CATALOG['narrativo'].criteriosCumplimiento.find(c => c.id === 'C4')!;
        expect(c4.severidad).toBe('esencial');
    });

    it('los `refina` apuntan a un global existente (enlace jerárquico vivo)', () => {
        const ids = new Set(DESCALIFICADORES_GLOBALES.map(g => g.id));
        for (const f of APPROACH_COMPLIANCE_FORMS) {
            for (const d of APPROACH_COMPLIANCE_CATALOG[f].descalificadoresEspecificos) {
                if (d.refina) expect(ids.has(d.refina), `${f}/${d.id} refina ${d.refina}`).toBe(true);
            }
        }
        for (const g of GENRE_COMPLIANCE_GENRES) {
            for (const d of GENRE_COMPLIANCE_CATALOG[g]) {
                if (d.refina) expect(ids.has(d.refina), `${g}/${d.id} refina ${d.refina}`).toBe(true);
            }
        }
    });
});

describe('catálogo HERMANO de GÉNERO', () => {
    it('llaves ≡ enum LiteraryGenre', () => {
        expect([...GENRE_COMPLIANCE_GENRES].sort()).toEqual([...ALL_GENRES].sort());
    });

    it('todo género predicable trae al menos un descalificador propio', () => {
        for (const g of GENRE_COMPLIANCE_GENRES) {
            if (SENTINELS.includes(g)) continue;
            expect(GENRE_COMPLIANCE_CATALOG[g].length, `${g} sin descalificadores`).toBeGreaterThan(0);
        }
    });

    it('centinelas (gospel/mixed) vacíos: vacío es la respuesta correcta, no un hueco', () => {
        // No son géneros predicables: `gospel` se disuelve por perícopa y `mixed`
        // dispara el override. El piso lo pone el género que el pastor nombre.
        for (const g of SENTINELS) {
            expect(GENRE_COMPLIANCE_CATALOG[g as (typeof GENRE_COMPLIANCE_GENRES)[number]]).toEqual([]);
        }
    });

    it('parable trae su descalificador sellado (§6.3), NO el stub de PENDING_AUTHOR', () => {
        // Su criterio de DISCERNIMIENTO (Fase 1) sigue vacío esperando al
        // fundador; su descalificador de CUMPLIMIENTO el diseño sí lo selló.
        // Son catálogos distintos y no comparten el stub.
        expect(GENRE_COMPLIANCE_CATALOG.parable.length).toBe(1);
        expect(GENRE_COMPLIANCE_CATALOG.parable[0]!.text).toMatch(/alegorizar/i);
    });

    it('§6.4 — proverbio-como-promesa es CRÍTICA declarada (puerta de la prosperidad)', () => {
        const d1 = GENRE_COMPLIANCE_CATALOG.wisdom.find(d => d.id === 'D1')!;
        expect(d1.severidad).toBe('critica');
    });

    it('fail-safe: género ausente o fuera del enum → sin descalificadores (nunca inventa vara)', () => {
        expect(genreDisqualifiersFor(undefined)).toEqual([]);
        expect(genreDisqualifiersFor('xyz')).toEqual([]);
    });
});

describe('resolveSeveridad', () => {
    it('la severidad declarada manda', () => {
        const r = resolveSeveridad({ id: 'X', text: 't', severidad: 'critica' }, DESCALIFICADORES_GLOBALES);
        expect(r).toEqual({ severidad: 'critica', pendienteDeSellado: false, origen: 'declarada' });
    });

    it('sin declarar, hereda del global que refina (§9.5 "hereda crítica de G4")', () => {
        const r = resolveSeveridad({ id: 'X', text: 't', refina: 'G4' }, DESCALIFICADORES_GLOBALES);
        expect(r).toEqual({ severidad: 'critica', pendienteDeSellado: false, origen: 'heredada' });
    });

    it('sin declarar y sin refina → estandar Y marcado pendiente (fail-closed hacia la ADVERTENCIA)', () => {
        // Escalar por defecto exigiría reconocimiento activo del pastor sobre una
        // vara que nadie selló. Confrontar con vara no sellada es el mismo pecado
        // que confrontar con dato falso.
        const r = resolveSeveridad({ id: 'X', text: 't' }, DESCALIFICADORES_GLOBALES);
        expect(r).toEqual({ severidad: 'estandar', pendienteDeSellado: true, origen: 'default' });
    });

    it('refina a un global inexistente → no revienta, cae a pendiente', () => {
        const r = resolveSeveridad({ id: 'X', text: 't', refina: 'G99' }, DESCALIFICADORES_GLOBALES);
        expect(r.pendienteDeSellado).toBe(true);
    });
});
