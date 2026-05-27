import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { GraduationCap } from 'lucide-react';
import { GreekTutorSessionView } from './GreekTutorSessionView';

interface GreekTutorOverlayProps {
    isOpen: boolean;
    onClose: () => void;
    passage: string;
}

export const GreekTutorOverlay: React.FC<GreekTutorOverlayProps> = ({ isOpen, onClose, passage }) => {
    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-4xl h-[90vh] flex flex-col p-0 gap-0">
                <DialogHeader className="p-6 border-b bg-muted/10">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-lg">
                            <GraduationCap className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                            <DialogTitle className="text-xl">Entrenador de Exégesis Griega</DialogTitle>
                            <DialogDescription>
                                Analizando formas gramaticales en <span className="font-semibold text-foreground">{passage}</span>
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <div className="flex-1 overflow-hidden p-0">
                    {/* `embeddedInWizard` suppresses the session view's default
                        navigate to '/dashboard/greek-tutor/session?...' which
                        would destroy the wizard context. Module deprecated +
                        replaced by PastoralWordStudyModal in Fase 1.5. */}
                    <GreekTutorSessionView initialPassage={passage} embeddedInWizard />
                </div>
            </DialogContent>
        </Dialog>
    );
};
