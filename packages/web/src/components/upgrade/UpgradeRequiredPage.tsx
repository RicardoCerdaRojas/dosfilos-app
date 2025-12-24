import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Lock, Zap, Check, ArrowRight, Sparkles, BookOpen, Calendar, Languages } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSubscription } from '@/hooks/useSubscription';

interface UpgradeRequiredPageProps {
  reason: 'limit_reached' | 'module_restricted';
  module?: string;
  limitType?: 'sermons' | 'plans' | 'greek_sessions' | 'library';
  currentLimit?: number;
}

export function UpgradeRequiredPage({
  reason,
  module,
  limitType,
  currentLimit
}: UpgradeRequiredPageProps) {
  const navigate = useNavigate();
  const { subscription } = useSubscription();

  const getIcon = () => {
    switch (limitType) {
      case 'library':
        return BookOpen;
      case 'plans':
        return Calendar;
      case 'greek_sessions':
        return Languages;
      default:
        return Sparkles;
    }
  };

  const Icon = getIcon();

  const getTitle = () => {
    if (reason === 'limit_reached') {
      switch (limitType) {
        case 'sermons':
          return 'Límite de Sermones Alcanzado';
        case 'plans':
          return 'Límite de Planes Alcanzado';
        case 'greek_sessions':
          return 'Límite de Estudios Alcanzado';
        case 'library':
          return 'Biblioteca Personal';
        default:
          return 'Límite Alcanzado';
      }
    }
    return `${module || 'Esta función'} requiere actualización`;
  };

  const getDescription = () => {
    if (reason === 'limit_reached') {
      const limits = {
        sermons: `Has creado ${currentLimit} ${currentLimit === 1 ? 'sermón' : 'sermones'} este mes. Actualiza tu plan para crear más.`,
        plans: subscription?.planId === 'free' 
          ? `Ya tienes ${currentLimit} plan de predicación (límite total del plan Free). Actualiza para crear más.`
          : `Has creado ${currentLimit} ${currentLimit === 1 ? 'plan' : 'planes'} este mes.`,
        greek_sessions: `Has usado ${currentLimit} ${currentLimit === 1 ? 'sesión' : 'sesiones'} de estudio este mes.`,
        library: 'Accede a tu biblioteca personal para organizar y buscar tus recursos teológicos.'
      };
      return limits[limitType || 'sermons'];
    }
    return `Para acceder a ${module || 'esta función'}, necesitas actualizar tu plan.`;
  };

  const planFeatures = {
    pro: {
      title: 'Plan Pro',
      price: '$9.99',
      badge: 'Más Popular',
      badgeColor: 'bg-blue-100 text-blue-700',
      color: 'blue',
      features: [
        { text: '4 sermones por mes', highlight: true },
        { text: '1 plan de predicación mensual' },
        { text: '3 estudios de griego por mes' },
        { text: '200MB de biblioteca personal' },
        { text: 'Exportación PDF' },
        { text: 'Soporte prioritario' }
      ]
    },
    team: {
      title: 'Plan Team',
      price: '$24.99',
      badge: 'Mejor Valor',
      badgeColor: 'bg-purple-100 text-purple-700',
      color: 'purple',
      features: [
        { text: '12 sermones por mes', highlight: true },
        { text: '4 planes de predicación mensuales' },
        { text: '15 estudios de griego por mes' },
        { text: '600MB de biblioteca personal' },
        { text: 'Funciones colaborativas' },
        { text: 'Acceso para equipo pastoral' },
        { text: 'Soporte premium 24/7' }
      ]
    }
  };

  const handleUpgrade = (plan: 'pro' | 'team') => {
    navigate('/dashboard/subscription', { state: { suggestedPlan: plan } });
  };

  return (
    <div className="container max-w-5xl mx-auto py-12 px-4">
      {/* Header */}
      <div className="text-center mb-12">
        <div className="mx-auto mb-6 p-6 bg-gradient-to-br from-blue-500/10 via-purple-500/10 to-pink-500/10 rounded-full w-fit">
          <Icon className="h-16 w-16 text-blue-600" />
        </div>
        <h1 className="text-4xl font-bold mb-4">{getTitle()}</h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          {getDescription()}
        </p>
      </div>

      {/* Plans Grid */}
      <div className="grid md:grid-cols-2 gap-6 mb-8">
        {/* Pro Plan */}
        <Card className={`border-2 border-${planFeatures.pro.color}-200 hover:border-${planFeatures.pro.color}-400 transition-all hover:shadow-xl hover:scale-[1.02]`}>
          <CardHeader>
            <div className="flex items-start justify-between mb-2">
              <div>
                <CardTitle className={`text-2xl text-${planFeatures.pro.color}-600`}>
                  {planFeatures.pro.title}
                </CardTitle>
                <div className="flex items-baseline gap-1 mt-2">
                  <span className="text-4xl font-bold">{planFeatures.pro.price}</span>
                  <span className="text-muted-foreground">/mes</span>
                </div>
              </div>
              <div className={`${planFeatures.pro.badgeColor} px-3 py-1 rounded-full text-sm font-medium`}>
                {planFeatures.pro.badge}
              </div>
            </div>
            <CardDescription>Perfecto para pastores individuales</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3 mb-6">
              {planFeatures.pro.features.map((feature, idx) => (
                <li key={idx} className="flex items-center gap-3">
                  <div className={`p-1 rounded-full ${feature.highlight ? `bg-${planFeatures.pro.color}-100` : 'bg-green-100'}`}>
                    <Check className={`h-4 w-4 ${feature.highlight ? `text-${planFeatures.pro.color}-600` : 'text-green-600'}`} />
                  </div>
                  <span className={feature.highlight ? 'font-semibold' : ''}>{feature.text}</span>
                </li>
              ))}
            </ul>

            <Button 
              onClick={() => handleUpgrade('pro')}
              className={`w-full bg-${planFeatures.pro.color}-600 hover:bg-${planFeatures.pro.color}-700`}
              size="lg"
            >
              <Zap className="mr-2 h-5 w-5" />
              Actualizar a Pro
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </CardContent>
        </Card>

        {/* Team Plan */}
        <Card className={`border-2 border-${planFeatures.team.color}-200 hover:border-${planFeatures.team.color}-400 transition-all hover:shadow-xl hover:scale-[1.02]`}>
          <CardHeader>
            <div className="flex items-start justify-between mb-2">
              <div>
                <CardTitle className={`text-2xl text-${planFeatures.team.color}-600`}>
                  {planFeatures.team.title}
                </CardTitle>
                <div className="flex items-baseline gap-1 mt-2">
                  <span className="text-4xl font-bold">{planFeatures.team.price}</span>
                  <span className="text-muted-foreground">/mes</span>
                </div>
              </div>
              <div className={`${planFeatures.team.badgeColor} px-3 py-1 rounded-full text-sm font-medium`}>
                {planFeatures.team.badge}
              </div>
            </div>
            <CardDescription>Ideal para equipos pastorales</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3 mb-6">
              {planFeatures.team.features.map((feature, idx) => (
                <li key={idx} className="flex items-center gap-3">
                  <div className={`p-1 rounded-full ${feature.highlight ? `bg-${planFeatures.team.color}-100` : 'bg-green-100'}`}>
                    <Check className={`h-4 w-4 ${feature.highlight ? `text-${planFeatures.team.color}-600` : 'text-green-600'}`} />
                  </div>
                  <span className={feature.highlight ? 'font-semibold' : ''}>{feature.text}</span>
                </li>
              ))}
            </ul>

            <Button 
              onClick={() => handleUpgrade('team')}
              className={`w-full bg-${planFeatures.team.color}-600 hover:bg-${planFeatures.team.color}-700`}
              size="lg"
            >
              <Zap className="mr-2 h-5 w-5" />
              Actualizar a Team
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Back Button */}
      <div className="text-center">
        <Button 
          variant="outline" 
          onClick={() => navigate('/dashboard')}
          size="lg"
        >
          Volver al Dashboard
        </Button>
      </div>
    </div>
  );
}
