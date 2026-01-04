import * as admin from 'firebase-admin';
import { SubscriptionStatus } from '../../../domain/src/entities/Subscription';

/**
 * Migration script to upgrade rdocerda@gmail.com from Free to Team plan
 * 
 * This script will:
 * 1. Find the user by email
 * 2. Update their subscription to Team plan
 * 3. Set subscription status to ACTIVE
 * 4. Update timestamps
 * 
 * Usage:
 * Run this as a one-time Cloud Function or locally with Firebase Admin SDK
 */

const TARGET_EMAIL = 'rdocerda@gmail.com';
const TARGET_PLAN_ID = 'team';

interface UpgradeResult {
    success: boolean;
    message: string;
    userId?: string;
    previousPlan?: string;
    newPlan?: string;
}

export async function upgradeUserToTeamPlan(): Promise<UpgradeResult> {
    try {
        const db = admin.firestore();

        // Step 1: Find the user by email
        console.log(`🔍 Searching for user with email: ${TARGET_EMAIL}`);
        const usersSnapshot = await db.collection('users')
            .where('email', '==', TARGET_EMAIL)
            .limit(1)
            .get();

        if (usersSnapshot.empty) {
            return {
                success: false,
                message: `User with email ${TARGET_EMAIL} not found`
            };
        }

        const userDoc = usersSnapshot.docs[0];
        const userId = userDoc.id;
        const userData = userDoc.data();
        const previousPlan = userData.subscription?.planId || 'none';

        console.log(`✅ User found: ${userId}`);
        console.log(`📋 Current plan: ${previousPlan}`);

        // Step 2: Update the subscription to Team plan
        const now = new Date();
        const oneYearFromNow = new Date();
        oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);

        const updatedSubscription = {
            id: userData.subscription?.id || `sub_admin_${userId}`,
            planId: TARGET_PLAN_ID,
            status: SubscriptionStatus.ACTIVE,
            stripePriceId: 'manual_upgrade_team', // No Stripe price since this is manual
            startDate: userData.subscription?.startDate || admin.firestore.Timestamp.fromDate(now),
            currentPeriodStart: admin.firestore.Timestamp.fromDate(now),
            currentPeriodEnd: admin.firestore.Timestamp.fromDate(oneYearFromNow),
            cancelAtPeriodEnd: false,
            updatedAt: admin.firestore.Timestamp.fromDate(now)
        };

        // Step 3: Update the user document
        await db.collection('users').doc(userId).update({
            subscription: updatedSubscription,
            updatedAt: admin.firestore.Timestamp.fromDate(now)
        });

        console.log(`🎉 Successfully upgraded user to Team plan`);
        console.log(`📅 Subscription valid until: ${oneYearFromNow.toISOString()}`);

        return {
            success: true,
            message: `Successfully upgraded ${TARGET_EMAIL} from ${previousPlan} to ${TARGET_PLAN_ID}`,
            userId,
            previousPlan,
            newPlan: TARGET_PLAN_ID
        };

    } catch (error) {
        console.error('❌ Error upgrading user:', error);
        return {
            success: false,
            message: `Error: ${error instanceof Error ? error.message : String(error)}`
        };
    }
}
