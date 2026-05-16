import { Badge } from '@/components/ui/badge';
import { useTranslation } from '@/i18n';

interface EngagementBadgeProps {
    score: number; // 0-100
    showScore?: boolean;
}

/**
 * Compact engagement signal. Score 0-100; thresholds 33 / 66 split into
 * Low / Medium / High. Tones follow semantic tokens so the badge respects
 * the active color theme + dark mode (previously used hardcoded
 * green/orange/red-100 literals).
 *
 * When `showScore` is true, the score renders as "· 25/100" rather than
 * "(25)" — the parens read ambiguous (out of what?), the suffix makes
 * the denominator explicit.
 */
export function EngagementBadge({ score, showScore = true }: EngagementBadgeProps) {
    const { t } = useTranslation('admin');

    const level = score >= 66
        ? { key: 'high' as const, tone: 'bg-success-subtle text-success-subtle-foreground border-success/30', dot: 'bg-success' }
        : score >= 33
            ? { key: 'medium' as const, tone: 'bg-warning-subtle text-warning-subtle-foreground border-warning/30', dot: 'bg-warning' }
            : { key: 'low' as const, tone: 'bg-destructive/10 text-destructive border-destructive/30', dot: 'bg-destructive' };

    return (
        <Badge variant="outline" className={`${level.tone} font-medium`} title={t('users.engagement.tooltip')}>
            <div className="flex items-center gap-1.5">
                <div className={`h-2 w-2 rounded-full ${level.dot}`} />
                {t(`users.engagement.${level.key}`)}
                {showScore && <span className="ml-1 text-xs opacity-80">· {score}/100</span>}
            </div>
        </Badge>
    );
}
