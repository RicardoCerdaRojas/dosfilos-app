import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, MessageSquareQuote } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PROJECT_TYPES } from '@/pages/projects/projectRoadmaps';
import type { ProjectType } from '@dosfilos/domain';

const FEATURED_TYPES: ProjectType[] = ['sermon', 'series', 'study', 'counseling'];

interface ProjectsEmptyStateProps {
    /**
     * Called when the user picks a project type. Caller handles plan-gating
     * (free tier shows upgrade modal before opening the create dialog).
     */
    onCreateProject: (type?: ProjectType) => void;
}

export const ProjectsEmptyState: React.FC<ProjectsEmptyStateProps> = ({ onCreateProject }) => {
    const navigate = useNavigate();

    return (
        <div className="container mx-auto py-16 px-4 space-y-12">
            <div className="text-center space-y-4 max-w-2xl mx-auto">
                <h2 className="font-reading text-[34px] md:text-[40px] leading-[1.1] tracking-[-0.02em] text-foreground">
                    ¿Qué vas a estudiar?
                </h2>
                <p className="text-[15px] md:text-[16px] leading-relaxed text-muted-foreground">
                    Elige el tipo de proyecto. Cada uno tiene su propio flujo —
                    sermón, serie, investigación o consejería.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 max-w-4xl mx-auto">
                {FEATURED_TYPES.map((type) => {
                    const meta = PROJECT_TYPES[type];
                    const Icon = meta.icon;
                    return (
                        <Card
                            key={type}
                            onClick={() => onCreateProject(type)}
                            className="group flex flex-col p-7 gap-5 border-muted hover:border-primary/60 hover:shadow-md transition-all cursor-pointer"
                        >
                            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                <Icon className="h-5 w-5" />
                            </div>
                            <div className="space-y-2 flex-1">
                                <h3 className="font-reading text-[20px] leading-tight text-foreground">
                                    {meta.label}
                                </h3>
                                <p className="text-[14px] leading-relaxed text-muted-foreground">
                                    {meta.description}
                                </p>
                            </div>
                            <Button
                                variant="ghost"
                                className="justify-between w-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onCreateProject(type);
                                }}
                            >
                                Comenzar
                                <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
                            </Button>
                        </Card>
                    );
                })}
            </div>

            <div className="flex flex-col items-center gap-3 pt-4 max-w-4xl mx-auto">
                <button
                    type="button"
                    onClick={() => navigate('/dashboard/faculty')}
                    className="inline-flex items-center gap-2 text-[14px] text-muted-foreground hover:text-foreground transition-colors"
                >
                    <MessageSquareQuote className="h-4 w-4" />
                    ¿Solo una pregunta puntual? Ve a Tutores sin crear un proyecto
                    <ArrowRight className="h-4 w-4" />
                </button>
            </div>
        </div>
    );
};
