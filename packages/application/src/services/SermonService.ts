import { FirebaseSermonRepository } from '@dosfilos/infrastructure';
import { SermonEntity, FindOptions, Sermon } from '@dosfilos/domain';

export class SermonService {
    private sermonRepository: FirebaseSermonRepository;

    constructor() {
        this.sermonRepository = new FirebaseSermonRepository();
    }

    async createSermon(data: {
        userId: string;
        title: string;
        content: string;
        bibleReferences?: string[];
        tags?: string[];
        category?: string;
        status?: 'working' | 'draft' | 'published' | 'archived';
        authorName?: string;
        seriesId?: string;
        scheduledDate?: Date;
        wizardProgress?: Sermon['wizardProgress'];
    }): Promise<SermonEntity> {
        try {
            const sermon = SermonEntity.create({
                userId: data.userId,
                title: data.title,
                content: data.content,
                bibleReferences: data.bibleReferences || [],
                tags: data.tags || [],
                category: data.category,
                status: data.status || 'draft',
                isShared: false,
                authorName: data.authorName || 'Pastor',
                seriesId: data.seriesId,
                scheduledDate: data.scheduledDate,
                wizardProgress: data.wizardProgress,
            });
            return await this.sermonRepository.create(sermon);
        } catch (error: any) {
            throw new Error(error.message || 'Error al crear el sermón');
        }
    }

    async updateSermon(
        id: string,
        data: Partial<{
            title: string;
            content: string;
            bibleReferences: string[];
            tags: string[];
            category: string;
            status: 'working' | 'draft' | 'published' | 'archived';
            seriesId: string;
            scheduledDate: Date;
            wizardProgress: any;
            preachingHistory: any[];
        }>
    ): Promise<SermonEntity> {
        try {
            const sermon = await this.sermonRepository.findById(id);
            if (!sermon) {
                throw new Error('Sermón no encontrado');
            }
            const updatedSermon = sermon.update(data);
            return await this.sermonRepository.update(updatedSermon);
        } catch (error: any) {
            throw new Error(error.message || 'Error al actualizar el sermón');
        }
    }

    async deleteSermon(id: string): Promise<void> {
        try {
            await this.sermonRepository.delete(id);
        } catch (error: any) {
            throw new Error(error.message || 'Error al eliminar el sermón');
        }
    }

    async getSermon(id: string): Promise<SermonEntity | null> {
        try {
            return await this.sermonRepository.findById(id);
        } catch (error: any) {
            throw new Error(error.message || 'Error al obtener el sermón');
        }
    }

    async getUserSermons(userId: string, options?: FindOptions): Promise<SermonEntity[]> {
        try {
            return await this.sermonRepository.findByUserId(userId, options);
        } catch (error: any) {
            throw new Error(error.message || 'Error al obtener los sermones');
        }
    }

    async publishSermon(id: string): Promise<SermonEntity> {
        try {
            const sermon = await this.sermonRepository.findById(id);
            if (!sermon) {
                throw new Error('Sermón no encontrado');
            }
            const publishedSermon = sermon.publish();
            return await this.sermonRepository.update(publishedSermon);
        } catch (error: any) {
            throw new Error(error.message || 'Error al publicar el sermón');
        }
    }

    /**
     * Creates a published COPY of the draft sermon.
     * The original draft remains untouched (status='working')but tracks the publication.
     * The copy has a new ID and status='published'.
     * @returns The newly created published sermon copy
     */
    async publishSermonAsCopy(draftId: string): Promise<SermonEntity> {
        try {
            const draft = await this.sermonRepository.findById(draftId);
            if (!draft) {
                throw new Error('Borrador no encontrado');
            }

            // Create a published copy using the entity method
            const publishedCopy = draft.publishAsCopy();

            // Save the copy as a new sermon
            const createdCopy = await this.sermonRepository.create(publishedCopy);

            // Update the draft to track this published copy
            if (draft.wizardProgress) {
                const currentCount = draft.wizardProgress.publishCount || 0;
                const updatedProgress = {
                    ...draft.wizardProgress,
                    publishedCopyId: createdCopy.id,
                    lastPublishedAt: new Date(),
                    publishCount: currentCount + 1
                };

                const updatedDraft = draft.update({ wizardProgress: updatedProgress });
                await this.sermonRepository.update(updatedDraft);
            }

            return createdCopy;
        } catch (error: any) {
            throw new Error(error.message || 'Error al publicar el sermón');
        }
    }

    async archiveSermon(id: string): Promise<SermonEntity> {
        try {
            const sermon = await this.sermonRepository.findById(id);
            if (!sermon) {
                throw new Error('Sermón no encontrado');
            }
            const archivedSermon = sermon.archive();
            return await this.sermonRepository.update(archivedSermon);
        } catch (error: any) {
            throw new Error(error.message || 'Error al archivar el sermón');
        }
    }

