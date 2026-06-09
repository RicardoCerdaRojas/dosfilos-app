import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, Pencil, Presentation, MoreVertical, Trash2, FolderKanban, CopyPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { useTranslation } from '@/i18n';

interface SermonRowActionsProps {
    sermonId: string;
    onDelete: () => void;
    /** Optional: when omitted, the link-to-project dropdown item is hidden. */
    onLink?: () => void;
    /** Optional: when omitted, the "create new version" dropdown item is hidden. */
    onCreateVersion?: () => void;
    /** Hover-to-primary tint matches the grid card actions. Defaults to false (table). */
    hoverPrimary?: boolean;
}

/**
 * Shared row of action buttons used by both grid card footer and table row.
 * View / edit / preach + a dropdown for delete (and optional link-to-project).
 */
export const SermonRowActions: React.FC<SermonRowActionsProps> = ({
    sermonId,
    onDelete,
    onLink,
    onCreateVersion,
    hoverPrimary = false,
}) => {
    const { t } = useTranslation('sermons');
    const navigate = useNavigate();
    const hoverClass = hoverPrimary ? 'hover:text-primary' : '';

    return (
        <div className="flex items-center gap-1">
            <Button
                variant="ghost"
                size="sm"
                className={`h-8 w-8 p-0 ${hoverClass}`}
                onClick={() => navigate(`/dashboard/sermons/${sermonId}`)}
                title={t('actions.view')}
            >
                <Eye className="h-4 w-4" />
            </Button>
            <Button
                variant="ghost"
                size="sm"
                className={`h-8 w-8 p-0 ${hoverClass}`}
                onClick={() => navigate(`/dashboard/sermons/${sermonId}/edit`)}
                title={t('actions.edit')}
            >
                <Pencil className="h-4 w-4" />
            </Button>
            <Button
                variant="ghost"
                size="sm"
                className={`h-8 w-8 p-0 ${hoverClass}`}
                onClick={() => navigate(`/dashboard/sermons/${sermonId}/preach`)}
                title={t('actions.preachMode')}
            >
                <Presentation className="h-4 w-4" />
            </Button>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <MoreVertical className="h-4 w-4" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    {onCreateVersion && (
                        <DropdownMenuItem onClick={onCreateVersion}>
                            <CopyPlus className="mr-2 h-4 w-4" />
                            {t('actions.createVersion')}
                        </DropdownMenuItem>
                    )}
                    {onLink && (
                        <>
                            <DropdownMenuItem onClick={onLink}>
                                <FolderKanban className="mr-2 h-4 w-4" />
                                {t('actions.linkToProject')}
                            </DropdownMenuItem>
                        </>
                    )}
                    {(onCreateVersion || onLink) && <DropdownMenuSeparator />}
                    <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={onDelete}
                    >
                        <Trash2 className="mr-2 h-4 w-4" />
                        {t('actions.delete')}
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    );
};
