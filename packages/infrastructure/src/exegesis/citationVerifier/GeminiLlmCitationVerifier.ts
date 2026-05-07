import { GoogleGenerativeAI } from '@google/generative-ai';
import type {
    CitationStatus,
    CitationVerifierInput,
    CitationVerifierOutput,
    ICitationVerifier,
    ParsedCitation,
    VerifiedCitation,
    VerifierSource,
    VerifierSourceChunk,
} from '@dosfilos/domain';
import { withGeminiRetry } from '../geminiRetry';
import { parseCitations } from './citationParser';
import { buildLlmVerifierPrompt } from './llmVerifierPrompts';
import { LLM_CITATION_VERIFIER_SCHEMA } from './llmVerifierSchema';

/**
 * Robust citation verifier — replaces the token-set Jaccard adapter
 * with one Gemini call per citation. Designed to handle the realistic
 * cross-language scenario the Fuzzy verifier can't: a Spanish paper
 * paraphrasing English commentary returns 0% Jaccard but the LLM
 * verifier reads both languages and judges meaning, not lexical
 * overlap.
 *
 * Pipeline:
 *   1. Parse all citations from the markdown (shared `parseCitations`).
 *   2. Match each cite to a source via author/title heuristics
 *      (mirrors `FuzzyCitationVerifier.SourceMatcher` to keep
 *      identification consistent across adapters).
 *   3. For each matched cite, call Gemini with the claim + the
 *      source's chunks. The model returns status + confidence +
 *      bestPageHint + reasoning, all enum-locked via responseSchema.
 *   4. Collapse the LLM verdict into the domain `CitationStatus`
 *      catalog and overlay the page-mismatch logic when both sides
 *      provide pages.
 *
 * Cost estimate: ~$0.001 per citation with Pro 2.5. A typical step
 * with 5-10 cites costs <$0.01 to verify. Calls run in parallel
 * (Promise.all) so latency is roughly the slowest call, not the sum.
 *
 * Failure semantics:
 *   - Per-citation LLM errors fall back to `manual-pending` with the
 *     error captured in `note` so a single 503 doesn't blow up the
 *     whole verification run.
 *   - Source not matched bypasses the LLM entirely (free).
 */
export class GeminiLlmCitationVerifier implements ICitationVerifier {
    private genAI: GoogleGenerativeAI;
    private modelName: string;
    /** Per-source-chunk character cap to keep prompt tokens bounded. */
    private maxCharsPerChunk: number;
    /** Per-citation chunk cap. Excerpts win first; full-doc fallback gets sliced. */
    private maxChunksPerCitation: number;

    constructor(
        apiKey: string,
        options?: {
            modelName?: string;
            maxCharsPerChunk?: number;
            maxChunksPerCitation?: number;
        },
    ) {
        this.genAI = new GoogleGenerativeAI(apiKey);
        this.modelName = options?.modelName || 'gemini-2.5-pro';
        this.maxCharsPerChunk = options?.maxCharsPerChunk ?? 4000;
        this.maxChunksPerCitation = options?.maxChunksPerCitation ?? 8;
    }

    async verify(input: CitationVerifierInput): Promise<CitationVerifierOutput> {
        const lookup = new SourceMatcher(input.sources);
        const parsed = parseCitations(input.markdown);

        // Detect output language from the first parsed citation's
        // surrounding evidence — heuristic but cheap. Falls back to
        // Spanish (the more common case for our user base).
        const language = detectLanguage(parsed);

        const verdicts = await Promise.all(
            parsed.map(p => this.verifyOne(p, lookup, language)),
        );

        return { citations: verdicts };
    }

