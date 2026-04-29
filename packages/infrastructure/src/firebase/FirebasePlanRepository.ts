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
        // Iterate the (small) plans collection in memory rather than juggling
        // two Firestore queries against the new `stripePriceIds.{monthly,yearly}`
        // shape. With at most a handful of paid plans the cost is negligible
        // and the code stays simple. We also fall back to the legacy
        // `stripeProductIds` array so docs that haven't been migrated yet keep
        // resolving.
        const allPlans = await this.getAll();
        const match = allPlans.find(p => {
            if (p.stripePriceIds?.monthly === priceId) return true;
            if (p.stripePriceIds?.yearly === priceId) return true;
            // Legacy shape — coerced into stripePriceIds.monthly by mapToPlanDefinition,
            // but a doc may still carry the raw array if it was written by older code.
            const legacy = (p as any).stripeProductIds as string[] | undefined;
            return Array.isArray(legacy) && legacy.includes(priceId);
        });
        return match ?? null;
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

                // Tutor limits
                greekSessionsPerMonth: data.limits?.greekSessionsPerMonth ?? 0,
                // Pass through `undefined` when the doc doesn't define the field —
                // the dashboard treats undefined as "no quota" vs 0 as "not included".
                hebrewSessionsPerMonth: data.limits?.hebrewSessionsPerMonth,

                // Library limits
                libraryStorageMB: data.limits?.libraryStorageMB ?? 0,
                libraryDocsLimit: data.limits?.libraryDocsLimit,
                pagesProcessedPerMonth: data.limits?.pagesProcessedPerMonth,
                queriesPerMonth: data.limits?.queriesPerMonth,

                // Legacy/deprecated fields
                aiRequestsPerDay: data.limits?.aiRequestsPerDay ?? 0,
                maxMembers: data.limits?.maxMembers ?? 1,
            },
            pricing: {
                currency: data.pricing?.currency ?? 'USD',
                monthly: data.pricing?.monthly ?? 0,
                yearly: data.pricing?.yearly ?? 0,
            },
            stripePriceIds: this.coerceStripePriceIds(data),
            isActive: data.isActive ?? false,
            isPublic: data.isPublic ?? true,
            isLegacy: data.isLegacy ?? false,
            highlightText: data.highlightText ?? null,
            sortOrder: data.sortOrder ?? 0,
            createdAt: data.createdAt?.toDate() ?? new Date(),
            updatedAt: data.updatedAt?.toDate() ?? new Date(),
        };
    }

    /**
     * Reads either the new `stripePriceIds: { monthly, yearly? }` shape or the
     * legacy `stripeProductIds: string[]` and returns the canonical labelled
     * shape. Legacy docs collapse to `{ monthly: <first id> }` because the old
     * code path also returned `[0]` — same default behavior.
     */
    private coerceStripePriceIds(data: any): { monthly: string; yearly?: string } {
        if (data.stripePriceIds && typeof data.stripePriceIds === 'object' && data.stripePriceIds.monthly) {
            return {
                monthly: data.stripePriceIds.monthly,
                ...(data.stripePriceIds.yearly && { yearly: data.stripePriceIds.yearly }),
            };
        }
        const legacy = Array.isArray(data.stripeProductIds) ? data.stripeProductIds : [];
        return {
            monthly: legacy[0] ?? '',
            ...(legacy[1] && { yearly: legacy[1] }),
        };
    }
}
