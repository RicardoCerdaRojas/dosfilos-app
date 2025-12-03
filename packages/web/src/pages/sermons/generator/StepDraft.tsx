import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWizard } from './WizardContext';
import { WizardLayout } from './WizardLayout';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Loader2, ArrowLeft, Save, FileText, Sparkles } from 'lucide-react';
import { sermonGeneratorService, sermonService } from '@dosfilos/application';
import { useFirebase } from '@/context/firebase-context';
import { toast } from 'sonner';
import { ContentCanvas } from '@/components/canvas-chat/ContentCanvas';
import { ChatInterface } from '@/components/canvas-chat/ChatInterface';

export function StepDraft() {
    const navigate = useNavigate();
    const { user } = useFirebase();
    const { homiletics, rules, setDraft, draft, setStep, exegesis } = useWizard();
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [messages, setMessages] = useState<any[]>([]);
    const [selectedText, setSelectedText] = useState('');

    const handleGenerate = async () => {
        if (!homiletics) return;

        setLoading(true);
        try {
            const result = await sermonGeneratorService.generateSermonDraft(homiletics, rules);
            setDraft(result);
            toast.success('Borrador del sermón generado');
        } catch (error: any) {
            console.error(error);
            toast.error(error.message || 'Error al generar borrador');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!draft || !user || !exegesis) return;

        setSaving(true);
        try {
            // Format content as markdown
            const content = `
${draft.introduction}

${draft.body.map(point => `
## ${point.point}
${point.content}
${point.illustration ? `\n> **Ilustración:** ${point.illustration}` : ''}
`).join('\n')}

## Conclusión
${draft.conclusion}

${draft.callToAction ? `\n**Llamado a la Acción:** ${draft.callToAction}` : ''}
            `.trim();

            const sermon = await sermonService.createSermon({
                userId: user.uid,
                title: draft.title,
                content,
                bibleReferences: [exegesis.passage],
                tags: exegesis.keyWords.map(kw => kw.original),
                status: 'draft',
                authorName: user.displayName || 'Pastor',
            });

            toast.success('Sermón guardado exitosamente');
            navigate(`/sermons/${sermon.id}`);
        } catch (error: any) {
            console.error(error);
            toast.error('Error al guardar el sermón');
        } finally {
            setSaving(false);
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
        setDraft(newContent);
        setMessages(prev =>
            prev.map(msg =>
                msg.id === messageId ? { ...msg, appliedChange: true } : msg
            )
        );
    };

    if (!homiletics) {
        return <div>Error: Falta el análisis homilético.</div>;
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-[calc(100vh-120px)]">
                <div className="text-center space-y-4">
                    <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
                    <p className="text-lg font-medium">Generando borrador del sermón...</p>
                    <p className="text-sm text-muted-foreground">Esto puede tomar unos momentos</p>
                </div>
            </div>
        );
    }

    // Left Panel Content
    const leftPanel = !draft ? (
        <div className="h-full flex flex-col">
            <div className="space-y-4 mb-6">
                <div className="flex items-center gap-2">
                    <FileText className="h-6 w-6 text-primary" />
                    <h2 className="text-2xl font-bold">Borrador del Sermón</h2>
                </div>
                <p className="text-muted-foreground">
                    Genera el sermón completo listo para predicar.
                </p>
            </div>

            <Card className="p-6 space-y-4 bg-muted/50 mb-6">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">
                    Proposición Homilética
                </h3>
                <p className="text-lg font-medium italic">"{homiletics.homileticalProposition}"</p>
            </Card>

            <Card className="p-6 flex-1 flex flex-col justify-center">
                <div className="text-center space-y-6">
                    <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                        <FileText className="h-8 w-8 text-primary" />
                    </div>
                    <div>
                        <h3 className="font-semibold mb-2">Listo para generar tu sermón completo</h3>
                        <p className="text-sm text-muted-foreground">
                            Crearé un sermón completo con introducción, desarrollo de puntos,
                            ilustraciones, conclusión y llamado a la acción.
                        </p>
                    </div>
                    <Button
                        onClick={handleGenerate}
                        disabled={loading}
                        size="lg"
                        className="w-full max-w-md mx-auto"
                    >
                        <Sparkles className="mr-2 h-4 w-4" />
                        Generar Borrador del Sermón
                    </Button>
                </div>
            </Card>
        </div>
    ) : (
        <div className="h-full flex flex-col overflow-hidden">
            <div className="mb-4 flex-shrink-0">
                <h3 className="text-lg font-semibold">{draft.title}</h3>
                <p className="text-sm text-muted-foreground">
                    Revisa y refina el contenido usando el chat
                </p>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto">
                <ContentCanvas
                    content={draft}
                    contentType="sermon"
                    onContentUpdate={setDraft}
                    onTextSelect={setSelectedText}
                />
            </div>
        </div>
    );

    // Right Panel Content
    const rightPanel = !draft ? (
        <Card className="p-6 h-full flex flex-col justify-center">
            <div className="text-center space-y-4">
                <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                    <FileText className="h-8 w-8 text-primary" />
                </div>
                <div>
                    <h3 className="font-semibold mb-2">El Borrador Final</h3>
                    <p className="text-sm text-muted-foreground">
                        Este es el último paso. Generaré un sermón completo y estructurado
                        basado en tu exégesis y análisis homilético.
                    </p>
                </div>
                <div className="pt-4 border-t">
                    <h4 className="font-medium text-sm mb-2">Después de generar podrás:</h4>
                    <ul className="text-sm text-muted-foreground space-y-1 text-left">
                        <li>• Ajustar el tono y estilo</li>
                        <li>• Mejorar ilustraciones</li>
                        <li>• Refinar la conclusión</li>
                        <li>• Guardar y exportar</li>
                    </ul>
                </div>
            </div>
        </Card>
    ) : (
        <div className="h-full flex flex-col overflow-hidden">
            <div className="flex-1 min-h-0 overflow-y-auto">
                <ChatInterface
                    messages={messages}
                    contentType="sermon"
                    content={draft}
                    selectedText={selectedText}
                    onSendMessage={handleSendMessage}
                    onApplyChange={handleApplyChange}
                    onContentUpdate={setDraft}
                />
            </div>
            <div className="pt-2 border-t flex-shrink-0 space-y-2">
                <Button 
                    onClick={handleSave} 
                    disabled={saving}
                    size="lg" 
                    className="w-full"
                >
                    {saving ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Guardando...
                        </>
                    ) : (
                        <>
                            <Save className="mr-2 h-4 w-4" />
                            Guardar Sermón
                        </>
                    )}
                </Button>
                <Button onClick={() => setStep(2)} variant="outline" size="sm" className="w-full">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Volver a Homilética
                </Button>
            </div>
        </div>
    );

    return (
        <WizardLayout
            leftPanel={leftPanel}
            rightPanel={rightPanel}
        />
    );
}
