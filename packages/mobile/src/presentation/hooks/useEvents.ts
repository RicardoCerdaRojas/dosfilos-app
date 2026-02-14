import { useQuery } from '@tanstack/react-query';
import { EventRepositoryImpl } from '@/data/repositories/event.repository.impl';
import { useAuthStore } from '@/presentation/state/auth.store';

const repository = new EventRepositoryImpl();

export const useUpcomingEvents = (limit = 10) => {
    const user = useAuthStore((state) => state.user);
    const churchId = user?.churchId || '';

    return useQuery({
        queryKey: ['events', 'upcoming', churchId, limit],
        queryFn: () => repository.getUpcomingEvents(churchId, limit),
        enabled: !!churchId,
    });
};

export const useEvent = (id: string) => {
    return useQuery({
        queryKey: ['event', id],
        queryFn: () => repository.getEventById(id),
        enabled: !!id,
    });
};
