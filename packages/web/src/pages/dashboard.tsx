import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, Sparkles, BookOpen, TrendingUp, Clock, MapPin } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useFirebase } from '@/context/firebase-context';
import { sermonService } from '@dosfilos/application';
import { SermonEntity } from '@dosfilos/domain';
import { Progress } from '@/components/ui/progress';

export function DashboardPage() {
  const { user } = useFirebase();
  const [sermons, setSermons] = useState<SermonEntity[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalSermons: 0,
    aiGenerated: 0, // We can approximate this by checking if it has wizardProgress or created via wizard
    bibleReferences: 0,
    avgDuration: 0,
    bibleCoverage: 0,
    uniqueBooks: 0
  });

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
    } finally {
      setLoading(false);
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
      title: 'Total Sermones',
      value: stats.totalSermons.toString(),
      description: 'Sermones guardados',
      icon: FileText,
      iconBg: 'bg-primary/10',
      iconColor: 'text-primary',
    },
    {
      title: 'Nuevos este Mes',
      value: stats.aiGenerated.toString(),
      description: 'Sermones creados',
      icon: Sparkles,
      iconBg: 'bg-accent/10',
      iconColor: 'text-accent',
    },
    {
      title: 'Tiempo Promedio',
      value: `${stats.avgDuration} min`,
      description: 'Duración de predicación',
      icon: Clock,
      iconBg: 'bg-orange-100',
      iconColor: 'text-orange-600',
    },
    {
      title: 'Cobertura Bíblica',
      value: `${stats.bibleCoverage}%`,
      description: `${stats.uniqueBooks} libros citados (aprox)`,
      icon: BookOpen,
      iconBg: 'bg-green-100',
      iconColor: 'text-green-600',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-muted-foreground">
          Resumen de tu actividad en DosFilos.Preach
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Card 
            key={stat.title}
            className="transition-all hover:shadow-lg hover:scale-[1.02] cursor-pointer border-muted/50"
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <div className={`p-2 rounded-lg ${stat.iconBg}`}>
                <stat.icon className={`h-4 w-4 ${stat.iconColor}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">{stat.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        {/* Recent Activity / Sermons */}
        <Card className="col-span-4 border-muted/50">
          <CardHeader>
            <CardTitle>Sermones Recientes</CardTitle>
            <CardDescription>
              Últimos sermones modificados
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {sermons.slice(0, 5).map((sermon) => (
                <div key={sermon.id} className="flex items-center justify-between border-b pb-2 last:border-0 last:pb-0">
                  <div className="space-y-1">
                    <p className="text-sm font-medium leading-none">{sermon.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(sermon.updatedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className={`text-xs px-2 py-1 rounded-full ${
                    sermon.status === 'published' ? 'bg-green-100 text-green-700' :
                    sermon.status === 'draft' ? 'bg-gray-100 text-gray-700' :
                    'bg-yellow-100 text-yellow-700'
                  }`}>
                    {sermon.status === 'published' ? 'Publicado' : sermon.status === 'draft' ? 'Borrador' : 'Archivado'}
                  </div>
                </div>
              ))}
              {sermons.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No hay sermones recientes
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Bible Coverage Progress */}
        <Card className="col-span-3 border-muted/50">
          <CardHeader>
            <CardTitle>Progreso Bíblico</CardTitle>
            <CardDescription>
              Cobertura estimada de la Biblia
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-8">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">Antiguo Testamento</span>
                <span className="text-muted-foreground">--%</span>
              </div>
              <Progress value={0} className="h-2" />
              <p className="text-xs text-muted-foreground">Próximamente: desglose detallado</p>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">Nuevo Testamento</span>
                <span className="text-muted-foreground">--%</span>
              </div>
              <Progress value={0} className="h-2" />
            </div>

            <div className="pt-4 border-t">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <TrendingUp className="h-4 w-4" />
                <span>Meta anual: Predicar 10 libros nuevos</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
