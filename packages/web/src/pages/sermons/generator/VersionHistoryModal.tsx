import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { SermonEntity } from '@dosfilos/domain';
import { sermonService } from '@dosfilos/application';
import { useState, useEffect } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { Clock, ExternalLink, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

interface VersionHistoryModalProps {
    draftSermon: SermonEntity;
    isOpen: boolean;
    onClose: () => void;
}

export function VersionHistoryModal({ draftSermon, isOpen, onClose }: VersionHistoryModalProps) {
    const [versions, setVersions] = useState<SermonEntity[]>([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        if (isOpen && draftSermon.id) {
            loadVersions();
        }
    }, [isOpen, draftSermon.id]);

    const loadVersions = async () => {
        setLoading(true);
        try {
            console.log('🔍 Loading versions for draft:', draftSermon.id);
            const publishedVersions = await sermonService.getPublishedVersions(draftSermon.id, draftSermon.userId);
            console.log('📚 Found versions:', publishedVersions.length, publishedVersions);
            setVersions(publishedVersions);
        } catch (error) {
            console.error('❌ Error loading versions:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleViewVersion = (versionId: string) => {
        navigate(`/sermons/${versionId}`);
        onClose();
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5" />
                        Historial de Versiones
                    </DialogTitle>
                    <p className="text-sm text-muted-foreground mt-2">
                        {draftSermon.wizardProgress?.passage || draftSermon.title}
                    </p>
                </DialogHeader>

                <div className="space-y-3 mt-4">
                    {loading ? (
                        <div className="text-center py-8 text-muted-foreground">
                            Cargando versiones...
                        </div>
                    ) : versions.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            No hay versiones publicadas aún
                        </div>
                    ) : (
                        versions.map((version, index) => (
                            <div
                                key={version.id}
                                className="p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                            >
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1 space-y-2">
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-semibold text-primary">
                                                Versión {versions.length - index}
                                            </span>
                                            <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/10 text-green-700 dark:text-green-400">
                                                Publicado
                                            </span>
                                        </div>
                                        
                                        {version.publishedAt && (
                                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                                <Clock className="h-3 w-3" />
                                                <span>
                                                    Publicado {formatDistanceToNow(version.publishedAt, {
                                                        locale: es,
                                                        addSuffix: true
                                                    })}
                                                </span>
                                            </div>
                                        )}

                                        {version.preachingHistory && version.preachingHistory.length > 0 && (
                                            <div className="text-xs text-muted-foreground">
                                                Predicado {version.preachingHistory.length} {version.preachingHistory.length === 1 ? 'vez' : 'veces'}
                                            </div>
                                        )}
                                    </div>

                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => handleViewVersion(version.id)}
                                        className="gap-2"
                                    >
                                        Ver
                                        <ExternalLink className="h-3 w-3" />
                                    </Button>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {versions.length > 0 && (
                    <div className="mt-4 pt-4 border-t text-xs text-muted-foreground text-center">
                        {versions.length} {versions.length === 1 ? 'versión publicada' : 'versiones publicadas'}
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
