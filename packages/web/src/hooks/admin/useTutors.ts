import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FirestoreAIAgentRepository } from '@dosfilos/infrastructure';
import { AIAgent } from '@dosfilos/domain';
import { coreLibraryAdminService } from '@dosfilos/application';

const repository = new FirestoreAIAgentRepository();

export function useCoreLibraryStores() {
    return useQuery({
        queryKey: ['core-library-stores'],
        queryFn: async () => {
            const config = await coreLibraryAdminService.getStoreConfig();
            return config?.stores ?? {};
        }
    });
}

export function useTutors() {
    return useQuery({
        queryKey: ['admin-tutors'],
        queryFn: () => repository.getAllAgents()
    });
}

export function useTutor(id: string) {
    return useQuery({
        queryKey: ['admin-tutor', id],
        queryFn: () => repository.getAgent(id),
        enabled: !!id
    });
}

export function useCreateTutor() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (agent: Omit<AIAgent, 'id' | 'createdAt' | 'updatedAt'>) => repository.createAgent(agent),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-tutors'] });
        }
    });
}

export function useUpdateTutor() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, updates }: { id: string, updates: Partial<AIAgent> }) => repository.updateAgent(id, updates),
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['admin-tutors'] });
            queryClient.invalidateQueries({ queryKey: ['admin-tutor', data.id] });
        }
    });
}

export function useDeleteTutor() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => repository.deleteAgent(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-tutors'] });
        }
    });
}
