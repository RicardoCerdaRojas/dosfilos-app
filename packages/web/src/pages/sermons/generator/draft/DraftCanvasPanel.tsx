import { ContentCanvas } from '@/components/canvas-chat/ContentCanvas';
import { ChatInterface } from '@/components/canvas-chat/ChatInterface';
import { ResizableChatPanel } from '@/components/canvas-chat/ResizableChatPanel';
import { BibleReaderPanel } from '@/components/bible/BibleReaderPanel';
import { PanelGroup } from '@/components/ui/PanelGroup';
import { IllustrationDuplicateBanner } from '../IllustrationDuplicateBanner';
import type { CoachingStyle } from '@dosfilos/domain';

export interface DraftCanvasPanelProps {
    draft: any;
    /** Estado del canvas: qué sección está abierta y cuáles se tocaron. */
    expandedSectionId: string | null;
    onSectionExpand: (sectionId: string) => void;
    onSectionClose: () => void;
    modifiedSections: Set<string>;
    openHistoryFor: string | null;
    onSectionOpenHistory: (sectionId: string) => void;
    onSectionUpdate: (sectionId: string, value: any) => Promise<void>;
    onSectionUndo: (sectionId: string) => void;
    onSectionRedo: (sectionId: string) => void;
    canRedo: (sectionId: string) => boolean;
    getSectionVersions: (sectionId: string) => any;
    getCurrentVersionId: (sectionId: string) => string | undefined;
    onRestoreVersion: (sectionId: string, versionId: string) => void;
    onRegeneratePoint: (itemIndex: number) => Promise<void>;
    /** Panel derecho: el chat, o la Biblia cuando se abre el pasaje. */
    rightPanelMode: 'chat' | 'bible';
    onCloseBible: () => void;
    biblePassage: string | undefined;
    messages: any[];
    onSendMessage: (message: string) => void;
    onApplyChange: (messageId: string, newContent: any) => void;
    onContentUpdate: (newContent: any) => void;
    isAiLoading: boolean;
    selectedStyle: CoachingStyle | 'auto';
    onStyleChange: (style: CoachingStyle | 'auto') => void;
    activeContext: any;
    onRefreshContext: () => void;
}

/**
 * El borrador y su acompañante, lado a lado.
 *
 * UN MARCO, PANELES PEGADOS, LA LÍNEA ES EL BORDE COMPARTIDO — el patrón de VS
 * Code. Con tarjetas sueltas y `gap-4` el divisor flotaba en el vacío y nunca se
 * veía centrado: no era un problema de centrado sino de que no había un marco
 * al que pertenecer.
 */
export function DraftCanvasPanel(props: DraftCanvasPanelProps) {
    return (
        <>
            <IllustrationDuplicateBanner draft={props.draft} />
            <PanelGroup>
                <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
                    <div className="flex-1 min-h-0">
                        <ContentCanvas
                            content={props.draft}
                            contentType="sermon"
                            expandedSectionId={props.expandedSectionId}
                            onSectionExpand={props.onSectionExpand}
                            onSectionClose={props.onSectionClose}
                            onSectionUndo={props.onSectionUndo}
                            onSectionRedo={props.onSectionRedo}
                            canRedo={props.canRedo}
                            getSectionVersions={props.getSectionVersions}
                            getCurrentVersionId={props.getCurrentVersionId}
                            onRestoreVersion={props.onRestoreVersion}
                            modifiedSections={props.modifiedSections}
                            openHistoryFor={props.openHistoryFor}
                            onSectionOpenHistory={props.onSectionOpenHistory}
                            onSectionUpdate={props.onSectionUpdate}
                            onRegenerate={async (sectionId, itemIndex) => {
                                // Sólo los puntos del cuerpo se rehacen de a uno.
                                if (sectionId === 'body' && typeof itemIndex === 'number') {
                                    await props.onRegeneratePoint(itemIndex);
                                }
                            }}
                        />
                    </div>
                </div>

                <ResizableChatPanel storageKey="draftChatWidth">
                    {props.rightPanelMode === 'bible' && props.biblePassage ? (
                        <BibleReaderPanel passage={props.biblePassage} onClose={props.onCloseBible} />
                    ) : (
                        <ChatInterface
                            messages={props.messages}
                            contentType="sermon"
                            content={props.draft}
                            selectedText=""
                            onSendMessage={props.onSendMessage}
                            onApplyChange={props.onApplyChange}
                            onContentUpdate={props.onContentUpdate}
                            focusedSection={props.expandedSectionId}
                            disableDefaultAI={true}
                            externalIsLoading={props.isAiLoading}
                            showStyleSelector={true}
                            selectedStyle={props.selectedStyle}
                            onStyleChange={props.onStyleChange}
                            activeContext={props.activeContext}
                            onRefreshContext={props.onRefreshContext}
                            frameless
                            onSyncDocuments={() => Promise.resolve()}
                            isSyncingDocuments={false}
                        />
                    )}
                </ResizableChatPanel>
            </PanelGroup>
        </>
    );
}
