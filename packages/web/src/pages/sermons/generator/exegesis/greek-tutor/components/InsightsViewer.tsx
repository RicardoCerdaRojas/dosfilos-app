import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Bookmark, Search, X, Edit2, Trash2, Check, ChevronDown } from 'lucide-react';
import { ExegeticalInsight } from '@dosfilos/domain';
import { useGreekTutor } from '../GreekTutorProvider';
import { useFirebase } from '@/context/firebase-context';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import ReactMarkdown from 'react-markdown';
import { useTranslation } from '@/i18n';

/**
 * InsightsViewer Component
 * Displays user's saved insights with search, filter, and management capabilities
 */
export const InsightsViewer: React.FC = () => {
    const { t } = useTranslation('greekTutor');
    const { getUserInsights, updateInsight, deleteInsight } = useGreekTutor();
    const { user } = useFirebase();
    
    const [insights, setInsights] = useState<ExegeticalInsight[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedTags, setSelectedTags] = useState<string[]>([]);
    const [editingInsight, setEditingInsight] = useState<ExegeticalInsight | null>(null);
    const [deletingInsight, setDeleteingInsight] = useState<ExegeticalInsight | null>(null);

    // Load insights on mount
    useEffect(() => {
        loadInsights();
    }, [user]);

    const loadInsights = async () => {
        if (!user?.uid) return;
        
        setLoading(true);
        try {
            const filters = searchTerm || selectedTags.length > 0 ? {
                searchTerm: searchTerm || undefined,
                tags: selectedTags.length > 0 ? selectedTags : undefined
            } : undefined;
            
            const result = await getUserInsights.execute(user.uid, filters);
            setInsights(result);
            // console.log(`[InsightsViewer] Loaded ${result.length} insights`);
        } catch (error) {
            console.error('[InsightsViewer] Failed to load insights:', error);
        } finally {
            setLoading(false);
        }
    };

    // Reload when search/filter changes
    useEffect(() => {
        const timer = setTimeout(() => {
            if (user?.uid) loadInsights();
        }, 300); // Debounce
        return () => clearTimeout(timer);
    }, [searchTerm, selectedTags]);

    // Get all unique tags from insights
    const allTags = Array.from(new Set(insights.flatMap(i => i.tags)));

    const toggleTag = (tag: string) => {
        setSelectedTags(prev =>
            prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
        );
    };

    const handleDelete = async () => {
        if (!deletingInsight || !user?.uid) return;
        
        try {
            await deleteInsight.execute(user.uid, deletingInsight.id);
            setInsights(prev => prev.filter(i => i.id !== deletingInsight.id));
            setDeleteingInsight(null);
            // console.log('[InsightsViewer] Deleted insight:', deletingInsight.id);
        } catch (error) {
            console.error('[InsightsViewer] Failed to delete insight:', error);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-center">
                    <Bookmark className="h-12 w-12 text-muted-foreground mx-auto mb-4 animate-pulse" />
                    <p className="text-sm text-muted-foreground">{t('insights.loading')}</p>
                </div>
            </div>
        );
    }

    if (insights.length === 0 && !searchTerm && selectedTags.length === 0) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-center max-w-sm">
                    <Bookmark className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="font-semibold mb-2">{t('insights.emptyTitle')}</h3>
                    <p className="text-sm text-muted-foreground">
                        {t('insights.emptyMessage')}
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Search and Filter */}
            <Card className="p-4">
                <div className="space-y-3">
                    {/* Search */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder={t('insights.searchPlaceholder')}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10"
                        />
                    </div>

                    {/* Tag Filters */}
                    {allTags.length > 0 && (
                        <div className="space-y-2">
                            <Label className="text-xs text-muted-foreground">{t('insights.filterByTags')}</Label>
                            <div className="flex flex-wrap gap-2">
                                {allTags.map(tag => (
                                    <Badge
                                        key={tag}
                                        variant={selectedTags.includes(tag) ? "default" : "outline"}
                                        className="cursor-pointer"
                                        onClick={() => toggleTag(tag)}
                                    >
                                        {tag}
                                    </Badge>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Active filters */}
                    {(searchTerm || selectedTags.length > 0) && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>{t('insights.resultCount', { count: insights.length })}</span>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                    setSearchTerm('');
                                    setSelectedTags([]);
                                }}
                                className="h-6 text-xs"
                            >
                                {t('insights.clearFilters')}
                            </Button>
                        </div>
                    )}
                </div>
            </Card>

            {/* Insights List */}
            <ScrollArea className="h-[calc(100vh-300px)]">
                <div className="space-y-3">
                    {insights.map(insight => (
                        <InsightCard
                            key={insight.id}
                            insight={insight}
                            onEdit={() => setEditingInsight(insight)}
                            onDelete={() => setDeleteingInsight(insight)}
                        />
                    ))}
                </div>
            </ScrollArea>

            {/* Edit Dialog */}
            <EditInsightDialog
                insight={editingInsight}
                onClose={() => setEditingInsight(null)}
                onSave={async (updates) => {
                    if (!editingInsight || !user?.uid) return;
                    await updateInsight.execute(user.uid, editingInsight.id, updates);
                    setInsights(prev => prev.map(i =>
                        i.id === editingInsight.id ? { ...i, ...updates } : i
                    ));
                    setEditingInsight(null);
                }}
            />

            {/* Delete Confirmation Dialog */}
            <Dialog open={!!deletingInsight} onOpenChange={() => setDeleteingInsight(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('insights.deleteTitle')}</DialogTitle>
                        <DialogDescription>
                            {t('insights.deleteMessage')}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteingInsight(null)}>
                            {t('insights.cancel')}
                        </Button>
                        <Button variant="destructive" onClick={handleDelete}>
                            {t('insights.delete')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

// Individual Insight Card Component
const InsightCard: React.FC<{
    insight: ExegeticalInsight;
    onEdit: () => void;
    onDelete: () => void;
}> = ({ insight, onEdit, onDelete }) => {
    const { t } = useTranslation('greekTutor');
    const [isExpanded, setIsExpanded] = useState(false);

    // Parse content into sections (same logic as TutorResponseDisplay)
    const parsedSections = parseContentSections(insight.content);

    return (
        <Card className="p-4 hover:border-primary/50 transition-colors">
            <div className="space-y-3">
                {/* Header */}
                <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 space-y-1">
                        <h4 className="font-semibold text-sm line-clamp-2">{insight.title}</h4>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                            {insight.greekWord && (
                                <Badge variant="outline" className="font-greek text-xs">
                                    {insight.greekWord}
                                </Badge>
                            )}
                            {insight.passage && <span>{insight.passage}</span>}
                            <span>•</span>
                            <span>{new Date(insight.createdAt).toLocaleDateString('es')}</span>
                        </div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                        <Button variant="ghost" size="sm" onClick={onEdit} className="h-8 w-8 p-0">
                            <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={onDelete} className="h-8 w-8 p-0 text-destructive">
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </div>
                </div>

                {/* Tags */}
                {insight.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                        {insight.tags.map(tag => (
                            <Badge key={tag} variant="secondary" className="text-xs">
                                {tag}
                            </Badge>
                        ))}
                    </div>
                )}

                {/* Collapsible Content */}
                <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
                    <CollapsibleTrigger className="flex items-center gap-2 text-sm text-primary hover:underline">
                        <span>{isExpanded ? t('insights.hideContent') : t('insights.viewContent')}</span>
                        <ChevronDown className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                        <div className="mt-3 space-y-4">
                            {insight.question && (
                                <div className="text-sm p-3 rounded-lg bg-muted/50 border border-muted">
                                    <p className="font-medium text-muted-foreground mb-1 text-xs">{t('insights.question')}</p>
                                    <p className="text-foreground">{insight.question}</p>
                                </div>
                            )}
                            {/* Render sections with didactic formatting */}
                            <div className="space-y-4">
                                {parsedSections.map((section, index) => (
                                    <FormattedSection key={index} section={section} />
                                ))}
                            </div>
                        </div>
                    </CollapsibleContent>
                </Collapsible>
            </div>
        </Card>
    );
};

// Edit Dialog Component
const EditInsightDialog: React.FC<{
    insight: ExegeticalInsight | null;
    onClose: () => void;
    onSave: (updates: { title?: string; tags?: string[] }) => Promise<void>;
}> = ({ insight, onClose, onSave }) => {
    const { t } = useTranslation('greekTutor');
    const [title, setTitle] = useState('');
    const [tagInput, setTagInput] = useState('');
    const [tags, setTags] = useState<string[]>([]);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (insight) {
            setTitle(insight.title);
            setTags(insight.tags);
        }
    }, [insight]);

    const handleSave = async () => {
        setSaving(true);
        try {
            await onSave({ title, tags });
        } finally {
            setSaving(false);
        }
    };

    const addTag = () => {
        const tag = tagInput.trim().toLowerCase();
        if (tag && !tags.includes(tag) && tags.length < 10) {
            setTags([...tags, tag]);
            setTagInput('');
        }
    };

    if (!insight) return null;

    return (
        <Dialog open={!!insight} onOpenChange={onClose}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{t('insights.editTitle')}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label>{t('insights.title')}</Label>
                        <Input
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            maxLength={100}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>{t('insights.tags')}</Label>
                        <div className="flex gap-2">
                            <Input
                                value={tagInput}
                                onChange={(e) => setTagInput(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                                placeholder={t('insights.addTag')}
                                disabled={tags.length >= 10}
                            />
                            <Button onClick={addTag} size="sm" disabled={!tagInput.trim() || tags.length >= 10}>
                                <Check className="h-4 w-4" />
                            </Button>
                        </div>
                        {tags.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                                {tags.map(tag => (
                                    <Badge key={tag} variant="secondary" className="gap-1">
                                        {tag}
                                        <X
                                            className="h-3 w-3 cursor-pointer"
                                            onClick={() => setTags(tags.filter(t => t !== tag))}
                                        />
                                    </Badge>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={saving}>
                        {t('insights.cancel')}
                    </Button>
                    <Button onClick={handleSave} disabled={saving || !title.trim()}>
                        {saving ? t('insights.saving') : t('insights.save')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

// ========== Section Parsing and Formatting Logic ==========
// (Same logic as TutorResponseDisplay for consistency)

interface ParsedSection {
    type: 'concept' | 'example' | 'warning' | 'insight' | 'detail' | 'application' | 'text';
    title?: string;
    content: string;
    isCollapsible?: boolean;
}

/**
 * Parse content into structured sections
 */
function parseContentSections(content: string): ParsedSection[] {
    const sections: ParsedSection[] = [];
    
    // Split by markdown headers (## or ###)
    const headerRegex = /^(#{2,3})\s+(.+)$/gm;
    const parts = content.split(headerRegex);
    
    if (parts[0]?.trim()) {
        // Content before first header
        sections.push({
            type: 'text',
            content: parts[0].trim()
        });
    }
    
    // Process headers and their content
    for (let i = 1; i < parts.length; i += 3) {
        const level = parts[i];
        const title = parts[i + 1];
        const content = parts[i + 2];
        
        // Skip if any part is missing
        if (!level || !title || content === undefined) continue;
        
        // Determine section type based on title keywords
        const type = determineSectionType(title);
        
        sections.push({
            type,
            title: title.trim(),
            content: content.trim(),
            isCollapsible: type === 'detail' || level === '###'
        });
    }
    
    // If no sections were found, treat the whole content as text
    if (sections.length === 0) {
        sections.push({
            type: 'text',
            content: content
        });
    }
    
    return sections;
}

/**
 * Determine section type from title
 */
function determineSectionType(title: string): ParsedSection['type'] {
    const lowerTitle = title.toLowerCase();
    
    if (lowerTitle.match(/concept|concepto|clave|central|definición/)) return 'concept';
    if (lowerTitle.match(/ejemplo|example|ilustr/)) return 'example';
    if (lowerTitle.match(/advertencia|warning|cuidado|caution/)) return 'warning';
    if (lowerTitle.match(/insight|profund|técnic|aspect/)) return 'detail';
    if (lowerTitle.match(/aplicación|pastoral|implicacion|práctic/)) return 'application';
    if (lowerTitle.match(/contexto|uso en el nt/)) return 'insight';
    
    return 'text';
}

/**
 * Component to render a formatted section
 */
const FormattedSection: React.FC<{ section: ParsedSection }> = ({ section }) => {
    const [isOpen, setIsOpen] = useState(!section.isCollapsible);
    
    const { icon: Icon, color, bgColor } = getSectionStyle(section.type);
    
    if (section.type === 'text') {
        return (
            <div className="prose prose-sm prose-slate dark:prose-invert max-w-none">
                <ReactMarkdown>{section.content}</ReactMarkdown>
            </div>
        );
    }
    
    if (!section.isCollapsible) {
        return (
            <div className={`p-4 rounded-lg border ${bgColor} ${color}`}>
                {section.title && (
                    <div className="flex items-start gap-2 mb-2">
                        <Icon className="h-5 w-5 mt-0.5 shrink-0" />
                        <h4 className="font-semibold">{section.title}</h4>
                    </div>
                )}
                <div className="prose prose-sm prose-slate dark:prose-invert max-w-none">
                    <ReactMarkdown>{section.content}</ReactMarkdown>
                </div>
            </div>
        );
    }
    
    return (
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
            <div className={`rounded-lg border ${bgColor}`}>
                <CollapsibleTrigger className={`w-full p-3 flex items-center justify-between hover:bg-muted/50 transition-colors ${color}`}>
                    <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4 shrink-0" />
                        <span className="font-medium text-sm">{section.title}</span>
                    </div>
                    <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </CollapsibleTrigger>
                <CollapsibleContent>
                    <div className="p-4 pt-2 prose prose-sm prose-slate dark:prose-invert max-w-none">
                        <ReactMarkdown>{section.content}</ReactMarkdown>
                    </div>
                </CollapsibleContent>
            </div>
        </Collapsible>
    );
};

/**
 * Get visual style for section type
 */
function getSectionStyle(type: ParsedSection['type']) {
    const BookOpenIcon = (props: React.SVGProps<SVGSVGElement>) => (
        <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
    );
    const LightbulbIcon = (props: React.SVGProps<SVGSVGElement>) => (
        <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
    );
    const AlertCircleIcon = (props: React.SVGProps<SVGSVGElement>) => (
        <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
    );
    const SparklesIcon = (props: React.SVGProps<SVGSVGElement>) => (
        <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
        </svg>
    );
    const TargetIcon = (props: React.SVGProps<SVGSVGElement>) => (
        <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
    );
    
    switch (type) {
        case 'concept':
            return {
                icon: BookOpenIcon,
                color: 'text-blue-700 dark:text-blue-400',
                bgColor: 'bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800'
            };
        case 'insight':
            return {
                icon: LightbulbIcon,
                color: 'text-amber-700 dark:text-amber-400',
                bgColor: 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800'
            };
        case 'detail':
            return {
                icon: SparklesIcon,
                color: 'text-purple-700 dark:text-purple-400',
                bgColor: 'bg-purple-50 dark:bg-purple-950/20 border-purple-200 dark:border-purple-800'
            };
        case 'application':
            return {
                icon: TargetIcon,
                color: 'text-green-700 dark:text-green-400',
                bgColor: 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800'
            };
        case 'example':
            return {
                icon: BookOpenIcon,
                color: 'text-cyan-700 dark:text-cyan-400',
                bgColor: 'bg-cyan-50 dark:bg-cyan-950/20 border-cyan-200 dark:border-cyan-800'
            };
        case 'warning':
            return {
                icon: AlertCircleIcon,
                color: 'text-orange-700 dark:text-orange-400',
                bgColor: 'bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-800'
            };
        default:
            return {
                icon: BookOpenIcon,
                color: 'text-muted-foreground',
                bgColor: 'bg-muted/50 border-muted'
            };
    }
}
