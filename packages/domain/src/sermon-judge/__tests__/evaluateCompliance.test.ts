import { describe, it, expect } from 'vitest';
import { composeJudgeRubric, descalificadoresPendientesDeSellado } from '../composeJudgeRubric';
import { evaluateCompliance, type Adjudicaciones } from '../evaluateCompliance';

/**
 * Redacción v2 Fase 2 (§8.3/§8.4/§9.6) — mecánica del veredicto.
 * El juez CONFRONTA, NO BLOQUEA: ningún estado impide publicar. Lo que cambia es
 * qué le debe el sistema al pastor.
 */

/** Todo en yes / nada disparado, salvo lo que el test cambie. */
function adjudicacionesLimpias(
    rubric: ReturnType<typeof composeJudgeRubric>,
    overrides: Partial<Adjudicaciones> = {},
): Adjudicaciones {
    const criterios: Record<string, 'yes'> = {};
    for (const c of rubric.criterios) criterios[c.id] = 'yes';
    const descalificadores: Record<string, 'no-disparado'> = {};
    for (const d of rubric.descalificadores) descalificadores[d.claveVara] = 'no-disparado';
    return {
        criterios: { ...criterios, ...(overrides.criterios ?? {}) },
        descalificadores: { ...descalificadores, ...(overrides.descalificadores ?? {}) },
    };
}

describe('composeJudgeRubric', () => {
    it('apila las TRES capas: globales + forma + género', () => {
        const r = composeJudgeRubric('pastoral', 'wisdom');
        const capas = new Set(r.descalificadores.map(d => d.capa));
        expect(capas).toEqual(new Set(['global', 'forma', 'genero']));
    });

    it('claveVara es única aunque los ids choquen entre capas', () => {
        // 'E1' de forma y 'D1' de género conviven; sin prefijo de capa, dos capas
        // con el mismo id se pisarían en el mapa de adjudicaciones.
        const r = composeJudgeRubric('narrativo', 'narrative');
        const claves = r.descalificadores.map(d => d.claveVara);
        expect(new Set(claves).size).toBe(claves.length);
    });

    it('§8.2 — el piso de género aplica sea cual sea la forma elegida', () => {
        // Puedes predicar un profético en forma pastoral, pero no puedes violar
        // los descalificadores del profético.
        const pastoral = composeJudgeRubric('pastoral', 'prophecy');
        const teologico = composeJudgeRubric('teológico', 'prophecy');
        const soloGenero = (r: typeof pastoral) =>
            r.descalificadores.filter(d => d.capa === 'genero').map(d => d.id);
        expect(soloGenero(pastoral)).toEqual(soloGenero(teologico));
        expect(soloGenero(pastoral)).toContain('D3');
    });

    it('sin género (perfil sin genres) corre con globales + forma, sin inventar piso', () => {
        const r = composeJudgeRubric('temático');
        expect(r.descalificadores.some(d => d.capa === 'genero')).toBe(false);
        expect(r.descalificadores.some(d => d.capa === 'global')).toBe(true);
    });

    it('centinela `mixed` no aporta piso propio', () => {
        const r = composeJudgeRubric('temático', 'mixed');
        expect(r.descalificadores.filter(d => d.capa === 'genero')).toEqual([]);
    });
});

describe('evaluateCompliance — estados del veredicto (§8.3)', () => {
    it('limpio: todo en yes, cero disparados', () => {
        const r = composeJudgeRubric('pastoral', 'poetry');
        const v = evaluateCompliance(r, adjudicacionesLimpias(r));
        expect(v.estado).toBe('limpio');
        expect(v.cumple).toBe(true);
        expect(v.indeterminado).toBe(false);
    });

    it('confrontación fuerte: un descalificador CRÍTICO disparado', () => {
        const r = composeJudgeRubric('pastoral', 'wisdom');
        const v = evaluateCompliance(r, adjudicacionesLimpias(r, {
            descalificadores: { 'genero:wisdom:D1': 'disparado' }, // proverbio como promesa
        }));
        expect(v.estado).toBe('confrontacion-fuerte');
        expect(v.cumple).toBe(false);
        expect(v.disparados[0]!.claveVara).toBe('genero:wisdom:D1');
    });

    it('advertencia: solo disparó algo ESTÁNDAR', () => {
        const r = composeJudgeRubric('apologético', 'epistle');
        const v = evaluateCompliance(r, adjudicacionesLimpias(r, {
            descalificadores: { 'forma:apologético:E1': 'disparado' }, // hombre de paja, estándar
        }));
        expect(v.estado).toBe('advertencia');
        expect(v.cumple).toBe(false);
    });

    it('§8.4 — el TIPO no mueve el estado, solo la severidad', () => {
        const r = composeJudgeRubric('evangelístico', 'epistle');
        // E2 evangelístico: crítica + tipo `tratamiento`. Si el tipo pesara, un
        // problema "de tratamiento" quedaría en advertencia; debe escalar igual.
        const v = evaluateCompliance(r, adjudicacionesLimpias(r, {
            descalificadores: { 'forma:evangelístico:E2': 'disparado' },
        }));
        expect(v.disparados[0]!.tipo).toBe('tratamiento');
        expect(v.estado).toBe('confrontacion-fuerte');
    });

    it('los críticos se ordenan primero, aunque disparen después', () => {
        const r = composeJudgeRubric('pastoral', 'wisdom');
        const v = evaluateCompliance(r, adjudicacionesLimpias(r, {
            descalificadores: { 'forma:pastoral:E1': 'disparado', 'genero:wisdom:D1': 'disparado' },
        }));
        expect(v.disparados[0]!.resuelto.severidad).toBe('critica');
    });
});

