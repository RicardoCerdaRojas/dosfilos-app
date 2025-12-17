import { IPlanRepository, PlanDefinition } from '@dosfilos/domain';
import { collection, getDocs, doc, getDoc, query, where } from 'firebase/firestore';
import { db } from '../config/firebase';

export class FirebasePlanRepository implements IPlanRepository {
    private readonly collection = 'plans';

    async getAll(): Promise<PlanDefinition[]> {
        const q = query(
            collection(db, this.collection),
            where('isActive', '==', true)
        );

        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => this.mapToPlanDefinition(doc.id, doc.data()));
    }

    async getById(planId: string): Promise<PlanDefinition | null> {
        const docRef = doc(db, this.collection, planId);
        const docSnap = await getDoc(docRef);

        if (!docSnap.exists()) {
            return null;
        }

        return this.mapToPlanDefinition(docSnap.id, docSnap.data());
    }

    async getByStripePriceId(priceId: string): Promise<PlanDefinition | null> {
        const q = query(
            collection(db, this.collection),
            where('stripeProductIds', 'array-contains', priceId)
        );

        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            return null;
        }

        const doc = querySnapshot.docs[0];
        return this.mapToPlanDefinition(doc.id, doc.data());
    }

    private mapToPlanDefinition(id: string, data: any): PlanDefinition {
        return {
            id,
            name: data.name,
            description: data.description,
            tier: data.tier,
            features: data.features ?? [],
            modules: data.modules ?? [],
            limits: {
                aiRequestsPerDay: data.limits?.aiRequestsPerDay ?? 0,
                libraryStorageMB: data.limits?.libraryStorageMB ?? 0,
                maxMembers: data.limits?.maxMembers ?? 1,
                sermonsPerMonth: data.limits?.sermonsPerMonth ?? 0,
            },
            pricing: {
                currency: data.pricing?.currency ?? 'USD',
                monthly: data.pricing?.monthly ?? 0,
                yearly: data.pricing?.yearly ?? 0,
            },
            stripeProductIds: data.stripeProductIds ?? [],
            isActive: data.isActive ?? false,
            isPublic: data.isPublic ?? true,
            sortOrder: data.sortOrder ?? 0,
            createdAt: data.createdAt?.toDate() ?? new Date(),
            updatedAt: data.updatedAt?.toDate() ?? new Date(),
        };
    }
}
