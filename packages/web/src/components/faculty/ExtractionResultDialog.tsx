import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import ReactMarkdown from 'react-markdown';
import { useTranslation } from '@/i18n';

interface ExtractionResultDialogProps {
    content: { title: string; markdown: string } | null;
    onClose: () => void;
}

export function ExtractionResultDialog({ content, onClose }: ExtractionResultDialogProps) {
    const { t } = useTranslation('faculty');
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        if (!content) return;
        navigator.clipboard.writeText(content.markdown);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <Dialog open={!!content} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col">
                <DialogHeader className="flex flex-row items-center justify-between pr-8 shrink-0">
                    <DialogTitle className="text-lg font-bold">{content?.title}</DialogTitle>
                    <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5 h-8"
                        onClick={handleCopy}
                    >
                        {copied
                            ? <><Check className="h-3.5 w-3.5 text-green-600" /> {t('dialogs.copied')}</>
                            : <><Copy className="h-3.5 w-3.5" /> {t('dialogs.copy')}</>
                        }
                    </Button>
                </DialogHeader>
                <div className="overflow-y-auto flex-1 pr-1">
                    <div className="prose prose-sm prose-slate dark:prose-invert max-w-none">
                        <ReactMarkdown>{content?.markdown || ''}</ReactMarkdown>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
