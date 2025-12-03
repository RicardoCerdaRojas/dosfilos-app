import { QuickAction } from '@dosfilos/domain';
import { Button } from '@/components/ui/button';
import { Zap } from 'lucide-react';

interface QuickActionsProps {
  actions: QuickAction[];
  onActionClick: (actionId: string) => void;
  disabled?: boolean;
}

export function QuickActions({ actions, onActionClick, disabled }: QuickActionsProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
        <Zap className="h-3 w-3" />
        <span>Acciones Rápidas</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {actions.map(action => (
          <Button
            key={action.id}
            variant="outline"
            size="sm"
            onClick={() => onActionClick(action.id)}
            disabled={disabled}
            className="text-xs"
            title={action.description}
          >
            {action.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
