import { describe, it, expect } from 'vitest';
import {
    DEFAULT_FEATURE_FLAGS,
    buildDefaultFeatureFlags,
    FEATURE_FLAG_NAMES,
    FEATURE_FLAG_PREREQUISITES,
    DORMANT_FEATURE_FLAGS,
    isDormantFeatureFlag,
    getFlagPrerequisites,
    getFlagDependents,
} from '../User';

describe('FEATURE_FLAG_PREREQUISITES — topología', () => {
    it('declara un prereq por cada flag conocido (mapa completo)', () => {
        for (const flag of FEATURE_FLAG_NAMES) {
            expect(FEATURE_FLAG_PREREQUISITES[flag]).toBeDefined();
        }
    });

    it('pastoral_fidelity_flow es la raíz (sin prereqs)', () => {
        expect(FEATURE_FLAG_PREREQUISITES.pastoral_fidelity_flow).toEqual([]);
    });

    it('los sub-flags son hijos directos del parent (árbol de 2 niveles, no cadena)', () => {
        // study_depth y three_witnesses son HERMANOS — ninguno depende del otro.
        expect(getFlagPrerequisites('three_witnesses')).toEqual(['pastoral_fidelity_flow']);
        expect(getFlagPrerequisites('study_depth')).toEqual(['pastoral_fidelity_flow']);
        expect(getFlagPrerequisites('study_depth')).not.toContain('three_witnesses');
        expect(getFlagPrerequisites('three_witnesses')).not.toContain('study_depth');
    });

    it('conduccion_corazon cuelga del parent (decisión: no queda standalone)', () => {
        expect(getFlagPrerequisites('conduccion_corazon')).toEqual(['pastoral_fidelity_flow']);
    });
});

describe('getFlagPrerequisites — cierre transitivo (up auto)', () => {
    it('un sub-flag exige solo el parent', () => {
        expect(getFlagPrerequisites('contra_scan')).toEqual(['pastoral_fidelity_flow']);
    });

    it('la raíz no exige nada', () => {
        expect(getFlagPrerequisites('pastoral_fidelity_flow')).toEqual([]);
    });
});

describe('step3_genre_help — la cadena EXPRESA la dependencia del género confirmado (no delega en degradación)', () => {
    it('prereq DIRECTO es passage_profile (la fuente del género confirmado, PR1), NO el parent suelto', () => {
        expect(FEATURE_FLAG_PREREQUISITES.step3_genre_help).toEqual(['passage_profile']);
    });

    it('cierre transitivo exige passage_profile Y pastoral_fidelity_flow — no puede vivir con el subsistema de género apagado', () => {
        const prereqs = getFlagPrerequisites('step3_genre_help');
        expect(prereqs).toContain('passage_profile');
        expect(prereqs).toContain('pastoral_fidelity_flow');
    });

    it('NO es hermano de passage_profile (si lo fuera, la ayuda podría encenderse con el género OFF)', () => {
        expect(getFlagPrerequisites('step3_genre_help')).toContain('passage_profile');
    });

    it('apagar passage_profile deja step3_genre_help como dependiente (inerte, avisa)', () => {
        expect(getFlagDependents('passage_profile')).toContain('step3_genre_help');
    });
});

describe('getFlagDependents — descendientes activos (down con aviso)', () => {
    it('apagar el parent lista TODOS los sub-flags como dependientes', () => {
        const dependents = getFlagDependents('pastoral_fidelity_flow').sort();
        expect(dependents).toEqual(
            [
                'pastoral_word_study',
                'three_witnesses',
                'study_depth',
                'fidelity_pass',
                'contra_scan',
                'conduccion_corazon',
                'passage_profile',
                'passage_profile_enforce',
                'sermon_draft_shadow',
                'genre_override_enforce',
                'step3_genre_help',
                'anchor_fidelity_enforce',
                'socratic_drafting',
            ].sort(),
        );
    });

    it('un sub-flag hoja no tiene dependientes', () => {
        expect(getFlagDependents('three_witnesses')).toEqual([]);
        expect(getFlagDependents('study_depth')).toEqual([]);
    });
});

describe('flags dormantes', () => {
    it('fidelity_pass es dormante (inactivable)', () => {
        expect(isDormantFeatureFlag('fidelity_pass')).toBe(true);
        expect(DORMANT_FEATURE_FLAGS).toContain('fidelity_pass');
    });

    it('three_witnesses NO es dormante', () => {
        expect(isDormantFeatureFlag('three_witnesses')).toBe(false);
    });
});

/**
 * El set de defaults no es una lista de gustos: es una regla. Estos tests la
 * hacen cumplir para que nadie agregue por descuido un flag que ACTÚA sobre el
 * pastor sin datos, o uno dormante, al set que estrena toda cuenta nueva.
 */
describe('DEFAULT_FEATURE_FLAGS — el criterio se hace cumplir', () => {
    it('ningún flag dormante entra al set', () => {
        const dormantes = DEFAULT_FEATURE_FLAGS.filter(isDormantFeatureFlag);
        expect(dormantes, `Dormantes en el set de defaults: ${dormantes.join(', ')}`).toEqual([]);
    });

    it('ningún enforce entra al set (medir antes que actuar)', () => {
        const enforces = DEFAULT_FEATURE_FLAGS.filter((f) => f.endsWith('_enforce'));
        expect(enforces, `Enforce en el set de defaults: ${enforces.join(', ')}`).toEqual([]);
    });

    it('todo default trae también sus prerequisitos encendidos', () => {
        const set = new Set(DEFAULT_FEATURE_FLAGS);
        for (const flag of DEFAULT_FEATURE_FLAGS) {
            for (const prereq of getFlagPrerequisites(flag)) {
                expect(set.has(prereq), `${flag} necesita ${prereq}, ausente del set`).toBe(true);
            }
        }
    });

    it('todo nombre del set es un flag real del registry', () => {
        const conocidos = new Set<string>(FEATURE_FLAG_NAMES);
        const fantasma = DEFAULT_FEATURE_FLAGS.filter((f) => !conocidos.has(f));
        expect(fantasma).toEqual([]);
    });

    it('buildDefaultFeatureFlags entrega el mapa listo para escribir', () => {
        const map = buildDefaultFeatureFlags();
        expect(map.pastoral_fidelity_flow).toBe(true);
        expect(map.study_depth).toBe(true);
        // Lo que no está en el set NO se escribe como false: se omite.
        expect('passage_profile_enforce' in map).toBe(false);
        expect('fidelity_pass' in map).toBe(false);
    });
});
