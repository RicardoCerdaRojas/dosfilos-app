import React from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/i18n';

interface SermonStatusBadgeProps {
    status: string;
}

/**
 * Maps a sermon status (`draft` | `published` | `archived`) to a coloured badge.
 * Uses semantic tokens: warning (draft), success (published), muted (archived).
 */
export const SermonStatusBadge: React.FC<SermonStatusBadgeProps> = ({ status }) => {
    const { t } = useTranslation('sermons');

    const variants: Record<string, { label: string; className: string }> = {
        draft: { label: t('statusLabels.draft'), className: 'bg-warning/15 text-warning border-warning/30' },
        published: { label: t('statusLabels.published'), className: 'bg-success/15 text-success border-success/30' },
        archived: { label: t('statusLabels.archived'), className: 'bg-muted text-muted-foreground border-border' },
    };
    const config = variants[status] ?? variants.draft!;

    return (
        <Badge variant="outline" className={cn('capitalize', config.className)}>
            {config.label}
        </Badge>
    );
};
