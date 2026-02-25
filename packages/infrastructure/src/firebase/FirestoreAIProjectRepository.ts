import {
    collection,
    doc,
    getDoc,
    getDocs,
    setDoc,
    updateDoc,
    deleteDoc,
    query,
    where,
    orderBy
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { AIProject, IAIProjectRepository } from '@dosfilos/domain';

export class FirestoreAIProjectRepository implements IAIProjectRepository {
    private collectionRef() {
        return collection(db, 'ai_projects');
    }

    private docRef(projectId: string) {
        return doc(db, 'ai_projects', projectId);
    }

    async getUserProjects(userId: string): Promise<AIProject[]> {
        const q = query(
            this.collectionRef(),
            where('userId', '==', userId)
            // orderBy intentionally omitted — requires a composite index.
            // Sorting is done client-side below.
        );
        const snap = await getDocs(q);
        return snap.docs
            .map(d => {
                const data = d.data();
                return {
                    id: d.id,
                    ...data,
                    createdAt: data.createdAt?.toDate() || new Date(),
                    updatedAt: data.updatedAt?.toDate() || new Date(),
                } as AIProject;
            })
            .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
    }

    async getProject(projectId: string): Promise<AIProject | null> {
        const snap = await getDoc(this.docRef(projectId));
        if (!snap.exists()) return null;
        const data = snap.data();
        return {
            id: snap.id,
            ...data,
            createdAt: data.createdAt?.toDate() || new Date(),
            updatedAt: data.updatedAt?.toDate() || new Date(),
        } as AIProject;
    }

    async createProject(project: Omit<AIProject, 'id' | 'createdAt' | 'updatedAt'>): Promise<AIProject> {
        const ref = doc(this.collectionRef());
        const now = new Date();
        const newProject: AIProject = {
            ...project,
            id: ref.id,
            createdAt: now,
            updatedAt: now,
        };
        // Firestore does not accept undefined values — strip them before saving
        const docData = Object.fromEntries(
            Object.entries(newProject).filter(([, v]) => v !== undefined)
        );
        await setDoc(ref, docData);
        return newProject;
    }

    async updateProject(
        projectId: string,
        updates: Partial<Pick<AIProject, 'title' | 'color' | 'icon' | 'contextNote'>>
    ): Promise<AIProject> {
        const ref = this.docRef(projectId);
        await updateDoc(ref, { ...updates, updatedAt: new Date() });
        const updated = await this.getProject(projectId);
        if (!updated) throw new Error(`Project ${projectId} not found after update`);
        return updated;
    }

    async deleteProject(projectId: string): Promise<void> {
        await deleteDoc(this.docRef(projectId));
    }
}
