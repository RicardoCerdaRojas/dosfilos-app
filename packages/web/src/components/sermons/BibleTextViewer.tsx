import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BookOpen, Languages, Minus, Plus } from 'lucide-react';

interface BibleTextViewerProps {
    text: string;
    reference?: string;
    className?: string;
}

export function BibleTextViewer({ text, reference, className = '' }: BibleTextViewerProps) {
    const [activeTab, setActiveTab] = useState('rvr');
    const [fontSize, setFontSize] = useState(18);

    return (
        <Card className={`border-none shadow-sm bg-muted/30 overflow-hidden ${className}`}>
            <CardContent className="p-0">
                <Tabs defaultValue="rvr" value={activeTab} onValueChange={setActiveTab} className="w-full">
                    {/* Header with controls */}
                    <div className="flex items-center justify-between p-3 bg-muted/50 border-b">
                        <div className="flex items-center gap-2">
                            <BookOpen className="h-4 w-4 text-primary" />
                            <span className="font-medium text-sm">
                                {reference || 'Vista Previa'}
                            </span>
                        </div>
                        
                        <div className="flex items-center gap-4">
                            {/* Font Size Controls */}
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

                            {/* Version Tabs */}
                            <TabsList className="h-8">
                                <TabsTrigger value="rvr" className="text-xs px-3 h-6">RVR1960</TabsTrigger>
                                <TabsTrigger value="original" className="text-xs px-3 h-6 flex items-center gap-1">
                                    <Languages className="h-3 w-3" />
                                    Original
                                </TabsTrigger>
                            </TabsList>
                        </div>
                    </div>
                    
                    {/* Text Content */}
                    <TabsContent value="rvr" className="mt-0">
                        <div className="bg-amber-50/50 dark:bg-stone-950/50 p-6 min-h-[160px]">
                            <blockquote 
                                className="border-l-4 border-primary/20 pl-6 italic text-foreground/80 font-serif leading-relaxed transition-all duration-200"
                                style={{ fontSize: `${fontSize}px` }}
                            >
                                "{text}"
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
    );
}
