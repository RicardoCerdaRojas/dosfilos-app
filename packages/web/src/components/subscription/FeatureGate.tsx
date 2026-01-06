import { useFirebase } from '@/context/firebase-context';
import { ReactNode } from 'react';

interface FeatureGateProps {
  /**
   * Content to show when user doesn't have access
   */
  fallback?: ReactNode;
  /**
   * Children to render when user has access
   */
  children: ReactNode;
  /**
   * Simple feature check - for now just checks if user is authenticated
   * TODO: Implement proper feature checking with plan validation
   */
  feature?: string;
}

/**
 * FeatureGate component for conditional rendering based on user features
 * 
 * Currently simplified - full implementation will check against user's plan
 * and subscription status to determine feature access.
 */
export function FeatureGate({ children, fallback = null, feature }: FeatureGateProps) {
  const { user } = useFirebase();

  // For now, just check if user is authenticated
  // TODO: Implement proper feature checking when UserProfile integration is complete
  if (!user) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
