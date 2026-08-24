import type { GenerationRules, HomileticalAnalysis } from '../entities/SermonGenerator';

/**
 * Todo lo que el pastor aportó, en un solo texto para rastrear su autoría.
 *
 * POR QUÉ EXISTE: el generador TRANSCRIBE material del pastor —su ilustración
 * verbatim, sus aplicaciones, su proposición, sus títulos de puntos— por diseño
 * y bajo instrucción explícita. Medir su autoría contra todo lo generado le
 * atribuía ese texto a la máquina, y un sermón construido sobre su estudio de
 * ocho pasos marcaba "0% tuyo" recién generado.
 *
 * Esto es el otro lado del diff: lo que él trajo. Una palabra del sermón que
 * aparece acá es suya, aunque la haya escrito el generador.
 *
 * QUÉ NO ENTRA: nada que el modelo haya originado. Las descripciones de los
 * puntos del bosquejo, por ejemplo, las redacta el agente — incluirlas le
 * regalaría al pastor autoría por texto que no escribió, y un medidor que
 * regala autoría no sirve para confrontar a nadie.
 */
export function pastorMaterialCorpus(
    seed: GenerationRules['pastoralSeed'] | undefined,
    homiletics: HomileticalAnalysis | null | undefined,
    personalization?: GenerationRules['personalization'],
): string {
    const partes: (string | undefined)[] = [
        // Del estudio de ocho pasos: voz del pastor por construcción.
        seed?.centralIdea,
        seed?.pastoralAnecdote,
        seed?.doxologicalApplication,
        seed?.openQuestion,
        seed?.timelessPrinciple,
        seed?.mainClauseNote,
        seed?.originalAudienceFunction,
        seed?.genreImplication,
        seed?.bookLocationNote,
        ...(seed?.observations ?? []),
        ...(seed?.wordStudies ?? []).map((w) => w.discovery),
        ...(seed?.parallels ?? []).map((p) => p.relevance),

        // De la homilética: lo que él escribió o aprobó.
        homiletics?.homileticalProposition,
        ...(homiletics?.outline?.mainPoints ?? []).flatMap((p) => [
            p.title,
            p.application,
            p.pastorDirective?.emphasis,
            ...(p.pastorDirective?.exegeticalNotes ?? []),
        ]),

        // Del Contexto Pastoral: sus ilustraciones y notas, tal como las
        // escribió. El prompt tiene orden de incorporarlas LITERALMENTE, así que
        // aparecen casi intactas en el sermón.
        personalization?.illustrations,
        personalization?.preacherNotes,
        personalization?.pastoralEmphasis,
        personalization?.situationalContext,
        personalization?.congregationDescription,
    ];

    return partes.filter((t): t is string => Boolean(t?.trim())).join('\n\n');
}