    private async verifyOne(
        parsed: ParsedCitation,
        lookup: SourceMatcher,
        language: 'es' | 'en',
    ): Promise<VerifiedCitation> {
        const matched = lookup.match(parsed.author, parsed.title);
        if (!matched) {
            return {
                ...parsed,
                status: 'not-found',
                matchedCorpusId: null,
                matchedSourceLabel: null,
                similarityScore: null,
                matchedPage: null,
                note: language === 'en'
                    ? 'No source matched the author/title in this citation.'
                    : 'Ninguna fuente coincide con el autor/título de esta cita.',
            };
        }

        if (!parsed.evidence || parsed.evidence.trim().length === 0) {
            return {
                ...parsed,
                status: 'manual-pending',
                matchedCorpusId: matched.corpusId,
                matchedSourceLabel: matched.displayLabel,
                similarityScore: null,
                matchedPage: null,
                note: language === 'en'
                    ? 'No surrounding claim text could be extracted; please review manually.'
                    : 'No se pudo extraer el texto reclamado alrededor de la cita; revisa manualmente.',
            };
        }

        const chunks = this.prepareChunks(matched.chunks);
        if (chunks.length === 0) {
            return {
                ...parsed,
                status: 'not-found',
                matchedCorpusId: matched.corpusId,
                matchedSourceLabel: matched.displayLabel,
                similarityScore: null,
                matchedPage: null,
                note: language === 'en'
                    ? 'Source matched but no readable chunks were available to verify against.'
                    : 'La fuente coincide pero no hay fragmentos legibles disponibles para verificar.',
            };
        }

        const { systemInstruction, userMessage } = buildLlmVerifierPrompt({
            rawCitation: parsed.raw,
            evidence: parsed.evidence,
            evidenceIsQuoted: parsed.evidenceIsQuoted,
            citedPages: parsed.pages,
            matchedSourceLabel: matched.displayLabel,
            chunks,
            language,
        });

        try {
            const model = this.genAI.getGenerativeModel({
                model: this.modelName,
                systemInstruction,
                generationConfig: {
                    responseMimeType: 'application/json',
                    responseSchema: LLM_CITATION_VERIFIER_SCHEMA as any,
                    temperature: 0.1,
                    topP: 0.9,
                    maxOutputTokens: 1024,
                },
            });
            const result = await withGeminiRetry(
                () => model.generateContent(userMessage),
                { contextLabel: 'GeminiLlmCitationVerifier' },
            );
            const rawJson = result.response.text();
            const parsedResp = parseLlmResponse(rawJson);

            const matchedPage = extractPageFromHint(parsedResp.bestPageHint);
            let status: CitationStatus = parsedResp.status;
            let note: string | null = parsedResp.reasoning || null;

            // Page-mismatch overlay: if the LLM declared verified AND
            // both sides provide pages, surface page-mismatch when
            // they don't overlap. Same semantics as the Fuzzy verifier
            // so the dialog renders identically.
            if (status === 'verified' && parsed.pages && matchedPage) {
                if (!pagesOverlap(parsed.pages, matchedPage)) {
                    status = 'page-mismatch';
                    note = language === 'en'
                        ? `Cited p. ${parsed.pages} but the supporting passage is at ${matchedPage}.`
                        : `Citaste p. ${parsed.pages} pero el pasaje de apoyo está en ${matchedPage}.`;
                }
            }

            return {
                ...parsed,
                status,
                matchedCorpusId: matched.corpusId,
                matchedSourceLabel: matched.displayLabel,
                similarityScore: parsedResp.confidence,
                matchedPage,
                note,
            };
        } catch (err) {
            console.warn('[GeminiLlmCitationVerifier] verify failed for citation, falling back to manual-pending:', err);
            return {
                ...parsed,
                status: 'manual-pending',
                matchedCorpusId: matched.corpusId,
                matchedSourceLabel: matched.displayLabel,
                similarityScore: null,
                matchedPage: null,
                note: language === 'en'
                    ? 'Verifier call failed; please retry or review manually.'
                    : 'La verificación falló; reintenta o revisa manualmente.',
            };
        }
    }

    /**
     * Prepares the chunks the verifier sends to Gemini. Caps both per-
     * chunk character count (so one giant chunk doesn't blow the
     * context) and total chunk count per citation. Excerpts (with
     * pageHints) win first since they're the user's curated evidence
     * and preserve page-mismatch detection; full-document fallback
     * chunks fill the remainder.
     */
    private prepareChunks(chunks: ReadonlyArray<VerifierSourceChunk>): VerifierSourceChunk[] {
        const sorted = [...chunks].sort((a, b) => {
            // pageHint=null (full doc) goes last
            if (!!a.pageHint === !!b.pageHint) return 0;
            return a.pageHint ? -1 : 1;
        });
        return sorted
            .slice(0, this.maxChunksPerCitation)
            .map(c => ({
                text: c.text.length > this.maxCharsPerChunk
                    ? c.text.slice(0, this.maxCharsPerChunk)
                    : c.text,
                pageHint: c.pageHint,
            }))
            .filter(c => c.text.trim().length > 0);
    }
}

interface ParsedLlmResponse {
    status: CitationStatus;
    confidence: number | null;
    bestPageHint: string;
    reasoning: string;
}

