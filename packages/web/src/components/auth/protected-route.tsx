import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useFirebase } from '@/context/firebase-context';

interface ProtectedRouteProps {
  children: ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading } = useFirebase();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-muted-foreground">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Email-verification gate: Free signups must verify before reaching the
  // dashboard. Paid users come in pre-verified via completeRegistration so
  // they skip this entirely. The verify-email page itself is exempt to
  // avoid an infinite redirect loop.
  if (!user.emailVerified && location.pathname !== '/auth/verify-email') {
    return <Navigate to="/auth/verify-email" replace />;
  }

  return <>{children}</>;
}
