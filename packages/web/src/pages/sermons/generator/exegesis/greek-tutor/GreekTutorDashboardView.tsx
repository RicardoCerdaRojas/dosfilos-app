import React from 'react';
import { GreekTutorDashboard } from './dashboard/GreekTutorDashboard';
import { useGreekTutor } from './GreekTutorProvider';
import { useNavigate } from 'react-router-dom';
import { useFirebase } from '@/context/firebase-context';

/**
 * Wrapper component that provides use cases to GreekTutorDashboard
 * and handles navigation to create new sessions
 */
export const GreekTutorDashboardView: React.FC = () => {
    const { getUserSessions, deleteSession } = useGreekTutor();
    const { user } = useFirebase();
    const navigate = useNavigate();

    const handleCreateNew = () => {
        // Navigate to the session creation flow
        // For now, navigate directly to the exegesis flow
        navigate('/sermon/generator/exegesis');
    };

    if (!user) {
        return <div>Loading...</div>;
    }

    return (
        <div className="container mx-auto py-8 px-4">
            <GreekTutorDashboard
                userId={user.uid}
                getUserSessionsUseCase={getUserSessions}
                deleteSessionUseCase={deleteSession}
                onCreateNew={handleCreateNew}
            />
        </div>
    );
};
