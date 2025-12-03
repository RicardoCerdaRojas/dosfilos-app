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
        status?: 'draft' | 'published' | 'archived';
        authorName?: string;
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
            status: 'draft' | 'published' | 'archived';
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
                status: 'draft',
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
            const updated = sermon.update({ wizardProgress: progress });
            await this.sermonRepository.update(updated);
        } catch (error: any) {
            throw new Error(error.message || 'Error al actualizar progreso del wizard');
        }
    }
}

// Singleton instance
export const sermonService = new SermonService();
