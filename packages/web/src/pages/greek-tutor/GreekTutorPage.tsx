
import React from 'react';
import { GreekTutorProvider } from '../sermons/generator/exegesis/greek-tutor/GreekTutorProvider';
import { GreekTutorSessionView } from '../sermons/generator/exegesis/greek-tutor/GreekTutorSessionView';

export const GreekTutorPage: React.FC = () => {
    return (
        <div className="flex flex-col h-full bg-background">
            {/* Minimal header */}
            <div className="px-6 lg:px-10 py-4 border-b">
                <h1 className="text-2xl font-bold tracking-tight">Entrenador Griego</h1>
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
