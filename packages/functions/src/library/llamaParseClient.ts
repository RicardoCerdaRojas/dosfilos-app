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
     */
    async uploadDocument(
        fileBuffer: Buffer,
        fileName: string,
        options: LlamaParseOptions = {}
    ): Promise<string> {
        const form = new FormData();
        const blob = new Blob([new Uint8Array(fileBuffer)], { type: 'application/pdf' });
        form.append('file', blob, fileName);

        // Use the widely-documented `fast_mode` flag — simplest & most reliable.
        const mode = options.mode ?? 'fast';
        if (mode === 'fast') {
            form.append('fast_mode', 'true');
        } else if (mode === 'premium') {
            form.append('premium_mode', 'true');
        }
        // 'balanced' = no flag (default LLM-based parsing)

        if (options.language) {
            form.append('language', options.language);
        }
        if (options.parsingInstruction) {
            form.append('parsing_instruction', options.parsingInstruction);
        }

        console.log(`[LlamaParse] Uploading "${fileName}" (${(fileBuffer.length / 1024 / 1024).toFixed(2)} MB) with mode=${mode}`);

        const res = await fetch(`${LLAMAPARSE_BASE_URL}/upload`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.apiKey}`,
                'Accept': 'application/json',
            },
            body: form,
        });

        if (!res.ok) {
            const body = await res.text();
            console.error(`[LlamaParse] Upload failed. Status: ${res.status}. Body: ${body}`);
            throw new Error(`LlamaParse upload failed (${res.status}): ${body.substring(0, 500)}`);
        }

        const json = await res.json() as { id: string; status?: string };
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
        const maxSeconds = options.maxPollSeconds ?? 600;  // 10 min default (bump from 5)
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
     */
    async getJsonResult(jobId: string): Promise<LlamaParseResult> {
        const res = await fetch(`${LLAMAPARSE_BASE_URL}/job/${jobId}/result/json`, {
            headers: { 'Authorization': `Bearer ${this.apiKey}` },
        });

        if (!res.ok) {
            const body = await res.text();
            throw new Error(`LlamaParse result fetch failed (${res.status}): ${body}`);
        }

        const json = await res.json() as {
            pages?: LlamaParsePage[];
            job_metadata?: LlamaParseJobMetadata;
        };

        return {
            pages: json.pages ?? [],
            jobMetadata: json.job_metadata ?? {},
        };
    }
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
