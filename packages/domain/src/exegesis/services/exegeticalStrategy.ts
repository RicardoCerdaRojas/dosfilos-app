import type { ExegeticalStrategy } from '../entities/ExegeticalPaper';

/**
 * QUÉ SIGNIFICA CADA MODO METODOLÓGICO, en un solo lugar.
 *
 * `ExegeticalStrategy` es un valor de dos opciones, y hasta ahora sus reglas
 * vivían como literales sueltos por todo el código: `?? 'free'` en cuatro
 * pantallas, `?? 'dialectical'` al crear el paper y otra vez al guardarlo, y
 * `=== 'dialectical'` cada vez que había que decidir si mostrar la cobertura por
 * roles. Seis sitios con la misma política escrita a mano — la clase de reparto
 * que ya hizo divergir el catálogo de modelos y la tabla de libros bíblicos.
 */

/**
 * Lo que elige un paper NUEVO cuando el alumno no dice otra cosa.
 *
 * Dialéctico por defecto porque el andamiaje ayuda a quien está aprendiendo el
 * método; quien ya sabe lo que hace lo cambia a libre en un clic.
 */
export const DEFAULT_STRATEGY_FOR_NEW_PAPER: ExegeticalStrategy = 'dialectical';

/**
 * Cómo se lee un paper ANTERIOR a que este campo existiera.
 *
 * `free`, y la asimetría con el default de arriba es deliberada, no un descuido:
 * un paper viejo no eligió método, así que tratarlo como dialéctico lo llenaría
 * de avisos por no haber balanceado unos roles que nunca se le ofrecieron —
 * reprochándole no seguir una metodología que no existía cuando lo escribió.
 *
 * Es la misma regla que gobierna la procedencia del borrador y la autoría del
 * sermón: sin dato no se supone nada en contra del usuario.
 */
export const STRATEGY_FOR_LEGACY_PAPER: ExegeticalStrategy = 'free';

/** Normaliza lo guardado, que puede venir ausente o con basura. */
export function resolveExegeticalStrategy(stored: unknown): ExegeticalStrategy {
    return stored === 'dialectical' || stored === 'free' ? stored : STRATEGY_FOR_LEGACY_PAPER;
}

/**
 * ¿Este paper trabaja con el balance de roles (ancla, contraste, técnica)?
 *
 * Es LA pregunta que la interfaz venía haciendo como `=== 'dialectical'` en cada
 * pantalla. Nombrarla permite cambiar qué implica el método sin recorrer las
 * pantallas una por una — y deja claro, al leer, qué se está decidiendo.
 */
export function usesRoleCoverage(strategy: ExegeticalStrategy | undefined): boolean {
    return resolveExegeticalStrategy(strategy) === 'dialectical';
}
