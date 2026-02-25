import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { facultyService } from '@dosfilos/application';
import { useFirebase } from '@/context/firebase-context';
import { ProjectColor } from '@dosfilos/domain';

export function useFacultyProjects() {
    const { user } = useFirebase();
    const queryClient = useQueryClient();

    const projectsQuery = useQuery({
        queryKey: ['faculty', 'projects', user?.uid],
        queryFn: async () => {
            if (!user?.uid) throw new Error('User not authenticated');
            return facultyService.getProjects.execute(user.uid);
        },
        enabled: !!user?.uid,
    });

    const createProject = useMutation({
        mutationFn: async ({ title, color, contextNote }: { title: string; color: ProjectColor; contextNote?: string }) => {
            if (!user?.uid) throw new Error('User not authenticated');
            return facultyService.createProject.execute({ userId: user.uid, title, color, contextNote });
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['faculty', 'projects', user?.uid] }),
    });

    const updateProject = useMutation({
        mutationFn: async ({ projectId, ...updates }: { projectId: string; title?: string; color?: ProjectColor; contextNote?: string }) => {
            return facultyService.updateProject.execute(projectId, updates);
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['faculty', 'projects', user?.uid] }),
    });

    const deleteProject = useMutation({
        mutationFn: async (projectId: string) => {
            if (!user?.uid) throw new Error('User not authenticated');
            return facultyService.deleteProject.execute(user.uid, projectId);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['faculty', 'projects', user?.uid] });
            queryClient.invalidateQueries({ queryKey: ['faculty', 'sessions', user?.uid] });
        },
    });

    const assignToProject = useMutation({
        mutationFn: async ({ sessionId, projectId }: { sessionId: string; projectId: string | null }) => {
            if (!user?.uid) throw new Error('User not authenticated');
            return facultyService.updateSessionProject.execute(user.uid, sessionId, projectId);
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['faculty', 'sessions', user?.uid] }),
    });

    const generateContext = useMutation({
        mutationFn: async (projectId: string) => {
            if (!user?.uid) throw new Error('User not authenticated');
            return facultyService.generateProjectContext.execute(user.uid, projectId);
        },
    });

    return {
        projects: projectsQuery.data || [],
        isLoadingProjects: projectsQuery.isLoading,
        createProject,
        updateProject,
        deleteProject,
        assignToProject,
        generateContext,
    };
}
