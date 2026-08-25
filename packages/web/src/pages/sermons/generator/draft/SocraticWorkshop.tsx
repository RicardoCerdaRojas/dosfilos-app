import { useCallback, useEffect, useState } from 'react';
import { RailDivider } from '@/components/ui/RailDivider';
import { useTranslation } from '@/i18n';
import type { HomileticalAnalysis, SermonContent, SermonElement, WalkSection } from '@dosfilos/domain';
import { SermonMap } from './SermonMap';
import { SectionElementsPanel } from './SectionElementsPanel';
import { SectionProsePanel } from './SectionProsePanel';
import { WorkshopDraftActions } from './WorkshopDraftActions';

interface Props {
    walk: readonly WalkSection[];
    activeSection: WalkSection;
    elements: Record<string, SermonElement[]>;
    onSelectSection: (sectionId: string) => void;
    onChangeElements: (sectionId: string, elements: SermonElement[]) => void;
    prose: Record<string, string>;
    onChangeProse: (sectionId: string, prose: string) => void;
    audienceRigor?: 'beginner' | 'seminary';
    passage: string;
    proposition?: string;
    points?: readonly string[];
    /** Bosquejo, para armar el borrador con los títulos y aplicaciones reales. */
    outlinePoints: readonly { title?: string; application?: string; scriptureReferences?: string[] }[];
    onAssemble: (draft: SermonContent) => void | Promise<void>;
    hasDraft?: boolean;
    /** Título del sermón, para el encabezado. */
    sermonTitle?: string;
    homiletics: HomileticalAnalysis;
}

const ANCHO_MIN = 200;
const PROSA_MIN = 320;
const PROSA_MAX = 720;
const PROSA_INICIAL = 460;
const CLAVE_PROSA = 'dosfilos.socraticProseWidth';
const ANCHO_MAX = 480;
const ANCHO_INICIAL = 288;
/** El ancho del mapa es preferencia de escritorio, no dato del sermón. */
const CLAVE_ANCHO = 'dosfilos.socraticMapWidth';

function anchoGuardado(clave: string, inicial: number, min: number, max: number): number {
    const crudo = Number(localStorage.getItem(clave));
    if (!Number.isFinite(crudo) || crudo <= 0) return inicial;
    return Math.min(max, Math.max(min, crudo));
}

/**
 * El taller socrático completo: mapa a la izquierda, sección activa a la derecha.
 *
 * EL MAPA SE REDIMENSIONA Y SE PLIEGA con el mismo `RailDivider` de Faculty —
 * no un control nuevo. Los títulos de los puntos son frases largas ("I. Dios
 * habla y revela su voluntad (vv. 1-2)"), así que un ancho fijo los parte en
 * tres líneas y el mapa deja de leerse de un vistazo, que es su único trabajo.
 *
 * El ancho se guarda en `localStorage` y no en el sermón: es una preferencia del
 * escritorio de quien trabaja, no un dato del sermón. Guardarlo en el documento
 * lo haría viajar entre pantallas de distinto tamaño, y ahí el valor correcto
 * en una es el equivocado en la otra.
 */
