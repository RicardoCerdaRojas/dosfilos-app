

import React from 'react';
import { GreekTutorProvider } from '../sermons/generator/exegesis/greek-tutor/GreekTutorProvider';
import { GreekTutorSessionView } from '../sermons/generator/exegesis/greek-tutor/GreekTutorSessionView';

export const GreekTutorPage: React.FC = () => {
    return (
        <div className="flex flex-col h-full bg-background">
            {/* Full-height session view with integrated header */}
            <div className="flex-1">
                <GreekTutorProvider>
                    <GreekTutorSessionView />
                </GreekTutorProvider>
            </div>
        </div>
    );
};
