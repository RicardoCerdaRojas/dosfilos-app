import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { initializeFirebase } from '../../../infrastructure/src/config/firebase';
import { getCoreLibraryService } from '../services/coreLibraryService';

interface FirebaseContextType {
  user: User | null;
  loading: boolean;
  preparingAI: boolean; // 🎯 NEW: AI preparation state
}

const FirebaseContext = createContext<FirebaseContextType>({
  user: null,
  loading: true,
  preparingAI: false,
});

export function useFirebase() {
  const context = useContext(FirebaseContext);
  if (!context) {
    throw new Error('useFirebase must be used within FirebaseProvider');
  }
  return context;
}

interface FirebaseProviderProps {
  children: ReactNode;
}

export function FirebaseProvider({ children }: FirebaseProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [preparingAI, setPreparingAI] = useState(false); // 🎯 NEW

  useEffect(() => {
    // Initialize Firebase
    const { auth } = initializeFirebase();

    // Listen to auth state changes
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      setLoading(false);

      // 🎯 NEW: Prepare Core Library when user logs in
      if (user) {
        setPreparingAI(true);
        try {
          const coreLibraryService = getCoreLibraryService();
          await coreLibraryService.ensureStoresReady();
          console.log('✅ Core Library stores ready');
        } catch (error) {
          console.error('❌ Failed to prepare Core Library:', error);
          // Don't block user login - they can still use the app
          // Stores will retry on next module usage
        } finally {
          setPreparingAI(false);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  // Show loading screen while preparing AI (only if user just logged in)
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando...</p>
        </div>
      </div>
    );
  }

  if (preparingAI) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center max-w-md">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold mb-2">Preparando asistentes de IA...</h2>
          <p className="text-sm text-muted-foreground">
            Estamos configurando la biblioteca de conocimiento teológico.
            Esto solo toma unos segundos.
          </p>
        </div>
      </div>
    );
  }

  return (
    <FirebaseContext.Provider value={{ user, loading, preparingAI }}>
      {children}
    </FirebaseContext.Provider>
  );
}
