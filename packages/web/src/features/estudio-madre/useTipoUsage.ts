import { useEffect, useSyncExternalStore } from 'react';
import type { ElementoTipo } from '@dosfilos/domain';
import { ensureLoaded, getCounts, getTopTipos, recordTipoUsage, subscribe } from './tipoUsageStore';

/**
 * Acceso reactivo a la frecuencia de uso de tipos (cross-device) para la sección
 * "Más usados" del picker. Carga los contadores del usuario una vez y los
 * mantiene en sync entre todas las instancias del picker.
 */
export function useTipoUsage(userId: string | undefined): {
    topTipos: ElementoTipo[];
    record: (tipo: ElementoTipo) => void;
} {
    // Suscribe para re-render al cambiar los contadores (carga / promoción).
    useSyncExternalStore(subscribe, getCounts, getCounts);

    useEffect(() => {
        if (userId) ensureLoaded(userId);
    }, [userId]);

    return {
        topTipos: userId ? getTopTipos(3) : [],
        record: (tipo) => {
            if (userId) recordTipoUsage(userId, tipo);
        },
    };
}
