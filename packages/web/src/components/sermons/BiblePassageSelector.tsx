import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LocalBibleService } from '@/services/LocalBibleService';
import { BookOpen, Languages, Search, AlertCircle, Loader2, Minus, Plus } from 'lucide-react';

interface BiblePassageSelectorProps {
    value: string;
    onChange: (value: string) => void;
    onValidPassage?: (isValid: boolean) => void;
    disabled?: boolean;
    hidePreview?: boolean;
    label?: string;
    placeholder?: string;
}

export function BiblePassageSelector({ 
    value, 
    onChange, 
    onValidPassage,
    disabled,
    hidePreview = false,
    label = "Pasaje Bíblico",
    placeholder = "Ej: Juan 3:16, Salmos 23"
}: BiblePassageSelectorProps) {
    const { i18n } = useTranslation();
    const [previewText, setPreviewText] = useState<string | null>(null);
    const [isValid, setIsValid] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('rvr');
    const [fontSize, setFontSize] = useState(18);
    
    const [debouncedValue, setDebouncedValue] = useState(value);

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedValue(value);
        }, 500);
        return () => clearTimeout(timer);
    }, [value]);

    useEffect(() => {
        const checkPassage = async () => {
            if (!debouncedValue.trim()) {
                setPreviewText(null);
                setIsValid(false);
                onValidPassage?.(false);
                return;
            }

            setIsLoading(true);
            try {
                // Pass current system language to resolve ambiguous book names (e.g. Genesis)
                // normalize i18n language (es-ES -> es, en-US -> en)
                const currentLang = i18n.language?.split('-')[0] || 'es';
                const text = LocalBibleService.getVerses(debouncedValue, currentLang);
                if (text) {
                    setPreviewText(text);
                    setIsValid(true);
                    onValidPassage?.(true);
                } else {
                    setPreviewText(null);
                    setIsValid(false);
                    onValidPassage?.(false);
                }
            } catch (error) {
                console.error("Error checking passage:", error);
                setPreviewText(null);
                setIsValid(false);
            } finally {
                setIsLoading(false);
            }
        };

        checkPassage();
    }, [debouncedValue]);

    return (
        <div className="space-y-6">
            <div className="space-y-2">
                <Label htmlFor="passage-selector" className="text-base font-medium">
                    {label}
                </Label>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input
                        id="passage-selector"
                        value={value}
                        onChange={(e) => onChange(e.target.value)}
                        placeholder={placeholder}
                        className="pl-10 text-xl py-6 h-auto"
                        disabled={disabled}
                    />
                    {isLoading && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                        </div>
                    )}
                    {!isLoading && isValid && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                            <BookOpen className="h-5 w-5 text-emerald-500" />
                        </div>
                    )}
                </div>
            </div>

            {/* Preview Section */}
            {!hidePreview && (previewText || debouncedValue.length > 3) && (
                <div className={`transition-all duration-500 ${isValid ? 'opacity-100 translate-y-0' : 'opacity-50 translate-y-2'}`}>
                    {isValid ? (
                        <Card className="border-none shadow-sm bg-muted/30 overflow-hidden">
                            <CardContent className="p-0">
                                <Tabs defaultValue="rvr" value={activeTab} onValueChange={setActiveTab} className="w-full">
                                    <div className="flex items-center justify-between p-3 bg-muted/50 border-b">
                                        <div className="flex items-center gap-2">
                                            <BookOpen className="h-4 w-4 text-primary" />
                                            <span className="font-medium text-sm">Vista Previa</span>
                                        </div>
                                        
                                        <div className="flex items-center gap-4">
                                            {/* Font Controls */}
                                            <div className="flex items-center bg-background rounded-md border shadow-sm">
                                                <Button 
                                                    variant="ghost" 
                                                    size="icon" 
                                                    className="h-7 w-7 rounded-r-none"
                                                    onClick={() => setFontSize(prev => Math.max(14, prev - 2))}
                                                    disabled={fontSize <= 14}
                                                >
                                                    <Minus className="h-3 w-3" />
                                                </Button>
                                                <div className="h-4 w-[1px] bg-border" />
                                                <div className="px-2 text-xs font-mono text-muted-foreground min-w-[3ch] text-center">
                                                    {fontSize}
                                                </div>
                                                <div className="h-4 w-[1px] bg-border" />
                                                <Button 
                                                    variant="ghost" 
                                                    size="icon" 
                                                    className="h-7 w-7 rounded-l-none"
                                                    onClick={() => setFontSize(prev => Math.min(32, prev + 2))}
                                                    disabled={fontSize >= 32}
                                                >
                                                    <Plus className="h-3 w-3" />
                                                </Button>
                                            </div>

                                            <TabsList className="h-8">
                                                <TabsTrigger value="rvr" className="text-xs px-3 h-6">RVR1960</TabsTrigger>
                                                <TabsTrigger value="original" className="text-xs px-3 h-6 flex items-center gap-1">
                                                    <Languages className="h-3 w-3" />
                                                    Original
                                                </TabsTrigger>
                                            </TabsList>
                                        </div>
                                    </div>
                                    
                                    <TabsContent value="rvr" className="mt-0">
                                        <div className="bg-amber-50/50 dark:bg-stone-950/50 p-6 min-h-[160px]">
                                            <blockquote 
                                                className="border-l-4 border-primary/20 pl-6 italic text-foreground/80 font-serif leading-relaxed transition-all duration-200"
                                                style={{ fontSize: `${fontSize}px` }}
                                            >
                                                "{previewText}"
                                            </blockquote>
                                            <div className="mt-4 text-right">
                                                <span className="text-xs font-medium text-muted-foreground uppercase tracking-widest">Reina Valera 1960</span>
                                            </div>
                                        </div>
                                    </TabsContent>
                                    
                                    <TabsContent value="original" className="mt-0">
                                        <div className="h-[200px] flex flex-col items-center justify-center text-center text-muted-foreground bg-background/50">
                                            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                                                <Languages className="h-6 w-6 text-primary" />
                                            </div>
                                            <h4 className="font-medium text-foreground">Texto Original</h4>
                                            <p className="text-sm max-w-xs mt-1 mb-4">
                                                Visualización del texto en Griego/Hebreo próximamente disponible.
                                            </p>
                                        </div>
                                    </TabsContent>
                                </Tabs>
                            </CardContent>
                        </Card>
                    ) : (
                        debouncedValue.length > 3 && !isLoading && (
                            <div className="flex items-center gap-2 text-sm text-yellow-600 dark:text-yellow-500 bg-yellow-50 dark:bg-yellow-950/30 p-3 rounded-md border border-yellow-200 dark:border-yellow-900">
                                <AlertCircle className="h-4 w-4" />
                                <span>Pasaje no reconocido en la biblioteca local. La IA intentará interpretarlo igual.</span>
                            </div>
                        )
                    )}
                </div>
            )}
        </div>
    );
}
