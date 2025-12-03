import { IConfigRepository, WorkflowConfiguration } from '@dosfilos/domain';
import { db } from '../config/firebase';
import { doc, setDoc, collection, query, where, getDocs } from 'firebase/firestore';

export class FirebaseConfigRepository implements IConfigRepository {
    private collectionName = 'workflow_configs';

    async save(config: WorkflowConfiguration): Promise<void> {
        const configRef = doc(db, this.collectionName, config.id);
        await setDoc(configRef, config);
    }

    async findByUserId(userId: string): Promise<WorkflowConfiguration | null> {
        const q = query(
            collection(db, this.collectionName),
            where('userId', '==', userId)
        );

        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            return null;
        }

        // Assuming one config per user for now
        const doc = querySnapshot.docs[0];
        if (!doc) return null;

        return doc.data() as WorkflowConfiguration;
    }
}
