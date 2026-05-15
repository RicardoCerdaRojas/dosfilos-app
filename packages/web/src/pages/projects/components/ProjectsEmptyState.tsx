import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FolderKanban, MessageSquareQuote, ArrowRight } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface PathConfig {
    key: 'project' | 'session';
    icon: React.ComponentType<{ className?: string }>;
    title: string;
    description: string;
    cta: string;
}

const PATHS: PathConfig[] = [
    {
        key: 'project',
        icon: FolderKanban,
        title: 'Proyecto',
        description:
            'Cuando vas a sostener varias sesiones sobre el mismo tema — una serie, un libro, un curso. Une biblioteca, conversaciones y material en un solo lugar.',
        cta: 'Crear proyecto',
    },
    {
        key: 'session',
        icon: MessageSquareQuote,
        title: 'Sesión rápida',
        description:
            'Para una consulta puntual, una pregunta o un estudio aislado. Sin compromiso de proyecto. Después puedes promover la sesión si lo amerita.',
        cta: 'Ir a Tutores',
    },
];

interface ProjectsEmptyStateProps {
    onCreateProject: () => void;
}

export const ProjectsEmptyState: React.FC<ProjectsEmptyStateProps> = ({ onCreateProject }) => {
    const navigate = useNavigate();

    const handlePath = (key: PathConfig['key']) => {
        if (key === 'project') {
            onCreateProject();
        } else {
            navigate('/dashboard/faculty');
        }
    };

    return (
        <div className="container mx-auto py-16 px-4 space-y-12">
            <div className="text-center space-y-4 max-w-2xl mx-auto">
                <h2 className="font-reading text-[34px] md:text-[40px] leading-[1.1] tracking-[-0.02em] text-foreground">
                    ¿Qué vas a estudiar?
                </h2>
                <p className="text-[15px] md:text-[16px] leading-relaxed text-muted-foreground">
                    Un proyecto es el espacio donde vive una unidad de trabajo —
                    una serie, un libro, un curso. Elige por dónde empezar.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 max-w-4xl mx-auto">
                {PATHS.map(({ key, icon: Icon, title, description, cta }) => (
                    <Card
                        key={key}
                        onClick={() => handlePath(key)}
                        className="group flex flex-col p-7 gap-5 border-muted hover:border-primary/60 hover:shadow-md transition-all cursor-pointer"
                    >
                        <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
                            <Icon className="h-5 w-5" />
                        </div>
                        <div className="space-y-2 flex-1">
                            <h3 className="font-reading text-[20px] leading-tight text-foreground">
                                {title}
                            </h3>
                            <p className="text-[14px] leading-relaxed text-muted-foreground">
                                {description}
                            </p>
                        </div>
                        <Button
                            variant="ghost"
                            className="justify-between w-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors"
                            onClick={(e) => {
                                e.stopPropagation();
                                handlePath(key);
                            }}
                        >
                            {cta}
                            <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
                        </Button>
                    </Card>
                ))}
            </div>
        </div>
    );
};
