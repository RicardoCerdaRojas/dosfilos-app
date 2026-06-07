import React, { useEffect, useState } from 'react';
import { Loader2, CopyPlus } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useTranslation } from '@/i18n';
import type { SermonEntity } from '@dosfilos/domain';

interface CreateVersionDialogProps {
    /** Source sermon being versioned; `null` keeps the dialog closed. */
    sermon: SermonEntity | null;
    creating: boolean;
    onClose: () => void;
    onConfirm: (label?: string) => void;
}

/**
 * Captures an optional occasion label before creating an editable version of a
 * sermon (re-preaching the same message in a new context). The label is the
 * only input — content/title/references are copied from the source.
 */
export const CreateVersionDialog: React.FC<CreateVersionDialogProps> = ({
    sermon,
    creating,
    onClose,
    onConfirm,
}) => {
    const { t } = useTranslation('sermons');
    const [label, setLabel] = useState('');
    const open = !!sermon;

    // Reset the field whenever a new source sermon opens the dialog.
    useEffect(() => {
        if (open) setLabel('');
    }, [open, sermon?.id]);

    const handleConfirm = () => {
        onConfirm(label.trim() || undefined);
    };

    return (
        <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-primary font-medium mb-1">
                        <CopyPlus className="h-3.5 w-3.5" />
                        {t('versions.dialogEyebrow')}
                    </div>
                    <DialogTitle className="font-reading text-[22px] leading-tight">
                        {sermon?.title || t('versions.dialogFallbackTitle')}
                    </DialogTitle>
                    <DialogDescription className="text-[14px] text-muted-foreground">
                        {t('versions.dialogDescription')}
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-2 py-2">
                    <Label htmlFor="version-label">{t('versions.labelField')}</Label>
                    <Input
                        id="version-label"
                        value={label}
                        onChange={(e) => setLabel(e.target.value)}
                        placeholder={t('versions.labelPlaceholder')}
                        maxLength={80}
                        autoFocus
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !creating) handleConfirm();
                        }}
                    />
                    <p className="text-[12px] text-muted-foreground">{t('versions.labelHint')}</p>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={creating}>
                        {t('versions.cancel')}
                    </Button>
                    <Button onClick={handleConfirm} disabled={creating}>
                        {creating ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                {t('versions.creating')}
                            </>
                        ) : (
                            t('versions.confirm')
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
