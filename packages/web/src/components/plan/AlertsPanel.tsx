import { PlannedSermon } from '@dosfilos/domain';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, Calendar, Info, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AlertsPanelProps {
  sermons: PlannedSermon[];
  onFixAlert?: (alertType: string, sermonId?: string) => void;
}

interface PlanAlert {
  id: string;
  type: 'warning' | 'info' | 'error';
  title: string;
  message: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

const getDaysUntil = (date: Date): number => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const targetDate = new Date(date);
  targetDate.setHours(0, 0, 0, 0);
  const diff = targetDate.getTime() - today.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
};

export function AlertsPanel({ sermons, onFixAlert }: AlertsPanelProps) {
  const alerts: PlanAlert[] = [];

  // Alert 1: Sermones sin fecha
  const withoutDate = sermons.filter(s => !s.scheduledDate);
  if (withoutDate.length > 0) {
    alerts.push({
      id: 'without-date',
      type: 'warning',
      title: `${withoutDate.length} ${withoutDate.length === 1 ? 'sermón sin fecha' : 'sermones sin fecha'}`,
      message: 'Asigna fechas para una mejor planificación',
      action: onFixAlert ? {
        label: 'Asignar fechas',
        onClick: () => onFixAlert('without-date')
      } : undefined
    });
  }

  // Alert 2: Sermones urgentes sin completar
  const urgentSermons = sermons.filter(s => {
    if (!s.scheduledDate || s.draftId) return false;
    const days = getDaysUntil(s.scheduledDate);
    return days >= 0 && days <= 7;
  });
  if (urgentSermons.length > 0) {
    alerts.push({
      id: 'urgent',
      type: 'error',
      title: `${urgentSermons.length} ${urgentSermons.length === 1 ? 'sermón urgente' : 'sermones urgentes'}`,
      message: 'Programados en los próximos 7 días y aún no iniciados',
      action: onFixAlert ? {
        label: 'Ver sermones',
        onClick: () => onFixAlert('urgent')
      } : undefined
    });
  }

  // Alert 3: Gaps en calendario (más de 14 días sin sermón)
  const sermonsWithDate = sermons
    .filter(s => s.scheduledDate)
    .sort((a, b) => new Date(a.scheduledDate!).getTime() - new Date(b.scheduledDate!).getTime());
  
  let hasGaps = false;
  for (let i = 0; i < sermonsWithDate.length - 1; i++) {
    const current = new Date(sermonsWithDate[i].scheduledDate!);
    const next = new Date(sermonsWithDate[i + 1].scheduledDate!);
    const daysDiff = (next.getTime() - current.getTime()) / (1000 * 60 * 60 * 24);
    if (daysDiff > 14) {
      hasGaps = true;
      break;
    }
  }
  if (hasGaps) {
    alerts.push({
      id: 'gaps',
      type: 'info',
      title: 'Gaps en el calendario',
      message: 'Hay períodos de más de 2 semanas sin sermones programados',
      action: onFixAlert ? {
        label: 'Ver calendario',
        onClick: () => onFixAlert('gaps')
      } : undefined
    });
  }

  // Alert 4: Sermones sin pasaje (si alguno escapó la validación)
  const withoutPassage = sermons.filter(s => !s.passage || s.passage.trim() === '');
  if (withoutPassage.length > 0) {
    alerts.push({
      id: 'without-passage',
      type: 'warning',
      title: `${withoutPassage.length} ${withoutPassage.length === 1 ? 'sermón sin pasaje' : 'sermones sin pasaje'}`,
      message: 'El pasaje bíblico es requerido para cada sermón',
      action: onFixAlert ? {
        label: 'Completar información',
        onClick: () => onFixAlert('without-passage')
      } : undefined
    });
  }

  // If no alerts, show success message
  if (alerts.length === 0) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-3 text-green-600">
          <div className="rounded-full bg-green-100 p-2">
            <Info className="h-5 w-5" />
          </div>
          <div>
            <p className="font-medium">Todo en orden</p>
            <p className="text-sm text-muted-foreground">No hay alertas activas</p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Alertas y Recordatorios</h3>
      <div className="space-y-3">
        {alerts.map((alert) => {
          const Icon = alert.type === 'error' ? AlertCircle :
                      alert.type === 'warning' ? AlertTriangle :
          Info;

          const variant = alert.type === 'error' ? 'destructive' :
                         alert.type === 'warning' ? 'default' :
                         'default';

          return (
            <Alert key={alert.id} variant={variant}>
              <Icon className="h-4 w-4" />
              <AlertDescription className="flex items-center justify-between gap-4">
                <div className="flex-1">
                  <p className="font-medium mb-1">{alert.title}</p>
                  <p className="text-sm opacity-90">{alert.message}</p>
                </div>
                {alert.action && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={alert.action.onClick}
                  >
                    {alert.action.label}
                  </Button>
                )}
              </AlertDescription>
            </Alert>
          );
        })}
      </div>
    </Card>
  );
}
