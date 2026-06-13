/** Agrupamiento de clases por serie/curso para el hub de la Suite de Enseñanza. */

export interface ClaseLike {
  serie?: string;
  orden?: number;
  titulo: string;
}

/** Ordena por índice de sesión (si lo hay); cae a orden por título. */
export function ordenarSesiones<T extends ClaseLike>(clases: T[]): T[] {
  return [...clases].sort((a, b) => {
    if (a.orden != null && b.orden != null) return a.orden - b.orden;
    if (a.orden != null) return -1;
    if (b.orden != null) return 1;
    return a.titulo.localeCompare(b.titulo);
  });
}

/** Agrupa las clases por serie (cursos primero, sueltas al final). */
export function agruparPorSerie<T extends ClaseLike>(
  clases: T[],
): { serie: string | null; clases: T[] }[] {
  const conSerie = new Map<string, T[]>();
  const sueltas: T[] = [];
  for (const c of clases) {
    if (c.serie) {
      const arr = conSerie.get(c.serie) ?? [];
      arr.push(c);
      conSerie.set(c.serie, arr);
    } else {
      sueltas.push(c);
    }
  }
  const grupos = [...conSerie.entries()].map(([serie, cs]) => ({
    serie,
    clases: ordenarSesiones(cs),
  }));
  if (sueltas.length > 0) grupos.push({ serie: null, clases: ordenarSesiones(sueltas) });
  return grupos;
}
