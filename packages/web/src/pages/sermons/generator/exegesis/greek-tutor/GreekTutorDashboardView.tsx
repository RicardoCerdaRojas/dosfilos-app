import React, { useState } from 'react';
import { GreekTutorDashboard } from './dashboard/GreekTutorDashboard';
import { useGreekTutor } from './GreekTutorProvider';
import { useNavigate } from 'react-router-dom';
import { useFirebase } from '@/context/firebase-context';
import { useUsageLimits } from '@/hooks/useUsageLimits';
import { UpgradeRequiredModal } from '@/components/upgrade';

/**
 * Wrapper component that provides use cases to GreekTutorDashboard
 * and handles navigation to create new sessions
 */
export const GreekTutorDashboardView: React.FC = () => {
    const { getUserSessions, deleteSession } = useGreekTutor();
    const { user } = useFirebase();
    const navigate = useNavigate();
    const { checkCanStartGreekSession } = useUsageLimits();
    
    // Upgrade modal state
    const [showUpgradeModal, setShowUpgradeModal] = useState(false);
    const [upgradeReason, setUpgradeReason] = useState({
        reason: 'limit_reached' as const,
        limitType: 'greek_sessions' as const,
        currentLimit: 1
    });

    const handleCreateNew = async (passage?: string) => {
        // Check usage limits before creating session
        const check = await checkCanStartGreekSession();

        if (!check.allowed) {
            setUpgradeReason({
                reason: 'limit_reached',
                limitType: 'greek_sessions',
                currentLimit: check.limit || 1
            });
            setShowUpgradeModal(true);
            return;
        }

        // Navigate to greek-tutor session creation; deep-link the
        // passage when the caller already picked one (suggested-passage
        // card or session duplicate). The IntroView reads `?passage=`
        // on mount and pre-fills the selector.
        const url = passage
            ? `/dashboard/greek-tutor?passage=${encodeURIComponent(passage)}`
            : '/dashboard/greek-tutor';
        navigate(url);
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
            
            {/* Upgrade Required Modal */}
            <UpgradeRequiredModal
                open={showUpgradeModal}
                onOpenChange={setShowUpgradeModal}
                reason={upgradeReason.reason}
                limitType={upgradeReason.limitType}
                currentLimit={upgradeReason.currentLimit}
            />
        </div>
    );
};
