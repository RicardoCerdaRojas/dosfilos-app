import { useState } from 'react';
import { WorkflowPhase, LibraryResourceEntity } from '@dosfilos/domain';
import { libraryService } from '@dosfilos/application';
import { useTranslation } from '@/i18n';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { BookOpen, Mic2, PenTool, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface PhasePreferenceModalProps {
    resource: LibraryResourceEntity;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onUpdate: (resource: LibraryResourceEntity) => void;
}

// Phase visual config — labels + descriptions translated via i18n at render
// time, brand colours sourced from `phase-*` semantic tokens.
const phaseConfig: Array<{
    phase: WorkflowPhase;
    icon: typeof BookOpen;
    color: string;
    i18nKey: 'exegesis' | 'homiletics' | 'drafting';
}> = [
    { phase: WorkflowPhase.EXEGESIS, icon: BookOpen, color: 'text-phase-exegesis', i18nKey: 'exegesis' },
    { phase: WorkflowPhase.HOMILETICS, icon: Mic2, color: 'text-phase-homiletics', i18nKey: 'homiletics' },
    { phase: WorkflowPhase.DRAFTING, icon: PenTool, color: 'text-phase-drafting', i18nKey: 'drafting' },
];

export function PhasePreferenceModal({
    resource,
    open,
    onOpenChange,
    onUpdate
}: PhasePreferenceModalProps) {
    const { t } = useTranslation('library');
    const [selectedPhases, setSelectedPhases] = useState<WorkflowPhase[]>(
        resource.preferredForPhases || []
    );
    const [isSaving, setIsSaving] = useState(false);

    const handleTogglePhase = (phase: WorkflowPhase) => {
        setSelectedPhases(prev =>
            prev.includes(phase)
                ? prev.filter(p => p !== phase)
                : [...prev, phase]
        );
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            // Call library service to update the resource
            await libraryService.updateResource(resource.id, {
                preferredForPhases: selectedPhases
            } as any);  // Cast to any since type doesn't include preferredForPhases yet

            // Create updated resource by spreading original
            const updatedResource = {
                ...resource,
                preferredForPhases: selectedPhases
            } as LibraryResourceEntity;

            onUpdate(updatedResource);
            toast.success(t('phaseModal.toastSuccess'));
            onOpenChange(false);
        } catch (error) {
            console.error('Error updating phase preferences:', error);
            toast.error(t('phaseModal.toastError'));
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>{t('phaseModal.title')}</DialogTitle>
                    <DialogDescription>
                        {t('phaseModal.description')}
                    </DialogDescription>
                </DialogHeader>

                <div className="py-4">
                    <p className="text-sm text-muted-foreground mb-4 line-clamp-1">
                        <strong>{resource.title}</strong> — {resource.author}
                    </p>

                    <div className="space-y-3">
                        {phaseConfig.map(({ phase, icon: Icon, color, i18nKey }) => (
                            <div
                                key={phase}
                                className="flex items-start gap-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors"
                                onClick={() => handleTogglePhase(phase)}
                            >
                                <Checkbox
                                    checked={selectedPhases.includes(phase)}
                                    onCheckedChange={() => handleTogglePhase(phase)}
                                    className="mt-0.5"
                                />
                                <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                        <Icon className={`h-4 w-4 ${color}`} />
                                        <Label className="font-medium cursor-pointer">
                                            {t(`phaseModal.phases.${i18nKey}Label`)}
                                        </Label>
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        {t(`phaseModal.phases.${i18nKey}Description`)}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        {t('phaseModal.cancel')}
                    </Button>
                    <Button onClick={handleSave} disabled={isSaving}>
                        {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                        {t('phaseModal.save')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