export function SocraticWorkshop(props: Props) {
    const { t } = useTranslation('generator');
    const [abierto, setAbierto] = useState(true);
    const [ancho, setAncho] = useState(ANCHO_INICIAL);
    const [prosaAbierta, setProsaAbierta] = useState(true);
    const [anchoProsa, setAnchoProsa] = useState(PROSA_INICIAL);

    // Se lee después del primer render: en SSR/pruebas `localStorage` no existe,
    // y leerlo durante el render haría que el servidor y el cliente difieran.
    useEffect(() => {
        setAncho(anchoGuardado(CLAVE_ANCHO, ANCHO_INICIAL, ANCHO_MIN, ANCHO_MAX));
        setAnchoProsa(anchoGuardado(CLAVE_PROSA, PROSA_INICIAL, PROSA_MIN, PROSA_MAX));
    }, []);

    const redimensionar = useCallback((deltaPx: number) => {
        setAncho((previo) => {
            const siguiente = Math.min(ANCHO_MAX, Math.max(ANCHO_MIN, previo + deltaPx));
            localStorage.setItem(CLAVE_ANCHO, String(siguiente));
            return siguiente;
        });
    }, []);

    const redimensionarProsa = useCallback((deltaPx: number) => {
        setAnchoProsa((previo) => {
            const siguiente = Math.min(PROSA_MAX, Math.max(PROSA_MIN, previo + deltaPx));
            localStorage.setItem(CLAVE_PROSA, String(siguiente));
            return siguiente;
        });
    }, []);

    /**
     * La proposición YA DECIDIDA del punto al que pertenece la sección activa.
     *
     * La sección de exposición vive en `point.N.exposition` y la frase en
     * `point.N.proposition`: se busca por el `parentId`, así que basta con que
     * él la haya decidido para que la redacción la use. Si todavía no la
     * escribió, no viaja — y el prompt NO la inventa.
     */
    const proposicionDelPunto = props.activeSection.parentId
        ? (props.elements[`${props.activeSection.parentId}.proposition`] ?? [])
              .filter((e) => e.provenance !== 'descartado')
              .map((e) => e.text)
              .join(' ')
              .trim() || undefined
        : undefined;

    const listas = props.walk.filter(
        (s) =>
            s.status === 'cubierta' ||
            (props.elements[s.id] ?? []).some((e) => e.provenance !== 'descartado'),
    ).length;

    return (
        <div className="flex flex-col h-full min-h-[24rem]">
        {/* MISMO PATRÓN QUE LA PESTAÑA BORRADOR: título a la izquierda,
            acciones a la derecha, contenido debajo. El botón de armar vivía al
            pie y se sentía fuera de lugar en cualquier posición que probara —
            la razón era que el taller no seguía el patrón que el resto de la
            app ya establece, no dónde estaba puesto exactamente.

            Mismas clases que el encabezado del borrador: `min-w-0` + `truncate`
            en el título y `shrink-0` en las acciones, porque agregar cualquier
            cosa a esa fila partía el encabezado en dos líneas. */}
        <div className="mb-4 flex-shrink-0 flex items-center justify-between gap-3">
            <div className="min-w-0">
                <h3 className="text-lg font-semibold truncate" title={props.sermonTitle}>
                    {props.sermonTitle || t('drafting.sections.mapTitle')}
                </h3>
                <p className="text-sm text-muted-foreground">
                    {t('drafting.sections.pendingCount', { done: listas, total: props.walk.length })}
                </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
                <WorkshopDraftActions
                    walk={props.walk}
                    elements={props.elements}
                    prose={props.prose}
                    points={props.outlinePoints}
                    proposition={props.proposition}
                    audienceRigor={props.audienceRigor}
                    onProseChange={props.onChangeProse}
                    onAssemble={props.onAssemble}
                    hasDraft={props.hasDraft}
                    homiletics={props.homiletics}
                />
            </div>
        </div>

        <div className="flex items-stretch gap-0 flex-1 min-h-0">
            {abierto && (
                <div style={{ width: ancho }} className="shrink-0 overflow-hidden">
                    <SermonMap
                        walk={props.walk}
                        elements={props.elements}
                        activeId={props.activeSection.id}
                        onSelect={props.onSelectSection}
                    />
                </div>
            )}

            <RailDivider
                side="left"
                isOpen={abierto}
                onToggle={() => setAbierto((v) => !v)}
                // Arrastrar con el riel plegado no tiene sentido: no hay nada
                // que ensanchar hasta que se abra.
                onResize={abierto ? redimensionar : undefined}
                title={t('drafting.sections.mapTitle')}
            />

            {/* COLUMNA DE TRABAJO: contenido acotado arriba, acciones al pie.
                Las acciones vivían en una barra propia bajo TODO el taller, y
                quedaban en una franja vacía compitiendo con la del paso. Acá
                pertenecen a la columna que el pastor está usando. */}
            <div className="flex-1 min-w-0 pl-1 flex flex-col">
              <div className="flex-1 overflow-y-auto">
                {/* MEDIDA DE LECTURA, ALINEADA A LA IZQUIERDA.
                    A todo el ancho las líneas pasaban de 200 caracteres y el ojo
                    pierde el renglón al volver. Pero CENTRAR el bloque fue peor:
                    el contenido se despegó del mapa y quedó flotando con un
                    vacío enorme a su izquierda. La medida se acota pegando el
                    texto al borde donde empieza la columna, no al medio. */}
                <div className="w-full max-w-3xl">
                <SectionElementsPanel
                    section={props.activeSection}
                    passage={props.passage}
                    proposition={props.proposition}
                    points={props.points}
                    elements={props.elements[props.activeSection.id] ?? []}
                    onChange={(els) => props.onChangeElements(props.activeSection.id, els)}
                    // No se le pasa a la sección que ES la proposición: se
                    // estaría mostrando a sí misma como insumo.
                    pointProposition={
                        props.activeSection.id.endsWith('.proposition') ? undefined : proposicionDelPunto
                    }
                />
                </div>
              </div>

            </div>

            {/* El riel de prosa NO existe en las secciones `verbatim`: lo que el
                pastor escribió allí YA es el texto final, y abrir un editor
                vacío al lado sugeriría que falta redactarlo. */}
            {/* También en las secciones `cubierta`: la decisión está tomada,
                pero sus notas del bosquejo siguen necesitando redacción. */}
            {props.activeSection.mode === 'elements' && (
                <>
                    <RailDivider
                        side="right"
                        isOpen={prosaAbierta}
                        onToggle={() => setProsaAbierta((v) => !v)}
                        onResize={prosaAbierta ? redimensionarProsa : undefined}
                        title={t('drafting.prose.label')}
                    />
                    {prosaAbierta && (
                        <div style={{ width: anchoProsa }} className="shrink-0 overflow-hidden">
                            <SectionProsePanel
                                section={props.activeSection}
                                elements={props.elements[props.activeSection.id] ?? []}
                                prose={props.prose[props.activeSection.id]}
                                onProseChange={(texto) => props.onChangeProse(props.activeSection.id, texto)}
                                passage={props.passage}
                                proposition={props.proposition}
                                pointProposition={proposicionDelPunto}
                                audienceRigor={props.audienceRigor}
                            />
                        </div>
                    )}
                </>
            )}
        </div>
        </div>
    );
}
