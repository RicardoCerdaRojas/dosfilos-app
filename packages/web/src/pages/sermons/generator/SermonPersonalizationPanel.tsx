import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, ChevronUp, Heart } from 'lucide-react';
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useWizard } from './WizardContext';
import type { SermonPersonalization } from '@dosfilos/domain';

/**
 * Pastoral personalization slots for the wizard: situational context,
 * congregation, emphasis, illustrations, preacher notes. Mirrors what
 * Faculty's `SermonOutlinePreviewModal` already collects, so wizard
 * sermons can reach the same occasion-aware quality (funerals,
 * weddings, crisis preaching) without forcing the user through Faculty.
 *
 * `tone` is intentionally omitted — narrative voice lives in
 * `GenerationRules.tone` (pastoral / expositivo / narrativo) already
 * surfaced in `PromptSettings`. Personalization.tone is Faculty's
 * occasion-posture vocabulary (doxological / confrontational / …) and
 * would create a confusing second tone selector here.
 */
export function SermonPersonalizationPanel() {
    const { t } = useTranslation('generator');
    const { rules, setRules } = useWizard();
    const [isOpen, setIsOpen] = useState(false);

    const personalization = rules.personalization ?? {};
    const populatedCount = countPopulated(personalization);

    const update = <K extends keyof SermonPersonalization>(
        key: K,
        value: SermonPersonalization[K],
    ) => {
        setRules({
            ...rules,
            personalization: { ...personalization, [key]: value },
        });
    };

    return (
        <Collapsible open={isOpen} onOpenChange={setIsOpen} className="border rounded-lg bg-card">
            <div className="p-4 flex items-center justify-between">
                <div className="space-y-1">
                    <h3 className="font-semibold flex items-center gap-2">
                        <Heart className="h-4 w-4 text-primary" />
                        {t('pastoralContext.title')}
                    </h3>
                    {!isOpen && (
                        <p className="text-sm text-muted-foreground">
                            {populatedCount === 0
                                ? t('pastoralContext.hint')
                                : t('pastoralContext.filled', { count: populatedCount })}
                        </p>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    {!isOpen && populatedCount > 0 && (
                        <Badge variant="secondary" className="text-xs">
                            {t('pastoralContext.active')}
                        </Badge>
                    )}
                    <CollapsibleTrigger asChild>
                        <Button variant="ghost" size="sm" className="w-9 p-0">
                            {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                            <span className="sr-only">Toggle</span>
                        </Button>
                    </CollapsibleTrigger>
                </div>
            </div>

            <CollapsibleContent className="px-4 pb-4 space-y-4">
                {/* La versión anterior describía la IMPLEMENTACIÓN, no el
                    beneficio: "estos campos se inyectan al prompt" y "Faculty ya
                    los acepta — ahora el asistente del wizard también". Lo
                    segundo es una nota de release que le sobra al pastor, y lo
                    primero es jerga que ni siquiera le dice qué gana. Lo que
                    necesita saber es que esto no se archiva: entra al sermón. */}
                <p className="text-xs text-muted-foreground">
                    {t('pastoralContext.intro')}
                </p>

                {/* EL EJE ES EL LENGUAJE, NO EL RIGOR.
                    El rigor exegético ya ocurrió río arriba, en el estudio, y
                    este campo no lo toca: sólo llega al prompt del borrador y
                    al de regenerar un punto. Llamarlo "nivel de rigor" prometía
                    algo que el código no hace, e implicaba que un sermón para
                    una congregación general es menos riguroso — cuando lo único
                    que cambia es cuánto vocabulario técnico aflora en el
                    púlpito.
                    Y etiquetaba al PREDICADOR ("Pastor sin seminario"), pidiéndole
                    auto-clasificarse por credencial para conseguir lenguaje llano.
                    Ahora describe el SERMÓN.
                    Los valores persistidos siguen siendo `beginner` / `seminary`:
                    renombrarlos exigiría migrar `wizardProgress.audienceRigor` en
                    los sermones ya guardados, y no aporta nada al pastor. */}
                <div className="space-y-2">
                    <Label>{t('pastoralContext.languageLabel')}</Label>
                    <div className="grid grid-cols-2 gap-2">
                        <button
                            type="button"
                            onClick={() => setRules({ ...rules, audienceRigor: 'beginner' })}
                            className={`text-left rounded-md border p-2 text-sm transition-colors ${
                                (rules.audienceRigor ?? 'beginner') === 'beginner'
                                    ? 'border-primary bg-primary/5'
                                    : 'border-border hover:bg-muted/50'
                            }`}
                        >
                            <div className="font-medium">{t('pastoralContext.languageEveryday')}</div>
                            <div className="text-xs text-muted-foreground">
                                {t('pastoralContext.languageEverydayHint')}
                            </div>
                        </button>
                        <button
                            type="button"
                            onClick={() => setRules({ ...rules, audienceRigor: 'seminary' })}
                            className={`text-left rounded-md border p-2 text-sm transition-colors ${
                                rules.audienceRigor === 'seminary'
                                    ? 'border-primary bg-primary/5'
                                    : 'border-border hover:bg-muted/50'
                            }`}
                        >
                            <div className="font-medium">{t('pastoralContext.languageTechnical')}</div>
                            <div className="text-xs text-muted-foreground">
                                {t('pastoralContext.languageTechnicalHint')}
                            </div>
                        </button>
                    </div>
                </div>

                <div className="space-y-2">
                    <Label>{t('pastoralContext.situational')}</Label>
                    <Textarea
                        value={personalization.situationalContext ?? ''}
                        onChange={(e) => update('situationalContext', e.target.value)}
                        placeholder={t('pastoralContext.situationalPlaceholder')}
                        className="h-20"
                    />
                </div>

                <div className="space-y-2">
                    <Label>{t('pastoralContext.congregation')}</Label>
                    <Textarea
                        value={personalization.congregationDescription ?? ''}
                        onChange={(e) => update('congregationDescription', e.target.value)}
                        placeholder={t('pastoralContext.congregationPlaceholder')}
                        className="h-16"
                    />
                </div>

                <div className="space-y-2">
                    <Label>{t('pastoralContext.emphasis')}</Label>
                    <Textarea
                        value={personalization.pastoralEmphasis ?? ''}
                        onChange={(e) => update('pastoralEmphasis', e.target.value)}
                        placeholder={t('pastoralContext.emphasisPlaceholder')}
                        className="h-20"
                    />
                </div>

                <div className="space-y-2">
                    <Label>{t('pastoralContext.illustrations')}</Label>
                    <Textarea
                        value={personalization.illustrations ?? ''}
                        onChange={(e) => update('illustrations', e.target.value)}
                        placeholder={t('pastoralContext.illustrationsPlaceholder')}
                        className="h-24"
                    />
                </div>

                <div className="space-y-2">
                    <Label>{t('pastoralContext.notes')}</Label>
                    <Textarea
                        value={personalization.preacherNotes ?? ''}
                        onChange={(e) => update('preacherNotes', e.target.value)}
                        placeholder={t('pastoralContext.notesPlaceholder')}
                        className="h-24"
                    />
                </div>
            </CollapsibleContent>
        </Collapsible>
    );
}

function countPopulated(p: SermonPersonalization): number {
    let n = 0;
    if (p.situationalContext?.trim()) n++;
    if (p.congregationDescription?.trim()) n++;
    if (p.pastoralEmphasis?.trim()) n++;
    if (p.illustrations?.trim()) n++;
    if (p.preacherNotes?.trim()) n++;
    return n;
}
