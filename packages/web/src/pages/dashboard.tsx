import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, Sparkles, BookOpen, TrendingUp, Clock } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useFirebase } from '@/context/firebase-context';
import { sermonService } from '@dosfilos/application';
import { SermonEntity } from '@dosfilos/domain';
import { Progress } from '@/components/ui/progress';
import { useTranslation } from '@/i18n';
import { useOnboardingState } from '@/hooks/useOnboardingState';
import { OnboardingWelcomeModal, ActivationBanner, CelebrationModal } from '@/components/onboarding';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useUsageLimits } from '@/hooks/useUsageLimits';
import { UpgradeRequiredModal } from '@/components/upgrade';

export function DashboardPage() {
  const { user } = useFirebase();
  const { t } = useTranslation('dashboard');
  const navigate = useNavigate();
  const { checkCanCreateSermon } = useUsageLimits();
  const [sermons, setSermons] = useState<SermonEntity[]>([]);
  const [stats, setStats] = useState({
    totalSermons: 0,
    aiGenerated: 0,
    bibleReferences: 0,
    avgDuration: 0,
    bibleCoverage: 0,
    uniqueBooks: 0
  });

  // Onboarding state
  const onboarding = useOnboardingState();
  const [showWelcome, setShowWelcome] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  
  // Upgrade modal state
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgradeReason, setUpgradeReason] = useState({
    reason: 'limit_reached' as const,
    limitType: 'sermons' as const,
    currentLimit: 1
  });

  // Handler for creating a new sermon with limit check
  const handleCreateSermon = async () => {
    const check = await checkCanCreateSermon();
    
    if (!check.allowed) {
      // Show upgrade modal instead of just toast
      setUpgradeReason({
        reason: 'limit_reached',
        limitType: 'sermons',
        currentLimit: check.limit || 1
      });
      setShowUpgradeModal(true);
      return;
    }
    
    navigate('/dashboard/generate-sermon');
  };

  // Show modals based on onboarding state
  useEffect(() => {
    if (onboarding.shouldShowWelcome) {
      setShowWelcome(true);
    }
    if (onboarding.shouldShowCelebration) {
      setShowCelebration(true);
    }
  }, [onboarding.shouldShowWelcome, onboarding.shouldShowCelebration]);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    try {
      if (!user) return;
      const data = await sermonService.getUserSermons(user.uid);
      setSermons(data);
      calculateStats(data);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    }
  };

  const calculateStats = (data: SermonEntity[]) => {
    // Total Sermons
    const totalSermons = data.length;

    // AI Generated (Approximation: created in last 30 days and has wizard progress)
    // Or just count sermons created this month
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const thisMonthSermons = data.filter(s => new Date(s.createdAt) >= startOfMonth).length;

    // Bible References Count
    const totalRefs = data.reduce((acc, s) => acc + s.bibleReferences.length, 0);

    // Average Duration
    let totalDuration = 0;
    let preachedCount = 0;
    data.forEach(s => {
      s.preachingHistory.forEach(log => {
        totalDuration += log.durationMinutes;
        preachedCount++;
      });
    });
    const avgDuration = preachedCount > 0 ? Math.round(totalDuration / preachedCount) : 0;

    // Bible Coverage (Unique Books)
    // This is a naive implementation. Ideally we'd parse "Genesis 1:1" to "Genesis".
    // For now, let's assume we can extract the book name roughly.
    const uniqueBooks = new Set<string>();
    data.forEach(s => {
      s.bibleReferences.forEach(ref => {
        // Simple heuristic: take the first word or two. 
        // Real implementation needs a bible book parser.
        // Let's just count unique reference strings for now as a proxy, 
        // or try to split by space.
        const book = ref.split(' ')[0]; // Very naive
        if (book) uniqueBooks.add(book);
      });
    });
    // Let's assume 66 books. This is just an estimate.
    const coverage = Math.min(100, Math.round((uniqueBooks.size / 66) * 100));

    setStats({
      totalSermons,
      aiGenerated: thisMonthSermons,
      bibleReferences: totalRefs,
      avgDuration,
      bibleCoverage: coverage,
      uniqueBooks: uniqueBooks.size
    });
  };

  const statCards = [
    {
      title: t('stats.totalSermons.title'),
      value: stats.totalSermons.toString(),
      description: t('stats.totalSermons.description'),
      icon: FileText,
      iconBg: 'bg-primary/10',
      iconColor: 'text-primary',
    },
    {
      title: t('stats.newThisMonth.title'),
      value: stats.aiGenerated.toString(),
      description: t('stats.newThisMonth.description'),
      icon: Sparkles,
      iconBg: 'bg-accent/10',
      iconColor: 'text-accent',
    },
    {
      title: t('stats.avgTime.title'),
      value: `${stats.avgDuration} ${t('stats.avgTime.minutes')}`,
      description: t('stats.avgTime.description'),
      icon: Clock,
      iconBg: 'bg-orange-100',
      iconColor: 'text-orange-600',
    },
    {
      title: t('stats.bibleCoverage.title'),
      value: `${stats.bibleCoverage}%`,
      description: `${stats.uniqueBooks} ${t('stats.bibleCoverage.description')}`,
      icon: BookOpen,
      iconBg: 'bg-green-100',
      iconColor: 'text-green-600',
    },
  ];

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
      <div className="rounded-2xl border-2 border-muted/30 bg-gradient-to-b from-background via-background to-muted/10 p-6 md:p-8 shadow-sm">
        <div className="space-y-8">
          {/* Header with gradient */}
          <div className="border-b pb-6">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight bg-gradient-to-r from-primary via-purple-600 to-primary bg-clip-text text-transparent pb-1">
              {t('header.title')}
            </h2>
            <p className="text-muted-foreground mt-2">
              {t('header.subtitle')}
            </p>
          </div>

          {/* Activation Banner - Show only for users with 0 sermons */}
          {onboarding.shouldShowBanner && <ActivationBanner />}

          {/* Stats Grid */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {statCards.map((stat) => (
              <Card 
                key={stat.title}
                className="group relative overflow-hidden transition-all duration-300 hover:shadow-xl hover:scale-[1.03] hover:-translate-y-1 cursor-pointer border-2 border-muted/50 hover:border-primary/30 bg-gradient-to-br from-card to-card/80"
              >
                {/* Subtle gradient overlay on hover */}
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                
                <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                    {stat.title}
                  </CardTitle>
                  <div className={`p-2.5 rounded-xl ${stat.iconBg} group-hover:scale-110 transition-transform duration-300`}>
                    <stat.icon className={`h-4 w-4 ${stat.iconColor}`} />
                  </div>
                </CardHeader>
                <CardContent className="relative">
                  <div className="text-2xl font-bold">{stat.value}</div>
                  <p className="text-xs text-muted-foreground mt-1">{stat.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
            {/* Recent Activity / Sermons */}
            <Card className="col-span-4 border-2 border-muted/50 shadow-md bg-gradient-to-br from-card to-card/80">
              <CardHeader>
                <CardTitle className="text-xl">{t('recentSermons.title')}</CardTitle>
                <CardDescription>
                  {t('recentSermons.subtitle')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {sermons.slice(0, 5).map((sermon) => (
                    <div key={sermon.id} className="flex items-center justify-between border-b pb-3 last:border-0 last:pb-0 hover:bg-muted/30 rounded-lg px-3 py-2 transition-colors -mx-3">
                      <div className="space-y-1 flex-1">
                        <p 
                          className="text-sm font-medium leading-none cursor-pointer hover:text-primary hover:underline transition-colors"
                          onClick={() => navigate(`/dashboard/sermons/${sermon.id}`)}
                        >
                          {sermon.title}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(sermon.updatedAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                        sermon.status === 'published' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                        sermon.status === 'draft' ? 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300' :
                        'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                      }`}>
                        {sermon.status === 'published' ? t('recentSermons.status.published') : 
                         sermon.status === 'draft' ? t('recentSermons.status.draft') : 
                         t('recentSermons.status.archived')}
                      </div>
                    </div>
                  ))}
                {sermons.length === 0 && (
                  <div className="text-center py-12">
                    <div className="flex justify-center mb-4">
                      <div className="bg-purple-100 dark:bg-purple-900/30 p-4 rounded-full">
                        <Sparkles className="h-8 w-8 text-purple-600 dark:text-purple-400" />
                      </div>
                    </div>
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
                      ¡Crea tu primer sermón!
                    </h3>
                    <p className="text-muted-foreground mb-4 max-w-sm mx-auto">
                      Comienza tu jornada con nuestra asistente de IA para preparación homilética
                    </p>
                    <Button 
                      onClick={handleCreateSermon}
                      className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                    >
                      <Sparkles className="h-4 w-4 mr-2" />
                      Generar sermón
                    </Button>
                  </div>
                )}
                </div>
              </CardContent>
            </Card>

            {/* Bible Coverage Progress */}
            <Card className="col-span-3 border-2 border-muted/50 shadow-md bg-gradient-to-br from-card to-card/80">
              <CardHeader>
                <CardTitle className="text-xl">{t('bibleProgress.title')}</CardTitle>
                <CardDescription>
                  {t('bibleProgress.subtitle')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-8">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{t('bibleProgress.oldTestament')}</span>
                    <span className="text-muted-foreground">--%</span>
                  </div>
                  <Progress value={0} className="h-2" />
                  <p className="text-xs text-muted-foreground">{t('bibleProgress.comingSoon')}</p>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{t('bibleProgress.newTestament')}</span>
                    <span className="text-muted-foreground">--%</span>
                  </div>
                  <Progress value={0} className="h-2" />
                </div>

                <div className="pt-4 border-t">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <TrendingUp className="h-4 w-4" />
                    <span>{t('bibleProgress.yearlyGoal')}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Onboarding Modals */}
      <OnboardingWelcomeModal 
        isOpen={showWelcome}
        onClose={() => setShowWelcome(false)}
      />
      
      <CelebrationModal
        isOpen={showCelebration}
        onClose={() => setShowCelebration(false)}
      />

      {/* Upgrade Required Modal */}
      <UpgradeRequiredModal
        open={showUpgradeModal}
        onOpenChange={setShowUpgradeModal}
        reason={upgradeReason.reason}
        limitType={upgradeReason.limitType}
        currentLimit={upgradeReason.currentLimit}
      />
    </div>
  );
}
