import React, { useState, useEffect, useRef } from 'react';
import { PassageSyntaxAnalysis, Clause, ClauseType } from '@dosfilos/domain';
import { ChevronDown, ChevronRight, GitBranch, HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SyntaxHelpModal } from './SyntaxHelpModal';
import { SyntaxOnboarding, useHasSeenOnboarding } from './SyntaxOnboarding';
import { useTranslation } from '@/i18n';

interface PassageSyntaxViewProps {
    analysis: PassageSyntaxAnalysis;
    onWordClick?: (wordIndex: number) => void;
}

/**
 * PassageSyntaxView Component
 * 
 * Displays the hierarchical syntactic structure of a Greek passage
 * following academic methodology (Wallace, Stagg, etc.)
 * 
 * Features:
 * - Hierarchical tree view of clauses
 * - Main clauses highlighted
 * - Subordinates indented with visual connectors
 * - Expandable/collapsable for progressive disclosure
 * - Clickable words for morphology analysis
 */
export function PassageSyntaxView({ analysis, onWordClick }: PassageSyntaxViewProps) {
    const { t } = useTranslation('greekTutor');
    const [expandedClauses, setExpandedClauses] = useState<Set<string>>(() => {
        // Initialize with all MAIN clauses expanded
        const mainClauses = analysis.clauses
            .filter(c => c.type === ClauseType.MAIN)
            .map(c => c.id);
        return new Set(mainClauses);
    });
    const [showHelpModal, setShowHelpModal] = useState(false);
    const [hasSeen, markAsSeen] = useHasSeenOnboarding();
    const [runOnboarding, setRunOnboarding] = useState(false);
    const [highlightedClauseId, setHighlightedClauseId] = useState<string | null>(null);
    const clauseRefs = useRef<Map<string, HTMLDivElement>>(new Map());

    // Show onboarding on first render if not seen before
    useEffect(() => {
        if (!hasSeen) {
            // Delay to allow DOM to render with proper classes
            const timer = setTimeout(() => {
                setRunOnboarding(true);
            }, 500);
            return () => clearTimeout(timer);
        }
    }, [hasSeen]);

    const toggleClause = (clauseId: string) => {
        setExpandedClauses(prev => {
            const next = new Set(prev);
            if (next.has(clauseId)) {
                next.delete(clauseId);
            } else {
                next.add(clauseId);
            }
            return next;
        });
    };

    const expandAll = () => {
        setExpandedClauses(new Set(analysis.clauses.map(c => c.id)));
    };

    const collapseAll = () => {
        // Keep only MAIN clauses expanded (type = MAIN)
        const mainClauseIds = analysis.clauses
            .filter(c => c.type === ClauseType.MAIN)
            .map(c => c.id);
        setExpandedClauses(new Set(mainClauseIds));
    };

    // Build clause hierarchy map for efficient lookup
    const clauseMap = new Map(analysis.clauses.map(c => [c.id, c]));

    // Get children of a clause
    const getChildren = (clauseId: string): Clause[] => {
        return analysis.clauses.filter(c => c.parentClauseId === clauseId);
    };

    // Extract clause number from ID (e.g., "clause_1" -> "1")
    const getClauseNumber = (id: string): string => {
        const match = id.match(/\d+/);
        return match ? match[0] : '';
    };

    // Scroll to and highlight a clause
    const scrollToClause = (clauseId: string) => {
        const element = clauseRefs.current.get(clauseId);
        if (element) {
            // Expand parent clauses to make it visible
            const clause = clauseMap.get(clauseId);
            if (clause?.parentClauseId) {
                setExpandedClauses(prev => new Set([...prev, clause.parentClauseId!]));
            }
            
            // Scroll to element
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            
            // Highlight temporarily
            setHighlightedClauseId(clauseId);
            setTimeout(() => setHighlightedClauseId(null), 2000);
        }
    };

    // Make clause references clickeable in description
    const renderDescriptionWithLinks = (text: string) => {
        // Split on: (clause_N), clause_N, AND [N] patterns
        const parts = text.split(/(\(clause_\d+\)|clause_\d+|\[\d+\])/);
        return parts.map((part, index) => {
            // Match clause_N with or without parentheses
            let match = part.match(/clause_(\d+)/);
            if (match) {
                const clauseId = `clause_${match[1]}`;
                const clauseNumber = match[1];
                return (
                    <button
                        key={index}
                        onClick={() => scrollToClause(clauseId)}
                        className="inline-flex items-center justify-center w-6 h-6 mx-0.5 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-300 hover:border-blue-500 rounded-full transition-all cursor-pointer hover:shadow-sm"
                        title={`Ir a cláusula ${clauseNumber}`}
                    >
                        {clauseNumber}
                    </button>
                );
            }
            
            // Match [N] pattern (Gemini format)
            match = part.match(/\[(\d+)\]/);
            if (match) {
                const clauseNumber = match[1];
                const clauseId = `clause_${clauseNumber}`;
                return (
                    <button
                        key={index}
                        onClick={() => scrollToClause(clauseId)}
                        className="inline-flex items-center justify-center w-6 h-6 mx-0.5 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-300 hover:border-blue-500 rounded-full transition-all cursor-pointer hover:shadow-sm"
                        title={`Ir a cláusula ${clauseNumber}`}
                    >
                        {clauseNumber}
                    </button>
                );
            }
            
            return <span key={index}>{part}</span>;
        });
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-500/10 rounded-lg">
                        <GitBranch className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h3 className="text-lg font-semibold text-gray-900">
                                {t('syntax.title')}
                            </h3>
                            <button
                                onClick={() => setShowHelpModal(true)}
                                className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
                                title={t('syntax.helpTooltip')}
                            >
                                <HelpCircle className="w-4 h-4" />
                            </button>
                        </div>
                        <p className="text-sm text-gray-500">
                            {analysis.passageReference}
                        </p>
                    </div>
                </div>

                {/* Expand/Collapse Controls */}
                <div className="flex gap-2 syntax-controls">
                    <button
                        onClick={collapseAll}
                        className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                    >
                        {t('syntax.collapseAll')}
                    </button>
                    <button
                        onClick={expandAll}
                        className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                    >
                        {t('syntax.expandAll')}
                    </button>
                </div>
            </div>

            {/* Overall Structure Description */}
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg syntax-description">
                <h4 className="text-sm font-semibold text-blue-900 mb-2">
                    {t('syntax.generalDescription')}
                </h4>
                <p className="text-sm text-blue-800 leading-relaxed">
                    {renderDescriptionWithLinks(analysis.structureDescription)}
                </p>
            </div>

            {/* Clause Tree */}
            <div className="space-y-2">
                {analysis.clauses
                    .filter(c => c.parentClauseId === null) // Get all top-level clauses
                    // Don't filter by expandedClauses here - top-level always shows
                    .map(clause => 
                        renderClauseTree(
                            clause.id,
                            0,
                            clauseMap,
                            getChildren,
                            expandedClauses,
                            toggleClause,
                            onWordClick,
                            clauseRefs,
                            highlightedClauseId,
                            getClauseNumber,
                            t
                        )
                    )}
            </div>

            {/* Legend */}
            <div className="pt-4 border-t border-gray-200 syntax-legend">
                <h4 className="text-xs font-semibold text-gray-700 mb-3">{t('syntax.legend')}</h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                    <ClauseBadge type={ClauseType.MAIN} t={t} />
                    <ClauseBadge type={ClauseType.SUBORDINATE_PURPOSE} t={t} />
                    <ClauseBadge type={ClauseType.SUBORDINATE_CAUSAL} t={t} />
                    <ClauseBadge type={ClauseType.PARTICIPIAL} t={t} />
                    <ClauseBadge type={ClauseType.INFINITIVAL} t={t} />
                    <ClauseBadge type={ClauseType.RELATIVE} t={t} />
                </div>
            </div>

            {/* Help Modal */}
            <SyntaxHelpModal 
                open={showHelpModal} 
                onOpenChange={setShowHelpModal}
            />

            {/* Onboarding Tour */}
            <SyntaxOnboarding
                run={runOnboarding}
                onComplete={() => {
                    setRunOnboarding(false);
                    markAsSeen();
                }}
            />
        </div>
    );
}

