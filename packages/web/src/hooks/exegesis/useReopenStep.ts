import { useMutation, useQueryClient } from '@tanstack/react-query';
import { exegesisService } from '@dosfilos/application';
import { useFirebase } from '@/context/firebase-context';

/**
 * Devuelve un paso aceptado a revisión, para poder rehacerlo.
 *
 * No borra el análisis aceptado: queda como una versión más del historial. Por
 * eso la mutación es segura de repetir y no necesita confirmación destructiva.
 */
export function useReopenStep() {
    const { user } = useFirebase();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (input: { paperId: string; stepId: string }) => {
            if (!user) throw new Error('No authenticated user');
            return exegesisService.reopenStep.execute({ ...input, ownerId: user.uid });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['exegesis', 'papers', user?.uid] });
        },
    });
}
