import { describe, it, expect } from 'vitest';
import {
    collectAfectoClaims,
    evaluarHerenciaConducta,
    evaluarExamenCorazon,
    type AfectoVerdicts,
} from '../examenCorazon';
import { validarEstudioMadre, type EstudioWitnessVerdicts } from '../fidelidad';
import type { ElementoEstudio, ConduccionCorazonTrace } from '../types';
import type { WitnessVerdict } from '../../entities/WitnessValidation';

function el(p: Partial<ElementoEstudio> & Pick<ElementoEstudio, 'id' | 'tipo' | 'orden' | 'contenido'>): ElementoEstudio {
    return { autoria: 'docente', ...p };
}

const traza = (proposicionElementoId: string): ConduccionCorazonTrace => ({
    proposicionElementoId,
    caraAfectiva: 'El autor busca asombro ante un amor que ama al enemigo.',
    raizTeocentrica: 'El amor de Dios precede mi dignidad.',
    puenteCongregacion: 'Mi gente, dura consigo misma, necesita reposar en ese amor.',
});

/** Corazón con traza válida hacia una proposición. */
function corazon(id: string, prop: string, afeccion = 'Que reposen con seguridad filial.'): ElementoEstudio {
    return el({ id, tipo: 'aplicacion', orden: 9, contenido: afeccion, subtipo: 'corazon', conduccionCorazon: traza(prop) });
}

function verdicts(d: { context?: boolean; parallels?: boolean; confession?: boolean }): WitnessVerdict[] {
    const mk = (witness: WitnessVerdict['witness'], x: boolean): WitnessVerdict => ({
        witness,
        dissents: x,
        reasoning: '',
        evidence: [],
        confidence: x ? 0.9 : 0.1,
    });
    return [mk('context', d.context ?? false), mk('parallels', d.parallels ?? false), mk('confession', d.confession ?? false)];
}

const admisible = (claimKey: string, d = {}): AfectoVerdicts => ({
    claimKey,
    admisible: true,
    detectedLevel: 'distinctive',
    verdicts: verdicts(d),
});

describe('collectAfectoClaims', () => {
    it('resuelve el texto de la proposición desde la traza', () => {
        const elementos = [
            el({ id: 'i1', tipo: 'idea_central', orden: 1, contenido: 'Dios justifica al impío por la fe.' }),
            corazon('c1', 'i1'),
        ];
        const { claims, huerfanos } = collectAfectoClaims(elementos);
        expect(huerfanos).toEqual([]);
        expect(claims).toHaveLength(1);
        expect(claims[0]).toMatchObject({ key: 'c1', proposicionText: 'Dios justifica al impío por la fe.' });
    });

    it('corazón sin traza ⇒ huérfano estructural', () => {
        const elementos = [el({ id: 'c1', tipo: 'aplicacion', orden: 1, contenido: 'Que sientan paz', subtipo: 'corazon' })];
        const { claims, huerfanos } = collectAfectoClaims(elementos);
        expect(claims).toEqual([]);
        expect(huerfanos).toEqual(['c1']);
    });

    it('traza que apunta a una proposición inexistente/vacía ⇒ huérfano', () => {
        const elementos = [
            el({ id: 'i1', tipo: 'idea_central', orden: 1, contenido: '   ' }), // vacía
            corazon('c1', 'i1'),
            corazon('c2', 'fantasma'),
        ];
        const { huerfanos } = collectAfectoClaims(elementos);
        expect(huerfanos.sort()).toEqual(['c1', 'c2']);
    });
});

describe('evaluarHerenciaConducta', () => {
    const base = [
        el({ id: 'co', tipo: 'aplicacion', orden: 1, contenido: 'afecto', subtipo: 'corazon' }),
    ];
    it('conducta sin vínculo ⇒ sin_vinculo', () => {
        const elementos = [...base, el({ id: 'cd', tipo: 'aplicacion', orden: 2, contenido: 'haz X', subtipo: 'conducta' })];
        expect(evaluarHerenciaConducta(elementos, new Set())).toEqual([{ id: 'cd', razon: 'sin_vinculo' }]);
    });
    it('vínculo a un no-corazón ⇒ vinculo_invalido', () => {
        const elementos = [
            el({ id: 'x', tipo: 'observacion', orden: 1, contenido: 'obs' }),
            el({ id: 'cd', tipo: 'aplicacion', orden: 2, contenido: 'haz X', subtipo: 'conducta', derivaDeElementoId: 'x' }),
        ];
        expect(evaluarHerenciaConducta(elementos, new Set())).toEqual([{ id: 'cd', razon: 'vinculo_invalido' }]);
    });
    it('vínculo a un corazón NO validado ⇒ afecto_no_validado', () => {
        const elementos = [...base, el({ id: 'cd', tipo: 'aplicacion', orden: 2, contenido: 'haz X', subtipo: 'conducta', derivaDeElementoId: 'co' })];
        expect(evaluarHerenciaConducta(elementos, new Set())).toEqual([{ id: 'cd', razon: 'afecto_no_validado' }]);
    });
    it('vínculo a un corazón validado ⇒ sin moralismo', () => {
        const elementos = [...base, el({ id: 'cd', tipo: 'aplicacion', orden: 2, contenido: 'haz X', subtipo: 'conducta', derivaDeElementoId: 'co' })];
        expect(evaluarHerenciaConducta(elementos, new Set(['co']))).toEqual([]);
    });
});

