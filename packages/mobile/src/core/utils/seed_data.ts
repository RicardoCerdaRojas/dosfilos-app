import { getFirestore, collection, addDoc, Timestamp } from 'firebase/firestore';
import { getFirebaseApp } from '@/data/sources/firebase.source';

const db = getFirestore(getFirebaseApp());

export const seedData = async () => {
    try {
        console.log('Seeding Sermons...');
        const sermonsRef = collection(db, 'sermons');
        await addDoc(sermonsRef, {
            title: "La Fe que Mueve Montañas",
            description: "Un sermón poderoso sobre cómo la fe puede transformar nuestras vidas y superar cualquier obstáculo.",
            preacher: "Pastor Ricardo Cerda",
            date: Timestamp.now(),
            thumbnailUrl: "https://images.unsplash.com/photo-1507692049790-de58293a4654?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80",
            duration: 3600,
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now()
        });
        await addDoc(sermonsRef, {
            title: "Amor Incondicional",
            description: "Explorando la profundidad del amor de Dios y cómo debemos reflejarlo en nuestras relaciones.",
            preacher: "Pastor Invitado",
            date: Timestamp.now(),
            thumbnailUrl: "https://images.unsplash.com/photo-1438232992991-995b7058bbb3?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80",
            duration: 2700,
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now()
        });

        console.log('Seeding Events...');
        const eventsRef = collection(db, 'events');
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const nextWeek = new Date();
        nextWeek.setDate(nextWeek.getDate() + 7);

        await addDoc(eventsRef, {
            title: "Noche de Adoración",
            description: "Únete a nosotros para una noche especial de música y oración.",
            startDate: Timestamp.fromDate(tomorrow),
            location: "Auditorio Principal",
            imageUrl: "https://images.unsplash.com/photo-1459749411177-287ce328810e?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80",
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now()
        });

        await addDoc(eventsRef, {
            title: "Retiro de Jóvenes",
            description: "Un fin de semana inolvidable para conectar con Dios y amigos.",
            startDate: Timestamp.fromDate(nextWeek),
            location: "Campamento Los Pinos",
            imageUrl: "https://images.unsplash.com/photo-1523580494863-6f3031224c94?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80",
            registrationUrl: "https://example.com/register",
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now()
        });

        console.log('Data seeded successfully!');
    } catch (error) {
        console.error('Error seeding data:', error);
    }
};
