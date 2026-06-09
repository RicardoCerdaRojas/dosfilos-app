import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GitBranch, ArrowUpRight } from 'lucide-react';
import { sermonService } from '@dosfilos/application';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/i18n';

interface SermonVersionBannerProps {
    /** Root sermon id this sermon is a version of. */
    versionOf: string;
    /** Optional occasion label for this version. */
    versionLabel?: string;
}

/**
 * Detail-page strip shown when the open sermon is a version of another. Makes
 * it unmistakable that this is NOT the original and links back to it. Loads the
 * original's title lazily for context; falls back to a generic label if the
 * read fails.
 */
export const SermonVersionBanner: React.FC<SermonVersionBannerProps> = ({ versionOf, versionLabel }) => {
    const { t } = useTranslation('sermons');
    const navigate = useNavigate();
    const [rootTitle, setRootTitle] = useState<string | null>(null);

    useEffect(() => {
        let alive = true;
        sermonService
            .getSermon(versionOf)
            .then((root) => {
                if (alive) setRootTitle(root?.title ?? null);
            })
            .catch(() => {
                if (alive) setRootTitle(null);
            });
        return () => {
            alive = false;
        };
    }, [versionOf]);

    return (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border border-info/20 bg-info/5 px-4 py-2.5">
            <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-info">
                <GitBranch className="h-3.5 w-3.5" />
                {t('versions.badge')}
            </span>
            {versionLabel && (
                <span className="text-[13px] text-foreground truncate max-w-full" title={versionLabel}>
                    {versionLabel}
                </span>
            )}
            <span className="text-[12px] text-muted-foreground truncate max-w-full">
                {rootTitle
                    ? t('versions.bannerOf', { title: rootTitle })
                    : t('versions.bannerOfGeneric')}
            </span>
            <Button
                variant="ghost"
                size="sm"
                className="h-7 ml-auto text-info hover:text-info"
                onClick={() => navigate(`/dashboard/sermons/${versionOf}`)}
            >
                {t('versions.viewOriginal')}
                <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
            </Button>
        </div>
    );
};
