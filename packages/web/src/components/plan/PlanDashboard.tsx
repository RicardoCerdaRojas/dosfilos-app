import { PlannedSermon } from '@dosfilos/domain';
import { StatCard } from './StatCard';
import { UpcomingSermonsList } from './UpcomingSermonsList';
import { AlertsPanel } from './AlertsPanel';
import { Target, Calendar, Edit, CheckCircle } from 'lucide-react';

interface SermonItem {
  id: string;
  title: string;
  description: string;
  passage?: string;
  scheduledDate?: Date;
  status: 'planned' | 'in_progress' | 'complete';
  draftId?: string;
}

interface PlanDashboardProps {
  sermons: SermonItem[];
  plannedCount: number;
  inProgressCount: number;
  completedCount: number;
  onStartDraft: (sermon: SermonItem) => void;
  onContinue: (draftId: string) => void;
  onFixAlert?: (alertType: string) => void;
}

export function PlanDashboard({
  sermons,
  plannedCount,
  inProgressCount,
  completedCount,
  onStartDraft,
  onContinue,
  onFixAlert
}: PlanDashboardProps) {
  // Calculate next sermon
  const nextSermon = sermons
    .filter(s => s.scheduledDate)
    .sort((a, b) => new Date(a.scheduledDate!).getTime() - new Date(b.scheduledDate!).getTime())
    .find(s => new Date(s.scheduledDate!) >= new Date());

  const nextSermonDays = nextSermon
    ? Math.ceil((new Date(nextSermon.scheduledDate!).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    : null;

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Progreso General"
          value={`${completedCount}/${sermons.length}`}
          icon={Target}
          percentage={sermons.length > 0 ? Math.round((completedCount / sermons.length) * 100) : 0}
          variant="default"
        />
        
        <StatCard
          title="Próximo Sermón"
          value={nextSermon 
            ? new Date(nextSermon.scheduledDate!).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })
            : 'N/A'
          }
          subtitle={nextSermon?.title || ''}
          icon={Calendar}
          urgency={nextSermonDays !== null ? `en ${nextSermonDays} ${nextSermonDays === 1 ? 'día' : 'días'}` : undefined}
          variant={nextSermonDays !== null && nextSermonDays <= 7 ? 'warning' : 'info'}
        />
        
        <StatCard
          title="En Desarrollo"
          value={inProgressCount}
          icon={Edit}
          variant="info"
        />
        
        <StatCard
          title="Completados"
          value={completedCount}
          icon={CheckCircle}
          variant="success"
        />
      </div>

      {/* Upcoming Sermons & Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <UpcomingSermonsList
          sermons={sermons.map(s => ({
            id: s.id,
            week: 0, // Not used in display
            title: s.title,
            description: s.description,
            passage: s.passage || '',
            scheduledDate: s.scheduledDate,
            draftId: s.draftId
          }))}
          onStartDraft={(sermon) => {
            const item = sermons.find(s => s.id === sermon.id);
            if (item) onStartDraft(item);
          }}
          onContinue={onContinue}
        />
        
        <AlertsPanel
          sermons={sermons.map(s => ({
            id: s.id,
            week: 0,
            title: s.title,
            description: s.description,
            passage: s.passage || '',
            scheduledDate: s.scheduledDate,
            draftId: s.draftId
          }))}
          onFixAlert={onFixAlert}
        />
      </div>
    </div>
  );
}
