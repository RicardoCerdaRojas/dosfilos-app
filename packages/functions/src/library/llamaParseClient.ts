/**
 * LlamaParse client — REST API wrapper for professional PDF extraction.
 *
 * Docs: https://docs.cloud.llamaindex.ai/llamaparse/
 *
 * Flow:
 *   1. uploadDocument(buffer, fileName) → returns job_id
 *   2. pollJob(job_id) → waits for SUCCESS
 *   3. getJsonResult(job_id) → returns structured pages
 */

export interface LlamaParsePage {
    page: number;                  // Actual page number from PDF
    text: string;                  // Plain extracted text
    md?: string;                   // Markdown version (preserves structure)
    images?: any[];                // Image references (if any)
    items?: Array<{                // Structured elements
        type: string;              // 'heading' | 'text' | 'table' | 'list' | ...
        lvl?: number;              // Heading level
        value?: string;
        rows?: any[];              // For tables
    }>;
    width?: number;
    height?: number;
}

export interface LlamaParseJobMetadata {
    credits_used?: number;
    credits_max?: number;
    job_credits_usage?: number;
    job_pages?: number;
    job_is_cache_hit?: boolean;
}

export interface LlamaParseResult {
    pages: LlamaParsePage[];
    jobMetadata: LlamaParseJobMetadata;
}

export type LlamaParseMode = 'fast' | 'balanced' | 'premium';

export interface LlamaParseOptions {
    mode?: LlamaParseMode;
    language?: string;             // 'es', 'en', 'gr', 'he' ...
    // Preserve Greek/Hebrew by telling the parser what to expect
    parsingInstruction?: string;
    // Timeout for job polling
    maxPollSeconds?: number;
    pollIntervalMs?: number;
}

const LLAMAPARSE_BASE_URL = 'https://api.cloud.llamaindex.ai/api/v1/parsing';

export class LlamaParseClient {
    constructor(private apiKey: string) {
        if (!apiKey) throw new Error('LlamaParse API key is required');
    }

    /**
     * Full pipeline: upload → poll → get result.
     */
    async parseDocument(
        fileBuffer: Buffer,
        fileName: string,
        options: LlamaParseOptions = {}
    ): Promise<LlamaParseResult> {
        const jobId = await this.uploadDocument(fileBuffer, fileName, options);
        console.log(`[LlamaParse] Job created: ${jobId}`);

        await this.pollJob(jobId, options);
        console.log(`[LlamaParse] Job ${jobId} completed successfully`);

        return this.getJsonResult(jobId);
    }

