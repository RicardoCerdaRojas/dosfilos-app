import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { PassageWord, UnitPreview } from '@dosfilos/domain';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

interface WordPreviewModalProps {
    word: PassageWord | null;
    preview: UnitPreview | null;
    isLoading: boolean;
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    isConfirming?: boolean;
}

/**
 * Modal that shows a preview of the training unit before adding it
 */
export const WordPreviewModal: React.FC<WordPreviewModalProps> = ({
    word,
    preview,
    isLoading,
    isOpen,
    onClose,
    onConfirm,
    isConfirming = false
}) => {
    if (!word) return null;

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Agregar palabra a las unidades</DialogTitle>
                    <DialogDescription>
                        Vista previa de la unidad de estudio para <span className="font-mono font-semibold text-primary">{word.greek}</span>
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    {/* Word Info Card */}
                    <Card>
                        <CardContent className="pt-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-sm text-muted-foreground">Palabra griega</p>
                                    <p className="font-mono text-lg font-semibold">{word.greek}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">Transliteración</p>
                                    <p className="font-mono text-lg">{word.transliteration}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Preview Content */}
                    {isLoading && (
                        <div className="flex items-center justify-center py-8">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            <span className="ml-3 text-muted-foreground">Identificando palabra...</span>
                        </div>
                    )}

                    {!isLoading && preview && (
                        <Card>
                            <CardContent className="pt-6 space-y-4">
                                {/* Identification */}
                                <div>
                                    <div className="flex items-center gap-2 mb-2">
                                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                                        <p className="text-sm font-semibold">Identificación Gramatical</p>
                                    </div>
                                    <p className="text-sm bg-muted p-3 rounded-md">{preview.identification}</p>
                                </div>

                                {/* Greek Form Details */}
                                <div>
                                    <p className="text-sm font-semibold mb-2">Detalles del Formulario</p>
                                    <div className="grid grid-cols-2 gap-3 text-sm">
                                        <div>
                                            <span className="text-muted-foreground">Lema:</span>
                                            <span className="ml-2 font-mono">{preview.greekForm.lemma}</span>
                                        </div>
                                        <div>
                                            <span className="text-muted-foreground">Categoría:</span>
                                            <span className="ml-2">{preview.greekForm.grammaticalCategory}</span>
                                        </div>
                                        <div className="col-span-2">
                                            <span className="text-muted-foreground">Glosa:</span>
                                            <span className="ml-2">{preview.greekForm.gloss}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Recognition Guidance (if available) */}
                                {preview.recognitionGuidance && (
                                    <div>
                                        <p className="text-sm font-semibold mb-2">Guía de Reconocimiento</p>
                                        <p className="text-sm text-muted-foreground italic bg-blue-50 dark:bg-blue-950/20 p-3 rounded-md">
                                            {preview.recognitionGuidance}
                                        </p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    )}

                    {!isLoading && !preview && (
                        <div className="flex items-center justify-center py-8 text-destructive">
                            <AlertCircle className="h-8 w-8" />
                            <span className="ml-3">Error al identificar la palabra. Por favor intenta de nuevo.</span>
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={isConfirming}>
                        Cancelar
                    </Button>
                    <Button 
                        onClick={onConfirm} 
                        disabled={isLoading || !preview || isConfirming}
                    >
                        {isConfirming && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Agregar Unidad
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
