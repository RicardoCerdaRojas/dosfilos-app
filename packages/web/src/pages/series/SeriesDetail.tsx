import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, LayoutDashboard, List, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PlanDashboard } from '@/components/plan/PlanDashboard';
import { CalendarView } from '@/components/plan/CalendarView';
import { AddSermonDialog } from '@/components/plan/AddSermonDialog';
import { useSeriesData } from '@/hooks/useSeriesData';
import { Badge } from '@/components/ui/badge';

export function SeriesDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<'dashboard' | 'calendar'>('dashboard');
  
  const {
    series,
    sermonItems,
    loading,
    handleStartDraft,
    handleContinueEditing,
    handleUpdateSermonDate,
    handleDeleteSermon,
    handleMarkComplete,
    reloadData
  } = useSeriesData(id);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!series) return null;

  const plannedCount = sermonItems.filter(s => s.status === 'planned').length;
  const inProgressCount = sermonItems.filter(s => s.status === 'in_progress').length;
  const completedCount = sermonItems.filter(s => s.status === 'complete').length;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-4">
        <Button variant="ghost" className="pl-0" onClick={() => navigate('/dashboard/plans')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver a Planes
        </Button>
        
        <div className="flex flex-col md:flex-row gap-6 items-start">
          {series.coverUrl && (
            <div className="w-full md:w-48 h-48 rounded-lg overflow-hidden shadow-md shrink-0">
              <img src={series.coverUrl} alt={series.title} className="w-full h-full object-cover" />
            </div>
          )}
          <div className="flex-1 space-y-3">
            <h1 className="text-3xl font-bold font-serif">{series.title}</h1>
            <p className="text-muted-foreground text-lg">{series.description}</p>
            <div className="flex items-center gap-3 pt-2 flex-wrap">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                {new Date(series.startDate).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
              </div>
              <Badge variant="secondary">{sermonItems.length} sermones</Badge>
              {plannedCount > 0 && (
                <Badge variant="outline" className="border-slate-400 text-slate-600">
                  {plannedCount} planificados
                </Badge>
              )}
              {inProgressCount > 0 && (
                <Badge variant="outline" className="border-amber-500 text-amber-600">
                  {inProgressCount} en desarrollo
                </Badge>
              )}
              {completedCount > 0 && (
                <Badge variant="outline" className="border-green-500 text-green-600">
                  {completedCount} listos
                </Badge>
              )}
            </div>
          </div>
          <Button onClick={() => navigate(`/dashboard/plans/${series.id}/edit`)}>
            Editar Planes
          </Button>
        </div>
      </div>

      {/* View Tabs */}
      <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'dashboard' | 'calendar')}>
        <div className="flex items-center justify-between border-b pb-4">
          <TabsList>
            <TabsTrigger value="dashboard">
              <LayoutDashboard className="h-4 w-4 mr-2" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="calendar">
              <Calendar className="h-4 w-4 mr-2" />
              Calendario
            </TabsTrigger>
          </TabsList>
          
          <AddSermonDialog series={series} onSermonAdded={reloadData} />
        </div>

        {/* Dashboard View */}
        <TabsContent value="dashboard" className="mt-6">
          <PlanDashboard
            sermons={sermonItems}
            plannedCount={plannedCount}
            inProgressCount={inProgressCount}
            completedCount={completedCount}
            onStartDraft={handleStartDraft}
            onContinue={handleContinueEditing}
            onFixAlert={(type) => {
              if (type === 'without-date' || type === 'urgent') {
                setViewMode('calendar');
              }
            }}
          />
        </TabsContent>

        {/* Calendar View */}
        <TabsContent value="calendar" className="mt-6">
          <CalendarView
            sermons={sermonItems}
            onStartDraft={handleStartDraft}
            onContinue={handleContinueEditing}
            onUpdateDate={handleUpdateSermonDate}
            onDelete={handleDeleteSermon}
            onMarkComplete={handleMarkComplete}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
