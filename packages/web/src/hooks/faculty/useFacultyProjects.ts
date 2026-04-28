import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { facultyService } from '@dosfilos/application';
import { useFirebase } from '@/context/firebase-context';
import { ProjectColor, DEFAULT_LANGUAGE } from '@dosfilos/domain';
import type { SupportedLanguage } from '@dosfilos/domain';
import { useTranslation } from 'react-i18next';

function resolveActiveLanguage(raw: string | undefined): SupportedLanguage {
    if (!raw) return DEFAULT_LANGUAGE;
    return raw.split('-')[0] === 'en' ? 'en' : 'es';
}

export function useFacultyProjects() {
    const { user } = useFirebase();
    const queryClient = useQueryClient();
    const { i18n } = useTranslation();

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

    const archiveProject = useMutation({
        mutationFn: async ({ projectId, archived }: { projectId: string; archived: boolean }) => {
            return facultyService.setProjectArchived.execute(projectId, archived);
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['faculty', 'projects', user?.uid] }),
    });

    /**
     * Soft-delete: moves the project to the Papelera tab. Reversible via
     * `softDeleteProject.mutate({ projectId, deleted: false })`.
     */
    const softDeleteProject = useMutation({
        mutationFn: async ({ projectId, deleted }: { projectId: string; deleted: boolean }) => {
            return facultyService.setProjectDeleted.execute(projectId, deleted);
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['faculty', 'projects', user?.uid] }),
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
            return facultyService.generateProjectContext.execute(
                user.uid, projectId, resolveActiveLanguage(i18n.language),
            );
        },
    });

    return {
        projects: projectsQuery.data || [],
        isLoadingProjects: projectsQuery.isLoading,
        createProject,
        updateProject,
        deleteProject,
        archiveProject,
        softDeleteProject,
        assignToProject,
        generateContext,
    };
}
