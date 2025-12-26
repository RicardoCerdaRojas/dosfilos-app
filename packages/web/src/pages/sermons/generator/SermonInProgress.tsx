import { useState, useMemo, useEffect } from 'react';
import { SermonEntity } from '@dosfilos/domain';
import Fuse from 'fuse.js';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Clock, Trash2, ArrowRight, Search, LayoutGrid, List, MoreVertical, Copy, Share2, BarChart3, CheckCircle2, FileText, TrendingUp, Filter, Plus, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es, enUS } from 'date-fns/locale';
import { VersionHistoryModal } from './VersionHistoryModal';
import { sermonService } from '@dosfilos/application';
import { useTranslation } from '@/i18n';

interface SermonsInProgressProps {
    sermons: SermonEntity[];
    onContinue: (sermon: SermonEntity) => void;
    onDiscard: (sermon: SermonEntity) => void;
    onPublish?: (sermon: SermonEntity) => void;
    onDuplicate?: (sermon: SermonEntity) => void;
    onNewSermon?: () => void;
    publishingSermonId?: string | null;
}

export function SermonsInProgress({ sermons, onContinue, onDiscard, onPublish, onDuplicate, onNewSermon, publishingSermonId }: SermonsInProgressProps) {
    const { t, i18n } = useTranslation('generator');
    const dateLocale = i18n.language === 'es' ? es : enUS;
    const [searchQuery, setSearchQuery] = useState('');
    const [sortOrder, setSortOrder] = useState<'newest' | 'oldest' | 'published-first' | 'draft-first' | 'progress-high' | 'progress-low'>('newest');
    const [activeFilter, setActiveFilter] = useState<'all' | 'published' | 'draft' | 'exegesis' | 'homiletics' | 'drafting'>('all');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>(
        (localStorage.getItem('sermonGeneratorView') as 'grid' | 'list') || 'grid'
    );
    const [versionModalSermon, setVersionModalSermon] = useState<SermonEntity | null>(null);
    const [versionCounts, setVersionCounts] = useState<Record<string, number>>({});

    if (sermons.length === 0) return null;

    // Load version counts for published sermons
    useEffect(() => {
        const loadVersionCounts = async () => {
            const counts: Record<string, number> = {};
            for (const sermon of sermons) {
                if (sermon.wizardProgress?.publishedCopyId) {
                    const versions = await sermonService.getPublishedVersions(sermon.id, sermon.userId);
                    counts[sermon.id] = versions.length;
                }
            }
            setVersionCounts(counts);
        };
        loadVersionCounts();
    }, [sermons]);

    const getPhaseInfo = (sermon: SermonEntity) => {
        const step = sermon.wizardProgress?.currentStep || 0;
        const hasPublishedCopy = !!(sermon.wizardProgress?.publishedCopyId && sermon.wizardProgress?.lastPublishedAt);
        
        // If this draft has a published copy, show as published
        if (hasPublishedCopy) {
            return { 
                label: t('phases.published'), 
                progress: 100, 
                variant: 'success' as const,
                color: 'green',
                badgeClass: 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20',
                progressClass: 'bg-green-500'
            };
        }
        
        switch (step) {
            case 1: return { 
                label: t('phases.exegesis'), 
                progress: 33, 
                variant: 'secondary' as const,
                color: 'blue',
                badgeClass: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20',
                progressClass: 'bg-blue-500'
            };
            case 2: return { 
                label: t('phases.homiletics'), 
                progress: 66, 
                variant: 'secondary' as const,
                color: 'purple',
                badgeClass: 'bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20',
                progressClass: 'bg-purple-500'
            };
            case 3: return { 
                label: t('phases.drafting'), 
                progress: 100, 
                variant: 'secondary' as const,
                color: 'orange',
                badgeClass: 'bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/20',
                progressClass: 'bg-orange-500'
            };
            default: return { 
                label: t('phases.unknown'), 
                progress: 0, 
                variant: 'secondary' as const,
                color: 'gray',
                badgeClass: 'bg-secondary/50',
                progressClass: 'bg-secondary'
            };
        }
    };

    // Fuzzy search with Fuse.js
    const fuse = useMemo(() => {
        return new Fuse(sermons, {
            keys: [
                { name: 'wizardProgress.passage', weight: 2 },
                { name: 'title', weight: 1 },
                { name: 'wizardProgress.exegesis.observations', weight: 0.5 },
            ],
            threshold: 0.4, // 0 = perfect match, 1 = match anything
            ignoreLocation: true,
            includeScore: true,
        });
    }, [sermons]);

    const filteredSermons = useMemo(() => {
        let results = sermons;
        
        // Apply fuzzy search if query exists
        if (searchQuery.trim()) {
            const fuseResults = fuse.search(searchQuery);
            results = fuseResults.map(result => result.item);
        }
        
        // Apply phase/status filter
        results = results.filter(sermon => {
            // Phase/Status filter
            if (activeFilter === 'published') {
                return !!(sermon.wizardProgress?.publishedCopyId);
            }
            if (activeFilter === 'draft') {
                return !sermon.wizardProgress?.publishedCopyId;
            }
            if (activeFilter === 'exegesis') {
                return sermon.wizardProgress?.currentStep === 1;
            }
            if (activeFilter === 'homiletics') {
                return sermon.wizardProgress?.currentStep === 2;
            }
            if (activeFilter === 'drafting') {
                return sermon.wizardProgress?.currentStep === 3;
            }
            
            return true;
        })
        .sort((a, b) => {
            const dateA = new Date(a.wizardProgress?.lastSaved || 0).getTime();
            const dateB = new Date(b.wizardProgress?.lastSaved || 0).getTime();
            
            switch (sortOrder) {
                case 'newest':
                    return dateB - dateA;
                case 'oldest':
                    return dateA - dateB;
                case 'published-first':
                    const aPublished = a.wizardProgress?.publishedCopyId ? 1 : 0;
                    const bPublished = b.wizardProgress?.publishedCopyId ? 1 : 0;
                    return bPublished - aPublished || dateB - dateA;
                case 'draft-first':
                    const aDraft = !a.wizardProgress?.publishedCopyId ? 1 : 0;
                    const bDraft = !b.wizardProgress?.publishedCopyId ? 1 : 0;
                    return bDraft - aDraft || dateB - dateA;
                case 'progress-high':
                    const progressA = getPhaseInfo(a).progress;
                    const progressB = getPhaseInfo(b).progress;
                    return progressB - progressA;
                case 'progress-low':
                    const progressALow = getPhaseInfo(a).progress;
                    const progressBLow = getPhaseInfo(b).progress;
                    return progressALow - progressBLow;
                default:
                    return dateB - dateA;
            }
        });
        
        return results;
    }, [sermons, searchQuery, activeFilter, sortOrder, fuse]);

    // Calculate statistics
    const totalSermons = sermons.length;
    const publishedCount = sermons.filter(s => s.wizardProgress?.publishedCopyId).length;
    const draftCount = totalSermons - publishedCount;
    const avgCompletion = Math.round(
        sermons.reduce((sum, s) => sum + getPhaseInfo(s).progress, 0) / totalSermons
    );

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight mb-2">{t('title')}</h1>
                    <p className="text-muted-foreground max-w-2xl">{t('inProgress.subtitle')}</p>
                </div>
                {onNewSermon && (
                    <Button onClick={onNewSermon} size="lg" className="shadow-md hover:scale-105 transition-transform whitespace-nowrap">
                        <Plus className="mr-2 h-5 w-5" />
                        {t('actions.startNew')}
                    </Button>
                )}
            </div>

            {/* Stats Row - Clean & Compact */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: t('stats.total'), value: totalSermons, icon: BarChart3, color: 'text-primary', bg: 'bg-primary/10' },
                    { label: t('stats.published'), value: publishedCount, icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-500/10' },
                    { label: t('stats.drafts'), value: draftCount, icon: FileText, color: 'text-blue-600', bg: 'bg-blue-500/10' },
                    { label: t('stats.progress'), value: `${avgCompletion}%`, icon: TrendingUp, color: 'text-purple-600', bg: 'bg-purple-500/10' },
                ].map((stat, i) => (
                    <div key={i} className="flex items-center gap-4 p-4 rounded-xl border bg-card/50 hover:bg-card transition-colors">
                        <div className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 ${stat.bg}`}>
                            <stat.icon className={`h-5 w-5 ${stat.color}`} />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
                            <p className="text-2xl font-bold tracking-tight">{stat.value}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Search, Sort, Filters and View Controls - Combined responsive row */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="flex items-center gap-3 flex-1">
                    <div className="relative w-full sm:w-64">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder={t('search.placeholder')}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-8"
                        />
                    </div>
                    <Select value={sortOrder} onValueChange={(v: any) => setSortOrder(v)}>
                        <SelectTrigger className="w-[200px]">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="newest">{t('sort.newest')}</SelectItem>
                            <SelectItem value="oldest">{t('sort.oldest')}</SelectItem>
                            <SelectItem value="published-first">{t('sort.publishedFirst')}</SelectItem>
                            <SelectItem value="draft-first">{t('sort.draftFirst')}</SelectItem>
                            <SelectItem value="progress-high">{t('sort.progressHigh')}</SelectItem>
                            <SelectItem value="progress-low">{t('sort.progressLow')}</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                
                {/* Middle: Filter Chips */}
                <div className="flex items-center gap-1 border rounded-md p-1 flex-wrap">
                    <Filter className="h-4 w-4 text-muted-foreground" />
                    {[
                        { value: 'all', label: t('filter.all') },
                        { value: 'published', label: t('filter.published') },
                        { value: 'draft', label: t('filter.draft') },
                        { value: 'exegesis', label: t('filter.exegesis') },
                        { value: 'homiletics', label: t('filter.homiletics') },
                        { value: 'drafting', label: t('filter.drafting') },
                    ].map((filter) => (
                        <Button
                            key={filter.value}
                            variant={activeFilter === filter.value ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setActiveFilter(filter.value as any)}
                            className={`h-7 text-xs ${activeFilter === filter.value ? 'shadow-sm' : ''}`}
                        >
                            {filter.label}
                            {activeFilter === filter.value && filteredSermons.length > 0 && (
                                <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-background/20 text-[10px] font-semibold">
                                    {filteredSermons.length}
                                </span>
                            )}
                        </Button>
                    ))}
                </div>
                
                {/* Right: View Toggle */}
                <div className="flex items-center gap-1 border rounded-md p-1 shrink-0">
                    <Button
                        variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                        size="sm"
                        onClick={() => {
                            setViewMode('grid');
                            localStorage.setItem('sermonGeneratorView', 'grid');
                        }}
                        className="h-8 px-2"
                    >
                        <LayoutGrid className="h-4 w-4" />
                    </Button>
                    <Button
                        variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                        size="sm"
                        onClick={() => {
                            setViewMode('list');
                            localStorage.setItem('sermonGeneratorView', 'list');
                        }}
                        className="h-8 px-2"
                    >
                        <List className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            <div className={viewMode === 'grid' ? 'grid gap-6 md:grid-cols-2 lg:grid-cols-3' : 'flex flex-col gap-4'}>
                {filteredSermons.length === 0 ? (
                    <div className="col-span-full text-center py-12 text-muted-foreground">
                    {t('empty')}
                </div>
                ) : (
                    filteredSermons.map((sermon) => {
                        const wizardProgress = sermon.wizardProgress;
                        if (!wizardProgress) return null;
                        const phaseInfo = getPhaseInfo(sermon);
                        const { label, progress, variant, badgeClass, progressClass } = phaseInfo;

                        return (
                            <Card key={sermon.id} className="group flex flex-col hover:shadow-xl hover:scale-[1.02] transition-all duration-300 border-muted hover:border-primary/30 overflow-hidden">
                                <div className="p-4 flex-1 space-y-3">
                                    {/* Header: Date + Phase Badge */}
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wide font-medium">
                                            <Clock className="h-3.5 w-3.5" />
                                            {formatDistanceToNow(wizardProgress.lastSaved, { 
                                                addSuffix: true,
                                                locale: dateLocale 
                                            })}
                                        </div>
                                        <div className="flex flex-col items-end gap-1">
                                            <Badge 
                                                variant={variant} 
                                                className={`capitalize ${badgeClass}`}
                                            >
                                                {label}
                                            </Badge>
                                            {wizardProgress.publishCount && wizardProgress.publishCount > 1 && (
                                                <Badge 
                                                    variant="outline" 
                                                    className="text-xs px-2 py-0 cursor-pointer hover:bg-primary/10 transition-colors"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setVersionModalSermon(sermon);
                                                    }}
                                                >
                                                    {versionCounts[sermon.id] || wizardProgress.publishCount || 0} {t('card.versions')}
                                                </Badge>
                                            )}
                                        </div>
                                    </div>

                                    {/* Title (Passage) */}
                                    <div className="space-y-1.5">
                                        <h3 
                                            className="text-lg font-bold font-serif leading-tight group-hover:text-primary transition-colors cursor-pointer"
                                            onClick={() => onContinue(sermon)}
                                            title="Haz clic para abrir el sermón"
                                        >
                                            {wizardProgress.passage}
                                        </h3>
                                        
                                        {/* Publication Info */}
                                        {wizardProgress.lastPublishedAt && (
                                            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                                                <div className="flex items-center gap-1">
                                                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                    </svg>
                                                    <span>{t('card.publishedAgo')} {formatDistanceToNow(
                                                        wizardProgress.lastPublishedAt instanceof Date 
                                                            ? wizardProgress.lastPublishedAt 
                                                            : (wizardProgress.lastPublishedAt as any).toDate?.() || new Date(wizardProgress.lastPublishedAt as any),
                                                        { locale: dateLocale, addSuffix: true }
                                                    )}</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Progress Bar */}
                                    <div className="space-y-1 pt-1">
                                        <div className="flex justify-between text-xs text-muted-foreground">
                                            <span>{t('card.progress')}</span>
                                            <span>{progress}%</span>
                                        </div>
                                        <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                                            <div 
                                                className={`h-full ${progressClass} transition-all duration-300`}
                                                style={{ width: `${progress}%` }}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Footer Actions */}
                                <div className="p-4 border-t bg-muted/20 flex items-center justify-between gap-3">
                                    {/* Action Menu */}
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button 
                                                variant="ghost" 
                                                size="sm"
                                                className="h-9 w-9 p-0"
                                            >
                                                <MoreVertical className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="start">
                                            {onDuplicate && (
                                                <DropdownMenuItem onClick={() => onDuplicate(sermon)}>
                                                    <Copy className="h-4 w-4 mr-2" />
                                                    {t('actions.duplicate')}
                                                </DropdownMenuItem>
                                            )}
                                            {onPublish && wizardProgress.currentStep === 3 && (
                                                <DropdownMenuItem 
                                                    onClick={() => onPublish(sermon)}
                                                    disabled={publishingSermonId === sermon.id}
                                                >
                                                    {publishingSermonId === sermon.id ? (
                                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                                    ) : (
                                                        <Share2 className="h-4 w-4 mr-2" />
                                                    )}
                                                    {t('actions.publishNow')}
                                                </DropdownMenuItem>
                                            )}
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem 
                                                onClick={() => onDiscard(sermon)}
                                                className="text-destructive focus:text-destructive"
                                            >
                                                <Trash2 className="h-4 w-4 mr-2" />
                                                {t('actions.delete')}
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>

                                    {/* Primary Action Button */}
                                    {wizardProgress.currentStep === 3 && onPublish ? (
                                        <Button 
                                            size="sm" 
                                            onClick={() => onPublish(sermon)}
                                            disabled={publishingSermonId === sermon.id}
                                            className="gap-2 shadow-sm bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {publishingSermonId === sermon.id ? (
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                            ) : (
                                                <Share2 className="h-4 w-4" />
                                            )}
                                            {publishingSermonId === sermon.id ? t('actions.publishing') : t('actions.publish')}
                                        </Button>
                                    ) : (
                                        <Button 
                                            size="sm" 
                                            onClick={() => onContinue(sermon)}
                                            className="gap-2 shadow-sm"
                                        >
                                            {t('actions.continue')}
                                            <ArrowRight className="h-4 w-4" />
                                        </Button>
                                    )}
                                </div>
                            </Card>
                        );
                    })
                )}
            </div>

            {/* Version History Modal */}
            {versionModalSermon && (
                <VersionHistoryModal
                    draftSermon={versionModalSermon}
                    isOpen={!!versionModalSermon}
                    onClose={() => setVersionModalSermon(null)}
                />
            )}
        </div>
    );
}
