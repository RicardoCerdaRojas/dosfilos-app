import React from 'react';
import { Clock, MapPin } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useTranslation } from 'react-i18next';

interface LogPreachingDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    logDate: string;
    logLocation: string;
    logDuration: string;
    logNotes: string;
    logging: boolean;
    onDateChange: (value: string) => void;
    onLocationChange: (value: string) => void;
    onDurationChange: (value: string) => void;
    onNotesChange: (value: string) => void;
    onSubmit: () => void;
}

export const LogPreachingDialog: React.FC<LogPreachingDialogProps> = ({
    open,
    onOpenChange,
    logDate,
    logLocation,
    logDuration,
    logNotes,
    logging,
    onDateChange,
    onLocationChange,
    onDurationChange,
    onNotesChange,
    onSubmit,
}) => {
    const { t } = useTranslation('sermonDetail');

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{t('dialogs.log.title')}</DialogTitle>
                    <DialogDescription>{t('dialogs.log.description')}</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="log-date">{t('dialogs.log.date')}</Label>
                            <Input
                                id="log-date"
                                type="date"
                                value={logDate}
                                onChange={(e) => onDateChange(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="log-duration">{t('dialogs.log.duration')}</Label>
                            <div className="relative">
                                <Input
                                    id="log-duration"
                                    type="number"
                                    value={logDuration}
                                    onChange={(e) => onDurationChange(e.target.value)}
                                    className="pl-8"
                                />
                                <Clock className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            </div>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="log-location">{t('dialogs.log.location')}</Label>
                        <div className="relative">
                            <Input
                                id="log-location"
                                value={logLocation}
                                onChange={(e) => onLocationChange(e.target.value)}
                                placeholder={t('dialogs.log.locationPlaceholder')}
                                className="pl-8"
                            />
                            <MapPin className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="log-notes">{t('dialogs.log.notes')}</Label>
                        <Textarea
                            id="log-notes"
                            value={logNotes}
                            onChange={(e) => onNotesChange(e.target.value)}
                            placeholder={t('dialogs.log.notesPlaceholder')}
                            rows={3}
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>{t('dialogs.delete.cancel')}</Button>
                    <Button onClick={onSubmit} disabled={logging || !logLocation}>
                        {logging ? t('dialogs.log.saving') : t('dialogs.log.save')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
