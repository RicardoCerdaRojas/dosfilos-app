import {
    formatPassageReference,
    type ExegeticalPaper,
    type ExegeticalStudy,
    type HomileticalAnalysis,
    type KeyWord,
    type PaperToSermonOutput,
    type PaperToSermonTone,
    type RAGSource,
    type Sermon,
    type SermonContent,
    type SermonOutline,
} from '@dosfilos/domain';

/**
 * Translates the paper-to-sermon transformer output (Pipeline A) into a
 * `Sermon.wizardProgress` shape (Pipeline B's state machine). Lets us
 * deprecate Pipeline A as a standalone sermon-generation path while
 * keeping the one-click UX: the user clicks "Generar sermón" in the
 * paper, the transformer runs once, and the result is dropped into the
 * wizard at Step 3 (Draft) with all upstream steps pre-populated from
 * the paper's context.
 *
 * Rationale per the convergence plan:
 *   - Single backbone for sermon generation = the wizard (Pipeline B).
 *     Pipeline A becomes a pre-population shim, not a parallel pipeline.
 *   - User lands at Step 3 ready to publish (matches one-click UX), but
 *     can navigate back to Steps 1/2 to refine using the wizard's
 *     native multi-turn generators if they want deeper detail.
 *   - Sermon publish flow needs `exegesis` to be non-null (StepDraft
 *     line 114), so we synthesize a stub even though the paper itself
 *     is the real exegetical source.
 *
 * `paperContext` is stamped on `wizardProgress` so each Step can render
 * a "Pre-cargado desde paper {X}" banner. That's how the user
 * distinguishes "this state was synthesized from a paper" from "this
 * state was hand-generated step by step".
 *
 * Pastoral Fidelity (Phase 1 UI-audit Categoría 4 — AI-forbidden
 * fields): when adapting paper output into `PastoralSeed`-adjacent
 * shapes in future iterations, the following fields MUST NEVER be
 * pre-populated from the paper or any LLM source. They are reserved
 * for the pastor's own voice (`PASTORAL_SEED_AI_FORBIDDEN_FIELDS` in
 * the domain layer):
 *
 *   - `insight.centralIdea`
 *   - `insight.observations`
 *   - `insight.openQuestion`
 *   - `insight.pastoralAnecdote`
 *   - `insight.doxologicalApplication`
 *
 * Hint surfaces (e.g. the `derivedSuggestions` banner in
 * `PastoralSeedWizard`) may show paper-derived text as editable
 * suggestions, but the seed itself is only persisted when the pastor
 * types or actively accepts the suggestion as their own voice. Silent
 * autofill of any of the above five fields violates P1 (labor antes
 * que output) and P2 (AI desarrolla, no origina).
 */

export interface BuildWizardProgressInput {
    paper: ExegeticalPaper;
    transformerOutput: PaperToSermonOutput;
    tone: PaperToSermonTone;
}

export function buildWizardProgressFromPaper(
    input: BuildWizardProgressInput,
): NonNullable<Sermon['wizardProgress']> {
    const { paper, transformerOutput, tone } = input;

    const passageLabel = formatPassageReference(paper.passage, paper.displayLanguage);
    const exegesis = buildExegesisStub(paper, passageLabel, transformerOutput);
    const homiletics = buildHomileticsStub(exegesis, transformerOutput, tone);
    const draft = parseDraftFromMarkdown(transformerOutput);

    return {
        currentStep: 3, // Land at Step 3 (Redacción/Draft) — closest to publish
        passage: passageLabel,
        exegesis,
        homiletics,
        draft,
        lastSaved: new Date(),
        derivedContext: {
            kind: 'paper',
            paperId: paper.id,
            paperTitle: paper.title ?? passageLabel,
            tone,
            generatedAt: new Date(),
            transformerModelId: transformerOutput.modelId,
        },
    };
}

// ── Exegesis stub ──────────────────────────────────────────────────────

function buildExegesisStub(
    paper: ExegeticalPaper,
    passageLabel: string,
    transformerOutput: PaperToSermonOutput,
): ExegeticalStudy {
    return {
        passage: passageLabel,
        context: {
            historical: paper.assignmentBrief ?? '',
            literary: '',
            audience: '',
        },
        keyWords: extractKeyWords(paper),
        exegeticalProposition: paper.title ?? transformerOutput.title,
        pastoralInsights: [],
        ragSources: paper.sources.map<RAGSource>(s => ({
            title: s.displayLabel,
            usedFor: s.citationKey ?? s.sourceType,
        })),
    };
}

/**
 * Pulls citation keys from the paper's verse-level steps so the
 * exegesis stub carries at least the lexemes the paper analyzed. The
 * publish flow uses `exegesis.keyWords[].original` as sermon tags, so
 * having any non-empty list keeps that surface populated.
 *
 * Best-effort — paper steps may not have `canonicalAnalysis` populated
 * (legacy papers, free-strategy mode). Falls back to an empty list,
 * which is still valid for publish (the user can tag manually later).
 */
