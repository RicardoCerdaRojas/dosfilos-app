import { Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface SaveStatusProps {
    saving: boolean;
    lastSaved: Date | null;
}

export function SaveStatus({ saving, lastSaved }: SaveStatusProps) {
    if (saving) {
        return (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                <span>Guardando...</span>
            </div>
        );
    }

    if (lastSaved) {
        return (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                <span>
                    Guardado {formatDistanceToNow(lastSaved, { addSuffix: true, locale: es })}
                </span>
            </div>
        );
    }

    return null;
}
