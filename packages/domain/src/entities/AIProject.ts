export type ProjectColor = 'amber' | 'emerald' | 'sky' | 'rose' | 'violet' | 'slate' | 'orange' | 'teal';

export interface AIProject {
    id: string;
    userId: string;
    title: string;
    color: ProjectColor;
    icon?: string;
    /**
     * Short context injected by the orchestrator into every session within this project.
     * Example: "Serie sobre Romanos 1-8, congregación reformada de 80 personas, nivel teológico medio."
     */
    contextNote?: string;
    createdAt: Date;
    updatedAt: Date;
}
