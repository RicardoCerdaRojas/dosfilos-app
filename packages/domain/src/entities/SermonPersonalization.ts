/**
 * Represents the preacher's personal input for sermon co-authoring.
 * All fields are optional to avoid disrupting existing workflows,
 * but each one enriches the final generation when provided.
 */
export interface SermonPersonalization {
    /** Sermon tone — drives the overall rhetorical style. */
    tone?: SermonTone;

    /**
     * Free-text situational context that refines the tone.
     * Examples: "Será predicado en el funeral de un miembro fundador"
     *           "Contexto de una consejería matrimonial"
     */
    situationalContext?: string;

    /**
     * Personal illustrations, anecdotes, or testimonies the preacher
     * wants woven into the sermon body.
     */
    illustrations?: string;

    /**
     * What the preacher wants the congregation to feel, understand,
     * or do by the end of the sermon.
     */
    pastoralEmphasis?: string;

    /**
     * Free-form notes — half-formed ideas, rough arguments, or
     * any personal material the preacher wants the AI to incorporate.
     */
    preacherNotes?: string;

    /**
     * Brief description of the target audience.
     * Example: "80 personas, reformados, nivel teológico medio-alto"
     */
    congregationDescription?: string;
}

export type SermonTone =
    | 'doxological'
    | 'pastoral'
    | 'confrontational'
    | 'didactic'
    | 'evangelistic';

/** Human-readable labels for each tone (Spanish). */
export const SERMON_TONE_LABELS: Record<SermonTone, string> = {
    doxological: 'Doxológico — Exaltación y adoración',
    pastoral: 'Pastoral — Consolación y cuidado',
    confrontational: 'Confrontacional — Exhortación directa',
    didactic: 'Didáctico — Enseñanza y formación',
    evangelistic: 'Evangelístico — Proclamación del evangelio',
};
