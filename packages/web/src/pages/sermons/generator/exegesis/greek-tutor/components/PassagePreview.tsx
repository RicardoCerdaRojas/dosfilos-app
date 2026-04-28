import React, { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { LocalBibleService } from '@/services/LocalBibleService';
import { BibleTextViewer } from '@/components/sermons/BibleTextViewer';

interface PassagePreviewProps {
    passage: string;
}

/**
 * Inline preview of a Bible passage. Resolves the passage via LocalBibleService
 * using the current UI language and renders it through `BibleTextViewer`.
 */
export const PassagePreview: React.FC<PassagePreviewProps> = ({ passage }) => {
    const [text, setText] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const { t, i18n } = useTranslation('greekTutor');

    useEffect(() => {
        if (!passage.trim()) {
            setText(null);
            return;
        }

        setLoading(true);
        try {
            const verses = LocalBibleService.getVerses(passage, i18n.language);
            setText(verses || null);
        } catch (e) {
            setText(null);
        } finally {
            setLoading(false);
        }
    }, [passage, i18n.language]);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
        );
    }

    if (!text) {
        return (
            <p className="text-muted-foreground italic text-center py-8">
                {t('passageNotRecognized')}
            </p>
        );
    }

    return <BibleTextViewer text={text} reference={passage} language={i18n.language} />;
};
