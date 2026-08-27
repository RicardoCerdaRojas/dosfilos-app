import { Tabs, TabsContent } from '@/components/ui/tabs';

export interface DraftWorkspaceProps {
    activeTab: 'draft' | 'workshop';
    onTabChange: (tab: 'draft' | 'workshop') => void;
    /** La banda del paso. Va DENTRO de `Tabs`: lleva el `TabsList`. */
    header: React.ReactNode;
    draftBody: React.ReactNode;
    /** El taller. Ausente con el flag apagado: entonces no hay pestañas. */
    workshop: React.ReactNode;
}

/**
 * Las dos pantallas del paso, y la decisión de si hay pestañas.
 *
 * PESTAÑAS Y NO UN PANEL ENCIMA. Con el taller abierto sobre el borrador los dos
 * competían por la misma altura y ninguno se leía entero. Son dos modos de
 * trabajo —decidir ideas versus revisar prosa— y ninguno necesita ver al otro a
 * la vez.
 *
 * NINGUNA CLASE DE `display` EN `TabsContent`. Radix oculta el panel inactivo
 * con el atributo `hidden`, que el navegador implementa como `display:none` — y
 * cualquier clase de autor (`flex`, `block`) la pisa. Con `flex` acá, el panel
 * oculto seguía ocupando su `flex-1` y los dos se repartían la altura: el taller
 * quedaba empujado al fondo con un hueco enorme arriba. El layout va en un div
 * INTERIOR.
 */
export function DraftWorkspace(props: DraftWorkspaceProps) {
    return (
        <div className="h-full flex flex-col gap-4 overflow-hidden p-4">
            {props.workshop ? (
                <Tabs
                    value={props.activeTab}
                    onValueChange={(v) => props.onTabChange(v as 'draft' | 'workshop')}
                    className="flex-1 min-h-0 flex flex-col gap-4"
                >
                    {props.header}
                    <TabsContent value="draft" className="flex-1 min-h-0">
                        <div className="h-full flex flex-col gap-4">{props.draftBody}</div>
                    </TabsContent>
                    <TabsContent value="workshop" className="flex-1 min-h-0">
                        <div className="h-full overflow-y-auto">{props.workshop}</div>
                    </TabsContent>
                </Tabs>
            ) : (
                <>
                    {props.header}
                    {props.draftBody}
                </>
            )}
        </div>
    );
}
