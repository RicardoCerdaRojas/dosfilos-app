import { useQuery } from '@tanstack/react-query';
import { facultyService } from '@dosfilos/application';

export function useFacultyAgents() {
    return useQuery({
        queryKey: ['faculty', 'agents'],
        queryFn: async () => {
            return await facultyService.getAgents.execute();
        },
        staleTime: 1000 * 60 * 60 // 1 hour, agents don't change often
    });
}
