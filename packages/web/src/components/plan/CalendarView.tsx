import { useState, useMemo } from 'react';
import { SermonItem } from '@/hooks/useSeriesData';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Wand2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SermonDetailModal } from './SermonDetailModal';

interface CalendarViewProps {
  sermons: SermonItem[];
  onStartDraft: (sermon: SermonItem) => void;
  onContinue: (draftId: string) => void;
  onUpdateDate?: (sermonId: string, newDate: Date | null) => void;
}

const DAYS_OF_WEEK = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

function getDaysInMonth(year: number, month: number): Date[] {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const days: Date[] = [];
  
  // Add empty slots for days before month starts
  const startDayOfWeek = firstDay.getDay();
  for (let i = 0; i < startDayOfWeek; i++) {
    days.push(new Date(year, month, -startDayOfWeek + i + 1));
  }
  
  // Add all days in month
  for (let day = 1; day <= lastDay.getDate(); day++) {
    days.push(new Date(year, month, day));
  }
  
  // Add empty slots to complete the grid (6 weeks * 7 days = 42)
  while (days.length < 42) {
    const lastDate = days[days.length - 1];
    days.push(new Date(lastDate.getFullYear(), lastDate.getMonth(), lastDate.getDate() + 1));
  }
  
  return days;
}

function isSameDay(date1: Date, date2: Date): boolean {
  return date1.getDate() === date2.getDate() &&
         date1.getMonth() === date2.getMonth() &&
         date1.getFullYear() === date2.getFullYear();
}