    /**
     * Upload a PDF for parsing. Returns the job_id.
     * Retries transient failures (429, 5xx, network) up to 2 times with
     * exponential backoff. Safe to retry: no LlamaParse credits are
     * billed until the upload succeeds (we get a job id back), so a
     * retried upload simply re-attempts the same operation.
     */
    async uploadDocument(
        fileBuffer: Buffer,
        fileName: string,
        options: LlamaParseOptions = {}
    ): Promise<string> {
        const buildForm = () => {
            const form = new FormData();
            const blob = new Blob([new Uint8Array(fileBuffer)], { type: 'application/pdf' });
            form.append('file', blob, fileName);
            const mode = options.mode ?? 'fast';
            if (mode === 'fast') form.append('fast_mode', 'true');
            else if (mode === 'premium') form.append('premium_mode', 'true');
            // 'balanced' = no flag (default LLM-based parsing)
            if (options.language) form.append('language', options.language);
            if (options.parsingInstruction) form.append('parsing_instruction', options.parsingInstruction);
            return form;
        };

        console.log(`[LlamaParse] Uploading "${fileName}" (${(fileBuffer.length / 1024 / 1024).toFixed(2)} MB) with mode=${options.mode ?? 'fast'}`);

        const json = await retryTransient(
            async () => {
                const res = await fetch(`${LLAMAPARSE_BASE_URL}/upload`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${this.apiKey}`,
                        'Accept': 'application/json',
                    },
                    body: buildForm(),
                });
                if (!res.ok) {
                    const body = await res.text();
                    const err = new Error(`LlamaParse upload failed (${res.status}): ${body.substring(0, 500)}`);
                    (err as any).status = res.status;
                    throw err;
                }
                return await res.json() as { id: string; status?: string };
            },
            { label: '[LlamaParse:upload]' },
        );

        if (!json.id) {
            console.error('[LlamaParse] Upload response has no id:', JSON.stringify(json));
            throw new Error('LlamaParse upload returned no job id');
        }
        return json.id;
    }

    /**
     * Poll a job until it reaches SUCCESS or ERROR state.
     *
     * Heartbeat logging: every 60s of polling we emit a status line
     * so the cloud function logs aren't completely silent during the
     * potentially-long wait (NTG-class 1000+ page PDFs take 10-15
     * min). Without this, debugging "why hasn't it finished?" requires
     * guessing whether the function is alive, dead, or just polling.
     */
    async pollJob(jobId: string, options: LlamaParseOptions = {}): Promise<void> {
        const maxSeconds = options.maxPollSeconds ?? 1200;  // 20 min default — big academic books take 10-12 min
        const interval = options.pollIntervalMs ?? 3000;   // 3s between polls
        const heartbeatEverySeconds = 60;                  // log status once per minute
        const startTime = Date.now();
        let lastHeartbeatAt = startTime;

        while ((Date.now() - startTime) / 1000 < maxSeconds) {
            const res = await fetch(`${LLAMAPARSE_BASE_URL}/job/${jobId}`, {
                headers: { 'Authorization': `Bearer ${this.apiKey}` },
            });

            if (!res.ok) {
                const body = await res.text();
                throw new Error(`LlamaParse job poll failed (${res.status}): ${body}`);
            }

            const job = await res.json() as { status: string; error?: string };
            if (job.status === 'SUCCESS') {
                const elapsedS = Math.round((Date.now() - startTime) / 1000);
                console.log(`[LlamaParse] Job ${jobId} SUCCESS in ${elapsedS}s`);
                return;
            }
            if (job.status === 'ERROR' || job.status === 'FAILED') {
                throw new Error(`LlamaParse job ${jobId} failed: ${job.error ?? 'unknown'}`);
            }

            // PENDING or PROCESSING → wait and retry. Heartbeat every
            // ~60s so the operator can see we're still alive without
            // flooding logs with one line per 3s poll.
            if ((Date.now() - lastHeartbeatAt) / 1000 >= heartbeatEverySeconds) {
                const elapsedS = Math.round((Date.now() - startTime) / 1000);
                console.log(`[LlamaParse] Job ${jobId} still ${job.status} (${elapsedS}s elapsed, max ${maxSeconds}s)`);
                lastHeartbeatAt = Date.now();
            }
            await sleep(interval);
        }

        throw new Error(`LlamaParse job ${jobId} timed out after ${maxSeconds}s`);
    }

    /**
     * Fetch the structured JSON result (pages with text + markdown).
     * Retries transient failures (5xx, network) — the job already exists
     * on LlamaParse's side, this is a pure GET, so retry is safe.
     */
    async getJsonResult(jobId: string): Promise<LlamaParseResult> {
        const json = await retryTransient(
            async () => {
                const res = await fetch(`${LLAMAPARSE_BASE_URL}/job/${jobId}/result/json`, {
                    headers: { 'Authorization': `Bearer ${this.apiKey}` },
                });
                if (!res.ok) {
                    const body = await res.text();
                    const err = new Error(`LlamaParse result fetch failed (${res.status}): ${body}`);
                    (err as any).status = res.status;
                    throw err;
                }
                return await res.json() as {
                    pages?: LlamaParsePage[];
                    job_metadata?: LlamaParseJobMetadata;
                };
            },
            { label: `[LlamaParse:getJsonResult ${jobId}]` },
        );

        return {
            pages: json.pages ?? [],
            jobMetadata: json.job_metadata ?? {},
        };
    }
}

/**
 * Retry helper for transient HTTP failures (429 rate-limit, 5xx server
 * errors, network errors). Returns immediately on success or on a
 * non-retryable error (4xx other than 429/408). Bounded: at most
 * `attempts` total invocations of `fn`, with exponential backoff
 * between attempts.
 *
 * Why this matters: LlamaParse occasionally throws 5xx or 429 under
 * burst load. Without a small retry, a single transient blip kills
 * the whole Premium path and the user sees a "Básico" badge for what
 * should have been a clean Premium extraction.
 */
async function retryTransient<T>(
    fn: () => Promise<T>,
    opts: { label: string; attempts?: number; baseDelayMs?: number } = { label: '[retry]' },
): Promise<T> {
    const attempts = opts.attempts ?? 3;
    const baseDelayMs = opts.baseDelayMs ?? 2000;

    for (let attempt = 1; attempt <= attempts; attempt++) {
        try {
            return await fn();
        } catch (err: any) {
            const status = err?.status as number | undefined;
            const isRetryable =
                status === 429 ||
                status === 408 ||
                (typeof status === 'number' && status >= 500 && status <= 599) ||
                // Network / fetch errors typically lack a status — assume retryable
                status === undefined;
            const isLastAttempt = attempt === attempts;
            if (!isRetryable || isLastAttempt) {
                if (!isRetryable) {
                    console.warn(`${opts.label} non-retryable error (status=${status}); failing immediately`);
                }
                throw err;
            }
            const delay = baseDelayMs * Math.pow(2, attempt - 1); // 2s, 4s, 8s...
            console.warn(`${opts.label} transient failure on attempt ${attempt}/${attempts} (status=${status ?? 'network'}); retrying in ${delay}ms — ${err?.message ?? err}`);
            await sleep(delay);
        }
    }
    // Unreachable, but TS needs a return path.
    throw new Error(`${opts.label} exhausted retries without throwing — bug in retryTransient`);
}

function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Format LlamaParse pages into a single text string with [PAGE N] markers.
 * This preserves backward compatibility with the existing chunker that looks
 * for the [PAGE N] pattern.
 */
export function pagesToMarkedText(pages: LlamaParsePage[]): string {
    return pages
        .map(p => `[PAGE ${p.page}]\n${p.text ?? ''}`)
        .join('\n\n');
}

/**
 * Format LlamaParse pages into Markdown with page markers.
 * Used for storage as `structuredContent` for Phase 2 (smart chunking).
 *
 * Note: `||` (not `??`) because LlamaParse fast mode can return `p.md = ""`
 * (empty string, not undefined), and we want to fall back to `p.text` in that case.
 */
export function pagesToMarkdown(pages: LlamaParsePage[]): string {
    return pages
        .map(p => {
            const content = (p.md && p.md.trim()) || (p.text && p.text.trim()) || '';
            return `<!-- page: ${p.page} -->\n${content}`;
        })
        .join('\n\n---\n\n');
}
