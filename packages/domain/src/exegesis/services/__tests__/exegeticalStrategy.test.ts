import { describe, it, expect } from 'vitest';
import {
    DEFAULT_STRATEGY_FOR_NEW_PAPER,
    STRATEGY_FOR_LEGACY_PAPER,
    resolveExegeticalStrategy,
    usesRoleCoverage,
} from '../exegeticalStrategy';

describe('la asimetría entre paper nuevo y paper viejo es deliberada', () => {
    it('un paper nuevo arranca en dialéctico', () => {
        expect(DEFAULT_STRATEGY_FOR_NEW_PAPER).toBe('dialectical');
    });

    it('un paper anterior al campo se lee como libre', () => {
        // NO es lo mismo que el default de creación, y por eso hay dos
        // constantes: tratar un paper viejo como dialéctico lo llenaría de
        // avisos por no balancear unos roles que nunca se le ofrecieron.
        expect(STRATEGY_FOR_LEGACY_PAPER).toBe('free');
        expect(resolveExegeticalStrategy(undefined)).toBe('free');
    });

    it('las dos políticas NO son la misma', () => {
        // Si alguien las unifica sin querer, este test lo dice.
        expect(DEFAULT_STRATEGY_FOR_NEW_PAPER).not.toBe(STRATEGY_FOR_LEGACY_PAPER);
    });
});

describe('resolveExegeticalStrategy', () => {
    it('respeta lo que el alumno eligió', () => {
        expect(resolveExegeticalStrategy('dialectical')).toBe('dialectical');
        expect(resolveExegeticalStrategy('free')).toBe('free');
    });

    it('un valor corrupto no rompe: cae al lado que no reprocha', () => {
        // Basura en el documento no debe producir avisos metodológicos.
        expect(resolveExegeticalStrategy('dialéctico')).toBe('free');
        expect(resolveExegeticalStrategy(null)).toBe('free');
        expect(resolveExegeticalStrategy(42)).toBe('free');
    });
});

describe('usesRoleCoverage — la pregunta que hacía cada pantalla por su cuenta', () => {
    it('sólo el modo dialéctico trabaja con el balance de roles', () => {
        expect(usesRoleCoverage('dialectical')).toBe(true);
        expect(usesRoleCoverage('free')).toBe(false);
    });

    it('sin dato, no se muestran los avisos de roles', () => {
        expect(usesRoleCoverage(undefined)).toBe(false);
    });
});
