import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { initializeFirebase } from '../../../infrastructure/src/config/firebase';
import { getCoreLibraryService } from '../services/coreLibraryService';

interface FirebaseContextType {
  user: User | null;
  loading: boolean;
}

const FirebaseContext = createContext<FirebaseContextType>({
  user: null,
  loading: true,
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

  useEffect(() => {
    // Initialize Firebase
    const { auth } = initializeFirebase();

    // Listen to auth state changes
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      setLoading(false);

      // 🎯 Load Core Library config (but don't create stores automatically)
      // Store creation happens server-side via admin UI (/dashboard/admin/core-library)
      if (user) {
        try {
          const coreLibraryService = getCoreLibraryService();
          
          // 🎯 INJECTION: Wire the services together
          // This ensures the generator knows about the stores we are about to load
          const { sermonGeneratorService, generatorChatService } = await import('@dosfilos/application');
          // Inject Core Library Service into Sermon Generator Service
          sermonGeneratorService.setCoreLibraryService(coreLibraryService);
          
          // 🎯 NEW: Inject Core Library Service into Generator Chat Service
          generatorChatService.setCoreLibraryService(coreLibraryService);
          
          // Initialize service state so getStoreId() works
          await coreLibraryService.initializeFromConfig();
          console.log('✅ Core Library Service initialized globally');
        } catch (error) {
          console.error('⚠️ Failed to initialize Core Library Service:', error);
        }
      }
    });

    return () => unsubscribe();
  }, []);


  // Show loading screen while checking auth
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

  return (
    <FirebaseContext.Provider value={{ user, loading }}>
      {children}
    </FirebaseContext.Provider>
  );
}
