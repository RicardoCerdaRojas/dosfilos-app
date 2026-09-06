import type {
    ExegeticalStudy,
    HomileticalAnalysis,
    Sermon,
    SermonContent,
    SermonOutline,
} from '@dosfilos/domain';

/**
 * Runtime migration for sermons created before PRs #213/#214 (pipeline
 * convergence). Pre-convergence sermons were persisted with their full
 * markdown body in `sermon.content` but without a populated
 * `wizardProgress.draft` — the wizard's StepDraft only reads
 * `wizardProgress.draft`, so legacy sermons opened as empty Step 0
 * shells despite having content.
 *
 * Migration cases:
 *   1. `sourcePaperId` present + content → migrate as paper-derived
 *      (derivedContext.kind = 'paper').
 *   2. `sourceFacultySessionId` present + content → migrate as
 *      Faculty-derived (derivedContext.kind = 'faculty').
 *   3. Neither + content → migrate as wizard-native (no derivedContext,
 *      just parsed draft).
 *
 * Empty sermons (no content) are NOT migrated — they were genuinely
 * empty drafts and the wizard's Step 0 behavior is correct.
 *
 * Already-migrated sermons (`wizardProgress.draft` set OR
 * `wizardProgress.derivedContext` set) are passed through unchanged so
 * the migration is idempotent.
 *
 * The wizard component handles persistence: when this returns
 * `migrated: true`, the wizard calls `sermonService.updateWizardProgress`
 * once so the migrated state survives reload. Subsequent loads return
 * `migrated: false` and skip persistence.
 */

export interface MigrationResult {
    /** True when this call produced a synthesized wizardProgress. */
    migrated: boolean;
    /** The wizardProgress to use (either freshly synthesized or the existing one). */
    wizardProgress: NonNullable<Sermon['wizardProgress']>;
}

export function migrateLegacyWizardProgress(sermon: Sermon): MigrationResult | null {
    // Nothing to do — sermon is wizard-native (no markdown payload + no
    // legacy migration possible) and the wizard's empty-state path
    // handles it correctly.
    if (!sermon.content?.trim()) {
        return null;
    }

    // Already converged (post-PR #213/#214 sermon). Pass through.
    const existing = sermon.wizardProgress;
    if (existing?.draft || existing?.derivedContext) {
        return existing
            ? { migrated: false, wizardProgress: existing }
            : null;
    }

    const draft = parseDraftFromMarkdown(sermon.content, sermon.title);
    const passage = sermon.bibleReferences?.[0]
        ?? existing?.passage
        ?? draft.title;
    const exegesis = buildExegesisStub(passage, sermon.title, sermon.tags ?? []);
    const homiletics = buildHomileticsStub(exegesis, draft);

    const synthesized: NonNullable<Sermon['wizardProgress']> = {
        ...existing,
        currentStep: 3,
        passage,
        exegesis,
        homiletics,
        draft,
        lastSaved: new Date(),
    };

    // Stamp derivedContext when the sermon's provenance is clear from
    // its back-reference fields. Standalone legacy sermons (no paper /
    // no faculty) get no derivedContext — banner stays hidden.
    if (sermon.sourcePaperId) {
        synthesized.derivedContext = {
            kind: 'paper',
            paperId: sermon.sourcePaperId,
            paperTitle: sermon.title || passage,
            // Tone is unknown for legacy sermons (pre-#213 didn't
            // persist it). 'pastoral' is the planner's default fallback
            // so we use it here too — the banner copy mentions tone in
            // the homiletics hint, this keeps interpolation happy.
            tone: 'pastoral',
            generatedAt: sermon.createdAt,
            // Marker so analytics / debugging can identify migrated
            // sermons. Not a real model id — generation already happened
            // pre-migration, no LLM call here.
            transformerModelId: 'legacy-migration',
        };
    } else if (sermon.sourceFacultySessionId) {
        synthesized.derivedContext = {
            kind: 'faculty',
            sessionId: sermon.sourceFacultySessionId,
            sessionTitle: sermon.title || 'Sesión Faculty',
            outline: {
                title: sermon.title || passage,
                passage,
                proposition: sermon.title || passage,
                // Outline points are inferred from the draft body since
                // the original approved outline wasn't persisted
                // pre-#214. Best-effort.
                points: draft.body.map((b, i) => ({
                    title: b.point,
                    verses: b.scriptureReferences?.[0] ?? `Punto ${i + 1}`,
                })),
            },
            generatedAt: sermon.createdAt,
        };
    }

    return { migrated: true, wizardProgress: synthesized };
}

