import type {
    IAIChatRepository,
    IExegeticalPaperRepository,
    ISermonRepository,
} from '@dosfilos/domain';
import { parseSermonCitations, type ParsedSermonCitation } from './sermonCitationParser';

/**
 * Verifies author-attributed quotes in a generated sermon against the
 * sermon's source corpus (originating exegetical paper or Faculty
 * conversation). Output flags fabricated quotes that slipped past the
 * PR #217 prompt-level guard so the pastor sees the warning BEFORE
 * publishing to the pulpit.
 *
 * Why a deterministic substring/fuzzy check instead of the existing
 * `GeminiLlmCitationVerifier`:
 *   - The exegetical-paper verifier targets *paraphrase detection*
 *     across languages (a Spanish paper citing English commentary
 *     won't match on tokens but will match semantically). Useful for
 *     scholarly papers.
 *   - For sermons the failure mode is *fabrication*: the LLM invents
 *     "Spurgeon said X" when nothing in the source mentions Spurgeon.
 *     A literal substring + fuzzy-token check on the source corpus
 *     catches this cheaply, with no LLM call per quote, and produces
 *     deterministic + auditable verdicts.
 *   - Cost: zero LLM tokens. Latency: <50 ms even for 5 citations
 *     against a 10k-char source corpus.
 *
 * The verifier intentionally short-circuits when no source corpus is
 * available (standalone wizard sermons with no paper/Faculty origin):
 * those sermons have nothing to verify against, so the dialog tells
 * the pastor "verificación no disponible" rather than producing false
 * confidence with empty source checks.
 */

export type SermonCitationStatus = 'verified' | 'fuzzy-low' | 'not-found';

export interface VerifiedSermonCitation {
    /** The original parsed citation block. */
    citation: ParsedSermonCitation;
    /** Verdict of the verifier. */
    status: SermonCitationStatus;
    /**
     * Similarity score in [0,1] when applicable. Used by the UI for
     * a confidence indicator on `fuzzy-low` verdicts.
     */
    similarity: number;
    /**
     * Short human-readable explanation of the verdict (ES, surfaced
     * directly in the warning dialog).
     */
    note: string;
}

export interface VerifySermonCitationsInput {
    ownerId: string;
    sermonId: string;
}

export interface VerifySermonCitationsOutput {
    /**
     * `'paper' | 'faculty' | null`. Null means the sermon has no
     * verifiable source corpus (standalone wizard sermon). UI shows
     * an "unavailable" notice rather than treating zero citations as
     * a clean bill of health.
     */
    sourceKind: 'paper' | 'faculty' | 'library' | null;
    /** Number of source-corpus characters checked against. */
    sourceCorpusLength: number;
    citations: VerifiedSermonCitation[];
}

export class VerifySermonCitationsUseCase {
    constructor(
        private sermonRepository: ISermonRepository,
        private paperRepository: IExegeticalPaperRepository,
        private chatRepository: IAIChatRepository,
    ) { }

    async execute(input: VerifySermonCitationsInput): Promise<VerifySermonCitationsOutput> {
        const sermon = await this.sermonRepository.findById(input.sermonId);
        if (!sermon) {
            throw new Error('Sermon not found');
        }
        if (sermon.userId !== input.ownerId) {
            throw new Error('Sermon does not belong to the actor');
        }

        // Resolve source corpus. Paper-derived sermons pull from the
        // paper's assembled markdown + each ProjectSource's excerpts.
        // Faculty-derived sermons pull from the conversation messages.
        // Standalone wizard sermons have no source to verify against.
        const sourceCorpus = await this.resolveSourceCorpus(sermon);
        const sermonMarkdown = this.resolveSermonMarkdown(sermon);

        const citations = parseSermonCitations(sermonMarkdown);
        const verified = citations.map((citation) => verifyOne(citation, sourceCorpus.text));

        return {
            sourceKind: sourceCorpus.kind,
            sourceCorpusLength: sourceCorpus.text.length,
            citations: verified,
        };
    }

