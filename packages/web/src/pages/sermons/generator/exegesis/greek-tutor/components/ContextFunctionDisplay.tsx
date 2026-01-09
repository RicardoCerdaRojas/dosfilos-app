import React from 'react';
import { Card } from '@/components/ui/card';
import { BookOpen, Network, Zap } from 'lucide-react';
import { HighlightedVerse } from './HighlightedVerse';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useTranslation } from '@/i18n';

export interface ContextFunctionDisplayProps {
    content: string; // Markdown content from backend
    greekWord: string;
    passage: string;
    passageText?: string; // Optional Greek text if available
}

/**
 * Visual component for displaying function in context.
 * Shows how the Greek word functions within its syntactic context.
 * Following Single Responsibility - handles context display only.
 */
export const ContextFunctionDisplay: React.FC<ContextFunctionDisplayProps> = ({
    content,
    greekWord,
    passage,
    passageText
}) => {
    const { t } = useTranslation('greekTutor');
    // Extract key insights from markdown if formatted with headers
    const extractSections = (markdown: string) => {
        const sections: Record<string, string> = {};
        const lines = markdown.split('\n');
        let currentSection = 'general';
        let currentContent: string[] = [];

        for (const line of lines) {
            // Detect markdown headers
            if (line.startsWith('##')) {
                // Save previous section
                if (currentContent.length > 0) {
                    sections[currentSection] = currentContent.join('\n').trim();
                    currentContent = [];
                }
                // Start new section
                currentSection = line.replace(/^#+\s*/, '').toLowerCase();
            } else {
                currentContent.push(line);
            }
        }

        // Save last section
        if (currentContent.length > 0) {
            sections[currentSection] = currentContent.join('\n').trim();
        }

        return sections;
    };

    const sections = extractSections(content);
    const hasStructuredContent = Object.keys(sections).length > 1;

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div>
                <h5 className="text-sm text-muted-foreground">
                    {t('studyUnit.function.howFunctionsIn', { word: greekWord, passage })}
                </h5>
            </div>

            {/* Verse Display - if we have passage text */}
            {passageText && (
                <>
                    <HighlightedVerse
                        verseText={passageText}
                        highlightedWord={greekWord}
                        reference={passage}
                    />
                    <div className="border-t border-border" />
                </>
            )}

            {/* Syntactic Function Card */}
            <Card className="p-5 bg-gradient-to-br from-blue-500/10 to-purple-500/5 border-2 border-blue-500/20">
                <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center shrink-0">
                        <Network className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="flex-1">
                        <h3 className="font-semibold text-sm text-blue-900 dark:text-blue-100 uppercase tracking-wide mb-2">
                            {t('studyUnit.function.syntacticFunction')}
                        </h3>
                        {hasStructuredContent && sections['función sintáctica'] ? (
                            <div className="prose prose-sm dark:prose-invert max-w-none prose-p:leading-relaxed">
                                <ReactMarkdown>{sections['función sintáctica']}</ReactMarkdown>
                            </div>
                        ) : (
                            <p className="text-base leading-relaxed text-foreground">
                                {content.split('\n')[0]}
                            </p>
                        )}
                    </div>
                </div>
            </Card>

            {/* Main Content */}
            <Card className="p-6 md:p-8">
                <div className="prose prose-slate dark:prose-invert max-w-none
                              prose-headings:font-bold prose-headings:tracking-tight
                              prose-h1:text-2xl prose-h2:text-xl prose-h2:mt-8 prose-h2:mb-4
                              prose-h3:text-lg prose-h3:mt-6 prose-h3:mb-2
                              prose-p:leading-relaxed prose-p:mb-4
                              prose-li:leading-relaxed
                              prose-code:text-primary prose-code:bg-primary/10 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded
                              prose-strong:text-foreground prose-strong:font-semibold
                              prose-blockquote:border-l-primary prose-blockquote:bg-primary/5
                              prose-table:border-collapse prose-table:w-full
                              prose-th:border prose-th:border-border prose-th:bg-muted prose-th:p-2 prose-th:text-left
                              prose-td:border prose-td:border-border prose-td:p-2">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {content}
                    </ReactMarkdown>
                </div>
            </Card>

            {/* Semantic Impact Card */}
            <Card className="border-2 border-purple-500/30 bg-gradient-to-br from-purple-500/10 to-pink-500/5">
                <div className="p-4 space-y-3">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
                            <Zap className="w-4 h-4 text-purple-600" />
                        </div>
                        <h4 className="text-sm font-bold text-purple-900 dark:text-purple-100 uppercase tracking-wide">
                            {t('studyUnit.function.semanticImpact')}
                        </h4>
                    </div>
                    <p className="text-sm text-foreground/90 leading-relaxed">
                        {t('studyUnit.function.semanticText')}
                    </p>
                </div>
            </Card>

            {/* Reading Tip */}
            <Card className="border-2 border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 to-green-500/5">
                <div className="p-4 space-y-3">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                            <BookOpen className="w-4 h-4 text-emerald-600" />
                        </div>
                        <h4 className="text-sm font-bold text-emerald-900 dark:text-emerald-100 uppercase tracking-wide">
                            {t('studyUnit.function.forThePulpit')}
                        </h4>
                    </div>
                    <p className="text-sm text-foreground/90 leading-relaxed">
                        {t('studyUnit.function.pulpitTip')}
                    </p>
                </div>
            </Card>
        </div>
    );
};