// ── Markdown parsing ───────────────────────────────────────────────────

/**
 * Splits the legacy `sermon.content` markdown into a `SermonContent`
 * shape compatible with StepDraft. Detects intro / body / conclusion /
 * call-to-action sections by heading text.
 *
 * Heurística que compartía con `paperToWizardProgress.parseDraftFromMarkdown`
 * (retirado con el transformador paper→sermón)
 * + `BuildSermonFromFacultyOutlineUseCase.parseDraftFromSermonMarkdown`:
 * keep it lightweight and tolerant of structural variation since
 * pre-convergence content came from two distinct prompt templates with
 * different conventions.
 */
function parseDraftFromMarkdown(markdown: string, fallbackTitle: string): SermonContent {
    const sections = splitOnLevel2Headings(markdown);
    let introduction = '';
    let conclusion = '';
    let callToAction: string | undefined;
    const bodySections: { heading: string; body: string }[] = [];

    // First section (no heading) is treated as introduction if it has
    // content — this covers paper-derived sermons where the transformer
    // emitted intro text before any `## ` heading.
    if (sections[0] && !sections[0].heading && sections[0].body.trim()) {
        introduction = sections[0].body.trim();
    }

    for (const section of sections) {
        if (!section.heading) continue;
        const norm = normalizeHeading(section.heading);
        if (norm === 'introduccion') {
            // Faculty-derived has explicit `## Introducción`; that wins
            // over the pre-heading chunk if both exist.
            introduction = section.body.trim();
        } else if (norm === 'conclusion') {
            conclusion = section.body.trim();
        } else if (norm === 'llamado a la accion' || norm === 'call to action') {
            callToAction = section.body.trim();
        } else {
            bodySections.push(section);
        }
    }

    return {
        title: fallbackTitle || 'Sermón',
        introduction: introduction || 'Introducción del sermón.',
        body: bodySections.map(s => ({
            point: s.heading,
            content: s.body.trim(),
            scriptureReferences: [],
        })),
        conclusion: conclusion || 'Conclusión del sermón.',
        ...(callToAction ? { callToAction } : {}),
    };
}

interface MarkdownSection {
    heading: string;
    body: string;
}

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

function normalizeHeading(heading: string): string {
    return heading
        .toLowerCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/[:.]/g, '')
        .trim();
}

// ── Stub builders ──────────────────────────────────────────────────────

function buildExegesisStub(passage: string, title: string, tags: string[]): ExegeticalStudy {
    return {
        passage,
        context: { historical: '', literary: '', audience: '' },
        keyWords: tags.slice(0, 5).map(t => ({
            original: t,
            transliteration: '',
            morphology: '',
            syntacticFunction: '',
            significance: '',
        })),
        exegeticalProposition: title || passage,
        pastoralInsights: [],
    };
}

function buildHomileticsStub(
    exegesis: ExegeticalStudy,
    draft: SermonContent,
): HomileticalAnalysis {
    return {
        exegeticalStudy: exegesis,
        // No form is known when reconstructing from a legacy draft — leave unset
        // rather than fabricate one (expositivity is a condition, not a default form).
        homileticalProposition: draft.title,
        contemporaryApplication: [],
        outline: outlineFromDraft(draft),
    };
}

function outlineFromDraft(draft: SermonContent): SermonOutline {
    return {
        mainPoints: draft.body.map(b => ({
            title: b.point,
            description: b.content.slice(0, 200),
            scriptureReferences: b.scriptureReferences ?? [],
        })),
    };
}
