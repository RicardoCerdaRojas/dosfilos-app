import React, { useRef, useState } from 'react';
import { GestureResponderEvent, View } from 'react-native';
import { Canvas, Path, Skia } from '@shopify/react-native-skia';
import type { InkColor, InkNote, InkStroke } from '@dosfilos/domain';
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
    /** Color del lápiz. */
    color: InkColor;
    /** Goma: en vez de dibujar, un toque borra la nota que se tocó. */
    eraser: boolean;
    onErase: (noteId: string) => void;
    /**
     * Alto del chrome superior. La capa arranca DEBAJO: si cubriera la barra
     * taparía su propio botón de salida y no habría cómo apagar el lápiz.
     */
    top: number;
    /** Alto del tablero inferior, por la misma razón. */
    bottom: number;
}

const STROKE_WIDTH_EM = 0.07;

/**
 * El color del lápiz sale de los tokens del modo de luz, no de literales: en
 * tinta electrónica los tres caen a negro, que es lo único que ese modo puede
 * mostrar.
 */
function inkColor(color: InkColor, tokens: ReadingModeTokens): string {
    if (tokens.highlightUnderline) return tokens.textPrimary;
    if (color === 'red') return tokens.timerOver;
    if (color === 'blue') return tokens.accent;
    return tokens.textPrimary;
}

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
    color,
    eraser,
    onErase,
    top,
    bottom,
}: Props) {
    const [draft, setDraft] = useState<{ x: number; y: number }[]>([]);
    const anchor = useRef<{ offset: number; rect: AnchorRect } | null>(null);

    const begin = (e: GestureResponderEvent) => {
        const { pageX, pageY } = e.nativeEvent;
        if (eraser) {
            const hit = noteNear(pageX, pageY);
            if (hit) onErase(hit);
            return;
        }
        anchor.current = anchorAt(pageX, pageY);
        setDraft([{ x: pageX, y: pageY }]);
    };

    /** Nota cuyo trazo pasa cerca del punto tocado, para la goma. */
    const noteNear = (x: number, y: number): string | null => {
        const RADIUS = 28;
        for (const note of notes) {
            const rect = anchorRectFor(note);
            if (!rect) continue;
            for (const stroke of note.strokes) {
                for (const point of stroke.points) {
                    const screen = toScreenSpace(point, rect, bodySize);
                    if (Math.hypot(screen.x - x, screen.y - y) < RADIUS) return note.id;
                }
            }
        }
        return null;
    };

    const extend = (e: GestureResponderEvent) => {
        if (eraser) return;
        const { pageX, pageY } = e.nativeEvent;
        setDraft((current) => [...current, { x: pageX, y: pageY }]);
    };

    const finish = () => {
        if (eraser) return;
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
            color,
        });
    };

    /**
     * El lienzo empieza DEBAJO del chrome, así que sus coordenadas están
     * corridas respecto de las de pantalla. Todo lo que se dibuja pasa por
     * acá; sin esta resta los trazos aparecerían desplazados hacia abajo.
     */
    const toCanvas = (p: { x: number; y: number }) => ({ x: p.x, y: p.y - top });

    const pathFrom = (screenPoints: { x: number; y: number }[]) => {
        const points = screenPoints.map(toCanvas);
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
            style={{ position: 'absolute', top, left: 0, right: 0, bottom }}
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
                            color={inkColor(stroke.color, tokens)}
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
                        color={inkColor(color, tokens)}
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
