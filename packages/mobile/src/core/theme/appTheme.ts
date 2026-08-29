import { useColorScheme } from 'react-native';

import { useThemeStore } from '@/presentation/state/theme.store';

/**
 * Los colores del ESCRITORIO — todo lo que no es el atril.
 *
 * La app tiene dos temperaturas. El púlpito ya está resuelto en
 * `readingModes.ts`: papel, luz medida, nada que distraiga. El resto es donde
 * se PREPARA, y pide lo contrario — superficies, jerarquía, densidad. Que sean
 * mundos distintos está bien; que parezcan dos aplicaciones distintas no.
 *
 * POR QUÉ NEUTROS CÁLIDOS Y NO EL GRIS DE SIEMPRE. Las pantallas venían con la
 * escala `slate` de Tailwind, que es gris azulado, y el púlpito abre en papel
 * (`#f2efe9`). Pasar de una a otro se sentía como cambiar de aplicación. Estos
 * neutros son el mismo papel a plena luz: la temperatura no cambia al entrar
 * al atril, sólo la cantidad de estructura.
 *
 * El azul de marca se queda —es la identidad— pero se aclara en oscuro: el
 * `#1754cf` sobre fondo casi negro no llega al contraste que necesita un
 * pastor leyendo de pie.
 *
 * REGLA: ninguna pantalla escribe un hex. Todo sale de acá. Antes había
 * `#94a3b8`, `#64748b` y `#1754cf` sueltos por seis archivos, y cambiar un
 * gris obligaba a buscarlos de a uno.
 */
export interface AppTheme {
    /** Fondo de la pantalla. */
    background: string;
    /** Tarjetas y barras: lo que se levanta del fondo. */
    surface: string;
    /** Campos y celdas: lo que se hunde. */
    surfaceSunken: string;
    border: string;
    /** Borde de lo que está enfocado o elegido. */
    borderStrong: string;
    textPrimary: string;
    textSecondary: string;
    /** Metadatos: fechas, contadores. Presente sin pedir atención. */
    textMuted: string;
    accent: string;
    /** Fondo del acento: chips, estados elegidos. */
    accentSoft: string;
    /** Texto sobre el acento sólido. */
    onAccent: string;
    /** Listo, guardado, disponible sin conexión. */
    positive: string;
    positiveSoft: string;
    warning: string;
    danger: string;
    /** Sombra de tarjeta. En oscuro no hay: se distingue por superficie. */
    shadow: string;
    isDark: boolean;
}

export const APP_LIGHT: AppTheme = {
    background: '#f7f5f1',
    surface: '#ffffff',
    surfaceSunken: '#efece6',
    border: '#e4dfd6',
    borderStrong: '#cdc6ba',
    textPrimary: '#1b1a17',
    textSecondary: '#6a655c',
    textMuted: '#9a938a',
    accent: '#1754cf',
    accentSoft: 'rgba(23, 84, 207, 0.10)',
    onAccent: '#ffffff',
    positive: '#15803d',
    positiveSoft: 'rgba(21, 128, 61, 0.10)',
    warning: '#b45309',
    danger: '#b91c1c',
    shadow: 'rgba(27, 26, 23, 0.10)',
    isDark: false,
};

export const APP_DARK: AppTheme = {
    background: '#111110',
    surface: '#1a1917',
    surfaceSunken: '#0b0b0a',
    border: 'rgba(242, 239, 233, 0.09)',
    borderStrong: 'rgba(242, 239, 233, 0.22)',
    textPrimary: '#f2efe9',
    textSecondary: '#a7a199',
    textMuted: '#6f6a63',
    accent: '#7ea6ff',
    accentSoft: 'rgba(126, 166, 255, 0.14)',
    onAccent: '#111110',
    positive: '#5fbf7f',
    positiveSoft: 'rgba(95, 191, 127, 0.14)',
    warning: '#e0a45e',
    danger: '#f08a8a',
    shadow: 'transparent',
    isDark: true,
};

/** El tema vigente, respetando la preferencia guardada y la del sistema. */
export function useAppTheme(): AppTheme {
    const device = useColorScheme();
    const mode = useThemeStore((s) => s.themeMode);
    const dark = mode === 'system' ? device === 'dark' : mode === 'dark';
    return dark ? APP_DARK : APP_LIGHT;
}