/**
 * Recursively renders clause tree with proper indentation
 */
function renderClauseTree(
    clauseId: string,
    depth: number,
    clauseMap: Map<string, Clause>,
    getChildren: (id: string) => Clause[],
    expandedClauses: Set<string>,
    toggleClause: (id: string) => void,
    onWordClick: ((wordIndex: number) => void) | undefined,
    clauseRefs: React.MutableRefObject<Map<string, HTMLDivElement>>,
    highlightedClauseId: string | null,
    getClauseNumber: (id: string) => string,
    t: (key: string) => string
): React.ReactNode {
    const clause = clauseMap.get(clauseId);
    if (!clause) return null;

    const children = getChildren(clauseId);
    const hasChildren = children.length > 0;
    const isExpanded = expandedClauses.has(clauseId);
    const isRoot = depth === 0;
    const isFirstSubordinate = depth === 1 && !isRoot; // For onboarding targeting

    return (
        <div key={clauseId} className="relative">
            {/* Clause Card */}
            <div
                ref={(el) => {
                    if (el) clauseRefs.current.set(clauseId, el);
                    else clauseRefs.current.delete(clauseId);
                }}
                className={cn(
                    "relative rounded-lg border transition-all",
                    isRoot 
                        ? "bg-blue-50 border-blue-300 shadow-sm syntax-main-clause" 
                        : "bg-white border-gray-200 hover:border-gray-300",
                    isFirstSubordinate && "syntax-subordinate",
                    highlightedClauseId === clauseId && "ring-2 ring-blue-400 shadow-lg" // Highlight animation
                )}
                style={{ marginLeft: `${depth * 24}px` }}
            >
                {/* Expand/Collapse Button */}
                {hasChildren && (
                    <button
                        onClick={() => toggleClause(clauseId)}
                        className="absolute -left-6 top-3 p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
                    >
                        {isExpanded ? (
                            <ChevronDown className="w-4 h-4" />
                        ) : (
                            <ChevronRight className="w-4 h-4" />
                        )}
                    </button>
                )}

                <div className="p-3 space-y-2">
                    {/* Clause Header with Number Badge */}
                    <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                            <ClauseBadge type={clause.type} t={t} />
                            {clause.conjunction && (
                                <span className="px-2 py-0.5 text-xs font-medium text-purple-700 bg-purple-100 rounded">
                                    {typeof clause.conjunction === 'string' ? clause.conjunction : (clause.conjunction as any)?.text || String(clause.conjunction)}
                                </span>
                            )}
                        </div>
                        {/* Numeric Badge */}
                        <span className="flex-shrink-0 inline-flex items-center justify-center w-6 h-6 text-xs font-bold text-gray-600 bg-gray-100 border border-gray-300 rounded-full">
                            {getClauseNumber(clauseId)}
                        </span>
                    </div>

                    {/* Greek Text */}
                    <div className="text-sm font-medium text-gray-900 leading-relaxed">
                        {clause.greekText.split(/\s+/).map((word, idx) => {
                            // Get the word index from clause.wordIndices
                            const wordIndex = clause.wordIndices[idx];
                            const isClickable = onWordClick && wordIndex !== undefined;
                            
                            // Ensure word is a string (defensive check)
                            const wordText = typeof word === 'string' ? word : (word as any)?.text || String(word);
                            
                            return (
                                <React.Fragment key={idx}>
                                    <span
                                        className={cn(
                                            isClickable && "cursor-pointer hover:bg-blue-100 hover:underline rounded px-0.5 transition-colors"
                                        )}
                                        onClick={() => {
                                            if (isClickable) {
                                                onWordClick(wordIndex);
                                            }
                                        }}
                                        title={isClickable ? `${t('syntax.analyzeWord')} ${idx + 1}` : undefined}
                                    >
                                        {wordText}
                                    </span>
                                    {idx < clause.greekText.split(/\s+/).length - 1 && ' '}
                                </React.Fragment>
                            );
                        })}
                    </div>

                    {/* Syntactic Function */}
                    {clause.syntacticFunction && (
                        <p className="text-xs text-gray-600 italic">
                            {clause.syntacticFunction}
                        </p>
                    )}

                    {/* Stats */}
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                        <span>{clause.wordIndices.length} {t('syntax.words')}</span>
                        {clause.mainVerbIndex !== undefined && (
                            <span>• {t('syntax.mainVerb')} {clause.mainVerbIndex}</span>
                        )}
                    </div>
                </div>
            </div>

            {/* Children (if expanded) */}
            {hasChildren && isExpanded && (
                <div className="mt-2 space-y-2">
                    {children.map(child =>
                        renderClauseTree(
                            child.id,
                            depth + 1,
                            clauseMap,
                            getChildren,
                            expandedClauses,
                            toggleClause,
                            onWordClick,
                            clauseRefs,
                            highlightedClauseId,
                            getClauseNumber,
                            t
                        )
                    )}
                </div>
            )}
        </div>
    );
}

