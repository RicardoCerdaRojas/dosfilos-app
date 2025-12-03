import { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { Settings2, ChevronDown, ChevronUp } from 'lucide-react';
import { useWizard } from './WizardContext';

export function PromptSettings() {
    const { rules, setRules } = useWizard();
    const [isOpen, setIsOpen] = useState(false);

    const handleChange = (key: keyof typeof rules, value: string) => {
        setRules({ ...rules, [key]: value });
    };

    const summary = [
        rules.preferredBibleVersion,
        rules.theologicalBias,
        rules.tone === 'inspirational' ? 'Inspirador' : rules.tone,
        rules.targetAudience === 'general' ? 'General' : rules.targetAudience
    ].filter(Boolean).join(' • ');

    return (
        <Collapsible
            open={isOpen}
            onOpenChange={setIsOpen}
            className="border rounded-lg bg-card"
        >
            <div className="p-4 flex items-center justify-between">
                <div className="space-y-1">
                    <h3 className="font-semibold flex items-center gap-2">
                        <Settings2 className="h-4 w-4 text-primary" />
                        Configuración de esta Sesión
                    </h3>
                    {!isOpen && (
                        <p className="text-sm text-muted-foreground line-clamp-1">
                            {summary || 'Configuración predeterminada'}
                        </p>
                    )}
                </div>
                <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm" className="w-9 p-0">
                        {isOpen ? (
                            <ChevronUp className="h-4 w-4" />
                        ) : (
                            <ChevronDown className="h-4 w-4" />
                        )}
                        <span className="sr-only">Toggle</span>
                    </Button>
                </CollapsibleTrigger>
            </div>

            <CollapsibleContent className="px-4 pb-4 space-y-4">
                <p className="text-xs text-muted-foreground bg-secondary/50 p-2 rounded">
                    Estos ajustes iniciales provienen de tu configuración global. 
                    Cualquier cambio aquí aplicará <strong>solo para este sermón</strong>.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label>Versión Bíblica Preferida</Label>
                        <Input
                            value={rules.preferredBibleVersion || ''}
                            onChange={(e) => handleChange('preferredBibleVersion', e.target.value)}
                            placeholder="Ej: Reina Valera 1960, NVI"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Sesgo Teológico (Opcional)</Label>
                        <Input
                            value={rules.theologicalBias || ''}
                            onChange={(e) => handleChange('theologicalBias', e.target.value)}
                            placeholder="Ej: Reformado, Pentecostal, Bautista"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Tono</Label>
                        <Select
                            value={rules.tone}
                            onValueChange={(val) => handleChange('tone', val)}
                        >
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="inspirational">Inspirador</SelectItem>
                                <SelectItem value="educational">Educativo</SelectItem>
                                <SelectItem value="casual">Cercano</SelectItem>
                                <SelectItem value="formal">Formal</SelectItem>
                                <SelectItem value="evangelistic">Evangelístico</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label>Audiencia</Label>
                        <Select
                            value={rules.targetAudience}
                            onValueChange={(val) => handleChange('targetAudience', val)}
                        >
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="general">General</SelectItem>
                                <SelectItem value="youth">Jóvenes</SelectItem>
                                <SelectItem value="children">Niños</SelectItem>
                                <SelectItem value="adults">Adultos</SelectItem>
                                <SelectItem value="seniors">Adultos Mayores</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                <div className="space-y-2">
                    <Label>Instrucciones Personalizadas (Prompt Adicional)</Label>
                    <Textarea
                        value={rules.customInstructions || ''}
                        onChange={(e) => handleChange('customInstructions', e.target.value)}
                        placeholder="Instrucciones específicas para la IA..."
                        className="h-20"
                    />
                </div>
            </CollapsibleContent>
        </Collapsible>
    );
}
