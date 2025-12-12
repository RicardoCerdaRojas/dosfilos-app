import { WorkflowPhase } from '@dosfilos/domain';
import { cn } from '@/lib/utils';
import { BookOpen, Mic2, FileText, Check, LogOut } from 'lucide-react';
import { useWizard } from './WizardContext';
import { Button } from '@/components/ui/button';

interface WizardHeaderProps {
  currentStep: number;
  onExit?: () => void;
}

const PHASES = [
  { step: 1, phase: 'EXEGESIS' as WorkflowPhase, label: 'Exégesis', icon: BookOpen },
  { step: 2, phase: 'HOMILETICS' as WorkflowPhase, label: 'Homilética', icon: Mic2 },
  { step: 3, phase: 'SERMON_DRAFT' as WorkflowPhase, label: 'Redacción', icon: FileText }
];

export function WizardHeader({ currentStep, onExit }: WizardHeaderProps) {
  const { setStep, exegesis, homiletics } = useWizard();

  const handleStepClick = (step: number) => {
    // Prevent navigation if previous steps are not completed
    if (step === 1) {
      setStep(1);
    } else if (step === 2 && exegesis) {
      setStep(2);
    } else if (step === 3 && homiletics) {
      setStep(3);
    }
  };

  return (
    <div className="border-b bg-background flex-shrink-0">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Progress Steps */}
          <div className="flex items-center gap-2">
            {PHASES.map((p, index) => {
              const Icon = p.icon;
              const isActive = p.step === currentStep;
              const isCompleted = p.step < currentStep;
              const isClickable = (p.step === 1) || 
                                (p.step === 2 && !!exegesis) || 
                                (p.step === 3 && !!homiletics);
              
              return (
                <div 
                  key={p.step} 
                  className={cn(
                    "flex items-center",
                    isClickable && "cursor-pointer"
                  )}
                  onClick={() => isClickable && handleStepClick(p.step)}
                >
                  {index > 0 && (
                    <div className="relative h-[2px] w-12 mx-2 bg-muted overflow-hidden">
                      <div 
                        className={cn(
                          "absolute inset-0 bg-gradient-to-r from-primary to-primary/80 transition-transform duration-500",
                          isCompleted ? "translate-x-0" : "-translate-x-full"
                        )} 
                      />
                    </div>
                  )}
                  <div className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded-full transition-all duration-300",
                    isActive && "bg-gradient-to-r from-primary to-primary/90 text-primary-foreground shadow-md scale-105",
                    isCompleted && "bg-primary/10 text-primary hover:bg-primary/20",
                    !isActive && !isCompleted && "bg-muted text-muted-foreground"
                  )}>
                    <div className={cn(
                      "transition-transform duration-300",
                      isActive && "scale-110"
                    )}>
                      {isCompleted ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <Icon className="h-4 w-4" />
                      )}
                    </div>
                    <span className="text-sm font-medium hidden sm:inline">
                      {p.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Exit Action */}
          <div className="flex items-center gap-4">
            <div className="text-sm font-medium text-muted-foreground hidden md:block">
              Paso {currentStep} de 3
            </div>
            {onExit && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={onExit}
                className="text-muted-foreground hover:text-destructive gap-2"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Guardar y Salir</span>
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
