import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GraduationCap, X, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/i18n';
import type { SermonEntity } from '@dosfilos/domain';
import { useSermonTutorSession } from '@/hooks/sermons/useSermonTutorSession';
import { buildSermonTutorContext } from '@/pages/sermons/utils/buildSermonTutorContext';
import { SermonTutorChat } from './SermonTutorChat';
import { SermonTutorComposer } from './SermonTutorComposer';

interface SermonTutorPanelProps {
    sermon: SermonEntity;
    onClose?: () => void;
}

/**
 * Sermon-editor side panel that lets the pastor consult the tutor about an
 * already-generated sermon — viewing the conversation AND asking follow-ups.
 * Continues the sermon's origin faculty session when present; otherwise opens a
 * fresh editor session (created lazily on the first question).
 */
export function SermonTutorPanel({ sermon, onClose }: SermonTutorPanelProps) {
    const { t } = useTranslation('sermonDetail');
    const navigate = useNavigate();
    const { sessionId, isPreparing, ensureSession } = useSermonTutorSession(sermon);
    const [pendingFirstMessage, setPendingFirstMessage] = useState<string | null>(null);

    const sermonContext = buildSermonTutorContext(sermon);
    const isOriginSession = !!sermon.sourceFacultySessionId;

    const startFromEmpty = async (text: string) => {
        setPendingFirstMessage(text);
        try {
            await ensureSession();
        } catch {
            setPendingFirstMessage(null);
        }
    };

    return (
        <aside className="flex flex-col h-full border-l border-border bg-card">
            {/* Header */}
            <div className="px-4 py-3 border-b border-border shrink-0 bg-info/5">
                <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-info/15 flex items-center justify-center">
                            <GraduationCap className="w-3.5 h-3.5 text-info" />
                        </div>
                        <span className="text-sm font-bold text-foreground">{t('tutorPanel.title')}</span>
                    </div>
                    {onClose && (
                        <button
                            onClick={onClose}
                            className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                            title={t('tutorPanel.close')}
                            aria-label={t('tutorPanel.close')}
                        >
                            <X className="w-4 h-4" />
                        </button>
                    )}
                </div>
                <p className="text-xs text-muted-foreground leading-tight">
                    {isOriginSession ? t('tutorPanel.subtitleOrigin') : t('tutorPanel.subtitleNew')}
                </p>
                <p className="text-[10px] text-muted-foreground/80 mt-1">{t('tutorPanel.savedHint')}</p>
            </div>

            {/* Body */}
            <div className="flex-1 min-h-0">
                {sessionId ? (
                    <SermonTutorChat
                        sessionId={sessionId}
                        sermonContext={sermonContext}
                        pendingFirstMessage={pendingFirstMessage}
                        onConsumePending={() => setPendingFirstMessage(null)}
                    />
                ) : (
                    <div className="flex flex-col h-full min-h-0">
                        <div className="flex-1 flex flex-col items-center justify-center gap-2 px-6 text-center">
                            <GraduationCap className="w-8 h-8 text-muted-foreground/40" />
                            <p className="text-sm font-medium text-foreground">{t('tutorPanel.emptyTitle')}</p>
                            <p className="text-xs text-muted-foreground">{t('tutorPanel.emptyBody')}</p>
                        </div>
                        <SermonTutorComposer onSend={startFromEmpty} disabled={isPreparing} autoFocus />
                    </div>
                )}
            </div>

            {/* Footer: jump to the full faculty session */}
            {sessionId && (
                <div className="shrink-0 px-3 py-2 border-t border-border bg-card">
                    <Button
                        variant="outline"
                        size="sm"
                        className="w-full gap-2 text-xs font-semibold text-info border-info/30 hover:bg-info/10"
                        onClick={() => navigate(`/dashboard/faculty/${sessionId}`)}
                    >
                        <ExternalLink className="w-3.5 h-3.5" />
                        {t('tutorPanel.fullSession')}
                    </Button>
                </div>
            )}
        </aside>
    );
}
