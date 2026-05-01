import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    ArrowLeft,
    LayoutDashboard,
    Calendar,
    BookOpenText,
    Loader2,
    NotebookPen,
    ExternalLink,
    MessageCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PlanDashboard } from '@/components/plan/PlanDashboard';
import { CalendarView } from '@/components/plan/CalendarView';
import { AddSermonDialog } from '@/components/plan/AddSermonDialog';
import { EditSermonDialog } from '@/components/plan/EditSermonDialog';
import { useSeriesData } from '@/hooks/useSeriesData';
import { useFirebase } from '@/context/firebase-context';
import { useTranslation } from '@/i18n';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { exegesisService, seriesService } from '@dosfilos/application';
import {
    findBooksByAlias,
    type PlannedSermon,
    type SermonSeriesEntity,
    type SyntacticUnit,
} from '@dosfilos/domain';

export function SeriesDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useFirebase();
  const [viewMode, setViewMode] = useState<'dashboard' | 'calendar'>('dashboard');
  const [editingSermon, setEditingSermon] = useState<any>(null);

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
          style={{ backgroundImage: `url("${series.coverUrl}")` }}
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
                  {series.startDate ? new Date(series.startDate).toLocaleDateString('es-ES', { 
                    month: 'long', 
                    year: 'numeric' 
                  }) : 'Sin fecha'}
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

      {/* Pericope Panel — only when this is a pericope-driven expository series */}
      <PericopeSection
        series={series}
        actorUserId={user?.uid ?? null}
        onChanged={reloadData}
      />

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
            onEditSermon={setEditingSermon}
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

      <EditSermonDialog
         series={series}
         sermon={editingSermon}
         open={!!editingSermon}
         onOpenChange={(open) => !open && setEditingSermon(null)}
         onSermonUpdated={reloadData}
      />
    </div>
  );
}

// ── Pericope panel ──────────────────────────────────────────────────────

/**
 * Surfaces the planned sermons that came from the pericope assistant
 * (i.e. the ones with `syntacticUnit` set) so the user can promote any
 * of them to a full exegetical paper. Hidden when the series wasn't
 * built via the assistant — keeps the legacy planner detail view
 * unchanged.
 */
