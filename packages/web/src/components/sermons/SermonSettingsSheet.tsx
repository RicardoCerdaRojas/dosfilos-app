
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { TagInput } from './tag-input';
import { useTranslation } from 'react-i18next';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Settings } from 'lucide-react';

interface SermonSettingsSheetProps {
  category: string;
  setCategory: (value: string) => void;
  authorName: string;
  setAuthorName: (value: string) => void;
  bibleReferences: string[];
  setBibleReferences: (value: string[]) => void;
  tags: string[];
  setTags: (value: string[]) => void;
  status: 'working' | 'draft' | 'published' | 'archived';
  setStatus: (value: 'working' | 'draft' | 'published' | 'archived') => void;
  loading: boolean;
}

export function SermonSettingsSheet({
  category,
  setCategory,
  authorName,
  setAuthorName,
  bibleReferences,
  setBibleReferences,
  tags,
  setTags,
  status,
  setStatus,
  loading,
}: SermonSettingsSheetProps) {
  const { t } = useTranslation('sermonDetail');

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" title={t('form.sermonDetails')}>
          <Settings className="h-5 w-5 text-muted-foreground" />
        </Button>
      </SheetTrigger>
      <SheetContent className="w-[400px] sm:w-[540px] flex flex-col p-0 h-full">
        <SheetHeader className="px-6 py-4 border-b">
          <SheetTitle>{t('form.sermonDetails')}</SheetTitle>
          <SheetDescription>
            Configura los detalles y metadatos de tu sermón.
          </SheetDescription>
        </SheetHeader>
        
        <ScrollArea className="flex-1">
          <div className="p-6 space-y-6">
            {/* Status */}
            <div className="space-y-2">
              <Label htmlFor="status">{t('form.status')}</Label>
              <Select
                value={status}
                onValueChange={(value: any) => setStatus(value)}
                disabled={loading}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">{t('status.draft')}</SelectItem>
                  <SelectItem value="published">{t('status.published')}</SelectItem>
                  <SelectItem value="archived">{t('status.archived')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Category */}
            <div className="space-y-2">
              <Label htmlFor="category">{t('form.category')}</Label>
              <Select
                value={category}
                onValueChange={setCategory}
                disabled={loading}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('form.categoryPlaceholder')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="evangelismo">{t('form.categories.evangelismo')}</SelectItem>
                  <SelectItem value="discipulado">{t('form.categories.discipulado')}</SelectItem>
                  <SelectItem value="adoracion">{t('form.categories.adoracion')}</SelectItem>
                  <SelectItem value="familia">{t('form.categories.familia')}</SelectItem>
                  <SelectItem value="juventud">{t('form.categories.juventud')}</SelectItem>
                  <SelectItem value="matrimonio">{t('form.categories.matrimonio')}</SelectItem>
                  <SelectItem value="finanzas">{t('form.categories.finanzas')}</SelectItem>
                  <SelectItem value="oracion">{t('form.categories.oracion')}</SelectItem>
                  <SelectItem value="otro">{t('form.categories.otro')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Author Name */}
            <div className="space-y-2">
              <Label htmlFor="authorName">{t('form.author')}</Label>
              <Input
                id="authorName"
                value={authorName}
                onChange={(e) => setAuthorName(e.target.value)}
                placeholder={t('form.authorPlaceholder')}
                disabled={loading}
              />
              <p className="text-xs text-muted-foreground">
                {t('form.authorHelp')}
              </p>
            </div>

            {/* Bible References */}
            <div className="space-y-2">
              <Label>{t('form.bibleRefs')}</Label>
              <TagInput
                tags={bibleReferences}
                onChange={setBibleReferences}
                placeholder={t('form.bibleRefsPlaceholder')}
                disabled={loading}
              />
              <p className="text-xs text-muted-foreground">
                {t('form.bibleRefsHelp')}
              </p>
            </div>

            {/* Tags */}
            <div className="space-y-2">
              <Label>{t('form.tags')}</Label>
              <TagInput
                tags={tags}
                onChange={setTags}
                placeholder={t('form.tagsPlaceholder')}
                disabled={loading}
              />
              <p className="text-xs text-muted-foreground">
                {t('form.tagsHelp')}
              </p>
            </div>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
    );
}
