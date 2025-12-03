import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, Sparkles, BookOpen, TrendingUp } from 'lucide-react';

export function DashboardPage() {
  const stats = [
    {
      title: 'Total Sermones',
      value: '0',
      description: 'Sermones guardados',
      icon: FileText,
      iconBg: 'bg-primary/10',
      iconColor: 'text-primary',
    },
    {
      title: 'Generados con IA',
      value: '0',
      description: 'Este mes',
      icon: Sparkles,
      iconBg: 'bg-accent/10',
      iconColor: 'text-accent',
    },
    {
      title: 'Referencias Bíblicas',
      value: '0',
      description: 'Total utilizadas',
      icon: BookOpen,
      iconBg: 'bg-secondary/10',
      iconColor: 'text-secondary',
    },
    {
      title: 'Actividad',
      value: '+0%',
      description: 'vs. mes anterior',
      icon: TrendingUp,
      iconBg: 'bg-muted',
      iconColor: 'text-muted-foreground',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-muted-foreground">
          Resumen de tu actividad en DosFilos.app
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
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

      {/* Recent Activity */}
      <Card className="border-muted/50">
        <CardHeader>
          <CardTitle>Actividad Reciente</CardTitle>
          <CardDescription>
            Tus últimas acciones en la plataforma
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            No hay actividad reciente
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
