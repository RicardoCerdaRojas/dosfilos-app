import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BibleVersionFactory } from '@/data/repositories/bible/BibleVersionFactory';
import { useBibleStore } from '../state/bible.store';
import { getBookMetadata } from '@/domain/bible/utils/BibleMetadata';

export const useBible = () => {
    const {
        versionId,
        secondaryVersionId,
        isParallelMode,
        bookId,
        bookName,
        chapter,
        setVersion,
        setSecondaryVersion,
        toggleParallelMode,
        setBook,
        setChapter,
        nextChapter,
        prevChapter
    } = useBibleStore();

    const repository = BibleVersionFactory.getByVersion(versionId);

    const { data: books = [], isLoading: isLoadingBooks } = useQuery({
        queryKey: ['bible', versionId, 'books'],
        queryFn: async () => {
            const rawBooks = await repository.getBooks();
            return rawBooks.sort((a: any, b: any) => {
                const metaA = getBookMetadata(a.id, versionId);
                const metaB = getBookMetadata(b.id, versionId);
                return (metaA?.num || 999) - (metaB?.num || 999);
            });
        },
    });

    const categorizedBooks = useMemo(() => {
        return books.reduce((acc: any, book: any) => {
            const metadata = getBookMetadata(book.id, versionId);
            if (metadata) {
                const testament = metadata.testament;
                const category = metadata.category;

                if (!acc[testament]) acc[testament] = {};
                if (!acc[testament][category]) acc[testament][category] = [];

                acc[testament][category].push({ ...book, metadata });
            }
            return acc;
        }, {});
    }, [books, versionId]);

    const { data: chapterContent = [], isLoading: isLoadingChapter } = useQuery({
        queryKey: ['bible', versionId, bookId, chapter],
        queryFn: () => repository.getChapterContent(bookId, chapter),
        enabled: !!bookId && !!chapter,
    });

    const { data: secondaryChapterContent = [], isLoading: isLoadingSecondaryChapter } = useQuery({
        queryKey: ['bible', secondaryVersionId, bookId, chapter],
        queryFn: () => {
            if (!secondaryVersionId) return [];
            const secondaryRepo = BibleVersionFactory.getByVersion(secondaryVersionId);
            return secondaryRepo.getChapterContent(bookId, chapter);
        },
        enabled: isParallelMode && !!secondaryVersionId && !!bookId && !!chapter,
    });

    const availableVersions = BibleVersionFactory.getAllVersions();

    const search = async (query: string) => {
        return repository.search(query);
    };

    return {
        // State
        versionId,
        secondaryVersionId,
        isParallelMode,
        bookId,
        bookName,
        chapter,

        // Data
        books,
        categorizedBooks,
        chapterContent,
        secondaryChapterContent: secondaryChapterContent || [],
        availableVersions,

        // Loading states
        isLoadingBooks,
        isLoadingChapter,
        isLoadingSecondaryChapter,

        // Actions
        setVersion,
        setSecondaryVersion,
        toggleParallelMode,
        setBook,
        setChapter,
        nextChapter,
        prevChapter,
        search,
    };
};
