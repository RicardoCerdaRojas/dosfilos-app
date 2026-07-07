import { describe, it, expect } from 'vitest';
import {
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
