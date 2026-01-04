import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, LayoutDashboard, Calendar } from 'lucide-react';
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
    <div className="space-y-0">
      {/* Clean Image Banner */}
      {series.coverUrl && (
        <div 
          className="relative -mx-6 -mt-6 h-48 bg-cover bg-center"
          style={{ backgroundImage: `url(${series.coverUrl})` }}
        >
          {/* Subtle gradient at bottom for smooth transition */}
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background/80" />
          
          {/* Back button and Edit button positioned over image */}
          <div className="relative h-full flex items-start justify-between p-6">
            <Button 
              variant="ghost" 
              className="text-white hover:bg-white/20 bg-black/30 backdrop-blur-sm"
              onClick={() => navigate('/dashboard/plans')}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver a Planes
            </Button>
            
            <Button 
              onClick={() => navigate(`/dashboard/plans/${series.id}/edit`)}
              className="bg-white text-slate-900 hover:bg-white/90 shadow-lg"
            >
              Editar Planes
            </Button>
          </div>
        </div>
      )}
      
      {/* Content Section - Clean and Spacious */}
      <div className="px-6 pt-8 pb-6 space-y-6">
        {/* Breadcrumb for plans without image */}
        {!series.coverUrl && (
          <Button variant="ghost" className="pl-0" onClick={() => navigate('/dashboard/plans')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver a Planes
          </Button>
        )}
        
        {/* Title and Description */}
        <div className="space-y-4 max-w-4xl">
          <div className="space-y-2">
            <h1 className="text-4xl font-bold font-serif leading-tight text-slate-900">
              {series.title}
            </h1>
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4" />
                <span>
                  {new Date(series.startDate).toLocaleDateString('es-ES', { 
                    month: 'long', 
                    year: 'numeric' 
                  })}
                </span>
              </div>
              <span>•</span>
              <span>{sermonItems.length} {sermonItems.length === 1 ? 'sermón' : 'sermones'}</span>
            </div>
          </div>
          
          {series.description && (
            <p className="text-lg text-muted-foreground leading-relaxed">
              {series.description}
            </p>
          )}
        </div>
        
        {/* Stats Badges */}
        <div className="flex items-center gap-2 flex-wrap">
          {plannedCount > 0 && (
            <Badge variant="outline" className="border-slate-300 text-slate-700 px-3 py-1">
              {plannedCount} planificados
            </Badge>
          )}
          {inProgressCount > 0 && (
            <Badge variant="outline" className="border-amber-400 text-amber-700 bg-amber-50 px-3 py-1">
              {inProgressCount} en desarrollo
            </Badge>
          )}
          {completedCount > 0 && (
            <Badge variant="outline" className="border-green-400 text-green-700 bg-green-50 px-3 py-1">
              {completedCount} completados
            </Badge>
          )}
        </div>
        
        {/* Edit button for plans without image */}
        {!series.coverUrl && (
          <div>
            <Button onClick={() => navigate(`/dashboard/plans/${series.id}/edit`)}>
              Editar Planes
            </Button>
          </div>
        )}
      </div>

      {/* View Tabs */}
      <div className="px-6">
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
    </div>
  );
}
