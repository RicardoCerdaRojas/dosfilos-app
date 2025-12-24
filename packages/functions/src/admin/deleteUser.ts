import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { stripe } from '../config/stripe';

export const deleteUser = onCall(async (request) => {
    // 1. Verify Authentication
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'User must be authenticated');
    }

    const callerUid = request.auth.uid;
    const db = admin.firestore();

    // 2. Verify Super Admin Role
    const callerRef = db.collection('users').doc(callerUid);
    const callerDoc = await callerRef.get();

    if (!callerDoc.exists || callerDoc.data()?.role !== 'super_admin') {
        throw new HttpsError('permission-denied', 'Only super admins can delete users');
    }

    const { userId } = request.data;
    if (!userId) {
        throw new HttpsError('invalid-argument', 'Target userId is required');
    }

    // Don't allow deleting yourself
    if (userId === callerUid) {
        throw new HttpsError('invalid-argument', 'Cannot delete your own admin account');
    }

    try {
        console.log(`Starting deletion process for user ${userId} by admin ${callerUid}`);

        // 3. Get User Data for Stripe ID
        const userRef = db.collection('users').doc(userId);
        const userDoc = await userRef.get();
        const userData = userDoc.data();

        // 4. Cancel Stripe Subscription & Delete Customer (if exists)
        if (userData?.stripeCustomerId) {
            try {
                // First list active subscriptions to cancel them cleanly? 
                // Or just deleting the customer cancels everything. 
                // Deleting the customer is cleaner for complete removal.
                await stripe.customers.del(userData.stripeCustomerId);
                console.log(`Deleted Stripe customer ${userData.stripeCustomerId}`);
            } catch (stripeError) {
                console.error('Error deleting Stripe customer:', stripeError);
                // Continue execution, don't block deletion if Stripe fails (e.g. customer already deleted)
            }
        }

        // 5. Recursive Delete Subcollections (Sermons, Activity, etc.)
        // Using Firestore's recursive delete
        await db.recursiveDelete(userRef);
        console.log(`Recursively deleted Firestore document and subcollections for ${userId}`);

        // 6. Delete from Firebase Auth
        await admin.auth().deleteUser(userId);
        console.log(`Deleted Firebase Auth account for ${userId}`);

        return { success: true, message: `User ${userId} completely removed.` };

    } catch (error: any) {
        console.error('Error deleting user:', error);
        throw new HttpsError('internal', error.message || 'Failed to delete user');
    }
});
