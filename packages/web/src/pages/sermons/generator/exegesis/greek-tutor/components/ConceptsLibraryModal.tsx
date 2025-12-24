import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, BookOpen } from 'lucide-react';
import { GREEK_CAPSULES } from '../constants/greekCapsules';
import { EducationalCapsule } from './EducationalCapsule';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ConceptsLibraryModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

/**
 * Modal for browsing the library of Greek key concepts
 */
export const ConceptsLibraryModal: React.FC<ConceptsLibraryModalProps> = ({
    open,
    onOpenChange
}) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    
    const currentCapsule = GREEK_CAPSULES[currentIndex];
    const canGoPrev = currentIndex > 0;
    const canGoNext = currentIndex < GREEK_CAPSULES.length - 1;
    
    const handlePrev = () => {
        if (canGoPrev) {
            setCurrentIndex(prev => prev - 1);
        }
    };
    
    const handleNext = () => {
        if (canGoNext) {
            setCurrentIndex(prev => prev + 1);
        }
    };
    
    const handleJumpTo = (index: number) => {
        setCurrentIndex(index);
    };
    
    // Reset to first concept when opening
    const handleOpenChange = (newOpen: boolean) => {
        if (newOpen) {
            setCurrentIndex(0);
        }
        onOpenChange(newOpen);
    };
    
    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent 
                className="!max-w-[90vw] h-[90vh] p-0 gap-0 w-full flex flex-col items-start"
                style={{ maxWidth: '1400px' }}
            >
                {/* Header */}
                <DialogHeader className="px-8 py-6 border-b">
                    <div className="flex items-center justify-between gap-6">
                        <div className="flex items-center gap-4">
                            <div className="p-2.5 rounded-lg bg-primary/10">
                                <BookOpen className="h-6 w-6 text-primary" />
                            </div>
                            <div>
                                <DialogTitle className="text-xl">Biblioteca de Conceptos Clave</DialogTitle>
                                <p className="text-sm text-muted-foreground mt-1">
                                    {currentIndex + 1} de {GREEK_CAPSULES.length}
                                </p>
                            </div>
                        </div>
                        
                        {/* Navigation Controls */}
                        <div className="flex items-center gap-3">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={handlePrev}
                                disabled={!canGoPrev}
                                className="h-9 w-9 p-0"
                            >
                                <ChevronLeft className="h-5 w-5" />
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleNext}
                                disabled={!canGoNext}
                                className="h-9 w-9 p-0"
                            >
                                <ChevronRight className="h-5 w-5" />
                            </Button>
                        </div>
                    </div>
                </DialogHeader>
                
                {/* Content Area */}
                <div className="flex-1 flex overflow-hidden">
                    {/* Sidebar - Desktop only */}
                    <div className="hidden md:flex md:w-64 border-r flex-col">
                        <ScrollArea className="flex-1">
                            <div className="p-4 space-y-1">
                                {GREEK_CAPSULES.map((capsule, index) => (
                                    <button
                                        key={capsule.id}
                                        onClick={() => handleJumpTo(index)}
                                        className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                                            index === currentIndex
                                                ? 'bg-primary text-primary-foreground font-medium'
                                                : 'hover:bg-muted text-foreground/80'
                                        }`}
                                    >
                                        <span className="text-xs opacity-60">{index + 1}.</span> {capsule.title}
                                    </button>
                                ))}
                            </div>
                        </ScrollArea>
                    </div>
                    
                    {/* Main Content */}
                    <ScrollArea className="flex-1">
                        <div className="p-6 md:p-8">
                            {currentCapsule && (
                                <EducationalCapsule
                                    capsule={currentCapsule}
                                    onRefresh={canGoNext ? handleNext : undefined}
                                />
                            )}
                        </div>
                    </ScrollArea>
                </div>
                
                {/* Mobile Navigation - Bottom */}
                <div className="md:hidden border-t p-4">
                    <div className="flex items-center justify-between gap-4">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handlePrev}
                            disabled={!canGoPrev}
                            className="flex-1"
                        >
                            <ChevronLeft className="h-4 w-4 mr-1" />
                            Anterior
                        </Button>
                        <div className="text-xs text-muted-foreground whitespace-nowrap">
                            {currentIndex + 1}/{GREEK_CAPSULES.length}
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleNext}
                            disabled={!canGoNext}
                            className="flex-1"
                        >
                            Siguiente
                            <ChevronRight className="h-4 w-4 ml-1" />
                        </Button>
                    </div>
                    
                    {/* Concept selector for mobile */}
                    <details className="mt-3">
                        <summary className="text-xs text-primary cursor-pointer hover:underline">
                            Ir a otro concepto...
                        </summary>
                        <div className="mt-2 space-y-1 max-h-40 overflow-y-auto">
                            {GREEK_CAPSULES.map((capsule, index) => (
                                <button
                                    key={capsule.id}
                                    onClick={() => handleJumpTo(index)}
                                    className={`w-full text-left px-3 py-2 rounded text-xs transition-colors ${
                                        index === currentIndex
                                            ? 'bg-primary text-primary-foreground'
                                            : 'hover:bg-muted'
                                    }`}
                                >
                                    {index + 1}. {capsule.title}
                                </button>
                            ))}
                        </div>
                    </details>
                </div>
            </DialogContent>
        </Dialog>
    );
};
