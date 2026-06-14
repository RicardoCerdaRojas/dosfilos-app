import { describe, it, expect } from 'vitest';
import {
    collectEstudioClaims,
    evaluarProofTexting,
    evaluarCitas,
    calcularAutoriaResumen,
    validarEstudioMadre,
    MIN_RESPALDO_TESTIGOS,
    type EstudioWitnessVerdicts,
} from '../fidelidad';
import type { ElementoEstudio } from '../types';
import type { WitnessVerdict } from '../../entities/WitnessValidation';

function el(p: Partial<ElementoEstudio> & Pick<ElementoEstudio, 'id' | 'tipo' | 'orden' | 'contenido'>): ElementoEstudio {
    return { autoria: 'docente', ...p };
}

/** Tres verdicts (context, parallels, confession) con disenso configurable. */
function verdicts(dissents: { context?: boolean; parallels?: boolean; confession?: boolean }): WitnessVerdict[] {
    const mk = (witness: WitnessVerdict['witness'], d: boolean): WitnessVerdict => ({
        witness,
        dissents: d,
        reasoning: '',
        evidence: [],
        confidence: d ? 0.9 : 0.1,
    });
    return [
        mk('context', dissents.context ?? false),
        mk('parallels', dissents.parallels ?? false),
        mk('confession', dissents.confession ?? false),
    ];
}

describe('collectEstudioClaims', () => {
    it('toma solo afirmaciones de peso, ordenadas, sin soporte ni vacíos', () => {
        const elementos: ElementoEstudio[] = [
            el({ id: 'e3', tipo: 'argumento', orden: 3, contenido: 'Arg' }),
            el({ id: 'e1', tipo: 'marco', orden: 1, contenido: 'Marco' }),
            el({ id: 'e2', tipo: 'cita', orden: 2, contenido: 'Calcedonia dice...' }), // soporte → fuera
            el({ id: 'e4', tipo: 'idea_central', orden: 4, contenido: '   ' }), // vacío → fuera
        ];
        const claims = collectEstudioClaims(elementos);
        expect(claims.map((c) => c.key)).toEqual(['e1', 'e3']);
        expect(claims[0]).toEqual({ key: 'e1', kind: 'marco', text: 'Marco' });
    });
});

describe('evaluarProofTexting', () => {
    it('afirmación de peso con <2 respaldos = sospechoso; ≥2 = limpio', () => {
        const elementos: ElementoEstudio[] = [
            el({ id: 'a', tipo: 'argumento', orden: 1, contenido: 'A', respaldoTestigos: ['t1'] }),
            el({ id: 'b', tipo: 'argumento', orden: 2, contenido: 'B', respaldoTestigos: ['t1', 't2'] }),
            el({ id: 'c', tipo: 'conclusion', orden: 3, contenido: 'C' }), // sin respaldo
            el({ id: 't1', tipo: 'testigo', orden: 4, contenido: 'soporte' }), // no es de peso
        ];
        const r = evaluarProofTexting(elementos);
        expect(r.porElemento).toEqual({ a: 'sospechoso', b: 'limpio', c: 'sospechoso' });
        expect(r.sospechosos.sort()).toEqual(['a', 'c']);
        expect(MIN_RESPALDO_TESTIGOS).toBe(2);
    });
});

describe('evaluarCitas', () => {
    it('clasifica citas por verificación', () => {
        const elementos: ElementoEstudio[] = [
            el({ id: 'c1', tipo: 'cita', orden: 1, contenido: 'x', verificacionCitas: 'no' }),
            el({ id: 'c2', tipo: 'cita', orden: 2, contenido: 'y', verificacionCitas: 'ok' }),
            el({ id: 'c3', tipo: 'cita', orden: 3, contenido: 'z', verificacionCitas: 'parcial' }),
            el({ id: 'c4', tipo: 'cita', orden: 4, contenido: 'w' }), // sin flag
            el({ id: 'a', tipo: 'argumento', orden: 5, contenido: 'a' }), // no cita
        ];
        const r = evaluarCitas(elementos);
        expect(r.fallidas).toEqual(['c1']);
        expect(r.sinVerificar.sort()).toEqual(['c3', 'c4']);
    });
});

