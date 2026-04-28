import React from 'react';
import { Check, Copy, Globe } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useTranslation } from 'react-i18next';
import type { SermonEntity } from '@dosfilos/domain';

interface ShareSermonDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    sermon: SermonEntity;
    sharing: boolean;
    copied: boolean;
    onShareToggle: (checked: boolean) => void;
    onCopyLink: () => void;
}

export const ShareSermonDialog: React.FC<ShareSermonDialogProps> = ({
    open,
    onOpenChange,
    sermon,
    sharing,
    copied,
    onShareToggle,
    onCopyLink,
}) => {
    const { t } = useTranslation('sermonDetail');

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{t('dialogs.share.title')}</DialogTitle>
                    <DialogDescription>{t('dialogs.share.description')}</DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    <div className="flex items-center justify-between space-x-2 p-4 border rounded-lg bg-muted/50">
                        <Label htmlFor="share-mode" className="flex flex-col space-y-1 cursor-pointer">
                            <span className="font-medium">{t('dialogs.share.publicMode')}</span>
                            <span className="font-normal text-xs text-muted-foreground">
                                {t('dialogs.share.publicModeDesc')}
                            </span>
                        </Label>
                        <Switch
                            id="share-mode"
                            checked={sermon.isShared}
                            onCheckedChange={onShareToggle}
                            disabled={sharing}
                        />
                    </div>

                    {sermon.isShared && sermon.shareToken && (
                        <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                            <Label>{t('dialogs.share.publicLink')}</Label>
                            <div className="flex items-center space-x-2">
                                <div className="relative flex-1">
                                    <Input
                                        id="link"
                                        defaultValue={`${window.location.origin}/share/${sermon.shareToken}`}
                                        readOnly
                                        className="pr-10"
                                    />
                                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-muted-foreground">
                                        <Globe className="h-4 w-4" />
                                    </div>
                                </div>
                                <Button size="icon" variant="outline" onClick={onCopyLink}>
                                    {copied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
                                </Button>
                            </div>
                            <p className="text-xs text-muted-foreground">{t('dialogs.share.copyTip')}</p>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
};
