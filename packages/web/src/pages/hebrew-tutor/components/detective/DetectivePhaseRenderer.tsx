import React from 'react';
import type { WordAnalysis } from '@dosfilos/domain';
import { DetectivePhase } from '@dosfilos/domain';
import { DetectivePhase1Observe } from './DetectivePhase1Observe';
import { DetectivePhase2Triage } from './DetectivePhase2Triage';
import { DetectivePhase2Colors } from './DetectivePhase2Colors';
import { DetectivePhase4Dagesh } from './DetectivePhase4Dagesh';
import { DetectivePhase5Binyan } from './DetectivePhase5Binyan';
import { DetectivePhase6WeakVerb } from './DetectivePhase6WeakVerb';
import { DetectivePhase3wPreformative } from './DetectivePhase3wPreformative';
import { DetectivePhase4wWeakRoot } from './DetectivePhase4wWeakRoot';
import { DetectivePhase5wWeakBinyan } from './DetectivePhase5wWeakBinyan';
import { DetectivePhaseTranslation } from './DetectivePhaseTranslation';
import { DetectivePhaseVerbForm } from './DetectivePhaseVerbForm';
import {
    type InvestigationPath,
    getEffectiveVerbClassification,
    getExpectedPreformativeVowel,
} from '../../utils/detectiveLogic';

interface DetectivePhaseRendererProps {
    word: WordAnalysis;
    phase: DetectivePhase;
    activePath: InvestigationPath;
    onComplete: (phase: DetectivePhase, answer: string) => void;
}

export const DetectivePhaseRenderer: React.FC<DetectivePhaseRendererProps> = ({ word, phase, onComplete }) => {
    const wrap = (p: DetectivePhase) => (answer: string) => onComplete(p, answer);

    switch (phase) {
        case DetectivePhase.OBSERVE:
            return <DetectivePhase1Observe word={word} onComplete={wrap(DetectivePhase.OBSERVE)} />;
        case DetectivePhase.TRIAGE: {
            const { verbType, path: expectedTriagePath } = getEffectiveVerbClassification(word);
            return (
                <DetectivePhase2Triage
                    word={word}
                    expectedPath={expectedTriagePath}
                    verbType={verbType}
                    onComplete={wrap(DetectivePhase.TRIAGE)}
                />
            );
        }

        case DetectivePhase.COLORS:
            return <DetectivePhase2Colors word={word} onComplete={wrap(DetectivePhase.COLORS)} />;
        case DetectivePhase.DAGESH:
            return <DetectivePhase4Dagesh word={word} onComplete={wrap(DetectivePhase.DAGESH)} />;
        case DetectivePhase.BINYAN:
            return <DetectivePhase5Binyan word={word} onComplete={wrap(DetectivePhase.BINYAN)} />;
        case DetectivePhase.STRONG_CONFIRM:
            return <DetectivePhase6WeakVerb word={word} onComplete={wrap(DetectivePhase.STRONG_CONFIRM)} />;

        case DetectivePhase.PREFORMATIVE:
            return (
                <DetectivePhase3wPreformative
                    word={word}
                    onComplete={wrap(DetectivePhase.PREFORMATIVE)}
                    expectedVowelId={getExpectedPreformativeVowel(word)}
                />
            );
        case DetectivePhase.WEAK_ROOT: {
            const { verbType: effectiveVerbType } = getEffectiveVerbClassification(word);
            return (
                <DetectivePhase4wWeakRoot
                    word={word}
                    effectiveVerbType={effectiveVerbType}
                    onComplete={wrap(DetectivePhase.WEAK_ROOT)}
                />
            );
        }
        case DetectivePhase.WEAK_BINYAN:
            return <DetectivePhase5wWeakBinyan word={word} onComplete={wrap(DetectivePhase.WEAK_BINYAN)} />;

        case DetectivePhase.VERB_FORM:
            return <DetectivePhaseVerbForm word={word} onComplete={wrap(DetectivePhase.VERB_FORM)} />;

        case DetectivePhase.TRANSLATION:
            return <DetectivePhaseTranslation word={word} onComplete={wrap(DetectivePhase.TRANSLATION)} />;

        default:
            return null;
    }
};
