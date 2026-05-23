import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Loader2,
    ArrowLeft,
    RefreshCw,
    ScrollText,
    BookOpen,
    AlertCircle,
    Sparkles,
    CheckCircle2,
} from 'lucide-react';
import { useTranslation } from '@/i18n';
import { useAdminAuth } from '@/hooks/admin/useAdminAuth';
import { useConfessionCatalog, useConfessionSections } from '@/hooks/admin/useConfessionCatalog';
import { useIngestCoreLibrary } from '@/hooks/admin/useIngestCoreLibrary';
import { useTagDoctrineLevels } from '@/hooks/admin/useTagDoctrineLevels';
import { useUpdateSectionDoctrineLevel } from '@/hooks/admin/useUpdateSectionDoctrineLevel';
import type { Confession, ConfessionSection, DoctrineLevel } from '@dosfilos/domain';

const DOCTRINE_LEVEL_TONE: Record<string, string> = {
    core: 'bg-destructive/15 text-destructive border-destructive/30',
    distinctive: 'bg-warning/15 text-warning border-warning/30',
    'open-evangelical': 'bg-success/15 text-success border-success/30',
};

const STATUS_TONE: Record<string, string> = {
    complete: 'bg-success/15 text-success border-success/30',
    partial: 'bg-warning/15 text-warning border-warning/30',
    pending: 'bg-muted text-muted-foreground border-muted-foreground/30',
    'not-applicable': 'bg-muted/50 text-muted-foreground border-muted-foreground/20',
};

/**
 * Admin viewer + ingest control for the Pastoral Fidelity CORE Library
 * confession catalog. Lists every catalog entry from Firestore, surfaces
 * ingest status (complete / partial / pending / not-applicable), and lets
 * super_admins trigger the ingest callable for a single source or the
 * whole catalog. Drill-down navigates to a section list per confession.
 */
