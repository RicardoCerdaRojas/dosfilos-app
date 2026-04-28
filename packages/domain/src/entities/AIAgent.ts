import type { LocalizedString } from '../types/i18n';

// AIAgentRole is now a dynamic string to support Superadmin-created roles.
export type AIAgentRole = string;

/**
 * Authoring-side type for any agent-content field that must round-trip through
 * the AI prompt layer in the user's preferred language. Plain strings are
 * accepted as a transitional shape — repositories serving older Firestore docs
 * can keep returning `string` until the localization migration runs, and the
 * resolver in `domain/types/i18n.ts` handles either form transparently.
 */
type LocalizedField = LocalizedString | string;

export interface AIAgent {
    id: string;
    /** Display name. Localized so "Pastor Counselor" reads naturally in EN. */
    name: LocalizedField;
    role: AIAgentRole;
    /** System prompt sent to the model. Localized so the tutor's voice stays
     * consistent in each language without runtime translation tax. */
    systemInstruction: LocalizedField;
    /** Short label rendered in cards / chips. */
    expertiseArea: LocalizedField;
    /**
     * Optional disambiguation description used exclusively by the orchestrator router.
     * Can include "USE FOR:" and "NOT FOR:" clauses so the router makes precise decisions.
     * Falls back to `expertiseArea` when absent.
     */
    routingDescription?: LocalizedField;
    icon?: string;
    /** Long marketing description rendered in the directory. */
    description: LocalizedField;
    isActive: boolean; // Flag to enable/disable agents
    /**
     * Core Library store keys this agent consults (e.g. ['exegesis', 'homiletics']).
     * Used directly by retrieveChunks as the scope filter — no reverse-resolve needed.
     * Preferred over corpusIds for any new agents.
     */
    stores?: string[];
    /**
     * @deprecated Legacy Gemini File Search URIs (fileSearchStores/...). Phase-2-only
     * pipelines no longer use these; the server reverse-resolves them to keys via
     * `config/coreLibraryStores` for backwards compatibility until all agents are
     * migrated to `stores`.
     */
    corpusIds?: string[];
    createdAt?: Date;
    updatedAt?: Date;
}
