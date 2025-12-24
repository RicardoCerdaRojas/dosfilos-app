import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Lock, Zap, Check, ArrowRight, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSubscription } from '@/hooks/useSubscription';

interface UpgradeRequiredModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reason: 'limit_reached' | 'module_restricted';
  module?: string;
  limitType?: 'sermons' | 'plans' | 'greek_sessions';
  currentLimit?: number;
}

export function UpgradeRequiredModal({
  open,
  onOpenChange,
  reason,
  module,
  limitType,
  currentLimit
}: UpgradeRequiredModalProps) {
  const navigate = useNavigate();
  const { subscription } = useSubscription();

  const getTitle = () => {
    if (reason === 'limit_reached') {
      switch (limitType) {
        case 'sermons':
          return '📝 Límite de Sermones Alcanzado';
        case 'plans':
          return '📅 Límite de Planes Alcanzado';
        case 'greek_sessions':
          return '📖 Límite de Estudios Alcanzado';
        default:
          return '⚡ Límite Alcanzado';
      }
    }
    return `🔒 ${module || 'Esta función'} requiere actualización`;
  };

  const getDescription = () => {
    if (reason === 'limit_reached') {
      const limits = {
        sermons: `Has creado ${currentLimit} ${currentLimit === 1 ? 'sermón' : 'sermones'} este mes`,
        plans: subscription?.planId === 'free' 
          ? `Ya tienes ${currentLimit} plan de predicación (límite total del plan Free)`
          : `Has creado ${currentLimit} ${currentLimit === 1 ? 'plan' : 'planes'} este mes`,
        greek_sessions: `Has usado ${currentLimit} ${currentLimit === 1 ? 'sesión' : 'sesiones'} de estudio este mes`
      };
      return limits[limitType || 'sermons'];
    }
    return `Para acceder a ${module || 'esta función'}, necesitas actualizar tu plan`;
  };

  const benefits = {
    pro: [
      { icon: Sparkles, text: '4 sermones por mes', highlight: true },
      { icon: Check, text: '1 plan de predicación mensual' },
      { icon: Check, text: '3 estudios de griego por mes' },
      { icon: Check, text: '200MB de biblioteca personal' },
      { icon: Check, text: 'Soporte prioritario' }
    ],
    team: [
      { icon: Sparkles, text: '12 sermones por mes', highlight: true },
      { icon: Check, text: '4 planes de predicación mensuales' },
      { icon: Check, text: '15 estudios de griego por mes' },
      { icon: Check, text: '600MB de biblioteca personal' },
      { icon: Check, text: 'Acceso para equipo pastoral' },
      { icon: Check, text: 'Soporte premium 24/7' }
    ]
  };

  const handleUpgrade = (plan: 'pro' | 'team') => {
    onOpenChange(false);
    navigate('/dashboard/subscription', { state: { suggestedPlan: plan } });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="mx-auto mb-4 p-4 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-full w-fit">
            <Lock className="h-12 w-12 text-blue-600" />
          </div>
          <DialogTitle className="text-2xl text-center">{getTitle()}</DialogTitle>
          <DialogDescription className="text-center text-base">
            {getDescription()}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* Pro Plan Card */}
          <Card className="border-2 border-blue-200 hover:border-blue-400 transition-all hover:shadow-lg">
            <CardContent className="pt-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-xl font-bold text-blue-600">Plan Pro</h3>
                  <p className="text-3xl font-bold mt-1">
                    $9.99
                    <span className="text-sm text-muted-foreground font-normal">/mes</span>
                  </p>
                </div>
                <div className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm font-medium">
                  Popular
                </div>
              </div>

              <ul className="space-y-2 mb-4">
                {benefits.pro.map((benefit, idx) => (
                  <li key={idx} className="flex items-center gap-2">
                    <benefit.icon className={`h-4 w-4 ${benefit.highlight ? 'text-blue-600' : 'text-green-600'}`} />
                    <span className={benefit.highlight ? 'font-medium' : ''}>{benefit.text}</span>
                  </li>
                ))}
              </ul>

              <Button 
                onClick={() => handleUpgrade('pro')}
                className="w-full bg-blue-600 hover:bg-blue-700"
                size="lg"
              >
                Actualizar a Pro
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>

          {/* Team Plan Card */}
          <Card className="border-2 border-purple-200 hover:border-purple-400 transition-all hover:shadow-lg">
            <CardContent className="pt-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-xl font-bold text-purple-600">Plan Team</h3>
                  <p className="text-3xl font-bold mt-1">
                    $24.99
                    <span className="text-sm text-muted-foreground font-normal">/mes</span>
                  </p>
                </div>
                <div className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-sm font-medium">
                  Mejor valor
                </div>
              </div>

              <ul className="space-y-2 mb-4">
                {benefits.team.map((benefit, idx) => (
                  <li key={idx} className="flex items-center gap-2">
                    <benefit.icon className={`h-4 w-4 ${benefit.highlight ? 'text-purple-600' : 'text-green-600'}`} />
                    <span className={benefit.highlight ? 'font-medium' : ''}>{benefit.text}</span>
                  </li>
                ))}
              </ul>

              <Button 
                onClick={() => handleUpgrade('team')}
                className="w-full bg-purple-600 hover:bg-purple-700"
                size="lg"
              >
                Actualizar a Team
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>

          <div className="text-center pt-2">
            <Button 
              variant="ghost" 
              onClick={() => onOpenChange(false)}
              className="text-sm"
            >
              Continuar con plan Free
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
