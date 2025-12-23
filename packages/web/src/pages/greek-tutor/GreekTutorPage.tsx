
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { LayoutDashboard } from 'lucide-react';
import { GreekTutorProvider } from '../sermons/generator/exegesis/greek-tutor/GreekTutorProvider';
import { GreekTutorSessionView } from '../sermons/generator/exegesis/greek-tutor/GreekTutorSessionView';

export const GreekTutorPage: React.FC = () => {
    const navigate = useNavigate();

    return (
        <div className="flex flex-col h-full bg-background">
            {/* Minimal header */}
            <div className="px-6 lg:px-10 py-4 border-b flex items-center justify-between">
                <h1 className="text-2xl font-bold tracking-tight">Entrenador Griego</h1>
                <Button 
                    onClick={() => navigate('/dashboard/greek-tutor-dashboard')}
                    variant="outline"
                    className="gap-2"
                >
                    <LayoutDashboard className="h-4 w-4" />
                    Mis Sesiones
                </Button>
            </div>
            
            {/* Full-height session view */}
            <div className="flex-1 overflow-hidden">
                <GreekTutorProvider>
                    <GreekTutorSessionView />
                </GreekTutorProvider>
            </div>
        </div>
    );
};
