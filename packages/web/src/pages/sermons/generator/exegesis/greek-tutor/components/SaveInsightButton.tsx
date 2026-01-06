import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Bookmark, Check, X } from 'lucide-react';
import { useTranslation } from '@/i18n';

interface SaveInsightButtonProps {
    question: string;
    answer: string;
    greekWord?: string;
    passage?: string;
    onSave: (data: {
        title?: string;
        content: string;
        question: string;
        tags: string[];
        greekWord?: string;
        passage?: string;
    }) => Promise<void>;
}

/**
 * Button component for saving tutor responses as personal insights
 * Follows Single Responsibility - handles only the UI for saving insights
 */
export const SaveInsightButton: React.FC<SaveInsightButtonProps> = ({
    question,
    answer,
    greekWord,
    passage,
    onSave
}) => {
    const { t } = useTranslation('greekTutor');
    const [isOpen, setIsOpen] = useState(false);
    const [title, setTitle] = useState('');
    const [tagInput, setTagInput] = useState('');
    const [tags, setTags] = useState<string[]>([]);
    const [isSaving, setIsSaving] = useState(false);

    const handleAddTag = () => {
        const tag = tagInput.trim().toLowerCase();
        if (tag && !tags.includes(tag) && tags.length < 10) {
            setTags([...tags, tag]);
            setTagInput('');
        }
    };

    const handleRemoveTag = (tagToRemove: string) => {
        setTags(tags.filter(t => t !== tagToRemove));
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await onSave({
                title: title.trim() || undefined,
                content: answer,
                question,
                tags,
                greekWord,
                passage
            });

            // Reset and close
            setIsOpen(false);
            setTitle('');
            setTags([]);
            setTagInput('');
        } catch (error) {
            console.error('[SaveInsightButton] Error saving insight:', error);
            // Re-throw to let parent component handle
            throw error;
        } finally {
            setIsSaving(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleAddTag();
        }
    };

    return (
        <>
            <Button
                onClick={() => setIsOpen(true)}
                variant="ghost"
                size="sm"
                className="gap-2"
            >
                <Bookmark className="h-4 w-4" />
                {t('askTutor.saveInsight.button')}
            </Button>

            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>{t('askTutor.saveInsight.modalTitle')}</DialogTitle>
                        <DialogDescription>
                            {t('askTutor.saveInsight.modalDescription')}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        {/* Context Preview */}
                        <div className="rounded-lg border p-3 bg-muted/30 space-y-2">
                            {greekWord && (
                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-muted-foreground">{t('askTutor.saveInsight.wordLabel')}</span>
                                    <Badge variant="outline" className="font-greek">
                                        {greekWord}
                                    </Badge>
                                </div>
                            )}
                            {passage && (
                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-muted-foreground">{t('askTutor.saveInsight.passageLabel')}</span>
                                    <span className="text-xs">{passage}</span>
                                </div>
                            )}
                        </div>

                        {/* Title Input */}
                        <div className="space-y-2">
                            <Label htmlFor="title">
                                {t('askTutor.saveInsight.titleLabel')}
                            </Label>
                            <Input
                                id="title"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder={t('askTutor.saveInsight.titlePlaceholder')}
                                maxLength={100}
                            />
                            <p className="text-xs text-muted-foreground">
                                {t('askTutor.saveInsight.titleCharCount', { count: title.length })}
                            </p>
                        </div>

                        {/* Tags Input */}
                        <div className="space-y-2">
                            <Label htmlFor="tags">
                                {t('askTutor.saveInsight.tagsLabel')}
                            </Label>
                            <div className="flex gap-2">
                                <Input
                                    id="tags"
                                    value={tagInput}
                                    onChange={(e) => setTagInput(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    placeholder={t('askTutor.saveInsight.tagsPlaceholder')}
                                    disabled={tags.length >= 10}
                                />
                                <Button
                                    onClick={handleAddTag}
                                    size="sm"
                                    variant="outline"
                                    disabled={!tagInput.trim() || tags.length >= 10}
                                >
                                    <Check className="h-4 w-4" />
                                </Button>
                            </div>
                            {tags.length > 0 && (
                                <div className="flex flex-wrap gap-2 mt-2">
                                    {tags.map((tag) => (
                                        <Badge
                                            key={tag}
                                            variant="secondary"
                                            className="gap-1"
                                        >
                                            {tag}
                                            <button
                                                onClick={() => handleRemoveTag(tag)}
                                                className="ml-1 hover:text-destructive"
                                            >
                                                <X className="h-3 w-3" />
                                            </button>
                                        </Badge>
                                    ))}
                                </div>
                            )}
                            <p className="text-xs text-muted-foreground">
                                {t('askTutor.saveInsight.tagsCount', { count: tags.length })}
                            </p>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setIsOpen(false)}
                            disabled={isSaving}
                        >
                            {t('askTutor.saveInsight.cancel')}
                        </Button>
                        <Button
                            onClick={handleSave}
                            disabled={isSaving}
                        >
                            {isSaving ? t('askTutor.saveInsight.saving') : t('askTutor.saveInsight.save')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
};
