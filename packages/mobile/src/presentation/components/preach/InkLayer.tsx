import React, { useRef, useState } from 'react';
import { GestureResponderEvent, View } from 'react-native';
import { Canvas, Path, Skia } from '@shopify/react-native-skia';
import type { InkNote, InkStroke } from '@dosfilos/domain';
import { toNoteSpace, toScreenSpace } from '@dosfilos/domain';

import { ReadingModeTokens } from '@/core/theme/readingModes';

/** Dónde está en pantalla la palabra a la que se ancla una nota. */
export interface AnchorRect {
    x: number;
    y: number;
    height: number;
}

interface Props {
    tokens: ReadingModeTokens;
    /** Notas de ESTA sección, ya filtradas. */
    notes: InkNote[];
    /** Resuelve la posición actual del ancla de una nota. `null` = no está en
     *  esta página, así que no se dibuja. */
    anchorRectFor: (note: InkNote) => AnchorRect | null;
    /** Cuerpo actual: las coordenadas de la nota están en estas unidades. */
    bodySize: number;
    /** `true` mientras el lápiz está activo: sólo entonces la capa toma toques. */
    penActive: boolean;
    /** Devuelve el ancla para un trazo que empezó en este punto de pantalla. */
    anchorAt: (screenX: number, screenY: number) => { offset: number; rect: AnchorRect } | null;
    onFinishStroke: (offset: number, stroke: InkStroke) => void;
}

const STROKE_WIDTH_EM = 0.07;

/**
 * La capa de tinta: lo que el predicador escribe a mano, encima del sermón.
 *
 * NO GUARDA COORDENADAS DE PANTALLA. Cada trazo se ancla a la palabra sobre
 * la que empezó y se guarda en unidades del cuerpo, relativas a esa palabra.
 * Al dibujar se pregunta dónde está esa palabra AHORA. Por eso la nota sigue
 * a su pasaje cuando se cambia el tamaño de letra, se prende la colometría o
 * se edita el sermón — y por eso margen y sobre-el-texto no son dos sistemas
 * distintos, sino dos lugares donde caen los trazos del mismo mecanismo.
 *
 * `pointerEvents` sigue al lápiz: apagado, la capa es transparente al tacto y
 * el pastor pasa página, selecciona y toca citas como siempre. Predicar no
 * puede quedar detrás de una capa de dibujo.
 */
export function InkLayer({
    tokens,
    notes,
    anchorRectFor,
    bodySize,
    penActive,
    anchorAt,
    onFinishStroke,
}: Props) {
    const [draft, setDraft] = useState<{ x: number; y: number }[]>([]);
    const anchor = useRef<{ offset: number; rect: AnchorRect } | null>(null);

    const begin = (e: GestureResponderEvent) => {
        const { pageX, pageY } = e.nativeEvent;
        anchor.current = anchorAt(pageX, pageY);
        setDraft([{ x: pageX, y: pageY }]);
    };

    const extend = (e: GestureResponderEvent) => {
        const { pageX, pageY } = e.nativeEvent;
        setDraft((current) => [...current, { x: pageX, y: pageY }]);
    };

    const finish = () => {
        const held = anchor.current;
        const points = draft;
        anchor.current = null;
        setDraft([]);
        // Un trazo sin ancla no se guarda: preferimos perder un garabato
        // suelto antes que guardar tinta que no sabe a qué se refiere.
        if (!held || points.length < 2) return;
        onFinishStroke(held.offset, {
            points: points.map((p) => toNoteSpace(p, held.rect, bodySize)),
            width: STROKE_WIDTH_EM,
            color: 'ink',
        });
    };

    const pathFrom = (points: { x: number; y: number }[]) => {
        const path = Skia.Path.Make();
        if (!points.length) return path;
        path.moveTo(points[0].x, points[0].y);
        // Curvas cuadráticas entre puntos medios: el trazo sale suave sin
        // tener que muestrear más rápido de lo que el responder entrega.
        for (let i = 1; i < points.length - 1; i += 1) {
            const mid = {
                x: (points[i].x + points[i + 1].x) / 2,
                y: (points[i].y + points[i + 1].y) / 2,
            };
            path.quadTo(points[i].x, points[i].y, mid.x, mid.y);
        }
        const last = points[points.length - 1];
        path.lineTo(last.x, last.y);
        return path;
    };

    return (
        <View
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
            pointerEvents={penActive ? 'auto' : 'none'}
            onStartShouldSetResponder={() => penActive}
            onMoveShouldSetResponder={() => penActive}
            onResponderGrant={begin}
            onResponderMove={extend}
            onResponderRelease={finish}
            onResponderTerminate={finish}
        >
            <Canvas style={{ flex: 1 }} pointerEvents="none">
                {notes.map((note) => {
                    const rect = anchorRectFor(note);
                    if (!rect) return null;
                    return note.strokes.map((stroke, index) => (
                        <Path
                            key={`${note.id}-${index}`}
                            path={pathFrom(
                                stroke.points.map((p) => toScreenSpace(p, rect, bodySize)),
                            )}
                            color={tokens.textPrimary}
                            style="stroke"
                            strokeWidth={stroke.width * bodySize}
                            strokeCap="round"
                            strokeJoin="round"
                        />
                    ));
                })}

                {draft.length > 1 ? (
                    <Path
                        path={pathFrom(draft)}
                        color={tokens.textPrimary}
                        style="stroke"
                        strokeWidth={STROKE_WIDTH_EM * bodySize}
                        strokeCap="round"
                        strokeJoin="round"
                    />
                ) : null}
            </Canvas>
        </View>
    );
}
