import React from 'react';
import { BiblicalPassage, TrainingUnit } from '@dosfilos/domain';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { BookOpen, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils'; // Added import
import { PassageVersionRow } from './PassageVersionRow';
import { WordPreviewModal } from './WordPreviewModal';
import { usePassageReader } from '../hooks/usePassageReader';
import { useTranslation } from '@/i18n';

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
    const { t, i18n } = useTranslation('greekTutor');
    const isEnglish = (i18n.language || 'es').startsWith('en');
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
        handleCloseModal,
        hoveredWord,
        setHoveredWord
    } = usePassageReader(passage, sessionId, currentUnits, fileSearchStoreId, onUnitAdded);

    const educationalTips = [
        "Haz clic en cualquier palabra griega para ver su análisis detallado",
        "El orden de palabras en griego es flexible gracias a su sistema de casos",
        "La transliteración te ayuda a pronunciar correctamente mientras estudias",
        "Cada sesión queda guardada automáticamente en tu dashboard"
    ];
    
    const randomTip = educationalTips[Math.floor(Math.random() * educationalTips.length)];

    if (isLoading) {
        return (
            <div className="space-y-6 p-8">
                {/* Header con ícono y título */}
                <div className="text-center space-y-2">
                    <div className="flex justify-center">
                        <BookOpen className="h-12 w-12 text-primary animate-pulse" />
                    </div>
                    <h3 className="text-lg font-semibold">{t('session.passageReader.preparingSession')}</h3>
                    <p className="text-sm text-muted-foreground">
                        {passage?.reference || t('session.passageReader.loadingPassage')}
                    </p>
                </div>

                {/* Pasos de progreso */}
                <div className="space-y-3 max-w-md mx-auto">
                    <div className="flex items-center gap-3 text-sm">
                        <Loader2 className="h-4 w-4 animate-spin text-primary" />
                        <span className="text-muted-foreground">{t('session.passageReader.loadingGreek')}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm opacity-50">
                        <div className="h-4 w-4 rounded-full border-2 border-muted" />
                        <span className="text-muted-foreground">{t('session.passageReader.generatingTranslit')}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm opacity-50">
                        <div className="h-4 w-4 rounded-full border-2 border-muted" />
                        <span className="text-muted-foreground">{t('session.passageReader.preparingAnalysis')}</span>
                    </div>
                </div>

                {/* Tip educativo */}
                <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 max-w-md mx-auto">
                    <div className="flex gap-3">
                        <span className="text-xl">💡</span>
                        <div className="text-sm">
                            <p className="font-medium text-primary mb-1">{t('session.passageReader.tip')}</p>
                            <p className="text-muted-foreground">{randomTip}</p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (!passage) {
        return (
            <Alert>
                <BookOpen className="h-4 w-4" />
                <AlertDescription>
                    {t('session.passageReader.errorLoading')}
                </AlertDescription>
            </Alert>
        );
    }


    // Calculate grid columns based on visibility
    const visibleCount = visibleVersions.size;
    const gridCols = visibleCount === 1 ? 'grid-cols-1' :
                     visibleCount === 2 ? 'grid-cols-1 lg:grid-cols-2' :
                     'grid-cols-1 lg:grid-cols-3';

    return (
        <div className="space-y-4 w-full">
            {/* Header & View Controls */}
            <Card className="border-none shadow-sm bg-transparent">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div>
                        <h3 className="text-xl font-bold flex items-center gap-2">
                            <BookOpen className="h-5 w-5 text-primary" />
                            {passage.reference}
                        </h3>
                    </div>

                    {/* View Options Toolbar */}
                    <div className="flex items-center gap-2 bg-background/50 backdrop-blur-sm p-1 rounded-lg border border-border/50">
                        {/* RV60 Toggle */}
                        <button
                            onClick={() => toggleVersion('rv60')}
                            className={cn(
                                "px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-2",
                                visibleVersions.has('rv60') 
                                    ? "bg-green-500/10 text-green-700 dark:text-green-400 border border-green-500/20" 
                                    : "hover:bg-muted text-muted-foreground"
                            )}
                        >
                            <div className={cn("h-1.5 w-1.5 rounded-full", visibleVersions.has('rv60') ? "bg-green-500" : "bg-muted-foreground/30")} />
                            {isEnglish ? "ASV" : "RV60"}
                        </button>

                        {/* Greek Toggle */}
                        <button
                            onClick={() => toggleVersion('greek')}
                            className={cn(
                                "px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-2",
                                visibleVersions.has('greek') 
                                    ? "bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/20" 
                                    : "hover:bg-muted text-muted-foreground"
                            )}
                        >
                            <div className={cn("h-1.5 w-1.5 rounded-full", visibleVersions.has('greek') ? "bg-blue-500" : "bg-muted-foreground/30")} />
                            {t('session.passageReader.greekOriginal')}
                        </button>

                        {/* Transliteration Toggle */}
                        <button
                            onClick={() => toggleVersion('transliteration')}
                            className={cn(
                                "px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-2",
                                visibleVersions.has('transliteration') 
                                    ? "bg-purple-500/10 text-purple-700 dark:text-purple-400 border border-purple-500/20" 
                                    : "hover:bg-muted text-muted-foreground"
                            )}
                        >
                            <div className={cn("h-1.5 w-1.5 rounded-full", visibleVersions.has('transliteration') ? "bg-purple-500" : "bg-muted-foreground/30")} />
                            {t('session.passageReader.transliteration')}
                        </button>
                    </div>
                </div>
            </Card>

            {/* Content Grid */}
            <div className={cn("grid gap-4 transition-all duration-300", gridCols)}>
                {/* RV60 Row */}
                {visibleVersions.has('rv60') && (
                    <PassageVersionRow
                        version="rv60"
                        text={passage.rv60Text}
                        highlightText={hoveredWord?.spanish}
                    />
                )}

                {/* Greek Row */}
                {visibleVersions.has('greek') && (
                    <PassageVersionRow
                        version="greek"
                        text={passage.greekText}
                        words={wordsWithStatus}
                        onWordClick={handleWordClick}
                        highlightedWordId={selectedWord?.id}
                        onWordHover={setHoveredWord}
                    />
                )}

                {/* Transliteration Row */}
                {visibleVersions.has('transliteration') && (
                    <PassageVersionRow
                        version="transliteration"
                        text={passage.transliteration}
                        highlightText={hoveredWord?.transliteration}
                    />
                )}
            </div>

            {/* Words in Units Info */}
            {currentUnits.length > 0 && (
                <Alert className="bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800">
                    <AlertDescription className="text-sm">
                        {t('session.passageReader.wordsHighlighted', { count: currentUnits.length })}
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
