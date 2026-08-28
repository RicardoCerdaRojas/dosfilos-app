import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { READING_MODES, ReadingMode, ReadingModeTokens } from '@/core/theme/readingModes';
import { DELIVERY_SIZE } from '@/core/theme/typography';

interface ReaderSettingsState {
    /** Cuerpo del lector de Biblia: lectura sentada. */
    fontSize: number;
    setFontSize: (size: number) => void;
    /**
     * Cuerpo del modo púlpito: se predica de pie, a 60-70 cm. Separado del
     * anterior porque compartirlos hacía que ajustar la Biblia cambiara el
     * sermón, y al revés.
     */
    deliveryFontSize: number;
    setDeliveryFontSize: (size: number) => void;
    /** Modo de luz del lector/púlpito (plan §6). Persistido; sync llega en F1. */
    readingMode: ReadingMode;
    setReadingMode: (mode: ReadingMode) => void;
    /**
     * Colometría: cada oración abre renglón (D6). Preferencia del predicador,
     * no un ajuste con respuesta correcta — hay quien reengancha mejor con el
     * párrafo corrido.
     */
    senseLines: boolean;
    setSenseLines: (on: boolean) => void;
    /**
     * Línea vertical al 66 % de la medida. EXCLUYENTE con `senseLines`:
     * encender una apaga la otra, porque resuelven lo mismo y se estorban.
     */
    gazeLine: boolean;
    setGazeLine: (on: boolean) => void;
    /**
     * Presupuesto de tiempo fijado a mano, en segundos, por
     * `${sermonId}|${sectionSlug}`. Lo que el pastor no toca se reparte solo.
     * Persiste porque se decide preparando, no en el atril.
     */
    budgetOverrides: Record<string, number>;
    setBudgetOverride: (key: string, seconds: number | null) => void;
}

export const useReaderSettingsStore = create<ReaderSettingsState>()(
    persist(
        (set) => ({
            fontSize: 18, // Default font size
            setFontSize: (size: number) => set({ fontSize: size }),
            deliveryFontSize: DELIVERY_SIZE.default,
            setDeliveryFontSize: (size: number) => set({ deliveryFontSize: size }),
            readingMode: 'claro',
            setReadingMode: (mode: ReadingMode) => set({ readingMode: mode }),
            senseLines: false,
            // Encender una apaga la otra: resuelven el mismo problema y se
            // estorban entre sí. No son dos niveles de una escala.
            setSenseLines: (on: boolean) =>
                set((state) => ({ senseLines: on, gazeLine: on ? false : state.gazeLine })),
            gazeLine: false,
            setGazeLine: (on: boolean) =>
                set((state) => ({ gazeLine: on, senseLines: on ? false : state.senseLines })),
            budgetOverrides: {},
            setBudgetOverride: (key: string, seconds: number | null) =>
                set((state) => {
                    const next = { ...state.budgetOverrides };
                    if (seconds === null) delete next[key];
                    else next[key] = seconds;
                    return { budgetOverrides: next };
                }),
        }),
        {
            name: 'reader-settings-storage',
            storage: createJSONStorage(() => AsyncStorage),
        }
    )
);

/** Tokens del modo activo — el consumo de F1 pasa por aquí, no por READING_MODES directo. */
export function useReadingModeTokens(): ReadingModeTokens {
    const mode = useReaderSettingsStore((s) => s.readingMode);
    return READING_MODES[mode];
}
