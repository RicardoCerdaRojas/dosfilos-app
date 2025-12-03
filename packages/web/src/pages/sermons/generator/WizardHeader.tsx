import { WorkflowPhase } from '@dosfilos/domain';
import { cn } from '@/lib/utils';
import { BookOpen, Mic2, FileText, Check } from 'lucide-react';

interface WizardHeaderProps {
  currentStep: number;
  phase: WorkflowPhase;
}

const PHASES = [
  { step: 1, phase: 'EXEGESIS' as WorkflowPhase, label: 'Exégesis', icon: BookOpen },
  { step: 2, phase: 'HOMILETICS' as WorkflowPhase, label: 'Homilética', icon: Mic2 },
  { step: 3, phase: 'SERMON_DRAFT' as WorkflowPhase, label: 'Redacción', icon: FileText }
];

export function WizardHeader({ currentStep, phase }: WizardHeaderProps) {
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
              
              return (
                <div key={p.step} className="flex items-center">
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

          {/* Current Phase Title */}
          <div className="text-sm font-medium text-muted-foreground hidden md:block">
            Paso {currentStep} de 3
          </div>
        </div>
      </div>
    </div>
  );
}
