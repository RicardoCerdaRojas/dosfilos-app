/**
 * Thin LLM provider port (Phase 2.5, Q7 / ADR-025) — LOCAL copy.
 *
 * The functions package deliberately does NOT depend on `@dosfilos/domain`
 * (cross-package decoupling kept throughout this package — see the duplicate
 * type notes in `validateSeedWitnesses` / `extractionVersions`). So the
 * `ILlmClient` shape, whose canonical home is `@dosfilos/domain`, is mirrored
 * here. Keep the two in sync.
 *
 * New Pastoral Fidelity callables depend on this interface, not on the
 * `@google/generative-ai` SDK directly, so the model can be swapped
 * (Gemini → MiniMax/other) by replacing the adapter. The broad refactor of
 * the ~34 existing direct Gemini callers is a separate tech-debt sprint
 * (memory `tech_debt_llm_provider_abstraction`).
 */

export interface LlmGenerateOptions {
    /** System instruction. Sets the assistant's role/constraints. */
    system?: string;
    /** The user prompt. */
    prompt: string;
    /** 0..1. Verifier-orienter callables run low (≈0.2) for determinism. */
    temperature?: number;
    /** When `'application/json'`, the adapter requests structured output. */
    responseMimeType?: 'text/plain' | 'application/json';
    /** Hard cap on output size. */
    maxOutputTokens?: number;
}

export interface ILlmClient {
    /** Generate text (or JSON string) from a single-turn prompt. */
    generate(options: LlmGenerateOptions): Promise<string>;
}
