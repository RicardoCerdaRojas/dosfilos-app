/**
 * Pastoral Fidelity — Phase 2 three-witnesses prompts (ADR-011).
 *
 * One prompt per witness. Each witness evaluates ALL claims in a single
 * Gemini call (returns a `verdicts` array aligned by claim index), so the
 * cost is ≤3 Flash calls per seed regardless of claim count.
 *
 * Output is strict JSON. Witnesses never affirm or deny doctrine on their
 * own authority — they surface tension and reason from text + tradition,
 * per the manifesto (socratismo bíblico anclado en Palabra).
 */

/**
 * Bumped when any witness prompt changes — invalidates the
 * `witnessResults/` cache. MUST stay in sync with the domain copy at
 * packages/domain/src/entities/WitnessValidation.ts (`WITNESS_PROMPT_VERSION`).
 */
export const WITNESS_PROMPT_VERSION = 'v1';

/** Claim kinds del seed del sermón. */
export type SeedPromptClaimKind = 'centralIdea' | 'observation' | 'doxologicalApplication' | 'principle';

export interface PromptClaim {
    /** Stable key from `collectSeedClaims` (o del colector del estudio). */
    key: string;
    /**
     * Etiqueta de procedencia. ABIERTA: el mismo motor sirve a otras fuentes
     * (estudio_madre pasa sus tipos de elemento). La escalación nunca hace
     * switch sobre `kind` — solo se usa como rótulo en el prompt.
     */
    kind: SeedPromptClaimKind | (string & {});
    text: string;
}

export interface SeedContext {
    passage: string;
    mainClauseRef: string;
    mainClauseNote: string;
    wordStudies: Array<{ word: string; reference: string; discovery: string }>;
    originalAudienceFunction: string;
}

const CLAIM_KIND_LABEL: Record<string, string> = {
    // seed del sermón
    centralIdea: 'idea central',
    observation: 'observación',
    doxologicalApplication: 'aplicación doxológica',
    principle: 'principio teológico atemporal',
    // elementos del estudio_madre (mismo motor, otra fuente)
    idea_central: 'idea central',
    observacion: 'observación',
    error_confrontado: 'error confrontado',
    aplicacion: 'aplicación',
    marco: 'marco',
    argumento: 'argumento',
    contraargumento: 'contraargumento',
    conclusion: 'conclusión',
};

function renderClaims(claims: PromptClaim[]): string {
    return claims
        // Fallback al propio `kind` para rótulos no catalogados (motor abierto).
        .map((c, i) => `[${i}] (${CLAIM_KIND_LABEL[c.kind] ?? c.kind}) "${c.text}"`)
        .join('\n');
}

const VERDICT_SCHEMA_NOTE = `Devuelve SIEMPRE JSON válido (sin Markdown, sin code fences):
{
  "verdicts": [
    { "index": 0, "dissents": true|false, "confidence": 0.0-1.0, "reasoning": "español, 1-2 frases", "evidence": ["referencia o sección", "..."] }
  ]
}
Un verdict por cada claim, alineado por su "index". "dissents" = true SOLO si hay tensión real; ante duda, dissents=false con confidence baja.`;

// ── Testigo 1 — contexto inmediato ────────────────────────────────────

export const WITNESS_CONTEXT_SYSTEM = `Eres el Testigo del Contexto Inmediato en un mecanismo pastoral de validación.

Tu única tarea: para cada afirmación del pastor, juzgar si IGNORA un elemento estructural mayor del propio texto que estudió (la perícopa, su oración principal, su función para la audiencia original).

NO juzgas doctrina sistemática ni tradición — solo si la afirmación es fiel al texto inmediato. Si la afirmación armoniza con el contexto, dissents=false. Si la afirmación contradice o pasa por alto algo central del pasaje, dissents=true con una pregunta socrática (no una sentencia).`;

export function buildContextPrompt(claims: PromptClaim[], ctx: SeedContext): string {
    const studies = ctx.wordStudies.length
        ? ctx.wordStudies.map((w) => `- ${w.word} (${w.reference}): ${w.discovery}`).join('\n')
        : '(sin estudios de palabras)';
    return `Pasaje: ${ctx.passage}
Oración principal (según el pastor): ${ctx.mainClauseRef} — ${ctx.mainClauseNote}
Función para la audiencia original (según el pastor): ${ctx.originalAudienceFunction}
Estudios de palabras del pastor:
${studies}

Afirmaciones a evaluar contra el contexto inmediato:
${renderClaims(claims)}

${VERDICT_SCHEMA_NOTE}
"evidence" debe citar el elemento del pasaje (verso/cláusula) que sustenta tu lectura.`;
}