    private async resolveSourceCorpus(sermon: {
        sourcePaperId?: string;
        sourceFacultySessionId?: string;
        userId: string;
        citationManifest?: { entries?: Array<{ excerpt?: string; author?: string; title?: string }> };
    }): Promise<{ kind: 'paper' | 'faculty' | 'library' | null; text: string }> {
        const parts: string[] = [];
        let kind: 'paper' | 'faculty' | 'library' | null = null;

        if (sermon.sourcePaperId) {
            kind = 'paper';
            const paper = await this.paperRepository.getPaper(sermon.userId, sermon.sourcePaperId);
            if (paper) {
                if (paper.assembledMarkdown) parts.push(paper.assembledMarkdown);
                // Each project source contributes its curated excerpts + its
                // display label. The label catches "as Owen wrote in his
                // commentary on Hebrews" — if Owen's commentary is a source,
                // the author surname is present.
                for (const source of paper.sources ?? []) {
                    if (source.displayLabel) parts.push(source.displayLabel);
                    if (source.citationKey) parts.push(source.citationKey);
                    const excerpts = (source as any).excerpts;
                    if (Array.isArray(excerpts)) {
                        for (const ex of excerpts) {
                            if (ex?.text) parts.push(ex.text);
                        }
                    }
                }
            }
        } else if (sermon.sourceFacultySessionId) {
            kind = 'faculty';
            const session = await this.chatRepository.getSession(
                sermon.userId,
                sermon.sourceFacultySessionId,
            );
            if (session) {
                const messages = (session.messages ?? []) as Array<{ content?: string }>;
                for (const m of messages) {
                    if (m?.content) parts.push(m.content);
                }
            }
        }

        // ADR-031: library-backed citations live in the citation manifest. Their
        // verbatim excerpts + author + title ARE real source material, so add
        // them to the corpus. This lets standalone wizard sermons (no paper /
        // Faculty) verify against their actual library sources instead of falsely
        // flagging every citation as invented.
        const entries = sermon.citationManifest?.entries ?? [];
        if (entries.length > 0) {
            for (const e of entries) {
                if (e.excerpt) parts.push(e.excerpt);
                if (e.author) parts.push(e.author);
                if (e.title) parts.push(e.title);
            }
            if (!kind) kind = 'library';
        }

        return { kind, text: parts.join('\n\n') };
    }

    private resolveSermonMarkdown(sermon: {
        content?: string;
        wizardProgress?: { draft?: any } | undefined;
    }): string {
        const draft = sermon.wizardProgress?.draft as
            | {
                introduction?: string;
                body?: Array<{ content?: string; authorityQuote?: string | null }>;
                conclusion?: string;
                callToAction?: string;
            }
            | undefined;
        if (draft) {
            const parts: string[] = [];
            if (draft.introduction) parts.push(draft.introduction);
            for (const b of draft.body ?? []) {
                if (b.content) parts.push(b.content);
                if (b.authorityQuote) parts.push(b.authorityQuote);
            }
            if (draft.conclusion) parts.push(draft.conclusion);
            if (draft.callToAction) parts.push(draft.callToAction);
            return parts.join('\n\n');
        }
        return sermon.content ?? '';
    }
}

// ── Verification ──────────────────────────────────────────────────────

/**
 * Returns a verdict for a single parsed citation. Three-stage check:
 *
 *   1. Author surname must appear in the source corpus. If the
 *      author's name is nowhere in the source material, the quote is
 *      almost certainly fabricated regardless of the quote text — the
 *      LLM made up both the quote AND the attribution.
 *   2. Quote text substring check against the source corpus
 *      (normalized). Catches direct quotes the paper transcribed.
 *   3. Quote text fuzzy-token check (Jaccard similarity on shingles)
 *      against any source chunk containing the author surname.
 *      Catches paraphrased quotes that are still grounded in the
 *      source.
 *
 * Note: this verifier is deterministic + cheap. It optimizes for
 * catching FABRICATION, not for catching paraphrase mismatch — the
 * latter is rare in sermon citation context (sermons either reuse
 * paper quotes verbatim or invent them wholesale).
 */