export function CalendarView({ sermons, onStartDraft, onContinue, onUpdateDate }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSermon, setSelectedSermon] = useState<SermonItem | null>(null);
  
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();
  const days = getDaysInMonth(currentYear, currentMonth);
  const today = new Date();
  

  // Filter sermons by  search term
  const filteredSermons = useMemo(() => {
    if (!searchTerm.trim()) return sermons;
    const lower = searchTerm.toLowerCase();
    return sermons.filter(sermon => 
      sermon.title.toLowerCase().includes(lower) ||
      (sermon.passage && sermon.passage.toLowerCase().includes(lower))
    );
  }, [sermons, searchTerm]);
  // Group sermons by date
  const sermonsByDate = new Map<string, SermonItem[]>();
  const sermonsWithoutDate: SermonItem[] = [];
  
  sermons.forEach(sermon => {
    if (sermon.scheduledDate) {
      const dateKey = new Date(sermon.scheduledDate).toDateString();
      if (!sermonsByDate.has(dateKey)) {
        sermonsByDate.set(dateKey, []);
      }
      sermonsByDate.get(dateKey)!.push(sermon);
    } else {
      sermonsWithoutDate.push(sermon);
    }
  });
  
  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth - 1, 1));
  };
  
  const goToNextMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth + 1, 1));
  };
  
  const goToToday = () => {
    setCurrentDate(new Date());
  };
  
  const getStatusColor = (status: SermonItem['status']) => {
    switch (status) {
      case 'planned': return 'bg-slate-100 border-slate-300 text-slate-700';
      case 'in_progress': return 'bg-amber-100 border-amber-300 text-amber-700';
      case 'complete': return 'bg-green-100 border-green-300 text-green-700';
    }
  };

  return (
    <>
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      {/* Calendar - Main Area */}
      <div className="lg:col-span-3">
        <Card className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">
              {MONTHS[currentMonth]} {currentYear}
            </h2>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={goToToday}>
                Hoy
              </Button>
              <Button variant="ghost" size="sm" onClick={goToPreviousMonth}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={goToNextMonth}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Days of Week */}
          <div className="grid grid-cols-7 gap-2 mb-2">
            {DAYS_OF_WEEK.map(day => (
              <div key={day} className="text-center text-sm font-medium text-muted-foreground py-2">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-2">
            {days.map((day, index) => {
              const isCurrentMonth = day.getMonth() === currentMonth;
              const isToday = isSameDay(day, today);
              const dateKey = day.toDateString();
              const daySermons = sermonsByDate.get(dateKey) || [];
              
              return (
                <div
                  key={index}
                  className={cn(
                    'min-h-[100px] p-2 rounded-lg border transition-all',
                    isCurrentMonth ? 'bg-background' : 'bg-muted/30',
                    isToday && 'ring-2 ring-primary',
                    'hover:shadow-md cursor-pointer'
                  )}
                  onClick={() => setSelectedDate(day)}
                >
                  <div className={cn(
                    'text-sm font-medium mb-1',
                    isCurrentMonth ? 'text-foreground' : 'text-muted-foreground',
                    isToday && 'text-primary font-bold'
                  )}>
                    {day.getDate()}
                  </div>
                  
                  {/* Sermons for this day */}
                  <div className="space-y-1">
                    {daySermons.slice(0, 3).map(sermon => (
                      <div
                        key={sermon.id}
                        className={cn(
                          'text-xs p-1 rounded border truncate cursor-pointer hover:shadow-sm transition-all',
                          getStatusColor(sermon.status)
                        )}
                        title={sermon.title}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedSermon(sermon);
                        }}
                      >
                        {sermon.title}
                      </div>
                    ))}
                    {daySermons.length > 3 && (
                      <div className="text-xs text-muted-foreground">
                        +{daySermons.length - 3} más
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {/* Sidebar - Sermon List */}
      <div className="lg:col-span-1">
        <Card className="p-0 sticky top-6 max-h-[calc(100vh-8rem)] flex flex-col">
          <Tabs defaultValue="unscheduled" className="flex flex-col h-full">
            <div className="p-4 pb-0">
              <TabsList className="w-full grid grid-cols-2">
                <TabsTrigger value="unscheduled" className="text-xs">
                  Sin Fecha ({sermonsWithoutDate.length})
                </TabsTrigger>
                <TabsTrigger value="all" className="text-xs">
                  Todos ({sermons.length})
                </TabsTrigger>
              </TabsList>
            </div>

            {/* Sin Fecha Tab */}
            <TabsContent value="unscheduled" className="flex-1 overflow-hidden p-4 pt-3 m-0">
              {sermonsWithoutDate.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Todos los sermones tienen fecha programada
                </p>
              ) : (
                <div className="space-y-2 overflow-y-auto h-full">
                  {sermonsWithoutDate.map(sermon => (
                    <Card
                      key={sermon.id}
                      className={cn(
                        'p-3 cursor-pointer hover:shadow-md transition-all border-l-4',
                        sermon.status === 'planned' && 'border-l-slate-400',
                        sermon.status === 'in_progress' && 'border-l-amber-500',
                        sermon.status === 'complete' && 'border-l-green-500'
                      )}
                      onClick={() => setSelectedSermon(sermon)}
                    >
                      <div className="text-sm font-medium mb-1 line-clamp-2">
                        {sermon.title}
                      </div>
                      {sermon.passage && (
                        <div className="text-xs text-muted-foreground mb-2">
                          {sermon.passage}
                        </div>
                      )}
                      <div className="flex gap-1">
                        {sermon.status === 'planned' && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full text-xs h-7"
                            onClick={() => onStartDraft(sermon)}
                          >
                            <Wand2 className="h-3 w-3 mr-1" />
                            Desarrollar
                          </Button>
                        )}
                        {sermon.status === 'in_progress' && sermon.draftId && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full text-xs h-7"
                            onClick={() => onContinue(sermon.draftId!)}
                          >
                            Continuar
                          </Button>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Todos Tab */}
            <TabsContent value="all" className="flex-1 overflow-hidden p-4 pt-3 m-0 flex flex-col">
              {/* Search */}
              <div className="mb-3">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Buscar sermón..."
                    className="w-full px-3 py-2 text-sm border rounded-md pr-8"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  {searchTerm && (
                    <button
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      onClick={() => setSearchTerm('')}
                    >
                      ×
                    </button>
                  )}
                </div>
              </div>

              {/* All Sermons List */}
              <div className="space-y-1 overflow-y-auto flex-1">
                {filteredSermons.map(sermon => (
                  <div
                    key={sermon.id}
                    className={cn(
                      'p-2 rounded-md cursor-pointer hover:bg-accent transition-colors border-l-2',
                      sermon.status === 'planned' && 'border-l-slate-400',
                      sermon.status === 'in_progress' && 'border-l-amber-500',
                      sermon.status === 'complete' && 'border-l-green-500'
                    )}
                    onClick={() => setSelectedSermon(sermon)}
                  >
                    <div className="text-sm font-medium line-clamp-1 mb-0.5">
                      {sermon.title}
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>
                        {sermon.scheduledDate ? (
                          new Date(sermon.scheduledDate).toLocaleDateString('es-ES', {
                            day: 'numeric',
                            month: 'short'
                          })
                        ) : (
                          <span className="text-amber-600">Sin fecha</span>
                        )}
                      </span>
                      {sermon.passage && (
                        <span className="text-xs truncate ml-2">{sermon.passage}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </Card>
      </div>
    </div>

    {/* Sermon Detail Modal */}
    <SermonDetailModal
      sermon={selectedSermon}
      isOpen={!!selectedSermon}
      onClose={() => setSelectedSermon(null)}
      onStartDraft={onStartDraft}
      onContinue={onContinue}
      onUpdateDate={onUpdateDate}
    />
    </>
  );
}