// ── Testigo 2 — paralelos canónicos ───────────────────────────────────

export const WITNESS_PARALLELS_SYSTEM = `Eres el Testigo de los Paralelos Canónicos.

Tu única tarea: para cada afirmación del pastor, juzgar si la Escritura, EN OTROS PASAJES, trata el mismo tema de un modo que tensione la afirmación. Usas los paralelos provistos como punto de partida; puedes razonar sobre la trayectoria canónica (AT→NT) cuando aplique.

dissents=true solo si un paralelo canónico claro complica la afirmación. No inventes referencias fuera de las provistas salvo paralelos muy establecidos.`;

export function buildParallelsPrompt(
    claims: PromptClaim[],
    ctx: SeedContext,
    crossRefs: string[],
    seedParallels: Array<{ reference: string; note: string }>,
): string {
    const engineBlock = crossRefs.length ? crossRefs.map((r) => `- ${r}`).join('\n') : '(sin cross-references del engine)';
    const pastorBlock = seedParallels.length
        ? seedParallels.map((p) => `- ${p.reference}: ${p.note}`).join('\n')
        : '(el pastor no marcó paralelos)';
    return `Pasaje del sermón: ${ctx.passage}

Paralelos del cross-reference engine:
${engineBlock}

Paralelos que el pastor marcó relevantes:
${pastorBlock}

Afirmaciones a evaluar contra el testimonio canónico:
${renderClaims(claims)}

${VERDICT_SCHEMA_NOTE}
"evidence" debe citar las referencias canónicas en juego.`;
}

// ── Testigo 3 — testigo confesional plural ────────────────────────────

export interface TraditionSection {
    tradition: string;
    sectionReference: string;
    doctrineLevel: 'core' | 'distinctive' | 'open-evangelical';
    text: string;
}

export const WITNESS_CONFESSION_SYSTEM = `Eres el Testigo Confesional Plural: el testimonio acumulado de la iglesia fiel a lo largo de los siglos (múltiples tradiciones, no una sola).

Para cada afirmación del pastor haces DOS cosas:
1. Clasificas su nivel doctrinal: "core" (negable solo fuera de la fe cristiana clásica — credos ecuménicos), "distinctive" (distintivo confesional legítimo entre tradiciones fieles), "open-evangelical" (disentimiento legítimo intra-confesional), o null si no es una afirmación doctrinal.
2. Juzgas si la afirmación TENSIONA la lectura histórica de la iglesia, citando las secciones confesionales provistas.

NUNCA dices "esto es lo correcto". Dices "la iglesia fiel ha leído así porque…". El texto es el fundamento; la tradición confirma y levanta banderas de borde.

Si una afirmación NIEGA una doctrina "core" de la lista ecuménica, marca detectedLevel="core" y dissents=true con confidence alta.`;

export function buildConfessionPrompt(
    claims: PromptClaim[],
    coreDoctrines: ReadonlyArray<{ id: string; statement: string }>,
    sections: TraditionSection[],
    confessionalWitnessesEnabled: boolean,
): string {
    const coreBlock = coreDoctrines.map((d) => `- ${d.statement}`).join('\n');
    const sectionBlock = sections.length
        ? sections
              .map((s) => `- [${s.tradition} ${s.sectionReference} · ${s.doctrineLevel}] ${s.text}`)
              .join('\n')
        : '(catálogo confesional aún sin secciones cargadas para este nivel)';
    const toggleNote = confessionalWitnessesEnabled
        ? 'El pastor tiene los testigos confesionales ACTIVOS: evalúa los tres niveles.'
        : 'El pastor DESACTIVÓ los testigos confesionales: clasifica el nivel igual, pero marca dissents=true SOLO para afirmaciones de nivel "core". Para "distinctive"/"open-evangelical" devuelve dissents=false.';

    return `Doctrinas ecuménicas "core" (negarlas cae fuera de la fe cristiana clásica):
${coreBlock}

Secciones confesionales disponibles (testimonio plural):
${sectionBlock}

${toggleNote}

Afirmaciones a evaluar:
${renderClaims(claims)}

Devuelve SIEMPRE JSON válido (sin Markdown):
{
  "verdicts": [
    { "index": 0, "detectedLevel": "core"|"distinctive"|"open-evangelical"|null, "dissents": true|false, "confidence": 0.0-1.0, "reasoning": "español, marco 'la iglesia leyó así porque…'", "evidence": ["tradición + sección", "..."] }
  ]
}
Un verdict por cada claim, alineado por "index".`;
}
