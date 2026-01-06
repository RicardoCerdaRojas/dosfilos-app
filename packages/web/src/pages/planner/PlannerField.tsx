import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Wand2, Pencil, Save, X, Loader2 } from 'lucide-react';
import { MarkdownRenderer } from '@/components/canvas-chat/MarkdownRenderer';
import { cn } from '@/lib/utils';

interface PlannerFieldProps {
    title: string;
    content: string;
    onSave: (newContent: string) => void;
    onRefine: () => void;
    className?: string;
    minHeight?: string;
    isLoading?: boolean;
}

export function PlannerField({ 
    title, 
    content, 
    onSave, 
    onRefine, 
    className,
    minHeight = "min-h-[100px]",
    isLoading = false
}: PlannerFieldProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [editValue, setEditValue] = useState(content);

    // Sync editValue with content when it changes externally (e.g., after reformulation)
    useEffect(() => {
        if (!isEditing) {
            setEditValue(content);
        }
    }, [content, isEditing]);

    const handleSave = () => {
        onSave(editValue);
        setIsEditing(false);
    };

    const handleCancel = () => {
        setEditValue(content);
        setIsEditing(false);
    };

    const handleStartEdit = () => {
        setEditValue(content);
        setIsEditing(true);
    };

    return (
        <div className={cn("space-y-2", className)}>
            <div className="flex items-center justify-between">
                <h4 className="font-medium text-sm text-foreground flex items-center gap-2">
                    {title}
                    {isLoading && (
                        <span className="inline-flex items-center gap-1 text-xs text-primary animate-pulse">
                            <Loader2 className="h-3 w-3 animate-spin" />
                            Reformulando...
                        </span>
                    )}
                </h4>
                {!isEditing && !isLoading && (
                    <div className="flex items-center gap-1">
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={handleStartEdit}
                            className="h-8 px-2 text-muted-foreground hover:text-foreground"
                        >
                            <Pencil className="h-3.5 w-3.5 mr-1" /> Editar
                        </Button>
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={onRefine}
                            className="h-8 px-2 text-primary hover:text-primary/80 hover:bg-primary/10"
                        >
                            <Wand2 className="h-3.5 w-3.5 mr-1" /> Refinar
                        </Button>
                    </div>
                )}
            </div>

            {isEditing ? (
                <div className="space-y-2 animate-in fade-in zoom-in-95 duration-200">
                    <Textarea
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        className={cn("font-mono text-sm", minHeight)}
                        placeholder={`Escribe el contenido para ${title}...`}
                    />
                    <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="sm" onClick={handleCancel}>
                            <X className="h-4 w-4 mr-1" /> Cancelar
                        </Button>
                        <Button size="sm" onClick={handleSave}>
                            <Save className="h-4 w-4 mr-1" /> Guardar
                        </Button>
                    </div>
                </div>
            ) : (
                <Card 
                    className={cn(
                        "p-4 bg-muted/30 transition-all relative overflow-hidden",
                        minHeight,
                        isLoading 
                            ? "border-2 border-primary/50 animate-pulse bg-primary/5" 
                            : "hover:bg-muted/50"
                    )} 
                >
                    {isLoading && (
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/10 to-transparent animate-shimmer" 
                             style={{ backgroundSize: '200% 100%' }} 
                        />
                    )}
                    <div className={cn(isLoading && "opacity-70")}>
                        <MarkdownRenderer content={content} />
                    </div>
                </Card>
            )}
        </div>
    );
}
