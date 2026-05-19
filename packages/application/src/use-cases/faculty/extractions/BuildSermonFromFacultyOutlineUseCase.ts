import {
    SermonEntity,
    type ExegeticalStudy,
    type HomileticalAnalysis,
    type IExtractionRepository,
    type ISermonRepository,
    type Sermon,
    type SermonContent,
    type SermonOutline,
    type SermonPersonalization,
} from '@dosfilos/domain';
import type { ExtractTheologicalContentUseCase, ApprovedSermonOutline } from '../ExtractTheologicalContentUseCase';
import type { SaveSermonExtractionUseCase } from './SaveSermonExtractionUseCase';

/**
 * Faculty → Wizard convergence (2026-05-19): generates a full sermon
 * from an approved Faculty outline + optional pastoral personalization,
 * then persists it as a `Sermon` with `wizardProgress` pre-populated so
 * the user lands in the sermon wizard at Step 3 (Redacción) with
 * everything ready to refine or publish.
 *
 * Replaces the legacy Faculty path where `SermonOutlinePreviewModal`
 * called `extractContent({type:'SERMON'})` to generate raw markdown +
 * then `createSermon()` to persist a sermon doc + `saveSermonExtraction`
 * to mirror the artifact. That flow landed the user in
 * `FacultyDocumentEditor` (raw markdown autosave) which bypassed the
 * wizard's chat refinement, versioning, Greek Tutor and RAG tooling.
 *
 * The convergence keeps the same 2 LLM calls per Faculty sermon (1 for
 * outline + 1 for full sermon) and reuses the exact same SERMON prompt
 * inside `ExtractTheologicalContentUseCase` — only the post-processing
 * moves into this use case so the output lands in `wizardProgress`
 * instead of the Faculty editor.
 *
 * Persistence after generation:
 *   - `sermons/{id}` with `wizardProgress.draft` + `content` (back-compat)
 *     + `wizardProgress.derivedContext.kind === 'faculty'` for banner.
 *   - `extractions/{id}` mirror with `externalRef → sermons/{id}` so the
 *     sermon still surfaces in Faculty's Generados tab + library tabs.
 *
 * Series-planner integration: this path does NOT auto-link to a series.
 * Faculty sermons are typically ad-hoc, not series-driven (the series
 * path is paper-derived via `GenerateSermonFromPaperUseCase`).
 */

export interface BuildSermonFromFacultyOutlineInput {
    ownerId: string;
    sessionId: string;
    /** Title of the originating Faculty session for the banner. */
    sessionTitle: string;
    approvedOutline: ApprovedSermonOutline;
    personalization?: SermonPersonalization;
    derivedFromMessageIds: string[];
}

export interface BuildSermonFromFacultyOutlineOutput {
    sermonId: string;
    /** Full markdown of the generated sermon — useful for inline preview. */
    content: string;
}

export class BuildSermonFromFacultyOutlineUseCase {
    constructor(
        private extractContent: ExtractTheologicalContentUseCase,
        private sermonRepository: ISermonRepository,
        private saveSermonExtraction: SaveSermonExtractionUseCase,
        private extractionRepository: IExtractionRepository,
    ) { }

    async execute(input: BuildSermonFromFacultyOutlineInput): Promise<BuildSermonFromFacultyOutlineOutput> {
        if (!input.ownerId) throw new Error('BuildSermonFromFacultyOutlineUseCase: ownerId required');
        if (!input.sessionId) throw new Error('BuildSermonFromFacultyOutlineUseCase: sessionId required');
        if (!input.approvedOutline) throw new Error('BuildSermonFromFacultyOutlineUseCase: approvedOutline required');

        // Reuse the existing SERMON prompt in ExtractTheologicalContentUseCase.
        // It consumes session messages + optional projectContext + the
        // approved outline + optional personalization. Output is the full
        // sermon markdown with the leading title/passage/proposition
        // header block + first `---` divider before the `## Introducción`.
        const fullMarkdown = await this.extractContent.execute(
            input.ownerId,
            input.sessionId,
            'SERMON',
            input.approvedOutline,
            input.personalization,
        );

        const cleanContent = stripSermonHeader(fullMarkdown);
        const draft = parseDraftFromSermonMarkdown(cleanContent, input.approvedOutline);
        const exegesis = buildExegesisStub(input.approvedOutline);
        const homiletics = buildHomileticsStub(exegesis, input.approvedOutline, input.personalization);

        const wizardProgress: NonNullable<Sermon['wizardProgress']> = {
            currentStep: 3,
            passage: input.approvedOutline.passage,
            exegesis,
            homiletics,
            draft,
            lastSaved: new Date(),
            derivedContext: {
                kind: 'faculty',
                sessionId: input.sessionId,
                sessionTitle: input.sessionTitle,
                outline: {
                    title: input.approvedOutline.title,
                    passage: input.approvedOutline.passage,
                    proposition: input.approvedOutline.proposition,
                    points: input.approvedOutline.points,
                },
                personalization: input.personalization as Record<string, unknown> | undefined,
                generatedAt: new Date(),
            },
        };

        const sermon = SermonEntity.create({
            userId: input.ownerId,
            title: input.approvedOutline.title || 'Sermón sin título',
            // `content` populated for the legacy sermon-detail surface +
            // the unified "Artefactos derivados" panel quick preview.
            content: cleanContent,
            bibleReferences: input.approvedOutline.passage ? [input.approvedOutline.passage] : [],
            status: 'draft',
            sourceFacultySessionId: input.sessionId,
            wizardProgress,
        });

        await this.sermonRepository.create(sermon);

        // Mirror as Extraction so the sermon surfaces in Faculty's
        // Generados tab + project libraries (same UX as pre-convergence).
        // Best-effort: a mirror failure does not roll back the sermon
        // (the sermon doc is authoritative). UI keeps working — the
        // sermon is reachable via Mis Sermones + the planner.
        try {
            await this.saveSermonExtraction.execute({
                userId: input.ownerId,
                sessionId: input.sessionId,
                sermonId: sermon.id,
                title: input.approvedOutline.title || 'Sermón sin título',
                markdown: cleanContent,
                derivedFromMessageIds: input.derivedFromMessageIds,
            });
        } catch (err) {
            console.warn(
                `[BuildSermonFromFacultyOutlineUseCase] extraction mirror failed for sermon=${sermon.id}:`,
                err,
            );
        }

        return { sermonId: sermon.id, content: cleanContent };
    }
}

