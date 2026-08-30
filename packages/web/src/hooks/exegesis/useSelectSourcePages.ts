import { useMutation, useQueryClient } from '@tanstack/react-query';
import { exegesisService } from '@dosfilos/application';
import type { SelectSourcePagesInput } from '@dosfilos/application';
import { useFirebase } from '@/context/firebase-context';

/**
 * Guarda la selección de hojas de una fuente.
 *
 * Invalida la misma clave que el resto de las mutaciones de fuentes: viven
 * inline en el documento del paper, así que cualquier cambio refresca el
 * subárbol entero de caché.
 */
export function useSelectSourcePages() {
    const { user } = useFirebase();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (input: Omit<SelectSourcePagesInput, 'ownerId'>) => {
            if (!user) throw new Error('No authenticated user');
            return exegesisService.selectSourcePages.execute({ ...input, ownerId: user.uid });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['exegesis', 'papers', user?.uid] });
        },
    });
}
