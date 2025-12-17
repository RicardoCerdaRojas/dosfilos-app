import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { stripe } from '../config/stripe';
import { getFirestore } from 'firebase-admin/firestore';

interface Invoice {
    id: string;
    date: number;
    amount: number;
    currency: string;
    status: string;
    pdfUrl: string | null;
}

export const getInvoices = onCall(async (request) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'User must be authenticated');
    }

    const userId = request.auth.uid;

    try {
        const db = getFirestore();
        const userDoc = await db.collection('users').doc(userId).get();

        if (!userDoc.exists) {
            throw new HttpsError('not-found', 'User profile not found');
        }

        const userData = userDoc.data()!;
        const customerId = userData.stripeCustomerId;

        if (!customerId) {
            return { invoices: [] };
        }

        // Fetch invoices from last 12 months
        const twelveMonthsAgo = Math.floor(Date.now() / 1000) - (365 * 24 * 60 * 60);

        const invoices = await stripe.invoices.list({
            customer: customerId,
            limit: 100,
            created: {
                gte: twelveMonthsAgo,
            },
        });

        const formattedInvoices: Invoice[] = invoices.data.map(invoice => ({
            id: invoice.id,
            date: invoice.created,
            amount: invoice.amount_paid / 100, // Convert from cents
            currency: invoice.currency.toUpperCase(),
            status: invoice.status || 'unknown',
            pdfUrl: invoice.invoice_pdf,
        }));

        return { invoices: formattedInvoices };
    } catch (error: any) {
        console.error('Error fetching invoices:', error);
        throw new HttpsError('internal', error.message || 'Failed to fetch invoices');
    }
});
