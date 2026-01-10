import { IPlanRepository, PlanDefinition } from '@dosfilos/domain';
import type { PlanTranslation } from '@dosfilos/domain';
import { collection, getDocs, doc, getDoc, query, where } from 'firebase/firestore';
import { db } from '../config/firebase';

export class FirebasePlanRepository implements IPlanRepository {
    private readonly plansCollection = 'plans';
    private readonly translationsCollection = 'plan_translations';

    async getAll(): Promise<PlanDefinition[]> {
        const q = query(
            collection(db, this.plansCollection),
            where('isActive', '==', true)
        );

        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => this.mapToPlanDefinition(doc.id, doc.data()));
    }

    async getPublicPlans(): Promise<PlanDefinition[]> {
        const q = query(
            collection(db, this.plansCollection),
            where('isActive', '==', true),
            where('isPublic', '==', true)
        );

        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => this.mapToPlanDefinition(doc.id, doc.data()));
    }

    async getById(planId: string): Promise<PlanDefinition | null> {
        const docRef = doc(db, this.plansCollection, planId);
        const docSnap = await getDoc(docRef);

        if (!docSnap.exists()) {
            return null;
        }

        return this.mapToPlanDefinition(docSnap.id, docSnap.data());
    }

    async getByStripePriceId(priceId: string): Promise<PlanDefinition | null> {
        const q = query(
            collection(db, this.plansCollection),
            where('stripeProductIds', 'array-contains', priceId)
        );

        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            return null;
        }

        const doc = querySnapshot.docs[0];
        return this.mapToPlanDefinition(doc.id, doc.data());
    }

    async getTranslations(planId: string, locale: string): Promise<PlanTranslation | null> {
        const docRef = doc(db, this.translationsCollection, planId);
        const docSnap = await getDoc(docRef);

        if (!docSnap.exists()) {
            return null;
        }

        return {
            planId: docSnap.id,
            ...docSnap.data()
        } as PlanTranslation;
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
                // Sermon limits
                sermonsPerMonth: data.limits?.sermonsPerMonth ?? 0,

                // Preaching plan limits
                maxPreachingPlans: data.limits?.maxPreachingPlans, // Total limit (Free plan)
                maxPreachingPlansPerMonth: data.limits?.maxPreachingPlansPerMonth, // Monthly limit (Pro/Team)

                // Greek Tutor limits
                greekSessionsPerMonth: data.limits?.greekSessionsPerMonth ?? 0,

                // Library limits
                libraryStorageMB: data.limits?.libraryStorageMB ?? 0,

                // Legacy/deprecated fields
                aiRequestsPerDay: data.limits?.aiRequestsPerDay ?? 0,
                maxMembers: data.limits?.maxMembers ?? 1,
            },
            pricing: {
                currency: data.pricing?.currency ?? 'USD',
                monthly: data.pricing?.monthly ?? 0,
                yearly: data.pricing?.yearly ?? 0,
            },
            stripeProductIds: data.stripeProductIds ?? [],
            isActive: data.isActive ?? false,
            isPublic: data.isPublic ?? true,
            isLegacy: data.isLegacy ?? false,
            highlightText: data.highlightText ?? null,
            sortOrder: data.sortOrder ?? 0,
            createdAt: data.createdAt?.toDate() ?? new Date(),
            updatedAt: data.updatedAt?.toDate() ?? new Date(),
        };
    }
}