// ── Markdown helpers ───────────────────────────────────────────────────

/**
 * Strips the AI-generated title/passage/proposition header block (lives
 * before the first `\n---\n` divider). Same heuristic the Faculty modal
 * used pre-convergence so wizard storage matches what the legacy editor
 * would have shown.
 */
function stripSermonHeader(markdown: string): string {
    const dividerIndex = markdown.indexOf('\n---\n');
    if (dividerIndex !== -1) {
        return markdown.slice(dividerIndex + 5).trimStart();
    }
    return markdown.replace(/^#[^\n]*\n/, '').trimStart();
}

/**
 * Parses the SERMON prompt's structured markdown into a `SermonContent`
 * shape compatible with the wizard's StepDraft renderer.
 *
 * SERMON prompt output structure (after `stripSermonHeader`):
 *   ## Introducción
 *     ### Contexto Histórico ... ### Conexión Actual ... ### Proposición y Puntos ...
 *   ---
 *   ## Punto I: ...   ### Exposición Bíblica ... **Referencias Cruzadas** ... etc.
 *   ---
 *   ## Punto II: ... (same shape)
 *   ---
 *   ## Conclusión
 *     ### Síntesis ... ### Llamado Final ...
 *   ## Llamado a la Acción ...
 *
 * Heuristic split: each `^## ` heading is a section. Introducción +
 * Conclusión map to dedicated fields; numbered points (heading begins
 * with "Punto" or contains roman numeral) become `body[]`. Anything
 * leftover (Llamado a la Acción) collapses into `callToAction`.
 */
function parseDraftFromSermonMarkdown(
    markdown: string,
    outline: ApprovedSermonOutline,
): SermonContent {
    const sections = splitOnLevel2Headings(markdown);

    let introduction = '';
    let conclusion = '';
    let callToAction: string | undefined;
    const bodySections: { heading: string; body: string }[] = [];

    for (const section of sections) {
        if (!section.heading) continue; // Pre-heading chunk (usually empty after strip)
        const norm = normalizeHeading(section.heading);
        if (norm === 'introduccion') {
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
        title: outline.title,
        introduction: introduction || fallbackIntroduction(outline),
        body: bodySections.map((s, i) => {
            const matchingOutlinePoint = outline.points[i];
            return {
                point: s.heading,
                content: s.body.trim(),
                scriptureReferences: matchingOutlinePoint?.verses
                    ? [`${outline.passage} (${matchingOutlinePoint.verses})`]
                    : [outline.passage].filter(Boolean),
            };
        }),
        conclusion: conclusion || fallbackConclusion(outline),
        ...(callToAction ? { callToAction } : {}),
    };
}

function fallbackIntroduction(outline: ApprovedSermonOutline): string {
    return `Introducción al sermón sobre ${outline.passage}: ${outline.proposition}`;
}

function fallbackConclusion(outline: ApprovedSermonOutline): string {
    return `Conclusión derivada del sermón: ${outline.title}.`;
}

// ── Stub builders ──────────────────────────────────────────────────────

function buildExegesisStub(outline: ApprovedSermonOutline): ExegeticalStudy {
    return {
        passage: outline.passage,
        context: {
            historical: '',
            literary: '',
            audience: '',
        },
        // The outline's point titles double as keyWord stand-ins so
        // publish flow (StepDraft uses keyWords as tags) has non-empty
        // tag input. User can edit tags before publish.
        keyWords: outline.points.map(p => ({
            original: p.title,
            transliteration: '',
            morphology: '',
            syntacticFunction: '',
            significance: p.verses,
        })),
        exegeticalProposition: outline.proposition,
        pastoralInsights: [],
    };
}

function buildHomileticsStub(
    exegesis: ExegeticalStudy,
    outline: ApprovedSermonOutline,
    personalization?: SermonPersonalization,
): HomileticalAnalysis {
    return {
        exegeticalStudy: exegesis,
        // Faculty outlines are typically expository (verse-anchored
        // points), so map to 'expository'. The tone field on
        // personalization is a separate axis (pastoral / doxological /
        // didactic / etc.) and informs prompts, not approach.
        homileticalApproach: 'expository',
        homileticalProposition: outline.proposition,
        contemporaryApplication: personalization?.preacherNotes
            ? [personalization.preacherNotes]
            : [],
        outline: outlineToSermonOutline(outline),
    };
}

function outlineToSermonOutline(outline: ApprovedSermonOutline): SermonOutline {
    return {
        mainPoints: outline.points.map(p => ({
            title: p.title,
            description: p.verses,
            scriptureReferences: [outline.passage],
        })),
    };
}

// ── Generic markdown splitter (shared with paper mapper if extracted) ──

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
