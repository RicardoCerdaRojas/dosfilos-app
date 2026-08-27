import { toast } from 'sonner';
import type { TFunction } from 'i18next';
import { generatorChatService } from '@dosfilos/application';
import { WorkflowPhase, type GenerationRules } from '@dosfilos/domain';

export interface RegeneratePointInput {
    draft: any;
    itemIndex: number;
    homiletics: any;
    rules: GenerationRules;
    config: any;
    /** Persiste el cuerpo nuevo pasando por el historial de secciones. */
    onBodyUpdate: (sectionId: string, body: any[]) => Promise<void>;
    t: TFunction;
}

/**
 * Rehace UN punto del sermón sin tocar los demás.
 *
 * EL PUNTO NUEVO TIENE QUE SONAR COMO LOS QUE SE QUEDAN. El resto del sermón se
 * generó con la voz del predicador, su nivel de rigor y el bosquejo; un punto
 * regenerado sin eso desentona con sus vecinos y el pastor lo nota al leer en
 * voz alta. Por eso viajan la personalización y el rigor junto con la
 * proposición y el tono.
 *
 * `libraryResources: []` es deliberado: éste es un rehacer local, no una
 * consulta nueva a la biblioteca.
 */
export async function regenerateSermonPoint(input: RegeneratePointInput): Promise<void> {
    const { draft, itemIndex, homiletics, rules, config, t } = input;
    const punto = draft?.body?.[itemIndex];
    if (!punto) return;

    const toastId = toast.loading(t('drafting.loadingRegeneratePoint'));
    try {
        const result = await generatorChatService.regenerateSermonPoint(punto, {
            sermonTitle: draft.title,
            homileticalProposition: homiletics.homileticalProposition,
            tone: rules.tone,
            customInstructions: rules.customInstructions,
            ...(rules.personalization ? { personalization: rules.personalization } : {}),
            ...(rules.audienceRigor ? { audienceRigor: rules.audienceRigor } : {}),
            homileticsResult: homiletics,
            libraryResources: [],
            aiModel: config?.advanced?.aiModel,
            temperature:
                config?.[WorkflowPhase.DRAFTING]?.temperature || config?.advanced?.globalTemperature,
        });

        const nuevoCuerpo = [...draft.body];
        nuevoCuerpo[itemIndex] = result.point;
        await input.onBodyUpdate('body', nuevoCuerpo);

        if (result.sources && result.sources.length > 0) {
            toast.success(t('drafting.success.generatedWithSources', { count: result.sources.length }), {
                id: toastId,
                duration: 4000,
            });
        } else {
            toast.success(t('drafting.success.regeneratedPoint'), { id: toastId });
        }
    } catch (error) {
        console.error('[draft] no se pudo regenerar el punto:', error);
        toast.error(t('drafting.errors.regeneratingPoint'), { id: toastId });
    }
}
