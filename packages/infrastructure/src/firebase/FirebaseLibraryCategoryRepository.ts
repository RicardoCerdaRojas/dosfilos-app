import {
    doc,
    getDoc,
    setDoc,
    Timestamp
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { LibraryCategory, DEFAULT_CATEGORIES } from '@dosfilos/domain';

export interface UserLibrarySettings {
    categories: LibraryCategory[];
    updatedAt: Date;
}

export class FirebaseLibraryCategoryRepository {
    private getSettingsRef(userId: string) {
        return doc(db, 'users', userId, 'settings', 'library');
    }

    async getCategories(userId: string): Promise<LibraryCategory[]> {
        const ref = this.getSettingsRef(userId);
        const snap = await getDoc(ref);

        if (!snap.exists()) {
            // Return default categories if no custom settings
            return DEFAULT_CATEGORIES;
        }

        const data = snap.data();
        const customCategories = (data.categories || []) as LibraryCategory[];

        // Merge default categories with custom ones
        // Default categories are always included, custom ones are added
        const allCategories = [...DEFAULT_CATEGORIES];
        for (const custom of customCategories) {
            if (!custom.isDefault) {
                allCategories.push(custom);
            }
        }

        return allCategories;
    }

    async getCustomCategories(userId: string): Promise<LibraryCategory[]> {
        const ref = this.getSettingsRef(userId);
        const snap = await getDoc(ref);

        if (!snap.exists()) {
            return [];
        }

        const data = snap.data();
        return ((data.categories || []) as LibraryCategory[]).filter(c => !c.isDefault);
    }

    async saveCustomCategories(userId: string, categories: LibraryCategory[]): Promise<void> {
        const ref = this.getSettingsRef(userId);
        await setDoc(ref, {
            categories: categories.filter(c => !c.isDefault),
            updatedAt: Timestamp.now()
        }, { merge: true });
    }

    async addCategory(userId: string, category: Omit<LibraryCategory, 'id' | 'isDefault'>): Promise<LibraryCategory> {
        const existing = await this.getCustomCategories(userId);
        const newCategory: LibraryCategory = {
            ...category,
            id: `custom_${Date.now()}`,
            isDefault: false
        };
        existing.push(newCategory);
        await this.saveCustomCategories(userId, existing);
        return newCategory;
    }

    async updateCategory(userId: string, categoryId: string, updates: Partial<LibraryCategory>): Promise<void> {
        const existing = await this.getCustomCategories(userId);
        const index = existing.findIndex(c => c.id === categoryId);
        if (index !== -1) {
            existing[index] = { ...existing[index], ...updates };
            await this.saveCustomCategories(userId, existing);
        }
    }

    async deleteCategory(userId: string, categoryId: string): Promise<void> {
        const existing = await this.getCustomCategories(userId);
        const filtered = existing.filter(c => c.id !== categoryId);
        await this.saveCustomCategories(userId, filtered);
    }
}
