import { useState } from 'react';
import { useWizard } from './WizardContext';
import { WizardLayout } from './WizardLayout';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Loader2, ArrowRight, ArrowLeft, Mic2, Sparkles } from 'lucide-react';
import { sermonGeneratorService } from '@dosfilos/application';
import { toast } from 'sonner';
import { ContentCanvas } from '@/components/canvas-chat/ContentCanvas';
import { ChatInterface } from '@/components/canvas-chat/ChatInterface';

export function StepHomiletics() {
    const { exegesis, rules, setHomiletics, setStep, homiletics, saving } = useWizard();
    const [loading, setLoading] = useState(false);
    const [messages, setMessages] = useState<any[]>([]);
    const [selectedText, setSelectedText] = useState('');

    const handleGenerate = async () => {
        if (!exegesis) return;

        setLoading(true);
        try {
            const result = await sermonGeneratorService.generateHomiletics(exegesis, rules);
            setHomiletics(result);
            toast.success('Análisis homilético generado');
        } catch (error: any) {
            console.error(error);
            toast.error(error.message || 'Error al generar homilética');
        } finally {
            setLoading(false);
        }
    };

    const handleSendMessage = (message: string, role: 'user' | 'assistant' = 'user') => {
        const newMessage = {
            id: Date.now().toString(),
            role,
            content: message,
            timestamp: new Date()
        };
        setMessages(prev => [...prev, newMessage]);
    };

    const handleApplyChange = (messageId: string, newContent: any) => {
        setHomiletics(newContent);
        setMessages(prev =>
            prev.map(msg =>
                msg.id === messageId ? { ...msg, appliedChange: true } : msg
            )
        );
    };

    if (!exegesis) {
        return <div>Error: Falta el estudio exegético.</div>;
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-[calc(100vh-120px)]">
                <div className="text-center space-y-4">
                    <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
                    <p className="text-lg font-medium">Generando análisis homilético...</p>
                    <p className="text-sm text-muted-foreground">Esto puede tomar unos momentos</p>
                </div>
            </div>
        );
    }

    // Left Panel Content
    const leftPanel = !homiletics ? (
        <div className="h-full flex flex-col">
            <div className="space-y-4 mb-6">
                <div className="flex items-center gap-2">
                    <Mic2 className="h-6 w-6 text-primary" />
                    <h2 className="text-2xl font-bold">Análisis Homilético</h2>
                </div>
                <p className="text-muted-foreground">
                    Construye el puente hacia la aplicación contemporánea.
                </p>
            </div>

            <Card className="p-6 space-y-4 bg-muted/50 mb-6">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">
                    Base Exegética
                </h3>
                <p className="text-lg font-medium italic">"{exegesis.exegeticalProposition}"</p>
            </Card>

            <Card className="p-6 flex-1 flex flex-col justify-center">
                <div className="text-center space-y-6">
                    <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                        <Mic2 className="h-8 w-8 text-primary" />
                    </div>
                    <div>
                        <h3 className="font-semibold mb-2">Listo para generar tu propuesta homilética</h3>
                        <p className="text-sm text-muted-foreground">
                            Basándome en tu análisis exegético, crearé una propuesta homilética
                            con enfoque, aplicaciones contemporáneas y un bosquejo estructurado.
                        </p>
                    </div>
                    <Button
                        onClick={handleGenerate}
                        disabled={loading}
                        size="lg"
                        className="w-full max-w-md mx-auto"
                    >
                        <Sparkles className="mr-2 h-4 w-4" />
                        Generar Propuesta Homilética
                    </Button>
                </div>
            </Card>
        </div>
    ) : (
        <div className="h-full flex flex-col overflow-hidden">
            <div className="mb-4 flex-shrink-0">
                <h3 className="text-lg font-semibold">Propuesta Homilética</h3>
                <p className="text-sm text-muted-foreground">
                    Revisa y refina el contenido usando el chat
                </p>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto">
                <ContentCanvas
                    content={homiletics}
                    contentType="homiletics"
                    onContentUpdate={setHomiletics}
                    onTextSelect={setSelectedText}
                />
            </div>
        </div>
    );

    // Right Panel Content
    const rightPanel = !homiletics ? (
        <Card className="p-6 h-full flex flex-col justify-center">
            <div className="text-center space-y-4">
                <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                    <Mic2 className="h-8 w-8 text-primary" />
                </div>
                <div>
                    <h3 className="font-semibold mb-2">¿Qué es la Homilética?</h3>
                    <p className="text-sm text-muted-foreground">
                        La homilética es el arte de construir el puente entre el texto bíblico
                        y la audiencia contemporánea, transformando la verdad eterna en aplicación práctica.
                    </p>
                </div>
                <div className="pt-4 border-t">
                    <h4 className="font-medium text-sm mb-2">Después de generar podrás:</h4>
                    <ul className="text-sm text-muted-foreground space-y-1 text-left">
                        <li>• Ajustar el enfoque homilético</li>
                        <li>• Refinar aplicaciones contemporáneas</li>
                        <li>• Mejorar el bosquejo del sermón</li>
                        <li>• Agregar ilustraciones relevantes</li>
                    </ul>
                </div>
            </div>
        </Card>
    ) : (
        <div className="h-full flex flex-col overflow-hidden">
            <div className="flex-1 min-h-0 overflow-y-auto">
                <ChatInterface
                    messages={messages}
                    contentType="homiletics"
                    content={homiletics}
                    selectedText={selectedText}
                    onSendMessage={handleSendMessage}
                    onApplyChange={handleApplyChange}
                    onContentUpdate={setHomiletics}
                />
            </div>
            <div className="pt-2 border-t flex-shrink-0 space-y-2">
                <Button onClick={() => setStep(3)} size="lg" className="w-full">
                    Continuar al Borrador
                    <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                <Button onClick={() => setStep(1)} variant="outline" size="sm" className="w-full">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Volver a Exégesis
                </Button>
            </div>
        </div>
    );

    return (
        <>
            {/* Saving Indicator */}
            {saving && (
                <div className="fixed top-4 right-4 flex items-center gap-2 bg-background border rounded-lg px-3 py-2 shadow-lg animate-in fade-in slide-in-from-top-2 duration-200 z-50">
                    <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-sm text-muted-foreground">Guardado</span>
                </div>
            )}
            
            <WizardLayout
                leftPanel={leftPanel}
                rightPanel={rightPanel}
            />
        </>
    );
}
