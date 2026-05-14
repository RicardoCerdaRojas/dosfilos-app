import { useState } from 'react';
import { type NavigateFunction } from 'react-router-dom';
import { toast } from 'sonner';
import { useTranslation } from '@/i18n';
import { type ResponseMode, type AIAgent } from '@dosfilos/domain';
import { prepareAttachmentForSend } from '../utils/prepareAttachmentForSend';

interface SendOrchestratedMessageInput {
    message: string;
    lengthPreference: ResponseMode;
    attachments?: Array<{ mimeType: string; data: string }>;
    attachmentsMeta?: Array<{ filename: string; mimeType: string; sizeBytes: number }>;
    sessionIdOverride?: string;
}

interface CreateSessionInput {
    agentId: string;
    projectId?: string;
    context?: { paperId?: string; seriesId?: string; pericopeId?: string };
}

interface UseSendMessageParams {
    isNewSession: boolean;
    isSending: boolean;
    isStreaming: boolean;
    agentIdForNew: string;
    agents: AIAgent[];
    projectIdForNew: string | undefined;
    contextForNew: { paperId?: string; seriesId?: string; pericopeId?: string } | undefined;
    lengthPreference: ResponseMode;
    scrollToBottom: (force?: boolean) => void;
    navigate: NavigateFunction;
    createSession: { mutateAsync: (input: CreateSessionInput) => Promise<{ id: string }> };
    sendOrchestratedMessage: (input: SendOrchestratedMessageInput) => Promise<void>;
}

/**
 * Owns the chat input + pending attachment state plus the
 * `handleSendMessage` flow:
 *
 *   1. Validate (text or attachment present, not already sending).
 *   2. Stage current values + clear inputs immediately so the field
 *      is responsive even if the call later fails.
 *   3. Encode the attachment to base64 once up front so the
 *      new-session and existing-session branches share the payload.
 *   4. New session: create it, then either navigate with `?q=` (text
 *      only) so the next render fires the send with a fresh closure,
 *      or send directly with `sessionIdOverride` (attachment present
 *      — `?q=` can't carry binary).
 *   5. Existing session: just send.
 *   6. On any error, restore the staged values so the user doesn't
 *      lose what they typed.
 *
 * Hoisted out of chat.tsx because the new-session race + the dual
 * payload prep made the page-level component the longest function in
 * the file.
 */
export function useSendMessage(params: UseSendMessageParams) {
    const {
        isNewSession,
        isSending,
        isStreaming,
        agentIdForNew,
        agents,
        projectIdForNew,
        contextForNew,
        lengthPreference,
        scrollToBottom,
        navigate,
        createSession,
        sendOrchestratedMessage,
    } = params;
    const { t } = useTranslation('faculty');

    const [input, setInput] = useState('');
    const [pendingAttachment, setPendingAttachment] = useState<File | null>(null);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        // Allow image-only sends — the model is multimodal so a question
        // can live entirely in the picture (e.g. "what does this say?").
        const hasAttachment = !!pendingAttachment;
        if ((!input.trim() && !hasAttachment) || isSending || isStreaming) return;

        const userMsg = input;
        const stagedAttachment = pendingAttachment;
        setInput('');
        setPendingAttachment(null);
        scrollToBottom(true);

        // Convert the file once up front so both the new-session path
        // (which waits on createSession before sending) and the existing
        // session path can reuse the same payload.
        let inlineAndMeta: {
            inline?: { mimeType: string; data: string };
            meta?: { filename: string; mimeType: string; sizeBytes: number };
        } = {};
        if (stagedAttachment) {
            try {
                const prepared = await prepareAttachmentForSend(stagedAttachment);
                inlineAndMeta = { inline: prepared.inline, meta: prepared.meta };
                console.log('[FacultyChat] attachment ready:', {
                    name: prepared.meta.filename,
                    mime: prepared.meta.mimeType,
                    bytes: prepared.meta.sizeBytes,
                });
            } catch (err) {
                console.error('[FacultyChat] attachment encoding failed:', err);
                toast.error(t('chat.attachment.tooLarge'));
                setInput(userMsg);
                setPendingAttachment(stagedAttachment);
                return;
            }
        }

        if (isNewSession) {
            const targetAgentId = agentIdForNew || agents.find(a => a.isActive)?.id || agents[0]?.id || '';
            if (!targetAgentId) {
                setInput(userMsg);
                if (stagedAttachment) setPendingAttachment(stagedAttachment);
                return;
            }
            try {
                const newSession = await createSession.mutateAsync({
                    agentId: targetAgentId,
                    projectId: projectIdForNew,
                    context: contextForNew,
                });
                // The auto-send path via `?q=` can't carry an attachment, so
                // when there's a file we send directly here instead, then
                // navigate to the canonical session URL afterwards.
                if (inlineAndMeta.inline) {
                    navigate(`/dashboard/faculty/${newSession.id}`, { replace: true });
                    // sessionIdOverride targets the freshly created session,
                    // bypassing the closure-captured `sessionId=''` from the
                    // pre-navigate /new render. Without it the mutation's
                    // `sessionQuery.data` guard throws "Session not found"
                    // because the query is disabled when `sessionId` is empty.
                    await sendOrchestratedMessage({
                        message: userMsg,
                        lengthPreference,
                        attachments: [inlineAndMeta.inline],
                        ...(inlineAndMeta.meta && { attachmentsMeta: [inlineAndMeta.meta] }),
                        sessionIdOverride: newSession.id,
                    });
                } else {
                    navigate(`/dashboard/faculty/${newSession.id}?q=${encodeURIComponent(userMsg)}`, { replace: true });
                }
            } catch (err) {
                console.error('Failed to create session:', err);
                setInput(userMsg);
                if (stagedAttachment) setPendingAttachment(stagedAttachment);
            }
            return;
        }

        try {
            await sendOrchestratedMessage({
                message: userMsg,
                lengthPreference,
                ...(inlineAndMeta.inline && { attachments: [inlineAndMeta.inline] }),
                ...(inlineAndMeta.meta && { attachmentsMeta: [inlineAndMeta.meta] }),
            });
        } catch (error) {
            console.error('Failed to send message:', error);
            setInput(userMsg);
            if (stagedAttachment) setPendingAttachment(stagedAttachment);
        }
    };

    return {
        input,
        setInput,
        pendingAttachment,
        setPendingAttachment,
        handleSendMessage,
    };
}