/**
 * ClauseBadge - Visual indicator of clause type
 */
function ClauseBadge({ type, t }: { type: ClauseType, t: (key: string) => string }) {
    const config = getClauseTypeConfig(type, t);
    
    return (
        <span className={cn(
            "inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md",
            config.bgClass,
            config.textClass
        )}>
            <span className={cn("w-1.5 h-1.5 rounded-full", config.dotClass)} />
            {config.label}
        </span>
    );
}

/**
 * Configuration for clause type badges
 */
function getClauseTypeConfig(type: ClauseType, t: (key: string) => string) {
    const configs: Record<ClauseType, {
        label: string;
        bgClass: string;
        textClass: string;
        dotClass: string;
    }> = {
        [ClauseType.MAIN]: {
            label: t('syntax.clauseTypes.main'),
            bgClass: 'bg-blue-100',
            textClass: 'text-blue-800',
            dotClass: 'bg-blue-600'
        },
        [ClauseType.SUBORDINATE_PURPOSE]: {
            label: t('syntax.clauseTypes.purposeIna'),
            bgClass: 'bg-green-100',
            textClass: 'text-green-800',
            dotClass: 'bg-green-600'
        },
        [ClauseType.SUBORDINATE_RESULT]: {
            label: t('syntax.clauseTypes.resultHoste'),
            bgClass: 'bg-yellow-100',
            textClass: 'text-yellow-800',
            dotClass: 'bg-yellow-600'
        },
        [ClauseType.SUBORDINATE_CAUSAL]: {
            label: t('syntax.clauseTypes.causal'),
            bgClass: 'bg-orange-100',
            textClass: 'text-orange-800',
            dotClass: 'bg-orange-600'
        },
        [ClauseType.SUBORDINATE_CONDITIONAL]: {
            label: t('syntax.clauseTypes.conditional'),
            bgClass: 'bg-red-100',
            textClass: 'text-red-800',
            dotClass: 'bg-red-600'
        },
        [ClauseType.SUBORDINATE_TEMPORAL]: {
            label: t('syntax.clauseTypes.temporal'),
            bgClass: 'bg-purple-100',
            textClass: 'text-purple-800',
            dotClass: 'bg-purple-600'
        },
        [ClauseType.SUBORDINATE_INDIRECT_QUESTION]: {
            label: t('syntax.clauseTypes.indirectQuestion'),
            bgClass: 'bg-amber-100',
            textClass: 'text-amber-800',
            dotClass: 'bg-amber-600'
        },
        [ClauseType.PARTICIPIAL]: {
            label: t('syntax.clauseTypes.participial'),
            bgClass: 'bg-teal-100',
            textClass: 'text-teal-800',
            dotClass: 'bg-teal-600'
        },
        [ClauseType.INFINITIVAL]: {
            label: t('syntax.clauseTypes.infinitival'),
            bgClass: 'bg-indigo-100',
            textClass: 'text-indigo-800',
            dotClass: 'bg-indigo-600'
        },
        [ClauseType.RELATIVE]: {
            label: t('syntax.clauseTypes.relative'),
            bgClass: 'bg-pink-100',
            textClass: 'text-pink-800',
            dotClass: 'bg-pink-600'
        }
    };

    return configs[type];
}
