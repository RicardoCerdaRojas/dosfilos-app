import { describe, it, expect } from 'vitest';
import {
    validarConduccionCorazon,
    construirAplicacionCorazon,
    type ConduccionCorazonRespuestas,
} from '../conduccionCorazon';

const completas: ConduccionCorazonRespuestas = {
    proposicionElementoId: 'e1',
    caraAfectiva: 'El autor busca asombro ante un amor que ama al enemigo.',
    raizTeocentrica: 'El amor de Dios precede y no depende de mi dignidad.',
    puenteCongregacion: 'Mi gente, dura consigo misma, necesita reposar en ese amor.',
    afeccion: 'Que reposen con seguridad filial en un amor que los precede.',
};

describe('validarConduccionCorazon', () => {
    it('respuestas completas → válido, sin faltantes', () => {
        expect(validarConduccionCorazon(completas)).toEqual({ valido: true, faltantes: [] });
    });

    it('sin proposición elegida → falta `proposicion`', () => {
        const r = { ...completas, proposicionElementoId: '  ' };
        expect(validarConduccionCorazon(r)).toEqual({ valido: false, faltantes: ['proposicion'] });
    });

    it('pasos de texto demasiado cortos se reportan en orden C1→C5', () => {
        const r: ConduccionCorazonRespuestas = {
            proposicionElementoId: 'e1',
            caraAfectiva: 'corto',
            raizTeocentrica: 'corto',
            puenteCongregacion: 'corto',
            afeccion: 'corto',
        };
        expect(validarConduccionCorazon(r)).toEqual({
            valido: false,
            faltantes: ['caraAfectiva', 'raizTeocentrica', 'puenteCongregacion', 'afeccion'],
        });
    });
});

describe('construirAplicacionCorazon', () => {
    it('la afección (C5) es el `contenido`; el resto va a la traza; autoría docente', () => {
        const el = construirAplicacionCorazon(completas);
        expect(el).toEqual({
            tipo: 'aplicacion',
            subtipo: 'corazon',
            autoria: 'docente',
            contenido: 'Que reposen con seguridad filial en un amor que los precede.',
            conduccionCorazon: {
                proposicionElementoId: 'e1',
                caraAfectiva: 'El autor busca asombro ante un amor que ama al enemigo.',
                raizTeocentrica: 'El amor de Dios precede y no depende de mi dignidad.',
                puenteCongregacion: 'Mi gente, dura consigo misma, necesita reposar en ese amor.',
            },
        });
    });

    it('recorta espacios alrededor del contenido y de la traza', () => {
        const el = construirAplicacionCorazon({ ...completas, afeccion: '  Reposo filial.  ' });
        expect(el.contenido).toBe('Reposo filial.');
    });
});
