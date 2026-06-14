import { describe, it, expect, beforeEach } from 'vitest';
import {
    addElemento,
    clearDraft,
    getDraft,
    moveElemento,
    removeElemento,
    setContenido,
    setRespaldo,
    setRespuesta,
    setTipo,
    setReferencia,
    setTitulo,
} from '../estudioDraftStore';

let n = 0;
function freshSession(): string {
    return `sess-${n++}-${Math.floor(Math.random() * 1e6)}`;
}

beforeEach(() => {
    try {
        localStorage.clear();
    } catch {
        /* noop */
    }
});

describe('estudioDraftStore', () => {
    it('promueve elementos con orden correlativo y campos del input', () => {
        const s = freshSession();
        addElemento(s, { tipo: 'idea_central', contenido: 'El Verbo es Dios', autoria: 'sistema', mensajeId: 'm1' });
        addElemento(s, { tipo: 'testigo', contenido: 'Col 1:16', autoria: 'docente', mensajeId: 'm2' });
        const d = getDraft(s);
        expect(d.elementos).toHaveLength(2);
        expect(d.elementos[0]).toMatchObject({ tipo: 'idea_central', orden: 1, contenido: 'El Verbo es Dios', autoria: 'sistema', mensajeId: 'm1' });
        expect(d.elementos[1]).toMatchObject({ tipo: 'testigo', orden: 2, mensajeId: 'm2' });
    });

    it('mover renumera orden y respeta los bordes', () => {
        const s = freshSession();
        addElemento(s, { tipo: 'marco', contenido: 'A', autoria: 'docente' });
        addElemento(s, { tipo: 'argumento', contenido: 'B', autoria: 'docente' });
        const [a, b] = getDraft(s).elementos;
        moveElemento(s, b.id, 'up');
        const after = getDraft(s).elementos;
        expect(after.map((e) => e.contenido)).toEqual(['B', 'A']);
        expect(after.map((e) => e.orden)).toEqual([1, 2]);
        // borde: subir el primero no hace nada
        moveElemento(s, after[0].id, 'up');
        expect(getDraft(s).elementos.map((e) => e.contenido)).toEqual(['B', 'A']);
        void a;
    });

    it('quitar renumera el resto', () => {
        const s = freshSession();
        addElemento(s, { tipo: 'marco', contenido: 'A', autoria: 'docente' });
        addElemento(s, { tipo: 'argumento', contenido: 'B', autoria: 'docente' });
        const [a] = getDraft(s).elementos;
        removeElemento(s, a.id);
        const after = getDraft(s).elementos;
        expect(after).toHaveLength(1);
        expect(after[0]).toMatchObject({ contenido: 'B', orden: 1 });
    });

    it('cambiar tipo, contenido y respaldo', () => {
        const s = freshSession();
        addElemento(s, { tipo: 'observacion', contenido: 'X', autoria: 'docente' });
        const id = getDraft(s).elementos[0].id;
        setTipo(s, id, 'idea_central');
        setContenido(s, id, 'El Verbo es Dios (editado, sin preámbulo)');
        setRespaldo(s, id, ['t1', 't2']);
        const e = getDraft(s).elementos[0];
        expect(e.tipo).toBe('idea_central');
        expect(e.contenido).toBe('El Verbo es Dios (editado, sin preámbulo)');
        expect(e.respaldoTestigos).toEqual(['t1', 't2']);
    });

    it('respuestas a testigos persisten en el borrador', () => {
        const s = freshSession();
        setRespuesta(s, 'centralIdea', 'Reconozco la tensión y reformulo: ...');
        expect(getDraft(s).respuestas).toEqual({ centralIdea: 'Reconozco la tensión y reformulo: ...' });
        // sobrevive en localStorage (la "recarga" relee desde ahí)
        expect(localStorage.getItem(`estudioDraft:${s}`)).toBeTruthy();
    });

    it('referencia/titulo/respuestas se persisten y clear limpia todo', () => {
        const s = freshSession();
        addElemento(s, { tipo: 'marco', contenido: 'A', autoria: 'docente' });
        setReferencia(s, 'Juan 1:1-3');
        setTitulo(s, 'El Verbo eterno');
        setRespuesta(s, 'e1', 'mi respuesta');
        expect(getDraft(s)).toMatchObject({ referencia: 'Juan 1:1-3', titulo: 'El Verbo eterno' });
        expect(getDraft(s).respuestas.e1).toBe('mi respuesta');
        expect(localStorage.getItem(`estudioDraft:${s}`)).toBeTruthy();
        clearDraft(s);
        expect(getDraft(s).elementos).toHaveLength(0);
        expect(getDraft(s).referencia).toBe('');
        expect(getDraft(s).respuestas).toEqual({});
        expect(localStorage.getItem(`estudioDraft:${s}`)).toBeNull();
    });

    it('borradores de sesiones distintas no se mezclan', () => {
        const s1 = freshSession();
        const s2 = freshSession();
        addElemento(s1, { tipo: 'marco', contenido: 'soy s1', autoria: 'docente' });
        expect(getDraft(s1).elementos).toHaveLength(1);
        expect(getDraft(s2).elementos).toHaveLength(0);
    });
});
