import { UserActivitySummary } from '@dosfilos/domain';
import { Card } from '@/components/ui/card';
import { FileText, Check, BookOpen, Upload, Folder, CalendarDays } from 'lucide-react';

interface Props {
    activity: UserActivitySummary;
}

interface MetricItemProps {
    label: string;
    value: number;
    icon: React.ReactNode;
    color?: string;
}

function MetricItem({ label, value, icon, color = 'blue' }: MetricItemProps) {
    const colorClasses = {
        blue: 'text-blue-600 bg-blue-50',
        green: 'text-green-600 bg-green-50',
        purple: 'text-purple-600 bg-purple-50',
        orange: 'text-orange-600 bg-orange-50',
        indigo: 'text-indigo-600 bg-indigo-50',
        pink: 'text-pink-600 bg-pink-50',
    };

    const selectedColor = colorClasses[color as keyof typeof colorClasses] || colorClasses.blue;

    return (
        <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
            <div className={`p-2 rounded-lg ${selectedColor}`}>
                {icon}
            </div>
            <div className="flex-1">
                <p className="text-sm text-slate-600">{label}</p>
                <p className="text-2xl font-bold text-slate-900">{value.toLocaleString()}</p>
            </div>
        </div>
    );
}

export function UserActivityCard({ activity }: Props) {
    return (
        <Card className="p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Resumen de Actividad</h3>
            
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <MetricItem
                    label="Sermones"
                    value={activity.totalSermonsCreated}
                    icon={<FileText className="h-5 w-5" />}
                    color="blue"
                />
                
                <MetricItem
                    label="Publicados"
                    value={activity.totalSermonsPublished}
                    icon={<Check className="h-5 w-5" />}
                    color="green"
                />
                
                <MetricItem
                    label="Greek Tutor"
                    value={activity.totalGreekSessions}
                    icon={<BookOpen className="h-5 w-5" />}
                    color="purple"
                />
                
                <MetricItem
                    label="Borradores"
                    value={activity.totalSeriesCreated}
                    icon={<FileText className="h-5 w-5" />}
                    color="indigo"
                />
                
                <MetricItem
                    label="Biblioteca"
                    value={activity.totalLibraryUploads}
                    icon={<Upload className="h-5 w-5" />}
                    color="orange"
                />
                
                <MetricItem
                    label="Planes"
                    value={activity.totalPreachingPlans}
                    icon={<CalendarDays className="h-5 w-5" />}
                    color="pink"
                />
            </div>
        </Card>
    );
}
