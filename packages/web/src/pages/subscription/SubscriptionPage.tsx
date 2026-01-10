import { useFirebase } from '@/context/firebase-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Crown } from 'lucide-react';
import { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@dosfilos/infrastructure';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@dosfilos/infrastructure';
import { toast } from 'sonner';
import { CancelSubscriptionDialog } from '@/components/subscription/dialogs/CancelSubscriptionDialog';
import { PlanChangeDialog } from '@/components/subscription/dialogs/PlanChangeDialog';
import { ReactivateSubscriptionDialog } from '@/components/subscription/dialogs/ReactivateSubscriptionDialog';
import { useTranslation } from '@/i18n';
import { usePlans } from '@/hooks/usePlans';
import { PlanCard } from '@/components/plans';

export default function SubscriptionPage() {
  const { user } = useFirebase();
  const { t } = useTranslation('subscription');
  const { plans, loading: plansLoading } = usePlans();
  const [userProfile, setUserProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // Dialog states
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [planChangeDialogOpen, setPlanChangeDialogOpen] = useState(false);
  const [reactivateDialogOpen, setReactivateDialogOpen] = useState(false);
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
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [user]);

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
      toast.error(error.message || t('errors.checkoutError'));
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
  // All plans now require active subscription (including trials)
  const isSubscriptionActive = userProfile?.subscription?.status === 'active' || userProfile?.subscription?.status === 'trialing';
  const isSubscriptionCancelled = userProfile?.subscription?.status === 'cancelled';
  const currentPlan = plans.find(p => p.id === currentPlanId);
  const isFreeUser = currentPlanId === 'free';

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">{t('header.title')}</h1>
        <p className="text-muted-foreground">
          {t('header.subtitle')}
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
                  {t('currentPlan.title')}: {currentPlan?.localizedName || currentPlanId.charAt(0).toUpperCase() + currentPlanId.slice(1)}
                  {isSubscriptionCancelled && (
                    <Badge variant="outline" className="ml-2 text-orange-600">
                      {t('currentPlan.badges.cancelled')}
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription className="mt-2">
                  {isSubscriptionActive && userProfile.subscription.currentPeriodEnd ? (
                    <>
                      {t('currentPlan.renewalDate')}: {new Date(
                        userProfile.subscription.currentPeriodEnd.seconds 
                          ? userProfile.subscription.currentPeriodEnd.seconds * 1000 
                          : userProfile.subscription.currentPeriodEnd
                      ).toLocaleDateString()}
                    </>
                  ) : isSubscriptionCancelled && userProfile.subscription.endDate ? (
                    <>
                      {t('currentPlan.accessUntil')}: {new Date(
                        userProfile.subscription.endDate.seconds 
                          ? userProfile.subscription.endDate.seconds * 1000 
                          : userProfile.subscription.endDate
                      ).toLocaleDateString()}
                    </>
                  ) : (
                    t('currentPlan.notActive')
                  )}
                </CardDescription>
              </div>
              {isSubscriptionActive && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setCancelDialogOpen(true)}
                >
                  {t('currentPlan.cancelButton')}
                </Button>
              )}
              {isSubscriptionCancelled && (
                <Button 
                  variant="default" 
                  size="sm"
                  onClick={() => setReactivateDialogOpen(true)}
                >
                  {t('currentPlan.reactivateButton')}
                </Button>
              )}
            </div>
          </CardHeader>
        </Card>
      )}

      {/* Free Plan Upgrade Message */}
      {isFreeUser && !isSubscriptionActive && (
        <Card className="mb-8 border-primary/50 bg-primary/5">
          <CardHeader>
            <CardTitle className="text-lg">
              🎁 {t('freePlan.upgradeTitle', { defaultValue: 'Estás usando el Plan Gratuito' })}
            </CardTitle>
            <CardDescription className="mt-2">
              {t('freePlan.upgradeMessage', { 
                defaultValue: 'Desbloquea todo el potencial de DosFilos.Preach con acceso a generación de sermones con IA, análisis homilético avanzado, y mucho más.' 
              })}
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map((plan) => {
          const isCurrent = plan.id === currentPlanId;
          
          return (
            <PlanCard
              key={plan.id}
              plan={plan}
              isCurrentPlan={isCurrent}
              onSelect={(planId) => {
                const selectedPlanData = plans.find(p => p.id === planId);
                if (!selectedPlanData || isCurrent) return;
                
                // If user doesn't have a subscription, create checkout
                if (!userProfile?.subscription || !isSubscriptionActive) {
                  if (selectedPlanData.stripeProductIds && selectedPlanData.stripeProductIds.length > 0) {
                    handleSubscribe(selectedPlanData.stripeProductIds[0] || '');
                  }
                } else {
                  // User has active subscription - show change dialog
                  handlePlanChange(selectedPlanData);
                }
              }}
              loading={loading}
              className=""
            />
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

      <ReactivateSubscriptionDialog
        open={reactivateDialogOpen}
        onOpenChange={setReactivateDialogOpen}
        onSuccess={handleDialogSuccess}
        currentPeriodEnd={
          userProfile?.subscription?.endDate 
            ? new Date(
                userProfile.subscription.endDate.seconds 
                  ? userProfile.subscription.endDate.seconds * 1000 
                  : userProfile.subscription.endDate
              )
            : undefined
        }
      />
    </div>
  );
}
