import { useState, useEffect } from 'react';
import { LibraryResourceEntity, ResourceType } from '@dosfilos/domain';
import { useTranslation } from '@/i18n';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Loader2 } from 'lucide-react';

interface EditResourceModalProps {
    resource: LibraryResourceEntity | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSave: (id: string, updates: {
        title: string;
        author: string;
        type: ResourceType;
    }) => Promise<void>;
}

// Resource types available in the editor — labels look up via i18n at render time.
type CategoryI18nKey = 'theology' | 'grammar' | 'commentary' | 'theologicalDictionary' | 'bibleDictionary' | 'article' | 'other';
const RESOURCE_TYPE_KEYS: Array<{ value: ResourceType; i18nKey: CategoryI18nKey }> = [
    { value: 'theology', i18nKey: 'theology' },
    { value: 'grammar', i18nKey: 'grammar' },
    { value: 'commentary', i18nKey: 'commentary' },
    { value: 'theological-dictionary', i18nKey: 'theologicalDictionary' },
    { value: 'bible-dictionary', i18nKey: 'bibleDictionary' },
    { value: 'article', i18nKey: 'article' },
    { value: 'other', i18nKey: 'other' },
];

export function EditResourceModal({ resource, open, onOpenChange, onSave }: EditResourceModalProps) {
    const { t } = useTranslation('library');
    const [title, setTitle] = useState('');
    const [author, setAuthor] = useState('');
    const [type, setType] = useState<ResourceType>('theology');
    const [saving, setSaving] = useState(false);

    // Reset form when resource changes
    useEffect(() => {
        if (resource) {
            setTitle(resource.title);
            setAuthor(resource.author);
            setType(resource.type);
        }
    }, [resource]);

    const handleSave = async () => {
        if (!resource) return;
        setSaving(true);
        try {
            await onSave(resource.id, { title, author, type });
            onOpenChange(false);
        } catch (error) {
            console.error('Error saving resource:', error);
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{t('editModal.title')}</DialogTitle>
                    <DialogDescription>
                        {t('editModal.description')}
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="edit-title">{t('editModal.titleLabel')}</Label>
                        <Input
                            id="edit-title"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder={t('editModal.titlePlaceholder')}
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="edit-author">{t('editModal.authorLabel')}</Label>
                        <Input
                            id="edit-author"
                            value={author}
                            onChange={(e) => setAuthor(e.target.value)}
                            placeholder={t('editModal.authorPlaceholder')}
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="edit-type">{t('editModal.categoryLabel')}</Label>
                        <Select value={type} onValueChange={(v: ResourceType) => setType(v)}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {RESOURCE_TYPE_KEYS.map(opt => (
                                    <SelectItem key={opt.value} value={opt.value}>
                                        {t(`editModal.categoryOptions.${opt.i18nKey}`)}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
                        {t('editModal.cancel')}
                    </Button>
                    <Button onClick={handleSave} disabled={saving || !title.trim()}>
                        {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {t('editModal.save')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
