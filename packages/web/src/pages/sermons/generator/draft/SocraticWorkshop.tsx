import { useCallback, useEffect, useState } from 'react';
import { RailDivider } from '@/components/ui/RailDivider';
import { useTranslation } from '@/i18n';
import type { SermonElement, WalkSection } from '@dosfilos/domain';
import { SermonMap } from './SermonMap';
import { SectionElementsPanel } from './SectionElementsPanel';

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
}

const ANCHO_MIN = 200;
const ANCHO_MAX = 480;
const ANCHO_INICIAL = 288;
/** El ancho del mapa es preferencia de escritorio, no dato del sermón. */
const CLAVE_ANCHO = 'dosfilos.socraticMapWidth';

function anchoGuardado(): number {
    const crudo = Number(localStorage.getItem(CLAVE_ANCHO));
    if (!Number.isFinite(crudo) || crudo <= 0) return ANCHO_INICIAL;
    return Math.min(ANCHO_MAX, Math.max(ANCHO_MIN, crudo));
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

    // Se lee después del primer render: en SSR/pruebas `localStorage` no existe,
    // y leerlo durante el render haría que el servidor y el cliente difieran.
    useEffect(() => setAncho(anchoGuardado()), []);

    const redimensionar = useCallback((deltaPx: number) => {
        setAncho((previo) => {
            const siguiente = Math.min(ANCHO_MAX, Math.max(ANCHO_MIN, previo + deltaPx));
            localStorage.setItem(CLAVE_ANCHO, String(siguiente));
            return siguiente;
        });
    }, []);

    return (
        <div className="flex items-stretch gap-0 h-full min-h-[24rem]">
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

            <div className="flex-1 min-w-0 pl-1">
                <SectionElementsPanel
                    section={props.activeSection}
                    passage={props.passage}
                    proposition={props.proposition}
                    points={props.points}
                    elements={props.elements[props.activeSection.id] ?? []}
                    onChange={(els) => props.onChangeElements(props.activeSection.id, els)}
                    prose={props.prose[props.activeSection.id]}
                    onProseChange={(texto) => props.onChangeProse(props.activeSection.id, texto)}
                    audienceRigor={props.audienceRigor}
                />
            </div>
        </div>
    );
}
