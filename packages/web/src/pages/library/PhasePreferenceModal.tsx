import { useState } from 'react';
import { WorkflowPhase, LibraryResourceEntity } from '@dosfilos/domain';
import { libraryService } from '@dosfilos/application';
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

const phaseConfig = [
    {
        phase: WorkflowPhase.EXEGESIS,
        label: 'Exégesis',
        icon: BookOpen,
        color: 'text-blue-500',
        description: 'El experto en análisis del texto bíblico original'
    },
    {
        phase: WorkflowPhase.HOMILETICS,
        label: 'Homilética',
        icon: Mic2,
        color: 'text-purple-500',
        description: 'El experto en estructurar el sermón'
    },
    {
        phase: WorkflowPhase.DRAFTING,
        label: 'Redacción',
        icon: PenTool,
        color: 'text-green-500',
        description: 'El experto en redactar el contenido final'
    }
];

export function PhasePreferenceModal({
    resource,
    open,
    onOpenChange,
    onUpdate
}: PhasePreferenceModalProps) {
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
            toast.success('Preferencias de fase actualizadas');
            onOpenChange(false);
        } catch (error) {
            console.error('Error updating phase preferences:', error);
            toast.error('Error al actualizar preferencias');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Fases Preferidas</DialogTitle>
                    <DialogDescription>
                        Selecciona en qué fases del sermón este documento será prioritario para RAG
                    </DialogDescription>
                </DialogHeader>
                
                <div className="py-4">
                    <p className="text-sm text-muted-foreground mb-4 line-clamp-1">
                        <strong>{resource.title}</strong> por {resource.author}
                    </p>
                    
                    <div className="space-y-3">
                        {phaseConfig.map(({ phase, label, icon: Icon, color, description }) => (
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
                                        <Label className="font-medium cursor-pointer">{label}</Label>
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        {description}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cancelar
                    </Button>
                    <Button onClick={handleSave} disabled={isSaving}>
                        {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                        Guardar
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

