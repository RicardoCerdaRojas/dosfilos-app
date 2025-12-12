import { useState } from 'react';
import { useWizard } from './WizardContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowRight, Book, Lightbulb, Sparkles } from 'lucide-react';
import { sermonService } from '@dosfilos/application';
import { useSearchParams } from 'react-router-dom';

export function StepPassage() {
  const { passage, setPassage, setStep } = useWizard();
  const [searchParams] = useSearchParams();
  const [localPassage, setLocalPassage] = useState(passage);
  const [isLoading, setIsLoading] = useState(false);

  // Get sermon info if resuming from a draft
  const sermonId = searchParams.get('id');
  const [sermonTitle, setSermonTitle] = useState<string | null>(null);
  const [sermonDescription, setSermonDescription] = useState<string | null>(null);

  // Load sermon info if we have an ID
  useState(() => {
    if (sermonId) {
      sermonService.getSermon(sermonId).then(sermon => {
        if (sermon) {
          setSermonTitle(sermon.title);
          setSermonDescription(sermon.content || '');
        }
      });
    }
  });

  const handleContinue = async () => {
    if (!localPassage.trim()) return;
    setIsLoading(true);
    try {
      setPassage(localPassage.trim());
      
      // If we have a sermon ID, update the passage in the database
      if (sermonId) {
        await sermonService.updateSermon(sermonId, {
          bibleReferences: [localPassage.trim()],
          wizardProgress: {
            currentStep: 1,
            passage: localPassage.trim(),
            lastSaved: new Date()
          }
        });
      }
      
      setStep(1); // Move to exegesis step
    } catch (error) {
      console.error('Error setting passage:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Common passage suggestions
  const suggestions = [
    { book: 'Juan', ref: 'Juan 3:16', topic: 'Amor de Dios' },
    { book: 'Romanos', ref: 'Romanos 8:28', topic: 'Propósito' },
    { book: 'Filipenses', ref: 'Filipenses 4:13', topic: 'Fortaleza' },
    { book: 'Salmos', ref: 'Salmos 23', topic: 'Protección' },
    { book: 'Isaías', ref: 'Isaías 40:31', topic: 'Esperanza' },
  ];

  return (
    <div className="max-w-2xl mx-auto space-y-8 py-8">
      {/* Header with sermon context if available */}
      <div className="text-center space-y-4">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10">
          <Book className="h-8 w-8 text-primary" />
        </div>
        <h1 className="text-3xl font-bold font-serif">Selecciona un Pasaje Bíblico</h1>
        {sermonTitle && (
          <div className="bg-muted/50 rounded-lg p-4 text-left">
            <p className="text-sm text-muted-foreground mb-1">Desarrollando sermón:</p>
            <p className="font-medium text-lg">{sermonTitle}</p>
            {sermonDescription && (
              <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{sermonDescription}</p>
            )}
          </div>
        )}
        <p className="text-muted-foreground">
          {sermonTitle 
            ? '¿Qué texto bíblico usarás para desarrollar este sermón?'
            : 'El texto base que usarás para desarrollar tu sermón.'
          }
        </p>
      </div>

      {/* Main input */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Pasaje Bíblico</CardTitle>
          <CardDescription>
            Ingresa una referencia como "Juan 3:16" o "Romanos 8:28-39"
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            value={localPassage}
            onChange={(e) => setLocalPassage(e.target.value)}
            placeholder="Ej: Juan 3:16, Salmos 23, Mateo 5:1-12"
            className="text-lg py-6"
            onKeyDown={(e) => e.key === 'Enter' && handleContinue()}
          />
          <Button 
            onClick={handleContinue} 
            disabled={!localPassage.trim() || isLoading}
            className="w-full"
            size="lg"
          >
            {isLoading ? 'Cargando...' : 'Continuar con Exégesis'}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </CardContent>
      </Card>

      {/* Quick suggestions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-amber-500" />
            Sugerencias Populares
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {suggestions.map((s) => (
              <Button
                key={s.ref}
                variant="outline"
                className="h-auto py-3 flex flex-col items-start text-left"
                onClick={() => setLocalPassage(s.ref)}
              >
                <span className="font-medium">{s.ref}</span>
                <span className="text-xs text-muted-foreground">{s.topic}</span>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* AI suggestion placeholder - could be enhanced later */}
      {sermonTitle && (
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Próximamente: Sugerencias con IA
            </CardTitle>
            <CardDescription>
              Basado en el título y descripción de tu sermón, la IA podrá sugerirte pasajes relevantes.
            </CardDescription>
          </CardHeader>
        </Card>
      )}
    </div>
  );
}
