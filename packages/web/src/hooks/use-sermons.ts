import { useState, useEffect } from 'react';
import { SermonEntity, FindOptions } from '@dosfilos/domain';
import { sermonService } from '@dosfilos/application';
import { useFirebase } from '@/context/firebase-context';
import { toast } from 'sonner';

export function useSermons(options?: FindOptions) {
    const { user } = useFirebase();
    const [sermons, setSermons] = useState<SermonEntity[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchSermons = async () => {
        if (!user) return;

        setLoading(true);
        setError(null);
        try {
            const data = await sermonService.getUserSermons(user.uid, options);
            setSermons(data);
        } catch (err: any) {
            setError(err.message);
            toast.error(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSermons();
    }, [user, JSON.stringify(options)]);

    return { sermons, loading, error, refetch: fetchSermons };
}

export function useSermon(id: string | undefined) {
    const [sermon, setSermon] = useState<SermonEntity | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!id) {
            setLoading(false);
            return;
        }

        const fetchSermon = async () => {
            setLoading(true);
            setError(null);
            try {
                const data = await sermonService.getSermon(id);
                setSermon(data);
            } catch (err: any) {
                setError(err.message);
                toast.error(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchSermon();
    }, [id]);

    return { sermon, loading, error };
}

export function useCreateSermon() {
    const { user } = useFirebase();
    const [loading, setLoading] = useState(false);

    const createSermon = async (data: {
        title: string;
        content: string;
        bibleReferences?: string[];
        tags?: string[];
        category?: string;
        status?: 'draft' | 'published' | 'archived';
    }) => {
        if (!user) throw new Error('Usuario no autenticado');

        setLoading(true);
        try {
            const sermon = await sermonService.createSermon({
                ...data,
                userId: user.uid,
                authorName: user.displayName || 'Pastor',
            });
            toast.success('Sermón creado exitosamente');
            return sermon;
        } catch (err: any) {
            toast.error(err.message);
            throw err;
        } finally {
            setLoading(false);
        }
    };

    return { createSermon, loading };
}

export function useUpdateSermon() {
    const [loading, setLoading] = useState(false);

    const updateSermon = async (
        id: string,
        data: Partial<{
            title: string;
            content: string;
            bibleReferences: string[];
            tags: string[];
            category: string;
            status: 'draft' | 'published' | 'archived';
        }>
    ) => {
        setLoading(true);
        try {
            const sermon = await sermonService.updateSermon(id, data);
            toast.success('Sermón actualizado exitosamente');
            return sermon;
        } catch (err: any) {
            toast.error(err.message);
            throw err;
        } finally {
            setLoading(false);
        }
    };

    return { updateSermon, loading };
}

export function useDeleteSermon() {
    const [loading, setLoading] = useState(false);

    const deleteSermon = async (id: string) => {
        setLoading(true);
        try {
            await sermonService.deleteSermon(id);
            toast.success('Sermón eliminado exitosamente');
        } catch (err: any) {
            toast.error(err.message);
            throw err;
        } finally {
            setLoading(false);
        }
    };

    return { deleteSermon, loading };
}

export function usePublishSermon() {
    const [loading, setLoading] = useState(false);

    const publishSermon = async (id: string) => {
        setLoading(true);
        try {
            const sermon = await sermonService.publishSermon(id);
            toast.success('Sermón publicado exitosamente');
            return sermon;
        } catch (err: any) {
            toast.error(err.message);
            throw err;
        } finally {
            setLoading(false);
        }
    };

    return { publishSermon, loading };
}

export function useArchiveSermon() {
    const [loading, setLoading] = useState(false);

    const archiveSermon = async (id: string) => {
        setLoading(true);
        try {
            const sermon = await sermonService.archiveSermon(id);
            toast.success('Sermón archivado exitosamente');
            return sermon;
        } catch (err: any) {
            toast.error(err.message);
            throw err;
        } finally {
            setLoading(false);
        }
    };

    return { archiveSermon, loading };
}
