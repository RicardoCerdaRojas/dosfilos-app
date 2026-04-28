import { useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { useFirebase } from '@/context/firebase-context';
import { useTranslation } from 'react-i18next';
import { db } from '../../../../infrastructure/src/config/firebase';
import type { SupportedLanguage } from '../types';
import { SUPPORTED_LANGUAGES } from '../types';

/**
 * Subscribes to the authenticated user's `preferredLanguage` field and keeps
 * `i18next` aligned with it. Mounting this hook once at app shell level (next
 * to FirebaseProvider) means every other consumer of `useTranslation()` sees
 * the canonical locale without each having to fetch it.
 *
 * Why a snapshot instead of a one-shot read: superadmin tooling may flip a
 * user's language remotely (e.g., during a support session). The listener
 * makes that change observable in the active tab.
 */
export function useLanguageSync(): void {
    const { user } = useFirebase();
    const { i18n } = useTranslation();

    useEffect(() => {
        if (!user?.uid) return;
        const ref = doc(db, 'users', user.uid);
        const unsubscribe = onSnapshot(ref, (snap) => {
            const data = snap.data();
            const lang = data?.preferredLanguage as SupportedLanguage | undefined;
            if (lang && SUPPORTED_LANGUAGES[lang] && i18n.language !== lang) {
                i18n.changeLanguage(lang);
            }
        }, (err) => {
            console.warn('[useLanguageSync] Firestore listener error:', err);
        });
        return () => unsubscribe();
    }, [user?.uid, i18n]);
}
