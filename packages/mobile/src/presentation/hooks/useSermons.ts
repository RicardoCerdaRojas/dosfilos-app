import { useQuery } from '@tanstack/react-query';
import { SermonRepositoryImpl } from '@/data/repositories/sermon.repository.impl';

const repository = new SermonRepositoryImpl();

export const useSermons = () => {
    return useQuery({
        queryKey: ['sermons'],
        queryFn: () => repository.getSermons(),
    });
};

export const useSermon = (id: string) => {
    return useQuery({
        queryKey: ['sermon', id],
        queryFn: () => repository.getSermonById(id),
        enabled: !!id,
    });
};
