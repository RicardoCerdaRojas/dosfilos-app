import { useFirebase } from '@/context/firebase-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CreditCard, Check, Crown, Zap } from 'lucide-react';
import { useState, useEffect } from 'react';
import { doc, getDoc, getDocs, query, collection, where } from 'firebase/firestore';
import { db } from '@dosfilos/infrastructure';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@dosfilos/infrastructure';
import { toast } from 'sonner';
import { getFeatureLabel } from '@/utils/featureLabels';
import { CancelSubscriptionDialog } from '@/components/subscription/dialogs/CancelSubscriptionDialog';
import { PlanChangeDialog } from '@/components/subscription/dialogs/PlanChangeDialog';

export default function SubscriptionPage() {
  const { user } = useFirebase();
  const [userProfile, setUserProfile] = useState<any>(null);
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Dialog states
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [planChangeDialogOpen, setPlanChangeDialogOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<any>(null);

  // Load user profile with subscription
  useEffect(() => {
    if (!user) return;

    const loadProfile = async () => {
      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          setUserProfile(userDoc.data());
        }
      } catch (error) {
        console.error('Error loading profile:', error);
      }
    };

    loadProfile();
  }, [user]);

  // Load plans
  useEffect(() => {
    const loadPlans = async () => {
      try {
        const plansSnapshot = await getDocs(query(collection(db, 'plans'), where('isPublic', '==', true)));
        const plansData = plansSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })).sort((a: any, b: any) => a.sortOrder - b.sortOrder);
        setPlans(plansData);
      } catch (error) {
        console.error('Error loading plans:', error);
      } finally {
        setLoading(false);
      }
    };

    loadPlans();
  }, []);

  const handleSubscribe = async (priceId: string) => {
    try {
      setLoading(true);
      const createCheckout = httpsCallable(functions, 'createCheckoutSession');
      const result: any = await createCheckout({
        priceId,
        successUrl: `${window.location.origin}/dashboard/subscription?success=true`,
        cancelUrl: `${window.location.origin}/dashboard/subscription?canceled=true`,
      });

      if (result.data.url) {
        window.location.href = result.data.url;
      }
    } catch (error: any) {
      console.error('Error creating checkout:', error);
      toast.error(error.message || 'Error al crear sesión de pago');
    } finally {
      setLoading(false);
    }
  };

  const handlePlanChange = (plan: any) => {
    setSelectedPlan(plan);
    setPlanChangeDialogOpen(true);
  };

  const handleDialogSuccess = async () => {
    // Reload user profile
    if (!user) return;
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    if (userDoc.exists()) {
      setUserProfile(userDoc.data());
    }
  };

  const currentPlanId = userProfile?.subscription?.planId || 'free';
  const isSubscriptionActive = userProfile?.subscription?.status === 'active';
  const currentPlan = plans.find(p => p.id === currentPlanId);

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Mi Suscripción</h1>
        <p className="text-muted-foreground">
          Gestiona tu plan y accede a todas las funcionalidades premium
        </p>
      </div>

      {/* Current Plan Badge */}
      {userProfile?.subscription && (
        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Crown className="h-5 w-5 text-amber-500" />
                  Plan Actual: {currentPlanId.charAt(0).toUpperCase() + currentPlanId.slice(1)}
                </CardTitle>
                <CardDescription className="mt-2">
                  {isSubscriptionActive && userProfile.subscription.currentPeriodEnd ? (
                    <>
                      Renovación: {new Date(
                        userProfile.subscription.currentPeriodEnd.seconds 
                          ? userProfile.subscription.currentPeriodEnd.seconds * 1000 
                          : userProfile.subscription.currentPeriodEnd
                      ).toLocaleDateString()}
                    </>
                  ) : (
                    'Tu suscripción no está activa'
                  )}
                </CardDescription>
              </div>
              {isSubscriptionActive && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setCancelDialogOpen(true)}
                >
                  Cancelar Suscripción
                </Button>
              )}
            </div>
          </CardHeader>
        </Card>
      )}

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map((plan) => {
          const isCurrent = plan.id === currentPlanId;
          const isPopular = plan.id === 'starter';

          return (
            <Card key={plan.id} className={`relative ${isPopular ? 'border-primary shadow-lg' : ''}`}>
              {isPopular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="bg-primary text-primary-foreground">
                    <Zap className="h-3 w-3 mr-1" />
                    Más Popular
                  </Badge>
                </div>
              )}

              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{plan.name}</span>
                  {isCurrent && <Badge variant="outline">Actual</Badge>}
                </CardTitle>
                <CardDescription>{plan.description}</CardDescription>
                <div className="mt-4">
                  <span className="text-4xl font-bold">${plan.pricing?.monthly || 0}</span>
                  <span className="text-muted-foreground">/mes</span>
                </div>
              </CardHeader>

              <CardContent>
                <div className="space-y-3 mb-6">
                  {plan.features?.map((feature: string, idx: number) => (
                    <div key={idx} className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                      <span className="text-sm">{getFeatureLabel(feature)}</span>
                    </div>
                  ))}
                </div>

                <Button
                  className="w-full"
                  variant={isCurrent ? 'outline' : 'default'}
                  disabled={loading || isCurrent || plan.id === 'free'}
                  onClick={() => {
                    if (isSubscriptionActive && !isCurrent) {
                      // User has active subscription, show change dialog
                      handlePlanChange(plan);
                    } else {
                      // User doesn't have subscription, go to checkout
                      const priceId = plan.stripeProductIds?.[0];
                      if (priceId) {
                        handleSubscribe(priceId);
                      }
                    }
                  }}
                >
                  {isCurrent ? 'Plan Actual' : plan.id === 'free' ? 'Plan Gratuito' : isSubscriptionActive ? 'Cambiar a Este Plan' : 'Suscribirse'}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Dialogs */}
      <CancelSubscriptionDialog 
        open={cancelDialogOpen}
        onOpenChange={setCancelDialogOpen}
        onSuccess={handleDialogSuccess}
        currentPeriodEnd={
          userProfile?.subscription?.currentPeriodEnd 
            ? new Date(
                userProfile.subscription.currentPeriodEnd.seconds 
                  ? userProfile.subscription.currentPeriodEnd.seconds * 1000 
                  : userProfile.subscription.currentPeriodEnd
              )
            : undefined
        }
      />

      <PlanChangeDialog
        open={planChangeDialogOpen}
        onOpenChange={setPlanChangeDialogOpen}
        onSuccess={handleDialogSuccess}
        currentPlan={currentPlan}
        newPlan={selectedPlan}
      />
    </div>
  );
}
