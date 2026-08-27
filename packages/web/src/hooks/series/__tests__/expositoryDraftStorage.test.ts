import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
    clearExpositoryDraft,
    loadExpositoryDraft,
    saveExpositoryDraft,
    type ExpositoryDraft,
} from '../expositoryDraftStorage';

/**
 * CARACTERIZACIÓN — describe lo que el código HACE HOY, no lo que debería.
 *
 * El borrador del asistente expositivo guarda hasta noventa segundos de trabajo
 * del pipeline: si se pierde, el pastor vuelve a correr los cinco pases. No tenía
 * ni una prueba, y sin ellas partir el orquestador es apostar.
 */

const CLAVE = 'dosfilos.expositoryAssistant.draft';

const borradorMinimo = () => ({
    bookId: '2PE' as const,
    displayLanguage: 'es' as const,
    bookDisplay: '2 Pedro',
    verses: [{ chapter: 1, verse: 1, text: 'Simón Pedro, siervo…' }] as any,
});

beforeEach(() => {
    localStorage.clear();
    vi.useRealTimers();
});

afterEach(() => {
    vi.useRealTimers();
});

describe('guardar y recuperar', () => {
    it('lo guardado vuelve entero', () => {
        saveExpositoryDraft(borradorMinimo());
        const leido = loadExpositoryDraft();

        expect(leido).toMatchObject({ bookId: '2PE', bookDisplay: '2 Pedro' });
        expect(leido?.verses).toHaveLength(1);
    });

    it('estampa versión de esquema y fecha, que el llamador no pasa', () => {
        saveExpositoryDraft(borradorMinimo());

        expect(loadExpositoryDraft()?.schemaVersion).toBe('v1');
        expect(Number.isFinite(Date.parse(loadExpositoryDraft()!.savedAt))).toBe(true);
    });

    it('UN SOLO BORRADOR: el nuevo pisa al anterior', () => {
        // Contrato deliberado — volver a pulsar "Iniciar análisis" reemplaza.
        saveExpositoryDraft({ ...borradorMinimo(), bookDisplay: 'Primero' });
        saveExpositoryDraft({ ...borradorMinimo(), bookDisplay: 'Segundo' });

        expect(loadExpositoryDraft()?.bookDisplay).toBe('Segundo');
    });

    it('sin nada guardado devuelve null, no un borrador vacío', () => {
        expect(loadExpositoryDraft()).toBeNull();
    });

    it('borrar lo deja sin rastro', () => {
        saveExpositoryDraft(borradorMinimo());
        clearExpositoryDraft();

        expect(loadExpositoryDraft()).toBeNull();
        expect(localStorage.getItem(CLAVE)).toBeNull();
    });
});

describe('caducidad — 24 horas', () => {
    it('un borrador de hace 25 horas NO se devuelve', () => {
        // Volver a la página una semana después y encontrarse un análisis viejo
        // en pantalla es peor que empezar limpio.
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-08-27T10:00:00Z'));
        saveExpositoryDraft(borradorMinimo());

        vi.setSystemTime(new Date('2026-08-28T11:00:00Z'));
        expect(loadExpositoryDraft()).toBeNull();
    });

    it('y además LO BORRA, no lo deja ocupando espacio', () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-08-27T10:00:00Z'));
        saveExpositoryDraft(borradorMinimo());

        vi.setSystemTime(new Date('2026-08-30T10:00:00Z'));
        loadExpositoryDraft();

        expect(localStorage.getItem(CLAVE)).toBeNull();
    });

    it('a las 23 horas sigue vivo', () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-08-27T10:00:00Z'));
        saveExpositoryDraft(borradorMinimo());

        vi.setSystemTime(new Date('2026-08-28T09:00:00Z'));
        expect(loadExpositoryDraft()).not.toBeNull();
    });
});

describe('datos que no se pueden usar', () => {
    it('otra versión de esquema se ignora en silencio', () => {
        // Así una versión futura del asistente puede cambiar la forma sin
        // reventar al abrir un borrador viejo.
        localStorage.setItem(CLAVE, JSON.stringify({ ...borradorMinimo(), schemaVersion: 'v2', savedAt: new Date().toISOString() }));

        expect(loadExpositoryDraft()).toBeNull();
    });

    it('JSON corrupto no tumba la página', () => {
        localStorage.setItem(CLAVE, '{esto no es json');

        expect(loadExpositoryDraft()).toBeNull();
    });

    it('una fecha ilegible se trata como caducada', () => {
        localStorage.setItem(CLAVE, JSON.stringify({ ...borradorMinimo(), schemaVersion: 'v1', savedAt: 'ayer por la tarde' }));

        expect(loadExpositoryDraft()).toBeNull();
    });

    it('CARACTERIZADO — el borrador NO se valida por dentro', () => {
        // Rareza que se deja constancia sin cambiarla: pasada la versión y la
        // fecha, el contenido se devuelve tal cual esté. Un documento sin
        // `verses` llega a la página como si fuera válido. Hoy no rompe porque
        // sólo lo escribe esta misma app; dejaría de ser cierto si alguien
        // editara el almacenamiento a mano.
        localStorage.setItem(CLAVE, JSON.stringify({ schemaVersion: 'v1', savedAt: new Date().toISOString() }));

        const leido = loadExpositoryDraft();
        expect(leido).not.toBeNull();
        expect(leido?.verses).toBeUndefined();
    });
});

describe('cuando el navegador no deja escribir', () => {
    it('guardar falla en silencio: el asistente sigue trabajando en memoria', () => {
        // Modo privado o cuota llena. Perder la copia de respaldo no puede
        // costarle al pastor el análisis que tiene en pantalla.
        const original = Storage.prototype.setItem;
        Storage.prototype.setItem = () => { throw new Error('QuotaExceeded'); };

        expect(() => saveExpositoryDraft(borradorMinimo())).not.toThrow();

        Storage.prototype.setItem = original;
    });

    it('borrar tampoco lanza', () => {
        const original = Storage.prototype.removeItem;
        Storage.prototype.removeItem = () => { throw new Error('nope'); };

        expect(() => clearExpositoryDraft()).not.toThrow();

        Storage.prototype.removeItem = original;
    });
});

describe('el triaje del pase 5 sobrevive al cierre de pestaña', () => {
    it('conserva qué hallazgos se atendieron y cuáles se descartaron', () => {
        // Son decisiones del pastor sobre la revisión de fidelidad: volver a
        // pedírselas equivale a no haberlas guardado.
        saveExpositoryDraft({
            ...borradorMinimo(),
            addressedIssueIndices: [0, 2],
            ignoredIssueIndices: [1],
        } as Omit<ExpositoryDraft, 'schemaVersion' | 'savedAt'>);

        const leido = loadExpositoryDraft();
        expect(leido?.addressedIssueIndices).toEqual([0, 2]);
        expect(leido?.ignoredIssueIndices).toEqual([1]);
    });
});
