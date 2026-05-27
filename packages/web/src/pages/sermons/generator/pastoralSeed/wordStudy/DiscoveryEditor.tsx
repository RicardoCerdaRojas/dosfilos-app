import { useEffect, useState } from 'react';
import { useTranslation } from '@/i18n';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Save, CheckCircle2 } from 'lucide-react';
import {
    PASTORAL_SEED_THRESHOLDS,
    type KeyWordCandidate,
    type WordStudy,
    type WordStudyLanguage,
} from '@dosfilos/domain';

const T = PASTORAL_SEED_THRESHOLDS.wordStudies;

interface Props {
    selected: KeyWordCandidate | null;
    language: WordStudyLanguage;
    wordAnalysisId: string | null;
    onSave: (study: WordStudy) => Promise<void>;
    onSaved: () => void;
}

/**
 * Pastoral Fidelity Phase 1.5 — pane 3 of the modal. Pastor writes
 * their own pastoral discovery (≥30 chars per threshold) AFTER reading
 * the LLM analysis above. No pre-fill (ADR-021); the hint is a static
 * prompt. The save handler stamps `lemma + language + wordAnalysisId`
 * so the seed audit can trace each study back to its analysis cache
 * doc.
 *
 * `pasteEvents` audit deliberately NOT wired here — Step 6 (Insight)
 * is the only field that today has paste audit. If telemetry shows
 * heavy paste on discovery, a follow-up wires it.
 */
export function DiscoveryEditor({ selected, language, wordAnalysisId, onSave, onSaved }: Props) {
    const { t } = useTranslation('wordStudy');
    const [draft, setDraft] = useState('');
    const [saving, setSaving] = useState(false);
    const [savedKey, setSavedKey] = useState<string | null>(null);

    useEffect(() => {
        setDraft('');
        setSavedKey(null);
    }, [selected?.lemma, selected?.verseRef]);

    if (!selected) {
        return null;
    }

    const trimmed = draft.trim();
    const charsRemaining = T.pastorDiscoveryMinChars - trimmed.length;
    const canSave = trimmed.length >= T.pastorDiscoveryMinChars && !saving;
    const cardKey = `${selected.lemma}::${selected.verseRef}`;
    const justSaved = savedKey === cardKey;

    const handleSave = async () => {
        if (!canSave) return;
        setSaving(true);
        try {
            const study: WordStudy = {
                word: selected.word,
                reference: selected.verseRef,
                pastorDiscovery: trimmed,
                language,
                lemma: selected.lemma,
            };
            if (wordAnalysisId) {
                study.wordAnalysisId = wordAnalysisId;
            }
            await onSave(study);
            setSavedKey(cardKey);
            onSaved();
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="space-y-2">
            <h4 className="text-sm font-semibold">{t('discovery.title')}</h4>
            <p className="text-xs text-muted-foreground">{t('discovery.hint')}</p>
            <Textarea
                value={draft}
                onChange={(e) => {
                    setDraft(e.target.value);
                    if (savedKey === cardKey) setSavedKey(null);
                }}
                placeholder={t('discovery.placeholder')}
                rows={4}
                aria-label={t('discovery.title')}
            />
            <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                    {trimmed.length}/{T.pastorDiscoveryMinChars}
                    {charsRemaining > 0 && (
                        <span className="ml-1">({t('discovery.charsRemaining', { count: charsRemaining })})</span>
                    )}
                </span>
                <div className="flex items-center gap-2">
                    {justSaved && (
                        <span className="inline-flex items-center gap-1 text-xs text-foreground">
                            <CheckCircle2 className="h-3 w-3" />
                            {t('discovery.saved')}
                        </span>
                    )}
                    <Button size="sm" onClick={handleSave} disabled={!canSave} type="button">
                        <Save className="h-3.5 w-3.5 mr-1" />
                        {saving ? t('discovery.saving') : t('discovery.save')}
                    </Button>
                </div>
            </div>
        </div>
    );
}
