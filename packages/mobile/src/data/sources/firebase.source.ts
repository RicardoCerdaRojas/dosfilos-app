import { getApp } from '@react-native-firebase/app';
import { getAuth } from '@react-native-firebase/auth';
import { getFirestore } from '@react-native-firebase/firestore';

// Con @react-native-firebase la app default se inicializa en el arranque
// nativo desde GoogleService-Info.plist / google-services.json — aquí no hay
// initializeApp ni persistencia manual: el SDK nativo trae caché de disco y
// cola de escrituras offline (decisión M-02 del plan Púlpito).

export const getFirebaseApp = () => getApp();
export const getFirebaseAuth = () => getAuth(getApp());
export const getFirebaseDb = () => getFirestore(getApp());