describe('evaluateCompliance — umbral (§9.6)', () => {
    it('un esencial en `no` descalifica aunque los esperados pasen', () => {
        const r = composeJudgeRubric('narrativo', 'narrative');
        const v = evaluateCompliance(r, adjudicacionesLimpias(r, {
            criterios: { C4: 'no' }, // redención: el único esencial sellado
        }));
        expect(v.cumple).toBe(false);
        expect(v.esenciales.faltantes).toEqual(['C4']);
        // Falla de criterio, no descalificador disparado: confronta como
        // advertencia, no como confrontación fuerte.
        expect(v.estado).toBe('advertencia');
    });

    it('mayoría de esperados: 2 de 3 en yes cumple, 1 de 3 no', () => {
        const r = composeJudgeRubric('teológico', 'epistle');
        const dos = evaluateCompliance(r, adjudicacionesLimpias(r, { criterios: { C3: 'no' } }));
        expect(dos.esperados).toEqual({ adjudicados: 3, enYes: 2, mayoria: true });
        expect(dos.cumple).toBe(true);

        const uno = evaluateCompliance(r, adjudicacionesLimpias(r, { criterios: { C2: 'no', C3: 'no' } }));
        expect(uno.esperados.mayoria).toBe(false);
        expect(uno.cumple).toBe(false);
    });

    it('empate NO es mayoría (2 de 4)', () => {
        const r = composeJudgeRubric('narrativo', 'narrative');
        // C1..C3 esperados + C4 esencial. Se deja C3 unclear para que el
        // denominador de esperados quede en 2 y el empate sea exacto.
        const v = evaluateCompliance(r, adjudicacionesLimpias(r, {
            criterios: { C2: 'no', C3: 'unclear' },
        }));
        expect(v.esperados).toEqual({ adjudicados: 2, enYes: 1, mayoria: false });
    });
});

describe('evaluateCompliance — unclear no infla la tasa (§8.4)', () => {
    it('un esperado en unclear sale del numerador Y del denominador', () => {
        const r = composeJudgeRubric('teológico', 'epistle');
        const v = evaluateCompliance(r, adjudicacionesLimpias(r, { criterios: { C3: 'unclear' } }));
        expect(v.esperados).toEqual({ adjudicados: 2, enYes: 2, mayoria: true });
        expect(v.colaDeRevision).toContain('criterio:C3');
        expect(v.estado).toBe('advertencia'); // hay unclear → nunca "limpio"
    });

    it('un ESENCIAL en unclear no cuenta como violado, pero deja indeterminado', () => {
        const r = composeJudgeRubric('narrativo', 'narrative');
        const v = evaluateCompliance(r, adjudicacionesLimpias(r, { criterios: { C4: 'unclear' } }));
        expect(v.esenciales.faltantes).toEqual([]); // NO se cuenta como falla
        expect(v.cumple).toBe(false);              // pero tampoco como cumplido
        expect(v.indeterminado).toBe(true);
        expect(v.estado).toBe('advertencia');
    });

    it('adjudicación AUSENTE se trata como unclear, no como aprobada', () => {
        // Fail-closed: un juez que no respondió sobre un criterio no lo aprueba.
        const r = composeJudgeRubric('pastoral', 'poetry');
        const v = evaluateCompliance(r, { criterios: {}, descalificadores: {} });
        expect(v.estado).toBe('advertencia');
        expect(v.cumple).toBe(false);
        expect(v.indeterminado).toBe(true);
    });

    it('un descalificador en unclear va a cola y NO cuenta como disparado', () => {
        const r = composeJudgeRubric('pastoral', 'wisdom');
        const v = evaluateCompliance(r, adjudicacionesLimpias(r, {
            descalificadores: { 'genero:wisdom:D1': 'unclear' },
        }));
        expect(v.disparados).toEqual([]);
        expect(v.colaDeRevision).toContain('descalificador:genero:wisdom:D1');
        expect(v.estado).toBe('advertencia'); // no escala a confrontación fuerte
    });
});

describe('vara sin sellar', () => {
    it('un descalificador pendiente de sellado NUNCA escala a confrontación fuerte', () => {
        const r = composeJudgeRubric('temático', 'epistle');
        const pendiente = r.descalificadores.find(d => d.resuelto.pendienteDeSellado);
        expect(pendiente, 'este test necesita al menos un pendiente en la vara').toBeTruthy();
        const v = evaluateCompliance(r, adjudicacionesLimpias(r, {
            descalificadores: { [pendiente!.claveVara]: 'disparado' },
        }));
        expect(v.estado).toBe('advertencia');
    });

    it('la cola de revisión del fundador sale del DATO, sin duplicar por combinación', () => {
        const pendientes = descalificadoresPendientesDeSellado();
        const claves = pendientes.map(d => d.claveVara);
        expect(new Set(claves).size).toBe(claves.length);
        // Los globales y todo lo sellado en §9.5 quedan fuera de la cola.
        expect(pendientes.some(d => d.capa === 'global')).toBe(false);
        expect(pendientes.some(d => d.capa === 'forma')).toBe(false);
    });
});
