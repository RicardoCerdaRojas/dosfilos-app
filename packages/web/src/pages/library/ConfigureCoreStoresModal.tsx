import { useEffect, useState } from 'react';
import { LibraryResourceEntity } from '@dosfilos/domain';
import { libraryService } from '@dosfilos/application';
import { useTranslation } from '@/i18n';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { BookOpen, Mic2, Library, Loader2, Database } from 'lucide-react';
import { toast } from 'sonner';

interface ConfigureCoreStoresModalProps {
    resource: LibraryResourceEntity;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onUpdate: (resource: LibraryResourceEntity) => void;
}

type CoreStore = string;

// Visual config for the 3 standard stores. Labels + descriptions translated
// via i18n at render time, brand colours sourced from `phase-*` tokens.
const standardStoreConfig: Record<string, {
    icon: typeof BookOpen;
    color: string;
    i18nKey: 'exegesis' | 'homiletics' | 'generic';
}> = {
    exegesis: { icon: BookOpen, color: 'text-phase-exegesis', i18nKey: 'exegesis' },
    homiletics: { icon: Mic2, color: 'text-phase-homiletics', i18nKey: 'homiletics' },
    generic: { icon: Library, color: 'text-phase-generic', i18nKey: 'generic' },
};

interface AvailableStore {
    store: CoreStore;
    icon: typeof BookOpen;
    color: string;
    i18nKey?: 'exegesis' | 'homiletics' | 'generic';
    customLabel?: string;
    customDescription?: string;
}

export function ConfigureCoreStoresModal({
    resource,
    open,
    onOpenChange,
    onUpdate
}: ConfigureCoreStoresModalProps) {
    const { t } = useTranslation('library');
    const [selectedStores, setSelectedStores] = useState<CoreStore[]>(
        resource.coreStores || []
    );
    const [isSaving, setIsSaving] = useState(false);
    const [availableStores, setAvailableStores] = useState<AvailableStore[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (open) {
            loadStoreConfig();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    // Update selected stores if resource changes
    useEffect(() => {
        setSelectedStores(resource.coreStores || []);
    }, [resource]);

    const loadStoreConfig = async () => {
        setLoading(true);
        try {
            // Read keys + descriptions through the service layer — UI never
            // touches Firestore directly. Standard 3-key fallback already
            // baked in at the service level on error.
            const { keys, descriptions } = await libraryService.getCoreStoresConfig();

            // Map keys to display objects. Standard stores use translated labels;
            // custom (admin-defined) stores use the description from config + a
            // generated display label derived from the key itself.
            const stores: AvailableStore[] = keys.map(key => {
                const standard = standardStoreConfig[key];
                if (standard) {
                    return {
                        store: key,
                        icon: standard.icon,
                        color: standard.color,
                        i18nKey: standard.i18nKey,
                    };
                }
                return {
                    store: key,
                    icon: Database,
                    color: 'text-muted-foreground',
                    customLabel: key.charAt(0).toUpperCase() + key.slice(1).replace(/-/g, ' '),
                    customDescription: descriptions[key] || t('coreStoresModal.stores.customDescription'),
                };
            });

            setAvailableStores(stores);
        } catch (error) {
            // Defensive fallback (service is already resilient, but keep this
            // to avoid a half-rendered modal if something unexpected breaks).
            console.error('Error loading store config:', error);
            setAvailableStores(
                Object.keys(standardStoreConfig).map(key => ({
                    store: key,
                    icon: standardStoreConfig[key].icon,
                    color: standardStoreConfig[key].color,
                    i18nKey: standardStoreConfig[key].i18nKey,
                }))
            );
        } finally {
            setLoading(false);
        }
    };

    const handleToggleStore = (store: CoreStore) => {
        setSelectedStores(prev =>
            prev.includes(store)
                ? prev.filter(s => s !== store)
                : [...prev, store]
        );
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            // Update resource with new stores
            await libraryService.updateResource(resource.id, {
                coreStores: selectedStores
            } as any);

            // Create updated resource
            const updatedResource = {
                ...resource,
                coreStores: selectedStores
            } as LibraryResourceEntity;

            onUpdate(updatedResource);

            if (selectedStores.length > 0) {
                toast.success(t('coreStoresModal.toastSuccessAdded', { count: selectedStores.length }));
            } else {
                toast.success(t('coreStoresModal.toastSuccessRemoved'));
            }

            onOpenChange(false);
        } catch (error) {
            console.error('Error updating Core Library stores:', error);
            toast.error(t('coreStoresModal.toastError'));
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>{t('coreStoresModal.title')}</DialogTitle>
                    <DialogDescription>
                        {t('coreStoresModal.description')}
                    </DialogDescription>
                </DialogHeader>

                <div className="py-4">
                    <p className="text-sm text-muted-foreground mb-4 line-clamp-1">
                        <strong>{resource.title}</strong> — {resource.author}
                    </p>

                    {loading ? (
                        <div className="py-8 flex justify-center">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                    ) : (
                        <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
                            {availableStores.map(({ store, icon: Icon, color, i18nKey, customLabel, customDescription }) => {
                                const label = i18nKey ? t(`coreStoresModal.stores.${i18nKey}Label`) : customLabel;
                                const description = i18nKey ? t(`coreStoresModal.stores.${i18nKey}Description`) : customDescription;
                                return (
                                    <div
                                        key={store}
                                        className="flex items-start gap-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors"
                                        onClick={() => handleToggleStore(store)}
                                    >
                                        <Checkbox
                                            checked={selectedStores.includes(store)}
                                            onCheckedChange={() => handleToggleStore(store)}
                                            className="mt-0.5"
                                        />
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2">
                                                <Icon className={`h-4 w-4 ${color}`} />
                                                <Label className="font-medium cursor-pointer">{label}</Label>
                                            </div>
                                            <p className="text-xs text-muted-foreground mt-1">
                                                {description}
                                            </p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {!loading && selectedStores.length > 0 && (
                        <p className="text-xs text-muted-foreground mt-4 text-center">
                            {t('coreStoresModal.documentInStores', { count: selectedStores.length })}
                        </p>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        {t('coreStoresModal.cancel')}
                    </Button>
                    <Button onClick={handleSave} disabled={isSaving || loading}>
                        {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                        {t('coreStoresModal.save')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
