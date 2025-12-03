import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface WizardLayoutProps {
  leftPanel: ReactNode;
  rightPanel: ReactNode;
  className?: string;
}

export function WizardLayout({ leftPanel, rightPanel, className }: WizardLayoutProps) {
  return (
    <div className={cn(
      "flex flex-col lg:flex-row gap-4 h-full overflow-hidden",
      className
    )}>
      {/* Left Panel - Canvas */}
      <div className="flex-1 lg:w-[65%] overflow-hidden flex flex-col">
        {leftPanel}
      </div>

      {/* Right Panel - Chat + Controls */}
      <div className="w-full lg:w-[35%] flex flex-col overflow-hidden">
        {rightPanel}
      </div>
    </div>
  );
}
