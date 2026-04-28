import React from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, MapPin, Plus } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';
import type { SermonEntity, SermonSeriesEntity } from '@dosfilos/domain';

interface SermonHistoryDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    sermon: SermonEntity;
    series: SermonSeriesEntity | null;
    onAddLog: () => void;
}

export const SermonHistoryDialog: React.FC<SermonHistoryDialogProps> = ({
    open,
    onOpenChange,
    sermon,
    series,
    onAddLog,
}) => {
    const { t, i18n } = useTranslation('sermonDetail');
    const navigate = useNavigate();

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{t('history.title')}</DialogTitle>
                    <DialogDescription>{t('history.description')}</DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {series && (
                        <div className="space-y-2 pb-4 border-b">
                            <div className="flex items-center gap-2 text-primary font-medium text-sm">
                                <BookOpen className="h-4 w-4" />
                                <h3>{t('series.partOf')}</h3>
                            </div>
                            <div>
                                <h4
                                    className="font-bold text-base cursor-pointer hover:underline"
                                    onClick={() => navigate(`/dashboard/plans/${series.id}`)}
                                >
                                    {series.title}
                                </h4>
                                <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                                    {series.description}
                                </p>
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                className="w-full"
                                onClick={() => navigate(`/dashboard/plans/${series.id}`)}
                            >
                                {t('series.viewFull')}
                            </Button>
                        </div>
                    )}

                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h4 className="text-sm font-medium text-muted-foreground">{t('history.logTitle')}</h4>
                            <Button variant="ghost" size="sm" onClick={onAddLog}>
                                <Plus className="h-4 w-4 mr-2" />
                                {t('history.addLog')}
                            </Button>
                        </div>

                        {(!sermon.preachingHistory || sermon.preachingHistory.length === 0) ? (
                            <p className="text-sm text-muted-foreground text-center py-4 bg-muted/30 rounded-lg">
                                {t('history.empty')}
                            </p>
                        ) : (
                            sermon.preachingHistory.map((log, index) => (
                                <div key={index} className="text-sm border-l-2 border-primary/30 pl-3 space-y-1 py-1">
                                    <div className="font-medium flex items-center justify-between">
                                        <span>{new Date(log.date || new Date()).toLocaleDateString(i18n.language)}</span>
                                        <span className="text-xs bg-muted px-2 py-0.5 rounded-full">{log.durationMinutes} min</span>
                                    </div>
                                    <div className="flex items-center gap-1 text-muted-foreground">
                                        <MapPin className="h-3 w-3" />
                                        <span>{log.location}</span>
                                    </div>
                                    {log.notes && (
                                        <p className="text-xs text-muted-foreground italic mt-1 bg-muted/20 p-2 rounded">
                                            "{log.notes}"
                                        </p>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};
