import React from 'react';
import { BiblicalPassage, TrainingUnit } from '@dosfilos/domain';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { BookOpen, Loader2 } from 'lucide-react';
import { PassageVersionRow } from './PassageVersionRow';
import { WordPreviewModal } from './WordPreviewModal';
import { usePassageReader } from '../hooks/usePassageReader';

interface PassageReaderProps {
    passage: BiblicalPassage | null;
    sessionId: string;
    currentUnits: TrainingUnit[];
    fileSearchStoreId?: string;
    isLoading?: boolean;
    onUnitAdded?: (unit: TrainingUnit) => void;
}

/**
 * Main component for interactive passage reading
 * Displays passage in 3 versions with toggleable visibility
 * Allows word selection and unit creation
 */
export const PassageReader: React.FC<PassageReaderProps> = ({
    passage,
    sessionId,
    currentUnits,
    fileSearchStoreId,
    isLoading = false,
    onUnitAdded
}) => {
    const {
        visibleVersions,
        toggleVersion,
        wordsWithStatus,
        selectedWord,
        unitPreview,
        isLoadingPreview,
        isModalOpen,
        isAddingUnit,
        handleWordClick,
        handleConfirmAdd,
        handleCloseModal
    } = usePassageReader(passage, sessionId, currentUnits, fileSearchStoreId, onUnitAdded);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="ml-3 text-muted-foreground">Cargando pasaje...</span>
            </div>
        );
    }

    if (!passage) {
        return (
            <Alert>
                <BookOpen className="h-4 w-4" />
                <AlertDescription>
                    No se pudo cargar el pasaje. Por favor intenta de nuevo más tarde.
                </AlertDescription>
            </Alert>
        );
    }

    return (
        <div className="space-y-4">
            {/* Header */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <BookOpen className="h-5 w-5" />
                        {passage.reference}
                    </CardTitle>
                    <CardDescription>
                        Selecciona las versiones que deseas visualizar. Haz click en las palabras griegas para agregarlas a tus unidades de estudio.
                    </CardDescription>
                </CardHeader>
            </Card>

            {/* Version Rows */}
            <div className="space-y-3">
                {/* RV60 Row */}
                <PassageVersionRow
                    version="rv60"
                    text={passage.rv60Text}
                    isVisible={visibleVersions.has('rv60')}
                    onToggle={() => toggleVersion('rv60')}
                />

                {/* Greek Row */}
                <PassageVersionRow
                    version="greek"
                    text={passage.greekText}
                    words={wordsWithStatus}
                    isVisible={visibleVersions.has('greek')}
                    onToggle={() => toggleVersion('greek')}
                    onWordClick={handleWordClick}
                    highlightedWordId={selectedWord?.id}
                />

                {/* Transliteration Row */}
                <PassageVersionRow
                    version="transliteration"
                    text={passage.transliteration}
                    isVisible={visibleVersions.has('transliteration')}
                    onToggle={() => toggleVersion('transliteration')}
                />
            </div>

            {/* Words in Units Info */}
            {currentUnits.length > 0 && (
                <Alert className="bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800">
                    <AlertDescription className="text-sm">
                        Las palabras resaltadas en verde ya están en tus unidades de estudio ({currentUnits.length} total).
                    </AlertDescription>
                </Alert>
            )}

            {/* Word Preview Modal */}
            <WordPreviewModal
                word={selectedWord}
                preview={unitPreview}
                isLoading={isLoadingPreview}
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                onConfirm={handleConfirmAdd}
                isConfirming={isAddingUnit}
            />
        </div>
    );
};