function verifyOne(citation: ParsedSermonCitation, corpus: string): VerifiedSermonCitation {
    if (!corpus.trim()) {
        return {
            citation,
            status: 'not-found',
            similarity: 0,
            note: 'No hay material fuente para verificar.',
        };
    }
    const corpusLower = corpus.toLowerCase();
    const surname = extractSurname(citation.author).toLowerCase();
    const quoteLower = citation.quote.toLowerCase();

    // Stage 1: author surname presence
    if (!surname || !corpusLower.includes(surname)) {
        return {
            citation,
            status: 'not-found',
            similarity: 0,
            note: `El autor "${citation.author}" no aparece en el material fuente. Probable cita inventada.`,
        };
    }

    // Stage 2: literal substring of the quote
    const normalizedQuote = normalizeForSearch(citation.quote);
    const normalizedCorpus = normalizeForSearch(corpus);
    if (normalizedCorpus.includes(normalizedQuote)) {
        return {
            citation,
            status: 'verified',
            similarity: 1,
            note: 'Cita encontrada literalmente en el material fuente.',
        };
    }

    // Stage 3: fuzzy token-set Jaccard against the corpus window
    // around the author's name.
    const sim = fuzzyTokenSimilarity(quoteLower, corpusLower, surname);
    if (sim >= 0.55) {
        return {
            citation,
            status: 'verified',
            similarity: sim,
            note: `Cita parafraseada del material fuente (similitud ${Math.round(sim * 100)}%).`,
        };
    }
    if (sim >= 0.25) {
        return {
            citation,
            status: 'fuzzy-low',
            similarity: sim,
            note: `Texto parcial vs ${citation.author}. Revisa que la cita refleje la fuente (similitud ${Math.round(sim * 100)}%).`,
        };
    }
    return {
        citation,
        status: 'not-found',
        similarity: sim,
        note: `El texto citado no aparece en lo que ${citation.author} expone en el material fuente. Probable cita inventada.`,
    };
}

function extractSurname(author: string): string {
    const cleaned = author.replace(/[*_"'.()]/g, '').trim();
    const parts = cleaned.split(/\s+/);
    return parts.length > 0 ? parts[parts.length - 1]! : '';
}

function normalizeForSearch(text: string): string {
    return text
        .toLowerCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')  // strip diacritics
        .replace(/[""'']/g, '"')
        .replace(/[—–]/g, '-')
        .replace(/\s+/g, ' ')
        .trim();
}

/**
 * Token-set Jaccard similarity between the quote and the slice of the
 * corpus around the author surname (within ±2000 chars). Filters
 * stopwords + tokens < 4 chars so the score reflects substantive
 * word overlap rather than noise.
 */
function fuzzyTokenSimilarity(quote: string, corpus: string, surname: string): number {
    const surnameIdx = corpus.indexOf(surname);
    if (surnameIdx === -1) return 0;
    const start = Math.max(0, surnameIdx - 2000);
    const end = Math.min(corpus.length, surnameIdx + 2000);
    const window = corpus.slice(start, end);

    const quoteTokens = tokenize(quote);
    const windowTokens = tokenize(window);
    if (quoteTokens.size === 0 || windowTokens.size === 0) return 0;

    let intersection = 0;
    for (const token of quoteTokens) {
        if (windowTokens.has(token)) intersection++;
    }
    const union = quoteTokens.size + windowTokens.size - intersection;
    return union === 0 ? 0 : intersection / union;
}

const STOPWORDS = new Set([
    'que', 'esta', 'este', 'para', 'como', 'pero', 'sino', 'sobre', 'cuando',
    'donde', 'porque', 'desde', 'hasta', 'entre', 'mientras', 'durante',
    'aunque', 'también', 'tambien', 'según', 'segun', 'aquí', 'aqui',
    'this', 'that', 'these', 'those', 'with', 'from', 'into', 'about',
    'which', 'where', 'when', 'while', 'because', 'although', 'between',
]);

function tokenize(text: string): Set<string> {
    return new Set(
        normalizeForSearch(text)
            .split(/\W+/)
            .filter((t) => t.length >= 4 && !STOPWORDS.has(t)),
    );
}