export function ConfessionsAdmin() {
    const navigate = useNavigate();
    const { confessionId } = useParams<{ confessionId?: string }>();
    const { t } = useTranslation('admin');
    const { isAdmin, loading: authLoading } = useAdminAuth();
    const { confessions, loading, refresh } = useConfessionCatalog();
    const { ingest, isLoading: ingesting } = useIngestCoreLibrary();

    const [selectedFilter, setSelectedFilter] = useState<'all' | 'sectioned' | 'reference'>('all');

    if (authLoading || !isAdmin) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (confessionId) {
        const confession = confessions.find((c) => c.id === confessionId) ?? null;
        return <ConfessionDetailView confession={confession} onBack={() => navigate('/dashboard/admin/confessions')} />;
    }

    const handleIngestAll = async () => {
        const ok = await ingest();
        if (ok) await refresh();
    };

    const filtered = confessions.filter((c) => {
        if (selectedFilter === 'all') return true;
        return c.sectionType === selectedFilter;
    });

    return (
        <div className="p-6 max-w-[95%] mx-auto">
            <div className="flex items-center gap-3 mb-6">
                <Button variant="outline" onClick={() => navigate('/dashboard/admin')}>
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    {t('common.back')}
                </Button>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                    <ScrollText className="h-6 w-6 text-primary" />
                    {t('confessions.title')}
                </h1>
            </div>

            <Card className="p-4 mb-6">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div>
                        <p className="text-sm text-muted-foreground">
                            {t('confessions.description')}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                            {t('confessions.totalCount', { count: confessions.length })}
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" onClick={refresh} disabled={loading}>
                            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                            {t('common.refresh')}
                        </Button>
                        <Button onClick={handleIngestAll} disabled={ingesting}>
                            {ingesting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                            {t('confessions.ingestAll')}
                        </Button>
                    </div>
                </div>
            </Card>

            <div className="flex gap-2 mb-4">
                {(['all', 'sectioned', 'reference'] as const).map((f) => (
                    <Button
                        key={f}
                        size="sm"
                        variant={selectedFilter === f ? 'default' : 'outline'}
                        onClick={() => setSelectedFilter(f)}
                    >
                        {t(`confessions.filter.${f}`)}
                    </Button>
                ))}
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-24">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            ) : filtered.length === 0 ? (
                <Card className="p-12 text-center">
                    <AlertCircle className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
                    <p className="text-muted-foreground">{t('confessions.empty')}</p>
                    <p className="text-xs text-muted-foreground mt-2">{t('confessions.emptyHint')}</p>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filtered.map((c) => (
                        <ConfessionCard
                            key={c.id}
                            confession={c}
                            onOpen={() => navigate(`/dashboard/admin/confessions/${c.id}`)}
                            onIngest={async () => {
                                const r = await ingest([c.id]);
                                if (r) await refresh();
                            }}
                            ingesting={ingesting}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

interface ConfessionCardProps {
    confession: Confession;
    onOpen: () => void;
    onIngest: () => void;
    ingesting: boolean;
}

function ConfessionCard({ confession, onOpen, onIngest, ingesting }: ConfessionCardProps) {
    const { t } = useTranslation('admin');
    const tone = STATUS_TONE[confession.ingestStatus] ?? '';

    return (
        <Card className="p-5 flex flex-col gap-3">
            <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                    <h3 className="font-semibold truncate">{confession.shortTitle}</h3>
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{confession.title}</p>
                </div>
                <Badge variant="outline" className={tone}>
                    {t(`confessions.status.${confession.ingestStatus}`)}
                </Badge>
            </div>

            <div className="text-xs text-muted-foreground space-y-1">
                <div>
                    <span className="font-medium">{t('confessions.tradition')}:</span> {confession.tradition}
                </div>
                <div>
                    <span className="font-medium">{t('confessions.year')}:</span> {String(confession.year)}
                </div>
                <div>
                    <span className="font-medium">{t('confessions.license')}:</span> {confession.license}
                </div>
                {confession.sectionType === 'sectioned' && (
                    <div>
                        <span className="font-medium">{t('confessions.sectionCount')}:</span> {confession.sectionCount}
                    </div>
                )}
            </div>

            <div className="flex gap-2 mt-auto">
                {confession.sectionType === 'sectioned' && (
                    <Button size="sm" variant="outline" onClick={onOpen} className="flex-1">
                        <BookOpen className="h-3 w-3 mr-1.5" />
                        {t('confessions.viewSections')}
                    </Button>
                )}
                <Button size="sm" variant="ghost" onClick={onIngest} disabled={ingesting}>
                    <RefreshCw className={`h-3 w-3 mr-1.5 ${ingesting ? 'animate-spin' : ''}`} />
                    {t('confessions.reingest')}
                </Button>
            </div>
        </Card>
    );
}

interface DetailProps {
    confession: Confession | null;
    onBack: () => void;
}

function ConfessionDetailView({ confession, onBack }: DetailProps) {
    const { t } = useTranslation('admin');
    const { sections, loading, refresh } = useConfessionSections(confession?.id ?? null);
    const { tag, isLoading: tagging } = useTagDoctrineLevels();

    if (!confession) {
        return (
            <div className="p-6 max-w-3xl mx-auto">
                <Button variant="outline" onClick={onBack}>
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    {t('common.back')}
                </Button>
                <Card className="p-12 text-center mt-6">
                    <p className="text-muted-foreground">{t('confessions.notFound')}</p>
                </Card>
            </div>
        );
    }

    const handleTag = async () => {
        const ok = await tag({ confessionIds: [confession.id] });
        if (ok) refresh();
    };

    const handleTagForce = async () => {
        if (!window.confirm(t('confessions.tagForceConfirm'))) return;
        const ok = await tag({ confessionIds: [confession.id], force: true });
        if (ok) refresh();
    };

    const pendingReview = sections.filter(
        (s) => s.doctrineLevel && s.reviewStatus !== 'reviewed',
    ).length;
    const untagged = sections.filter((s) => !s.doctrineLevel).length;

    return (
        <div className="p-6 max-w-4xl mx-auto">
            <Button variant="outline" onClick={onBack}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                {t('common.back')}
            </Button>

            <Card className="p-5 mt-6 mb-6">
                <h1 className="text-2xl font-bold">{confession.title}</h1>
                <p className="text-sm text-muted-foreground mt-1">{confession.shortTitle}</p>
                <div className="flex items-center gap-2 mt-3 flex-wrap">
                    <Badge variant="outline">{confession.tradition}</Badge>
                    <Badge variant="outline">{String(confession.year)}</Badge>
                    <Badge variant="outline" className={STATUS_TONE[confession.ingestStatus]}>
                        {t(`confessions.status.${confession.ingestStatus}`)}
                    </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-3">{confession.rightsStatus}</p>

                {sections.length > 0 && (
                    <div className="flex items-center gap-3 mt-4 flex-wrap">
                        <Button size="sm" onClick={handleTag} disabled={tagging || untagged === 0}>
                            {tagging ? (
                                <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />
                            ) : (
                                <Sparkles className="h-3 w-3 mr-1.5" />
                            )}
                            {t('confessions.tagLlm')}
                        </Button>
                        <Button size="sm" variant="outline" onClick={handleTagForce} disabled={tagging}>
                            <Sparkles className="h-3 w-3 mr-1.5" />
                            {t('confessions.tagLlmForce')}
                        </Button>
                        <span className="text-xs text-muted-foreground">
                            {t('confessions.taggingSummary', {
                                total: sections.length,
                                untagged,
                                pendingReview,
                            })}
                        </span>
                    </div>
                )}
            </Card>

            {loading ? (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
            ) : sections.length === 0 ? (
                <Card className="p-8 text-center">
                    <p className="text-muted-foreground">{t('confessions.noSections')}</p>
                    <p className="text-xs text-muted-foreground mt-2">{t('confessions.pendingHint')}</p>
                </Card>
            ) : (
                <div className="space-y-3">
                    {sections.map((s) => (
                        <SectionRow
                            key={s.sectionId}
                            section={s}
                            confessionId={confession.id}
                            onChanged={refresh}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

interface SectionRowProps {
    section: ConfessionSection;
    confessionId: string;
    onChanged: () => void;
}

function SectionRow({ section, confessionId, onChanged }: SectionRowProps) {
    const { t } = useTranslation('admin');
    const { update, isLoading } = useUpdateSectionDoctrineLevel();
    const [pendingLevel, setPendingLevel] = useState<DoctrineLevel | undefined>(undefined);

    const level = pendingLevel ?? section.doctrineLevel;
    const isPendingReview = !!section.doctrineLevel && section.reviewStatus !== 'reviewed';

    const handleLevelChange = async (next: DoctrineLevel) => {
        setPendingLevel(next);
        const ok = await update({
            confessionId,
            sectionId: section.sectionId,
            doctrineLevel: next,
        });
        if (ok) onChanged();
        else setPendingLevel(undefined);
    };

    const handleMarkReviewed = async () => {
        const ok = await update({
            confessionId,
            sectionId: section.sectionId,
            reviewStatus: 'reviewed',
        });
        if (ok) onChanged();
    };

    return (
        <Card className="p-4">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
                <Badge variant="outline" className="font-mono text-xs">{section.sectionReference}</Badge>
                {section.title && <h3 className="font-semibold text-sm">{section.title}</h3>}

                <div className="ml-auto flex items-center gap-2">
                    {level && (
                        <Badge variant="outline" className={`text-xs ${DOCTRINE_LEVEL_TONE[level] ?? ''}`}>
                            {level}
                        </Badge>
                    )}
                    {isPendingReview && (
                        <Badge variant="outline" className="text-xs bg-warning/15 text-warning border-warning/30">
                            {t('confessions.reviewPending')}
                        </Badge>
                    )}
                    {section.reviewStatus === 'reviewed' && (
                        <Badge variant="outline" className="text-xs bg-success/15 text-success border-success/30">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            {t('confessions.reviewed')}
                        </Badge>
                    )}
                </div>
            </div>
            <p className="text-sm leading-relaxed mb-3">{section.text}</p>

            {section.levelRationale && (
                <div className="text-xs text-muted-foreground italic bg-muted/30 rounded p-2 mb-3">
                    <span className="font-semibold not-italic">{t('confessions.rationale')}: </span>
                    {section.levelRationale}
                </div>
            )}

            <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-muted-foreground">{t('confessions.levelLabel')}:</span>
                <Select
                    value={level ?? ''}
                    onValueChange={(v) => handleLevelChange(v as DoctrineLevel)}
                    disabled={isLoading}
                >
                    <SelectTrigger className="h-8 w-48 text-xs">
                        <SelectValue placeholder={t('confessions.levelPlaceholder')} />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="core">core</SelectItem>
                        <SelectItem value="distinctive">distinctive</SelectItem>
                        <SelectItem value="open-evangelical">open-evangelical</SelectItem>
                    </SelectContent>
                </Select>
                {isPendingReview && (
                    <Button size="sm" variant="outline" onClick={handleMarkReviewed} disabled={isLoading}>
                        <CheckCircle2 className="h-3 w-3 mr-1.5" />
                        {t('confessions.markReviewed')}
                    </Button>
                )}
                {isLoading && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
            </div>
        </Card>
    );
}
