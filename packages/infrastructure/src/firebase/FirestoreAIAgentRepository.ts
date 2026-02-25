import { AIAgent, IAIAgentRepository, AIAgentRole } from '@dosfilos/domain';
import { db } from '../config/firebase';
import { collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, query, where } from 'firebase/firestore';

export class FirestoreAIAgentRepository implements IAIAgentRepository {
    private readonly COLLECTION = 'ai_agents';

    async getAgent(id: string): Promise<AIAgent | null> {
        const docRef = doc(db, this.COLLECTION, id);
        const docSnap = await getDoc(docRef);
        if (!docSnap.exists()) {
            return null;
        }
        return { id: docSnap.id, ...docSnap.data() } as AIAgent;
    }

    async getAgentByRole(role: AIAgentRole): Promise<AIAgent | null> {
        const agentsRef = collection(db, this.COLLECTION);
        const q = query(agentsRef, where('role', '==', role), where('isActive', '==', true));
        const querySnapshot = await getDocs(q);
        if (querySnapshot.empty) {
            return null;
        }
        const docSnap = querySnapshot.docs[0];
        return { id: docSnap.id, ...docSnap.data() } as AIAgent;
    }

    async getAllAgents(): Promise<AIAgent[]> {
        const agentsRef = collection(db, this.COLLECTION);
        const querySnapshot = await getDocs(agentsRef);
        return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AIAgent));
    }

    async createAgent(agent: Omit<AIAgent, 'id' | 'createdAt' | 'updatedAt'>): Promise<AIAgent> {
        const agentRef = doc(collection(db, this.COLLECTION));
        const now = new Date();
        const newAgent = {
            ...agent,
            corpusIds: agent.corpusIds || [],
            createdAt: now,
            updatedAt: now,
        };
        await setDoc(agentRef, newAgent);
        return { id: agentRef.id, ...newAgent };
    }

    async updateAgent(id: string, updates: Partial<AIAgent>): Promise<AIAgent> {
        const docRef = doc(db, this.COLLECTION, id);
        const updateData = {
            ...updates,
            updatedAt: new Date(),
        };
        if (updates.corpusIds !== undefined) {
            updateData.corpusIds = updates.corpusIds;
        }
        await updateDoc(docRef, updateData);

        // Return the updated document
        const updatedSnap = await getDoc(docRef);
        return { id: updatedSnap.id, ...updatedSnap.data() } as AIAgent;
    }

    async deleteAgent(id: string): Promise<void> {
        const docRef = doc(db, this.COLLECTION, id);
        await deleteDoc(docRef);
    }
}
