import { initializeApp, getApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, Auth, initializeAuth, browserLocalPersistence } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getFirestore, Firestore } from 'firebase/firestore';
import { firebaseConfig } from '@/core/config/firebase.config';
import { Platform } from 'react-native';

let app: FirebaseApp;
let auth: Auth;
let db: Firestore;

if (!getApps().length) {
    app = initializeApp(firebaseConfig);

    // Initialize Auth with platform-specific persistence
    // On web, getReactNativePersistence is not available and will throw
    let persistence;
    if (Platform.OS === 'web') {
        persistence = browserLocalPersistence;
    } else {
        // getReactNativePersistence might be undefined during SSR or if bundle is misconfigured
        const { getReactNativePersistence } = require('firebase/auth');
        persistence = getReactNativePersistence(AsyncStorage);
    }

    auth = initializeAuth(app, { persistence });
    db = getFirestore(app);
} else {
    app = getApp();
    auth = getAuth(app);
    db = getFirestore(app);
}

export const getFirebaseApp = () => app;
export const getFirebaseAuth = () => auth;
export const getFirebaseDb = () => db;
