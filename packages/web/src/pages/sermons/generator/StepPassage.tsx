import { useState } from 'react';
import { useWizard } from './WizardContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowRight, Book, Lightbulb, Sparkles } from 'lucide-react';
import { sermonService } from '@dosfilos/application';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from '@/i18n';

export function StepPassage() {
  const { t } = useTranslation('generator');
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
  const suggestions = t('passage.suggestions', { returnObjects: true }) as Array<{ book: string; ref: string; topic: string }>;

  return (
    <div className="max-w-2xl mx-auto space-y-8 py-8">
      {/* Header with sermon context if available */}
      <div className="text-center space-y-4">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10">
          <Book className="h-8 w-8 text-primary" />
        </div>
        <h1 className="text-3xl font-bold font-serif">{t('passage.title')}</h1>
        {sermonTitle && (
          <div className="bg-muted/50 rounded-lg p-4 text-left">
            <p className="text-sm text-muted-foreground mb-1">{t('passage.developingSermon')}</p>
            <p className="font-medium text-lg">{sermonTitle}</p>
            {sermonDescription && (
              <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{sermonDescription}</p>
            )}
          </div>
        )}
        <p className="text-muted-foreground">
          {sermonTitle 
            ? t('passage.descWithTitle')
            : t('passage.descDefault')
          }
        </p>
      </div>

      {/* Main input */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t('passage.inputTitle')}</CardTitle>
          <CardDescription>
            {t('passage.inputDesc')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            value={localPassage}
            onChange={(e) => setLocalPassage(e.target.value)}
            placeholder={t('passage.inputPlaceholder')}
            className="text-lg py-6"
            onKeyDown={(e) => e.key === 'Enter' && handleContinue()}
          />
          <Button 
            onClick={handleContinue} 
            disabled={!localPassage.trim() || isLoading}
            className="w-full"
            size="lg"
          >
            {isLoading ? t('passage.loading') : t('passage.continueBtn')}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </CardContent>
      </Card>

      {/* Quick suggestions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-amber-500" />
            {t('passage.suggestionsTitle')}
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
              {t('passage.comingSoonTitle')}
            </CardTitle>
            <CardDescription>
              {t('passage.comingSoonDesc')}
            </CardDescription>
          </CardHeader>
        </Card>
      )}
    </div>
  );
}