describe('calcularAutoriaResumen', () => {
    it('mixto cuenta medio a cada lado; vacío = 0/0', () => {
        expect(calcularAutoriaResumen([])).toEqual({ docentePct: 0, sistemaPct: 0 });
        const elementos: ElementoEstudio[] = [
            el({ id: '1', tipo: 'marco', orden: 1, contenido: 'a', autoria: 'docente' }),
            el({ id: '2', tipo: 'argumento', orden: 2, contenido: 'b', autoria: 'sistema' }),
            el({ id: '3', tipo: 'conclusion', orden: 3, contenido: 'c', autoria: 'mixto' }),
            el({ id: '4', tipo: 'aplicacion', orden: 4, contenido: 'd', autoria: 'docente' }),
        ];
        // docente = 1 + 0.5 + 1 = 2.5 ; sistema = 1 + 0.5 = 1.5 ; total 4
        expect(calcularAutoriaResumen(elementos)).toEqual({ docentePct: 63, sistemaPct: 38 });
    });
});

describe('validarEstudioMadre', () => {
    const limpio: ElementoEstudio[] = [
        el({ id: 'e1', tipo: 'marco', orden: 1, contenido: 'Marco', respaldoTestigos: ['t1', 't2'] }),
        el({ id: 't1', tipo: 'testigo', orden: 2, contenido: 'Juan 1:1' }),
        el({ id: 't2', tipo: 'testigo', orden: 3, contenido: 'Col 1:16' }),
    ];

    it('sin verdicts de testigos ⇒ sin_auditar + bloqueo de puertas', () => {
        const r = validarEstudioMadre({ estudioId: 's1', elementos: limpio });
        expect(r.estadoFidelidad).toBe('sin_auditar');
        expect(r.testigos).toBeNull();
        expect(r.bloqueos[0]).toMatch(/testigos/i);
    });

    it('testigos concurren + proof-texting limpio + sin citas ⇒ verde', () => {
        const witnessVerdicts: EstudioWitnessVerdicts[] = [
            { claimKey: 'e1', detectedLevel: 'distinctive', verdicts: verdicts({}) },
        ];
        const r = validarEstudioMadre({ estudioId: 's1', elementos: limpio, witnessVerdicts });
        expect(r.estadoFidelidad).toBe('verde');
        expect(r.bloqueos).toEqual([]);
        expect(r.proceed?.allowed).toBe(true);
    });

    it('proof-texting sospechoso mantiene en_progreso aunque testigos concurran', () => {
        const elementos: ElementoEstudio[] = [
            el({ id: 'e1', tipo: 'marco', orden: 1, contenido: 'Marco', respaldoTestigos: ['t1'] }), // 1 respaldo
        ];
        const witnessVerdicts: EstudioWitnessVerdicts[] = [
            { claimKey: 'e1', detectedLevel: 'distinctive', verdicts: verdicts({}) },
        ];
        const r = validarEstudioMadre({ estudioId: 's1', elementos, witnessVerdicts });
        expect(r.estadoFidelidad).toBe('en_progreso');
        expect(r.bloqueos.some((b) => /proof-texting/i.test(b))).toBe(true);
    });

    it('reusa la escalación: negar doctrina core ⇒ bloqueo absoluto, no verde', () => {
        const witnessVerdicts: EstudioWitnessVerdicts[] = [
            { claimKey: 'e1', detectedLevel: 'core', verdicts: verdicts({ confession: true }) },
        ];
        const r = validarEstudioMadre({ estudioId: 's1', elementos: limpio, witnessVerdicts });
        expect(r.estadoFidelidad).toBe('en_progreso');
        expect(r.proceed?.hasAbsoluteBlock).toBe(true);
        expect(r.testigos?.overallEscalation).toBe('absolute-block');
    });

    it('cita fallida bloquea verde', () => {
        const elementos: ElementoEstudio[] = [
            ...limpio,
            el({ id: 'c1', tipo: 'cita', orden: 4, contenido: 'mal citado', verificacionCitas: 'no' }),
        ];
        const witnessVerdicts: EstudioWitnessVerdicts[] = [
            { claimKey: 'e1', detectedLevel: 'distinctive', verdicts: verdicts({}) },
        ];
        const r = validarEstudioMadre({ estudioId: 's1', elementos, witnessVerdicts });
        expect(r.estadoFidelidad).toBe('en_progreso');
        expect(r.bloqueos.some((b) => /cita/i.test(b))).toBe(true);
    });
});
