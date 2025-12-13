import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Sparkles, Save } from 'lucide-react';
import { aiService, sermonService } from '@dosfilos/application';
import { toast } from 'sonner';
import { TagInput } from '@/components/sermons/tag-input';
import { useFirebase } from '@/context/firebase-context';

export function GenerateSermonPage() {
  const navigate = useNavigate();
  const { user } = useFirebase();
  const [loading, setLoading] = useState(false);
  const [topic, setTopic] = useState('');
  const [bibleReferences, setBibleReferences] = useState<string[]>([]);
  const [targetAudience, setTargetAudience] = useState<string>('general');
  const [tone, setTone] = useState<string>('inspirational');
  const [length, setLength] = useState<string>('medium');
  const [generatedSermon, setGeneratedSermon] = useState<any>(null);

  const handleGenerate = async () => {
    if (!topic.trim()) {
      toast.error('Por favor ingresa un tema para el sermón');
      return;
    }

    if (!aiService.isAvailable()) {
      toast.error('Servicio de IA no disponible. Verifica tu API key de Gemini');
      return;
    }

    setLoading(true);
    try {
      const result = await aiService.getService().generateSermon({
        topic: topic.trim(),
        bibleReferences: bibleReferences.length > 0 ? bibleReferences : undefined,
        targetAudience: targetAudience as any,
        tone: tone as any,
        length: length as any,
        includeIntroduction: true,
        includeConclusion: true,
        includeCallToAction: true,
      });

      setGeneratedSermon(result);
      toast.success('¡Sermón generado exitosamente!');
    } catch (error: any) {
      console.error('Error generating sermon:', error);
      toast.error(error.message || 'Error al generar el sermón');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!generatedSermon || !user) return;

    try {
      const content = `
${generatedSermon.introduction || ''}

${generatedSermon.mainPoints.map((point: any, index: number) => `
## ${point.title}

${point.content}

**Referencias:** ${point.bibleReferences?.join(', ') || 'N/A'}
`).join('\n')}

${generatedSermon.conclusion || ''}

${generatedSermon.callToAction ? `\n**Llamado a la acción:** ${generatedSermon.callToAction}` : ''}
      `.trim();

      await sermonService.createSermon({
        userId: user.uid,
        title: generatedSermon.title,
        content,
        bibleReferences: generatedSermon.suggestedBibleReferences || [],
        tags: generatedSermon.suggestedTags || [],
        status: 'draft',
        authorName: user.displayName || 'Pastor',
      });

      toast.success('Sermón guardado como borrador');
      navigate('/dashboard/sermons');
    } catch (error: any) {
      console.error('Error saving sermon:', error);
      toast.error('Error al guardar el sermón');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Generar Sermón con IA</h1>
        <p className="text-muted-foreground">
          Usa inteligencia artificial para crear sermones personalizados
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Generation Form */}
        <Card>
          <CardHeader>
            <CardTitle>Configuración del Sermón</CardTitle>
            <CardDescription>
              Define los parámetros para generar tu sermón
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Topic */}
            <div className="space-y-2">
              <Label htmlFor="topic">Tema del Sermón *</Label>
              <Input
                id="topic"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="Ej: El amor de Dios, La fe en tiempos difíciles"
                disabled={loading}
              />
            </div>

            {/* Bible References */}
            <div className="space-y-2">
              <Label>Referencias Bíblicas (opcional)</Label>
              <TagInput
                tags={bibleReferences}
                onChange={setBibleReferences}
                placeholder="Ej: Juan 3:16, Romanos 8:28"
                disabled={loading}
              />
              <p className="text-xs text-muted-foreground">
                Si no especificas, la IA sugerirá referencias apropiadas
              </p>
            </div>

            {/* Target Audience */}
            <div className="space-y-2">
              <Label>Audiencia</Label>
              <Select value={targetAudience} onValueChange={setTargetAudience} disabled={loading}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">General</SelectItem>
                  <SelectItem value="youth">Jóvenes (15-25 años)</SelectItem>
                  <SelectItem value="children">Niños (6-12 años)</SelectItem>
                  <SelectItem value="adults">Adultos (25-60 años)</SelectItem>
                  <SelectItem value="seniors">Adultos mayores (60+)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Tone */}
            <div className="space-y-2">
              <Label>Tono</Label>
              <Select value={tone} onValueChange={setTone} disabled={loading}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="inspirational">Inspirador</SelectItem>
                  <SelectItem value="educational">Educativo</SelectItem>
                  <SelectItem value="casual">Cercano y conversacional</SelectItem>
                  <SelectItem value="formal">Formal y académico</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Length */}
            <div className="space-y-2">
              <Label>Duración</Label>
              <Select value={length} onValueChange={setLength} disabled={loading}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="short">Corto (~5-7 min)</SelectItem>
                  <SelectItem value="medium">Medio (~15-20 min)</SelectItem>
                  <SelectItem value="long">Largo (~30-35 min)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              onClick={handleGenerate}
              disabled={loading || !topic.trim()}
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generando...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Generar Sermón
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Generated Content */}
        <Card>
          <CardHeader>
            <CardTitle>Sermón Generado</CardTitle>
            <CardDescription>
              {generatedSermon
                ? 'Revisa y edita el contenido generado'
                : 'El sermón aparecerá aquí'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading && (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
                <p className="text-lg font-medium">Generando tu sermón...</p>
                <p className="text-sm text-muted-foreground">
                  Esto puede tomar unos segundos
                </p>
              </div>
            )}

            {!loading && !generatedSermon && (
              <div className="py-12 text-center text-muted-foreground">
                <Sparkles className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Completa el formulario y genera tu sermón</p>
              </div>
            )}

            {!loading && generatedSermon && (
              <div className="space-y-6">
                {/* Title */}
                <div>
                  <h2 className="text-2xl font-bold">{generatedSermon.title}</h2>
                </div>

                {/* Introduction */}
                {generatedSermon.introduction && (
                  <div>
                    <h3 className="text-lg font-semibold mb-2">Introducción</h3>
                    <p className="text-sm whitespace-pre-wrap">{generatedSermon.introduction}</p>
                  </div>
                )}

                {/* Main Points */}
                {generatedSermon.mainPoints?.map((point: any, index: number) => (
                  <div key={index} className="border-l-4 border-primary pl-4">
                    <h3 className="text-lg font-semibold mb-2">{point.title}</h3>
                    <p className="text-sm whitespace-pre-wrap mb-2">{point.content}</p>
                    {point.bibleReferences?.length > 0 && (
                      <p className="text-xs text-muted-foreground">
                        <strong>Referencias:</strong> {point.bibleReferences.join(', ')}
                      </p>
                    )}
                  </div>
                ))}

                {/* Conclusion */}
                {generatedSermon.conclusion && (
                  <div>
                    <h3 className="text-lg font-semibold mb-2">Conclusión</h3>
                    <p className="text-sm whitespace-pre-wrap">{generatedSermon.conclusion}</p>
                  </div>
                )}

                {/* Call to Action */}
                {generatedSermon.callToAction && (
                  <div className="bg-primary/10 p-4 rounded-lg">
                    <h3 className="text-lg font-semibold mb-2">Llamado a la Acción</h3>
                    <p className="text-sm whitespace-pre-wrap">{generatedSermon.callToAction}</p>
                  </div>
                )}

                {/* Tags */}
                {generatedSermon.suggestedTags?.length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">
                      <strong>Etiquetas sugeridas:</strong>
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {generatedSermon.suggestedTags.map((tag: string, index: number) => (
                        <span
                          key={index}
                          className="px-2 py-1 bg-secondary text-xs rounded-md"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Save Button */}
                <Button onClick={handleSave} className="w-full">
                  <Save className="mr-2 h-4 w-4" />
                  Guardar como Borrador
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
