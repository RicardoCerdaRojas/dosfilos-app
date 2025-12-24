import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { BookOpen, Lightbulb, AlertTriangle, Sparkles, Search, Target, ChevronDown } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { SaveInsightButton } from './SaveInsightButton';

interface TutorResponseDisplayProps {
    question: string;
    answer: string;
    greekWord?: string;
    passage?: string;
    onSaveInsight?: (data: {
        title?: string;
        content: string;
        question: string;
        tags: string[];
        greekWord?: string;
        passage?: string;
    }) => Promise<void>;
}

/**
 * Component to display tutor responses with enhanced pedagogical design
 */
export const TutorResponseDisplay: React.FC<TutorResponseDisplayProps> = ({
    question,
    answer,
    greekWord,
    passage,
    onSaveInsight
}) => {
    // Parse sections from the answer
    const sections = parseAnswerSections(answer);
    
    return (
        <div className="space-y-6">
            {/* Question Box */}
            <Card className="p-4 bg-gradient-to-r from-primary/5 to-purple-500/5 border-l-4 border-l-primary">
                <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                        <BookOpen className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1">
                        <p className="text-xs font-medium text-primary mb-1">Tu Pregunta</p>
                        <p className="text-sm leading-relaxed">{question}</p>
                        {greekWord && (
                            <div className="mt-2 flex items-center gap-2">
                                <Badge variant="outline" className="font-greek text-sm">
                                    {greekWord}
                                </Badge>
                                {passage && (
                                    <span className="text-xs text-muted-foreground">{passage}</span>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </Card>

            {/* Answer Sections */}
            <Card className="p-6 md:p-8">
                <div className="flex items-start justify-between gap-4 mb-6">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-primary" />
                        Respuesta del Tutor
                    </h3>
                    {onSaveInsight && (
                        <div className="shrink-0">
                            <SaveInsightButton
                                question={question}
                                answer={answer}
                                greekWord={greekWord}
                                passage={passage}
                                onSave={onSaveInsight}
                            />
                        </div>
                    )}
                </div>
                
                <div className="space-y-6">
                    {sections.map((section, index) => (
                        <Section key={index} section={section} />
                    ))}
                </div>
            </Card>
        </div>
    );
};

interface ParsedSection {
    type: 'concept' | 'example' | 'warning' | 'insight' | 'detail' | 'application' | 'text';
    title?: string;
    content: string;
    isCollapsible?: boolean;
}

/**
 * Parse answer into structured sections
 */
function parseAnswerSections(answer: string): ParsedSection[] {
    const sections: ParsedSection[] = [];
    
    // Split by markdown headers (## or ###)
    const headerRegex = /^(#{2,3})\s+(.+)$/gm;
    const parts = answer.split(headerRegex);
    
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
        
        // Determine section type based on title keywords or emojis
        const type = determineSectionType(title);
        
        sections.push({
            type,
            title: title.replace(/^[📖💡⚠️✨🔍🎯]\s*/, ''), // Remove emoji if present
            content: content.trim(),
            isCollapsible: type === 'detail' || level === '###'
        });
    }
    
    // If no sections were found, treat the whole answer as text
    if (sections.length === 0) {
        sections.push({
            type: 'text',
            content: answer
        });
    }
    
    return sections;
}

/**
 * Determine section type from title
 */
function determineSectionType(title: string): ParsedSection['type'] {
    const lower = title.toLowerCase();
    
    if (lower.includes('concepto') || lower.includes('📖') || lower.includes('definición')) {
        return 'concept';
    }
    if (lower.includes('ejemplo') || lower.includes('💡') || lower.includes('contexto')) {
        return 'example';
    }
    if (lower.includes('cuidado') || lower.includes('⚠️') || lower.includes('advertencia') || lower.includes('error')) {
        return 'warning';
    }
    if (lower.includes('insight') || lower.includes('✨') || lower.includes('reflexión') || lower.includes('teológico')) {
        return 'insight';
    }
    if (lower.includes('profundi') || lower.includes('🔍') || lower.includes('detalle') || lower.includes('técnico')) {
        return 'detail';
    }
    if (lower.includes('aplicación') || lower.includes('🎯') || lower.includes('pastoral') || lower.includes('predicación')) {
        return 'application';
    }
    
    return 'text';
}

/**
 * Section component with icon and styling based on type
 */
const Section: React.FC<{ section: ParsedSection }> = ({ section }) => {
    const [isOpen, setIsOpen] = React.useState(!section.isCollapsible);
    
    const iconConfig = {
        concept: { icon: BookOpen, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-950/20', border: 'border-blue-200 dark:border-blue-800' },
        example: { icon: Lightbulb, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-950/20', border: 'border-amber-200 dark:border-amber-800' },
        warning: { icon: AlertTriangle, color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-50 dark:bg-orange-950/20', border: 'border-orange-200 dark:border-orange-800' },
        insight: { icon: Sparkles, color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-50 dark:bg-purple-950/20', border: 'border-purple-200 dark:border-purple-800' },
        detail: { icon: Search, color: 'text-slate-600 dark:text-slate-400', bg: 'bg-slate-50 dark:bg-slate-950/20', border: 'border-slate-200 dark:border-slate-800' },
        application: { icon: Target, color: 'text-green-600 dark:text-green-400', bg: 'bg-green-50 dark:bg-green-950/20', border: 'border-green-200 dark:border-green-800' },
        text: { icon: BookOpen, color: 'text-primary', bg: '', border: '' }
    };
    
    const config = iconConfig[section.type];
    const Icon = config.icon;
    
    // For simple text sections without title
    if (!section.title) {
        return (
            <div className="prose prose-slate dark:prose-invert max-w-none 
                          prose-p:leading-relaxed prose-p:mb-3
                          prose-ul:my-3 prose-li:my-1
                          prose-strong:font-semibold prose-strong:text-foreground
                          prose-code:text-primary prose-code:bg-primary/10 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{section.content}</ReactMarkdown>
            </div>
        );
    }
    
    // For sections with titles
    const content = (
        <div className="prose prose-slate dark:prose-invert max-w-none
                      prose-p:leading-relaxed prose-p:mb-3
                      prose-ul:my-3 prose-li:my-1
                      prose-strong:font-semibold prose-strong:text-foreground
                      prose-code:text-primary prose-code:bg-primary/10 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{section.content}</ReactMarkdown>
        </div>
    );
    
    if (section.isCollapsible) {
        return (
            <Collapsible open={isOpen} onOpenChange={setIsOpen}>
                <div className={`rounded-lg border ${config.border || 'border-border'} ${config.bg}`}>
                    <CollapsibleTrigger className="w-full p-4 flex items-center justify-between hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                        <div className="flex items-center gap-3">
                            <Icon className={`h-5 w-5 ${config.color}`} />
                            <h4 className="font-semibold text-sm">{section.title}</h4>
                        </div>
                        <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                        <div className="p-4 pt-0">
                            {content}
                        </div>
                    </CollapsibleContent>
                </div>
            </Collapsible>
        );
    }
    
    // Non-collapsible section with prominent styling
    return (
        <div className={`rounded-lg border ${config.border || 'border-border'} ${config.bg} p-4`}>
            <div className="flex items-center gap-3 mb-3">
                <Icon className={`h-5 w-5 ${config.color}`} />
                <h4 className="font-semibold text-sm">{section.title}</h4>
            </div>
            {content}
        </div>
    );
};
