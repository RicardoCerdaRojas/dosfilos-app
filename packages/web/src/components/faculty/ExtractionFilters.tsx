import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTranslation } from '@/i18n';
import type { Extraction, ExtractionType } from '@dosfilos/domain';

export type TypeFilterValue = 'all' | ExtractionType;
export type TimeFilterValue = 'all' | 'today' | 'week' | 'month' | 'older';

const TYPE_OPTIONS: TypeFilterValue[] = [
    'all',
    'SERMON',
    'BIBLE_STUDY',
    'COUNSELING_TASK',
    'NEWSLETTER',
    'BLOG_POST',
    'DEVOTIONAL',
    'SYSTEMATIC_THEOLOGY_PAPER',
];

const TYPE_LABEL_KEY: Record<TypeFilterValue, string> = {
    all: 'extractionsFilters.allTypes',
    SERMON: 'extraction.sermonOutline',
    SERMON_OUTLINE: 'extraction.sermonOutline',
    BIBLE_STUDY: 'extraction.bibleStudy',
    COUNSELING_TASK: 'extraction.counselingTask',
    NEWSLETTER: 'extraction.newsletter',
    BLOG_POST: 'extraction.blogPost',
    DEVOTIONAL: 'extraction.devotional',
    SYSTEMATIC_THEOLOGY_PAPER: 'extraction.theologyPaper',
};

const TIME_OPTIONS: TimeFilterValue[] = ['all', 'today', 'week', 'month', 'older'];

const TIME_LABEL_KEY: Record<TimeFilterValue, string> = {
    all: 'extractionsFilters.allTime',
    today: 'timeGroups.today',
    week: 'timeGroups.thisWeek',
    month: 'timeGroups.thisMonth',
    older: 'timeGroups.older',
};

interface ExtractionFiltersProps {
    typeFilter: TypeFilterValue;
    timeFilter: TimeFilterValue;
    onTypeChange: (next: TypeFilterValue) => void;
    onTimeChange: (next: TimeFilterValue) => void;
}

/**
 * Two compact selects above the resource list. Scales to many
 * artifacts without forcing the user to scroll: they pick type +
 * period and the list narrows. Each select stays single-value so the
 * mental model is simple — combination is AND.
 */
export function ExtractionFilters({
    typeFilter,
    timeFilter,
    onTypeChange,
    onTimeChange,
}: ExtractionFiltersProps) {
    const { t } = useTranslation('faculty');
    return (
        <div className="flex items-center gap-2 px-3 pt-3">
            <Select value={typeFilter} onValueChange={v => onTypeChange(v as TypeFilterValue)}>
                <SelectTrigger className="h-8 text-xs flex-1 min-w-0">
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    {TYPE_OPTIONS.map(option => (
                        <SelectItem key={option} value={option} className="text-xs">
                            {t(TYPE_LABEL_KEY[option])}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
            <Select value={timeFilter} onValueChange={v => onTimeChange(v as TimeFilterValue)}>
                <SelectTrigger className="h-8 text-xs flex-1 min-w-0">
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    {TIME_OPTIONS.map(option => (
                        <SelectItem key={option} value={option} className="text-xs">
                            {t(TIME_LABEL_KEY[option])}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    );
}

/**
 * Pure filter — applies type + time predicates to an extraction list.
 * Time buckets are computed against the moment the function runs (not
 * memoized) so a long-open page sees the same definition of "hoy" the
 * user expects after midnight.
 */
export function filterExtractions(
    items: Extraction[],
    typeFilter: TypeFilterValue,
    timeFilter: TimeFilterValue,
): Extraction[] {
    const now = Date.now();
    const DAY = 24 * 60 * 60 * 1000;
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const todayMs = startOfToday.getTime();

    return items.filter(item => {
        if (typeFilter !== 'all' && item.type !== typeFilter) return false;
        if (timeFilter === 'all') return true;
        const age = now - item.updatedAt.getTime();
        const isToday = item.updatedAt.getTime() >= todayMs;
        switch (timeFilter) {
            case 'today': return isToday;
            case 'week': return age < 7 * DAY && !isToday;
            case 'month': return age >= 7 * DAY && age < 30 * DAY;
            case 'older': return age >= 30 * DAY;
            default: return true;
        }
    });
}
