import { LibraryCategory, DEFAULT_CATEGORIES } from '@dosfilos/domain';
import { FirebaseLibraryCategoryRepository } from '@dosfilos/infrastructure';

/**
 * CategoryService
 * Manages library resource categories for a user
 */
export class CategoryService {
    private repository: FirebaseLibraryCategoryRepository;

    constructor() {
        this.repository = new FirebaseLibraryCategoryRepository();
    }

    /**
     * Get all categories (defaults + custom) for a user
     */
    async getCategories(userId: string): Promise<LibraryCategory[]> {
        return this.repository.getCategories(userId);
    }

    /**
     * Get only custom categories for a user
     */
    async getCustomCategories(userId: string): Promise<LibraryCategory[]> {
        return this.repository.getCustomCategories(userId);
    }

    /**
     * Get default categories (static)
     */
    getDefaultCategories(): LibraryCategory[] {
        return DEFAULT_CATEGORIES;
    }

    /**
     * Add a new custom category
     */
    async addCategory(
        userId: string,
        category: { label: string; icon?: string; color?: string }
    ): Promise<LibraryCategory> {
        return this.repository.addCategory(userId, category);
    }

    /**
     * Update a custom category
     */
    async updateCategory(
        userId: string,
        categoryId: string,
        updates: { label?: string; icon?: string; color?: string }
    ): Promise<void> {
        // Don't allow updating default categories
        if (!categoryId.startsWith('custom_')) {
            throw new Error('No se pueden modificar las categorías predeterminadas');
        }
        return this.repository.updateCategory(userId, categoryId, updates);
    }

    /**
     * Delete a custom category
     */
    async deleteCategory(userId: string, categoryId: string): Promise<void> {
        // Don't allow deleting default categories
        if (!categoryId.startsWith('custom_')) {
            throw new Error('No se pueden eliminar las categorías predeterminadas');
        }
        return this.repository.deleteCategory(userId, categoryId);
    }
}

export const categoryService = new CategoryService();
