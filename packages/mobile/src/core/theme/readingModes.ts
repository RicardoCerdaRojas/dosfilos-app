/**
 * Tokens de los cinco modos de luz del lector/púlpito (plan Púlpito §6, M-09).
 * F0 entrega los TOKENS; las pantallas que los consumen llegan en F1.
 *
 * Los cinco modos son producto, no preferencia estética:
 *   - claro / sepia / oscuro: lectura normal según ambiente.
 *   - atril: alto contraste y sin sorpresas — brillo fijo, keep-awake siempre,
 *     pensado para predicar con luz de escenario.
 *   - eink: BOOX y similares (M-09). Negro/blanco PURO, cero animaciones,
 *     refrescos mínimos. En e-ink el color no existe: los estados del timer
 *     se distinguen por forma/peso tipográfico, no por color — por eso aquí
 *     los tres estados comparten tinta.
 */

export type ReadingMode = 'claro' | 'sepia' | 'oscuro' | 'atril' | 'eink';

export interface ReadingModeTokens {
    /** Fondo de la superficie de lectura. */
    background: string;
    /** Superficie elevada (popovers, riel de secciones). */
    surface: string;
    /** Cuerpo del sermón. */
    textPrimary: string;
    /** Metadatos, números de sección, atribuciones. */
    textSecondary: string;
    /** Acento interactivo (marcadores [N], links, referencia bíblica). */
    accent: string;
    /** Divisores y bordes. */
    border: string;
    /** Resaltado por defecto (F1: tap largo por frase/párrafo). */
    highlight: string;
    /** Timer: bajo el 80% del objetivo. */
    timerOk: string;
    /** Timer: entre 80% y 100%. */
    timerWarn: string;
    /** Timer: pasado del objetivo (rojo tenue — nunca alarma). */
    timerOver: string;
    /** Animaciones permitidas en este modo. */
    animations: boolean;
    /** keep-awake incondicional (atril) — los demás siguen la sesión de lectura. */
    keepAwakeAlways: boolean;
    /** Estilo de status bar que no ensucia el modo. */
    statusBarStyle: 'light' | 'dark';
}

const primary = '#1754cf';

export const READING_MODES: Record<ReadingMode, ReadingModeTokens> = {
    claro: {
        background: '#f6f6f8',
        surface: '#ffffff',
        textPrimary: '#0f172a',
        textSecondary: '#64748b',
        accent: primary,
        border: '#e2e8f0',
        highlight: '#fef3c7',
        timerOk: '#15803d',
        timerWarn: '#b45309',
        timerOver: '#b91c1c',
        animations: true,
        keepAwakeAlways: false,
        statusBarStyle: 'dark',
    },
    sepia: {
        background: '#f4ecd8',
        surface: '#faf6ea',
        textPrimary: '#433422',
        textSecondary: '#8a7457',
        accent: '#8b5e2b',
        border: '#e0d3b8',
        highlight: '#f0dfa8',
        timerOk: '#4d7c0f',
        timerWarn: '#b45309',
        timerOver: '#b91c1c',
        animations: true,
        keepAwakeAlways: false,
        statusBarStyle: 'dark',
    },
    oscuro: {
        background: '#111621',
        surface: '#1e293b',
        textPrimary: '#f8fafc',
        textSecondary: '#94a3b8',
        accent: '#7ea2e8',
        border: 'rgba(255,255,255,0.08)',
        highlight: '#3f3a1e',
        timerOk: '#4ade80',
        timerWarn: '#fbbf24',
        timerOver: '#f87171',
        animations: true,
        keepAwakeAlways: false,
        statusBarStyle: 'light',
    },
    atril: {
        background: '#000000',
        surface: '#0a0a0a',
        textPrimary: '#ffffff',
        textSecondary: '#d4d4d4',
        accent: '#ffd166',
        border: '#404040',
        highlight: '#4d3f00',
        timerOk: '#22c55e',
        timerWarn: '#facc15',
        timerOver: '#ef4444',
        animations: false,
        keepAwakeAlways: true,
        statusBarStyle: 'light',
    },
    eink: {
        background: '#ffffff',
        surface: '#ffffff',
        textPrimary: '#000000',
        textSecondary: '#000000',
        accent: '#000000',
        border: '#000000',
        highlight: '#ffffff',
        timerOk: '#000000',
        timerWarn: '#000000',
        timerOver: '#000000',
        animations: false,
        keepAwakeAlways: false,
        statusBarStyle: 'dark',
    },
};

export const READING_MODE_LABELS: Record<ReadingMode, string> = {
    claro: 'Claro',
    sepia: 'Sepia',
    oscuro: 'Oscuro',
    atril: 'Atril',
    eink: 'Tinta electrónica',
};