    async shareSermon(id: string): Promise<string> {
        try {
            const sermon = await this.sermonRepository.findById(id);
            if (!sermon) {
                throw new Error('Sermón no encontrado');
            }
            const sharedSermon = sermon.enableSharing();
            await this.sermonRepository.update(sharedSermon);
            return sharedSermon.shareToken!;
        } catch (error: any) {
            throw new Error(error.message || 'Error al compartir el sermón');
        }
    }

    async unshareSermon(id: string): Promise<void> {
        try {
            const sermon = await this.sermonRepository.findById(id);
            if (!sermon) {
                throw new Error('Sermón no encontrado');
            }
            const unsharedSermon = sermon.disableSharing();
            await this.sermonRepository.update(unsharedSermon);
        } catch (error: any) {
            throw new Error(error.message || 'Error al dejar de compartir el sermón');
        }
    }

    async getSharedSermon(token: string): Promise<SermonEntity | null> {
        try {
            return await this.sermonRepository.findByShareToken(token);
        } catch (error: any) {
            throw new Error(error.message || 'Error al obtener el sermón compartido');
        }
    }

    // Wizard-specific methods
    async createDraft(data: {
        userId: string;
        passage: string;
        wizardProgress?: Sermon['wizardProgress'];
    }): Promise<string> {
        try {
            const sermon = SermonEntity.create({
                userId: data.userId,
                title: `Sermón sobre ${data.passage}`,
                content: '', // Empty until final draft
                bibleReferences: [data.passage],
                tags: [],
                status: 'draft', // 🎯 Using 'draft' for wizard in-progress sermons
                isShared: false,
                authorName: 'Pastor',
                wizardProgress: data.wizardProgress || {
                    currentStep: 1,
                    passage: data.passage,
                    lastSaved: new Date()
                }
            });
            const created = await this.sermonRepository.create(sermon);
            return created.id;
        } catch (error: any) {
            throw new Error(error.message || 'Error al crear borrador de sermón');
        }
    }

    async getInProgressSermons(userId: string): Promise<SermonEntity[]> {
        try {
            // 🎯 FIX: Changed from 'working' to 'draft' to match actual Firestore values
            const sermons = await this.sermonRepository.findByUserId(userId, {
                status: 'draft',
                limit: 20,
                orderBy: 'updatedAt',
                order: 'desc'
            });

            // Filter sermons that have wizardProgress
            return sermons.filter(s => s.wizardProgress !== undefined);
        } catch (error: any) {
            throw new Error(error.message || 'Error al obtener sermones en progreso');
        }
    }

    async updateWizardProgress(
        sermonId: string,
        progress: Sermon['wizardProgress']
    ): Promise<void> {
        try {
            const sermon = await this.sermonRepository.findById(sermonId);
            if (!sermon) {
                throw new Error('Sermón no encontrado');
            }

            // 🎯 Clean undefined values from progress (Firestore doesn't accept undefined)
            const cleanedProgress = this.removeUndefinedFields(progress);

            const updated = sermon.update({ wizardProgress: cleanedProgress });
            await this.sermonRepository.update(updated);
        } catch (error: any) {
            throw new Error(error.message || 'Error al actualizar progreso del wizard');
        }
    }

    /**
     * Recursively removes undefined fields from an object and handles Date conversion
     * Firestore doesn't accept undefined values and needs proper Date objects
     */
    private removeUndefinedFields(obj: any): any {
        if (obj === null || obj === undefined) {
            return obj;
        }

        // Handle Date objects - convert to JavaScript Date
        if (obj instanceof Date) {
            return obj;
        }

        // Handle Date-like objects (with seconds/nanoseconds from Firestore)
        if (obj && typeof obj === 'object' && 'seconds' in obj && 'nanoseconds' in obj) {
            return new Date(obj.seconds * 1000);
        }

        // Handle string dates
        if (typeof obj === 'string') {
            const dateTest = new Date(obj);
            if (!isNaN(dateTest.getTime()) && obj.includes('T')) {
                return dateTest;
            }
            return obj;
        }

        if (Array.isArray(obj)) {
            return obj.map(item => this.removeUndefinedFields(item));
        }

        if (typeof obj === 'object') {
            const cleaned: any = {};
            for (const key in obj) {
                const value = obj[key];
                if (value !== undefined) {
                    // Special handling for lastSaved field
                    if (key === 'lastSaved' && value) {
                        if (value instanceof Date) {
                            cleaned[key] = value;
                        } else if (typeof value === 'object' && 'seconds' in value) {
                            cleaned[key] = new Date(value.seconds * 1000);
                        } else {
                            cleaned[key] = new Date(value);
                        }
                    } else {
                        cleaned[key] = this.removeUndefinedFields(value);
                    }
                }
            }
            return cleaned;
        }

        return obj;
    }

    async getPublishedVersions(draftId: string, userId: string): Promise<SermonEntity[]> {
        return await this.sermonRepository.findByDraftId(draftId, userId);
    }
}

// Singleton instance
export const sermonService = new SermonService();