function extractKeyWords(paper: ExegeticalPaper): KeyWord[] {
    const words: KeyWord[] = [];
    for (const step of paper.steps) {
        if (step.kind !== 'verse') continue;
        const accepted = step.accepted;
        const canonicalAnalysis = accepted && typeof accepted === 'object'
            ? (accepted as any).canonicalAnalysis
            : null;
        if (!canonicalAnalysis?.lexemes) continue;
        for (const lex of canonicalAnalysis.lexemes) {
            if (!lex?.surface) continue;
            words.push({
                original: lex.surface,
                transliteration: lex.transliteration ?? '',
                lemma: lex.lemma,
                literalTranslation: lex.gloss,
                morphology: lex.morphology ?? '',
                syntacticFunction: lex.syntacticRole ?? '',
                significance: lex.semanticNote ?? '',
            });
        }
    }
    return words;
}

// ── Homiletics stub ────────────────────────────────────────────────────

function buildHomileticsStub(
    exegesis: ExegeticalStudy,
    transformerOutput: PaperToSermonOutput,
    tone: PaperToSermonTone,
): HomileticalAnalysis {
    return {
        exegeticalStudy: exegesis,
        homileticalApproach: mapToneToApproach(tone),
        homileticalProposition: transformerOutput.title,
        contemporaryApplication: [],
        outline: extractOutlineFromMarkdown(transformerOutput.content, transformerOutput.bibleReferences),
    };
}

/**
 * Maps the paper-to-sermon tone enum to the wizard's homiletical
 * approach enum. The wizard's `homileticalApproach` is a four-value
 * legacy field (`expository`/`thematic`/`narrative`/`topical`) so the
 * mapping is lossy but reasonable:
 *   - `expositivo` → `expository` (verse-by-verse / paper-driven)
 *   - `narrativo` → `narrative` (story-driven)
 *   - `pastoral`  → `thematic` (life-application focus, no exact match)
 */
function mapToneToApproach(tone: PaperToSermonTone): HomileticalAnalysis['homileticalApproach'] {
    switch (tone) {
        case 'expositivo':
            return 'expository';
        case 'narrativo':
            return 'narrative';
        case 'pastoral':
            return 'thematic';
    }
}

/**
 * Pulls `## ` headings + their immediate descriptions out of the
 * transformer's markdown content to build a `SermonOutline.mainPoints`
 * list. Each heading becomes a main point; description is the first
 * paragraph under it (truncated for the outline preview).
 *
 * Scripture references are inherited from the transformer's
 * `bibleReferences` list — the paper-to-sermon prompt enforces
 * scripture-only citations so the references are reliable.
 */
function extractOutlineFromMarkdown(
    markdown: string,
    bibleReferences: string[],
): SermonOutline {
    const sections = splitOnLevel2Headings(markdown);
    // Skip introduction (first chunk before any heading) + conclusion
    // (last section if its heading contains "conclusión"/"conclusion").
    const bodySections = sections.slice(1).filter(s => !isConclusionHeading(s.heading));
    return {
        mainPoints: bodySections.map(s => ({
            title: s.heading,
            description: truncate(s.body, 280),
            scriptureReferences: bibleReferences,
        })),
    };
}

// ── Draft (Step 3) ─────────────────────────────────────────────────────

function parseDraftFromMarkdown(transformerOutput: PaperToSermonOutput): SermonContent {
    const sections = splitOnLevel2Headings(transformerOutput.content);
    const intro = sections[0]?.body.trim() ?? '';
    const lastSection = sections[sections.length - 1];
    const hasConclusion = lastSection && lastSection.heading && isConclusionHeading(lastSection.heading);
    const conclusion = hasConclusion ? lastSection!.body.trim() : '';
    const bodyChunks = sections
        .slice(1, hasConclusion ? -1 : undefined)
        .filter(s => s.heading);

    return {
        title: transformerOutput.title,
        introduction: intro,
        body: bodyChunks.map(s => ({
            point: s.heading,
            content: s.body.trim(),
            scriptureReferences: transformerOutput.bibleReferences,
        })),
        conclusion: conclusion || fallbackConclusion(transformerOutput.title),
    };
}

/**
 * Defensive fallback when the transformer output has no detected
 * conclusion section. Publish would fail with an empty conclusion, so
 * we synthesize a single line. The user can edit before publishing.
 */
function fallbackConclusion(title: string): string {
    return `Conclusión derivada del paper: ${title}.`;
}

// ── Markdown helpers ───────────────────────────────────────────────────

interface MarkdownSection {
    heading: string;
    body: string;
}

/**
 * Splits markdown into sections divided by `## ` (level-2) headings.
 * First element holds content before any heading (the introduction);
 * its `heading` is empty.
 */
function splitOnLevel2Headings(markdown: string): MarkdownSection[] {
    const lines = markdown.split('\n');
    const sections: MarkdownSection[] = [{ heading: '', body: '' }];
    let current = sections[0]!;
    for (const line of lines) {
        const match = /^##\s+(.+)$/.exec(line);
        if (match) {
            current = { heading: match[1]!.trim(), body: '' };
            sections.push(current);
        } else {
            current.body += (current.body ? '\n' : '') + line;
        }
    }
    return sections;
}

function isConclusionHeading(heading: string): boolean {
    const normalized = heading.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    return normalized.includes('conclusion');
}

function truncate(s: string, max: number): string {
    const trimmed = s.trim();
    if (trimmed.length <= max) return trimmed;
    return trimmed.slice(0, max - 1).trimEnd() + '…';
}
