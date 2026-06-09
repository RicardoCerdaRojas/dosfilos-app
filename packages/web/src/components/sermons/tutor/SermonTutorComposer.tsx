import React, { useState } from 'react';
import { Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/i18n';

interface SermonTutorComposerProps {
    onSend: (text: string) => void;
    disabled?: boolean;
    autoFocus?: boolean;
}

/** Textarea + send button used by the sermon-editor tutor panel. */
export const SermonTutorComposer: React.FC<SermonTutorComposerProps> = ({ onSend, disabled, autoFocus }) => {
    const { t } = useTranslation('sermonDetail');
    const [text, setText] = useState('');

    const submit = () => {
        const trimmed = text.trim();
        if (!trimmed || disabled) return;
        onSend(trimmed);
        setText('');
    };

    return (
        <div className="flex items-end gap-2 p-3 border-t border-border bg-card">
            <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        submit();
                    }
                }}
                rows={2}
                autoFocus={autoFocus}
                placeholder={t('tutorPanel.placeholder')}
                className="flex-1 resize-none rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                disabled={disabled}
            />
            <Button
                size="icon"
                className="h-9 w-9 shrink-0"
                onClick={submit}
                disabled={disabled || !text.trim()}
                aria-label={t('tutorPanel.send')}
            >
                <Send className="h-4 w-4" />
            </Button>
        </div>
    );
};