function PericopeSection({
  series,
  actorUserId,
  onChanged,
}: {
  series: SermonSeriesEntity;
  actorUserId: string | null;
  onChanged: () => void;
}) {
  const { t, i18n } = useTranslation('series');
  const planned = series.metadata?.plannedSermons ?? [];
  const pericopes = planned.filter((p): p is PlannedSermon & { syntacticUnit: SyntacticUnit } =>
    Boolean(p.syntacticUnit),
  );
  const navigate = useNavigate();
  const [creating, setCreating] = useState<string | null>(null);

  if (pericopes.length === 0) return null;

  const language: 'es' | 'en' = i18n.language?.split('-')[0] === 'en' ? 'en' : 'es';

  const handleCreatePaper = async (planned: PlannedSermon & { syntacticUnit: SyntacticUnit }) => {
    if (!actorUserId) return;
    setCreating(planned.id);
    try {
      const passage = syntacticUnitToPassage(planned.syntacticUnit);
      if (!passage) {
        throw new Error(t('pericope.panel.toast.bookUnresolved') as string);
      }
      const paper = await exegesisService.createPaper.execute({
        ownerId: actorUserId,
        passage,
        displayLanguage: language,
        title: planned.title,
        assignmentBrief: planned.syntacticUnit.justification ?? null,
        styleGuideId: null,
      });

      // Stamp the planned sermon with the new paperId so the series
      // detail can show "Abrir paper" on subsequent loads (and so the
      // future `series.metadata.plannedSermons[i].status === 'paper-in-progress'`
      // gating works).
      const updated = (series.metadata?.plannedSermons ?? []).map((p) =>
        p.id === planned.id
          ? { ...p, paperId: paper.id, status: 'paper-in-progress' as const }
          : p,
      );
      await seriesService.updateSeries(series.id, {
        metadata: {
          ...series.metadata,
          plannedSermons: updated,
        },
      } as any);

      toast.success(t('pericope.panel.toast.paperCreated') as string);
      onChanged();
      navigate(`/dashboard/exegesis/${paper.id}`);
    } catch (err: any) {
      console.error('[pericope] createPaper failed:', err);
      toast.error(err?.message ?? (t('pericope.panel.toast.paperFailed') as string));
    } finally {
      setCreating(null);
    }
  };

  return (
    <div className="px-6 py-4">
      <section className="rounded-xl border border-emerald-200 dark:border-emerald-900/40 bg-emerald-50/40 dark:bg-emerald-950/10 p-5">
        <header className="flex items-center gap-2 mb-3">
          <BookOpenText className="h-4 w-4 text-emerald-700 dark:text-emerald-300" />
          <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100">
            {t('pericope.panel.title')}
          </h2>
          <Badge variant="outline" className="border-emerald-300 text-emerald-700 dark:text-emerald-300 dark:border-emerald-800/60">
            {pericopes.length}
          </Badge>
        </header>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 max-w-2xl">
          {t('pericope.panel.subtitle')}
        </p>
        <ul className="space-y-2.5">
          {pericopes.map((p) => {
            const passageLabel = formatUnitPassage(p.syntacticUnit);
            const isCreating = creating === p.id;
            const hasPaper = Boolean(p.paperId);
            return (
              <li
                key={p.id}
                className="rounded-lg bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-3 flex items-start gap-3"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-sm font-medium text-slate-800 dark:text-slate-100">
                      {p.title}
                    </span>
                    <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                      {passageLabel}
                    </span>
                    {hasPaper && (
                      <Badge variant="outline" className="border-emerald-400 text-emerald-700 dark:text-emerald-300 dark:border-emerald-800/60">
                        {t('pericope.panel.paperBadge')}
                      </Badge>
                    )}
                  </div>
                  {p.syntacticUnit.justification && (
                    <p className="text-xs text-slate-600 dark:text-slate-400 italic line-clamp-2">
                      {p.syntacticUnit.justification}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      navigate(
                        `/dashboard/faculty/new?seriesId=${series.id}&pericopeId=${p.id}`,
                      )
                    }
                    title={t('pericope.panel.askFaculty') as string}
                    aria-label={t('pericope.panel.askFaculty') as string}
                  >
                    <MessageCircle className="h-3.5 w-3.5" />
                  </Button>
                  {hasPaper ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => navigate(`/dashboard/exegesis/${p.paperId}`)}
                    >
                      <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                      {t('pericope.panel.openPaper')}
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => handleCreatePaper(p)}
                      disabled={isCreating}
                      className="bg-emerald-500 hover:bg-emerald-400 text-slate-900 disabled:opacity-50"
                    >
                      {isCreating ? (
                        <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                      ) : (
                        <NotebookPen className="h-3.5 w-3.5 mr-1.5" />
                      )}
                      {t('pericope.panel.createPaper')}
                    </Button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}

/**
 * Resolves a `SyntacticUnit` into a canonical `PassageReference` by
 * looking up the unit's display name in the bible canon. Returns null
 * when the alias isn't resolvable (which shouldn't happen for assistant-
 * produced units, but the lookup is defensive in case the user edited
 * the title manually).
 */
function syntacticUnitToPassage(unit: SyntacticUnit) {
  const matches = findBooksByAlias(unit.book.toLowerCase().trim());
  if (matches.length === 0) return null;
  const book = matches[0]!;
  return {
    bookId: book.id,
    chapterStart: unit.chapterStart,
    verseStart: unit.verseStart,
    chapterEnd: unit.chapterEnd,
    verseEnd: unit.verseEnd,
  };
}

function formatUnitPassage(unit: SyntacticUnit): string {
  const { book, chapterStart, verseStart, chapterEnd, verseEnd } = unit;
  if (chapterStart === chapterEnd) {
    if (verseStart === verseEnd) return `${book} ${chapterStart}:${verseStart}`;
    return `${book} ${chapterStart}:${verseStart}-${verseEnd}`;
  }
  return `${book} ${chapterStart}:${verseStart}-${chapterEnd}:${verseEnd}`;
}
