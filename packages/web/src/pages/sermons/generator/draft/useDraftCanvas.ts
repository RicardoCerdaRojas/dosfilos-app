import { useState } from 'react';
import type { TFunction } from 'i18next';
import { generatorChatService } from '@dosfilos/application';
import type { CoachingStyle, GenerationRules } from '@dosfilos/domain';
import { regenerateSermonPoint } from './regenerateSermonPoint';
import type { DraftCanvasPanelProps } from './DraftCanvasPanel';
import { useDraftHistory } from './useDraftHistory';
import type { useContentHistory } from '@/hooks/useContentHistory';

export interface DraftCanvasInput {
    draft: any;
    setDraft: (draft: any) => void;
    homiletics: any;
    rules: GenerationRules;
    config: any;
    exegesis: any;
    contentHistory: ReturnType<typeof useContentHistory>;
    /** Chat del acompañante — el canvas lo limpia al cambiar de sección. */
    messages: any[];
    setMessages: (updater: any) => void;
    activeContext: any;
    onRefreshContext: () => void;
    /** Deshacer/rehacer y edición de secciones (viven en `useDraftVersions`). */
    versiones: {
        handleUndo: (sectionId: string) => void;
        handleRedo: (sectionId: string) => void;
        handleRestoreVersion: (sectionId: string, versionId: string) => void;
        handleSectionUpdate: (sectionId: string, value: any) => Promise<void>;
    };
    modifiedSections: Set<string>;
    t: TFunction;
}

/**
 * EL CANVAS Y SU ACOMPAÑANTE: estado propio y cableado, en un solo lugar.
 *
 * Qué sección está abierta, cuál chat se muestra, qué estilo de acompañamiento
 * eligió el pastor y qué historial hay que abrir son estados del CANVAS, no del
 * paso. Repartidos por el componente del paso obligaban a leer 373 líneas para
 * saber qué pasa al expandir una sección.
 *
 * AL CAMBIAR DE SECCIÓN SE LIMPIA EL CHAT. El acompañante trabaja sobre lo que
 * el pastor está mirando; arrastrar la conversación de la introducción al punto
 * 3 haría que sus respuestas hablaran de un texto que ya no está en pantalla.
 *
 * EL HISTORIAL VIVE ACÁ ADENTRO, y no al lado, porque abrir una versión anterior
 * ES un movimiento del canvas: expande la sección y limpia el chat. Tenerlo
 * afuera obligaba a pasarle los setters de este estado y a que este hook pidiera
 * el historial de vuelta — dos piezas atadas en círculo. Se expone para las dos
 * acciones que también lo necesitan: regenerar y armar.
 */
export function useDraftCanvas(input: DraftCanvasInput) {
    const [expandedSectionId, setExpandedSectionId] = useState<string | null>(null);
    const [openHistoryFor, setOpenHistoryFor] = useState<string | null>(null);
    const [selectedStyle, setSelectedStyle] = useState<CoachingStyle | 'auto'>('auto');
    const [rightPanelMode, setRightPanelMode] = useState<'chat' | 'bible'>('chat');

    const historial = useDraftHistory({
        draft: input.draft,
        contentHistory: input.contentHistory,
        setExpandedSectionId,
        setOpenHistoryFor,
        setMessages: input.setMessages,
    });

    /**
     * `onSendMessage` e `isAiLoading` NO salen de acá: los pone el paso.
     *
     * El refinador necesita saber qué sección está expandida —dato de este
     * hook— así que si además este hook lo consumiera, los dos se pedirían
     * mutuamente. La sección la sabe el canvas; el mensaje lo maneja el
     * refinador; el paso los junta al montar el panel.
     */
    const canvasProps: Omit<DraftCanvasPanelProps, 'draft' | 'onSendMessage' | 'isAiLoading'> = {
        expandedSectionId,
        onSectionExpand: (sectionId) => {
            setExpandedSectionId(sectionId);
            input.setMessages([]);
        },
        onSectionClose: () => {
            setExpandedSectionId(null);
            setOpenHistoryFor(null);
            input.setMessages([]);
        },
        modifiedSections: input.modifiedSections,
        openHistoryFor,
        onSectionOpenHistory: historial.abrirHistorial,
        onSectionUpdate: input.versiones.handleSectionUpdate,
        onSectionUndo: input.versiones.handleUndo,
        onSectionRedo: input.versiones.handleRedo,
        canRedo: historial.canRedo,
        getSectionVersions: historial.getSectionVersions,
        getCurrentVersionId: historial.getCurrentVersionId,
        onRestoreVersion: input.versiones.handleRestoreVersion,
        onRegeneratePoint: (itemIndex) =>
            regenerateSermonPoint({
                draft: input.draft,
                itemIndex,
                homiletics: input.homiletics,
                rules: input.rules,
                config: input.config,
                onBodyUpdate: input.versiones.handleSectionUpdate,
                t: input.t,
            }),
        rightPanelMode,
        onCloseBible: () => setRightPanelMode('chat'),
        biblePassage: input.exegesis?.passage,
        messages: input.messages,
        onApplyChange: (messageId, newContent) => {
            input.setDraft(newContent);
            input.setMessages((prev: any[]) =>
                prev.map((msg) => (msg.id === messageId ? { ...msg, appliedChange: true } : msg)),
            );
        },
        onContentUpdate: input.setDraft,
        selectedStyle,
        onStyleChange: (style) => {
            setSelectedStyle(style);
            generatorChatService.setCoachingStyle(style);
        },
        activeContext: input.activeContext,
        onRefreshContext: input.onRefreshContext,
    };

    return {
        canvasProps,
        historial,
        expandedSectionId,
        /** La banda alterna entre el chat y el pasaje en el panel derecho. */
        togglePassage: () => setRightPanelMode((prev) => (prev === 'bible' ? 'chat' : 'bible')),
    };
}