function parseLlmResponse(rawJson: string): ParsedLlmResponse {
    let parsed: any;
    try {
        parsed = JSON.parse(rawJson);
    } catch {
        return { status: 'manual-pending', confidence: null, bestPageHint: '', reasoning: '' };
    }
    const status: CitationStatus = parsed?.status === 'verified'
        || parsed?.status === 'fuzzy-low'
        || parsed?.status === 'not-found'
        ? parsed.status
        : 'manual-pending';
    const confidence = typeof parsed?.confidence === 'number'
        && Number.isFinite(parsed.confidence)
        ? Math.max(0, Math.min(1, parsed.confidence))
        : null;
    const bestPageHint = typeof parsed?.bestPageHint === 'string' ? parsed.bestPageHint : '';
    const reasoning = typeof parsed?.reasoning === 'string' ? parsed.reasoning.trim() : '';
    return { status, confidence, bestPageHint, reasoning };
}

function extractPageFromHint(hint: string): string | null {
    if (!hint) return null;
    const match = hint.match(/(\d+(?:\s*[–\-—]\s*\d+)?)/);
    return match ? match[1]!.replace(/\s+/g, '') : null;
}

function pagesOverlap(citedRaw: string, matchedRaw: string): boolean {
    const cited = parseRange(citedRaw);
    const matched = parseRange(matchedRaw);
    if (!cited || !matched) return citedRaw === matchedRaw;
    return cited.start <= matched.end && matched.start <= cited.end;
}

function parseRange(raw: string): { start: number; end: number } | null {
    const cleaned = raw.replace(/\s+/g, '').replace(/[–—]/g, '-');
    const m = cleaned.match(/^(\d+)(?:-(\d+))?/);
    if (!m) return null;
    const start = parseInt(m[1]!, 10);
    const end = m[2] ? parseInt(m[2]!, 10) : start;
    return { start, end };
}

/**
 * Heuristic language detection from the first citation's evidence.
 * Tests for a tiny set of high-frequency Spanish-only function words
 * — robust enough for our paper-vs-source use, where the input is
 * always one of the two we support.
 */
function detectLanguage(citations: ParsedCitation[]): 'es' | 'en' {
    if (citations.length === 0) return 'es';
    const sample = citations.map(c => c.evidence).join(' ').toLowerCase();
    const spanishHits = (sample.match(/\b(que|para|por|del|los|las|una|este|esta|también|según|sino)\b/g) || []).length;
    const englishHits = (sample.match(/\b(the|of|to|and|in|that|with|from|is|are|this|these)\b/g) || []).length;
    return spanishHits > englishHits ? 'es' : 'en';
}

// ── Source matching ─────────────────────────────────────────────────
//
// Mirrors `FuzzyCitationVerifier.SourceMatcher`. Reproduced here
// rather than imported because the matcher there is private to its
// module; refactoring would couple two adapters that should evolve
// independently.

class SourceMatcher {
    private byKey = new Map<string, VerifierSource>();
    private bySurname = new Map<string, VerifierSource>();
    private all: VerifierSource[];

    constructor(sources: ReadonlyArray<VerifierSource>) {
        this.all = [...sources];
        for (const s of sources) {
            if (s.citationKey) this.byKey.set(normalize(s.citationKey), s);
            const surname = extractSurname(s.fullAuthor) ?? extractSurname(s.citationKey);
            if (surname) this.bySurname.set(normalize(surname), s);
        }
    }

    match(authorToken: string, titleToken: string): VerifierSource | null {
        const authorNorm = normalize(authorToken);
        const direct = this.byKey.get(authorNorm) ?? this.bySurname.get(authorNorm);
        if (direct) return direct;
        const firstWord = normalize(authorToken.split(/\s+/)[0] ?? '');
        if (firstWord) {
            const byFirstWord = this.byKey.get(firstWord) ?? this.bySurname.get(firstWord);
            if (byFirstWord) return byFirstWord;
        }
        const titleNorm = normalize(titleToken);
        if (titleNorm.length >= 4) {
            for (const candidate of this.all) {
                const labelNorm = normalize(candidate.displayLabel);
                if (!labelNorm) continue;
                if (labelNorm === titleNorm
                    || labelNorm.includes(titleNorm)
                    || titleNorm.includes(labelNorm)) {
                    return candidate;
                }
            }
        }
        return null;
    }
}

function normalize(s: string): string {
    return s.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

function extractSurname(fullAuthor: string | null | undefined): string | null {
    if (!fullAuthor) return null;
    const trimmed = fullAuthor.trim();
    if (!trimmed) return null;
    if (trimmed.includes(',')) return trimmed.split(',')[0]!.trim();
    const parts = trimmed.split(/\s+/);
    return parts[parts.length - 1] ?? null;
}