describe('evaluarExamenCorazon (tres estados, no colapsados)', () => {
    const elementos = [
        el({ id: 'i1', tipo: 'idea_central', orden: 1, contenido: 'Dios justifica al impío por la fe.' }),
        corazon('c1', 'i1'),
    ];

    it('emoción (Cond 4 admisible=false) ⇒ reformular, NO bloqueo de testigos', () => {
        const r = evaluarExamenCorazon({
            estudioId: 's',
            elementos,
            afectoVerdicts: [{ claimKey: 'c1', admisible: false, detectedLevel: null, verdicts: [] }],
        });
        expect(r.reformular).toEqual(['c1']);
        expect(r.testigos).toBeNull();
        expect(r.validados).toEqual([]);
    });

    it('sin verdict inyectado ⇒ sinExaminar', () => {
        const r = evaluarExamenCorazon({ estudioId: 's', elementos, afectoVerdicts: [] });
        expect(r.sinExaminar).toEqual(['c1']);
    });

    it('admisible + testigos concurren ⇒ validado', () => {
        const r = evaluarExamenCorazon({ estudioId: 's', elementos, afectoVerdicts: [admisible('c1')] });
        expect(r.validados).toEqual(['c1']);
        expect(r.proceed?.allowed).toBe(true);
    });

    it('raíz sin Dios del texto (core + disenso confesional) ⇒ bloqueo absoluto, no validado', () => {
        const r = evaluarExamenCorazon({
            estudioId: 's',
            elementos,
            afectoVerdicts: [{ claimKey: 'c1', admisible: true, detectedLevel: 'core', verdicts: verdicts({ confession: true }) }],
        });
        expect(r.validados).toEqual([]);
        expect(r.proceed?.hasAbsoluteBlock).toBe(true);
    });
});

describe('validarEstudioMadre — integración del examen del corazón', () => {
    it('afecto huérfano bloquea verde', () => {
        const elementos = [
            el({ id: 'i1', tipo: 'idea_central', orden: 1, contenido: 'Dios salva.', respaldoTestigos: ['t1', 't2'] }),
            el({ id: 't1', tipo: 'testigo', orden: 2, contenido: 'Ef 2:8' }),
            el({ id: 't2', tipo: 'testigo', orden: 3, contenido: 'Rom 3:24' }),
            el({ id: 'c1', tipo: 'aplicacion', orden: 4, contenido: 'Que sientan paz', subtipo: 'corazon' }), // sin traza
        ];
        const witnessVerdicts: EstudioWitnessVerdicts[] = [
            { claimKey: 'i1', detectedLevel: 'distinctive', verdicts: verdicts({}) },
        ];
        const r = validarEstudioMadre({ estudioId: 's', elementos, witnessVerdicts });
        expect(r.estadoFidelidad).toBe('en_progreso');
        expect(r.corazon.huerfanos).toEqual(['c1']);
        expect(r.bloqueos.some((b) => /huérfano/i.test(b))).toBe(true);
    });

    it('el corazón NO entra a los testigos de doctrina (sin doble confrontación)', () => {
        const elementos = [
            el({ id: 'i1', tipo: 'idea_central', orden: 1, contenido: 'Dios salva.', respaldoTestigos: ['t1', 't2'] }),
            el({ id: 't1', tipo: 'testigo', orden: 2, contenido: 'Ef 2:8' }),
            el({ id: 't2', tipo: 'testigo', orden: 3, contenido: 'Rom 3:24' }),
            corazon('c1', 'i1'),
        ];
        // El corazón NO debe aparecer entre los claims de doctrina.
        const witnessVerdicts: EstudioWitnessVerdicts[] = [
            { claimKey: 'i1', detectedLevel: 'distinctive', verdicts: verdicts({}) },
        ];
        const r = validarEstudioMadre({
            estudioId: 's',
            elementos,
            witnessVerdicts,
            afectoVerdicts: [admisible('c1')],
        });
        expect(r.testigos?.claims.map((c) => c.key)).toEqual(['i1']);
        expect(r.corazon.validados).toEqual(['c1']);
        expect(r.estadoFidelidad).toBe('verde');
        expect(r.bloqueos).toEqual([]);
    });

    it('conducta sin afecto validado detrás bloquea verde (moralismo)', () => {
        const elementos = [
            el({ id: 'i1', tipo: 'idea_central', orden: 1, contenido: 'Dios salva.', respaldoTestigos: ['t1', 't2'] }),
            el({ id: 't1', tipo: 'testigo', orden: 2, contenido: 'Ef 2:8' }),
            el({ id: 't2', tipo: 'testigo', orden: 3, contenido: 'Rom 3:24' }),
            el({ id: 'cd', tipo: 'aplicacion', orden: 4, contenido: 'Sirve al prójimo', subtipo: 'conducta' }),
        ];
        const witnessVerdicts: EstudioWitnessVerdicts[] = [
            { claimKey: 'i1', detectedLevel: 'distinctive', verdicts: verdicts({}) },
            { claimKey: 'cd', detectedLevel: 'distinctive', verdicts: verdicts({}) },
        ];
        const r = validarEstudioMadre({ estudioId: 's', elementos, witnessVerdicts });
        expect(r.corazon.herencia).toEqual([{ id: 'cd', razon: 'sin_vinculo' }]);
        expect(r.bloqueos.some((b) => /moralismo/i.test(b))).toBe(true);
        expect(r.estadoFidelidad).toBe('en_progreso');
    });
});
