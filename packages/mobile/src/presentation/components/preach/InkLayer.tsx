import React, { useRef } from 'react';
import { GestureResponderEvent, View } from 'react-native';
import { Canvas, Path, Skia, type SkPath } from '@shopify/react-native-skia';
import { useSharedValue } from 'react-native-reanimated';
import type { InkColor, InkNote, InkStroke } from '@dosfilos/domain';
import { toNoteSpace, toScreenSpace } from '@dosfilos/domain';

import { ReadingModeTokens } from '@/core/theme/readingModes';

/** Dónde está en pantalla el párrafo al que se ancla una nota. */
export interface AnchorRect {
    x: number;
    y: number;
    height: number;
}

interface Props {
    tokens: ReadingModeTokens;
    notes: InkNote[];
    anchorRectFor: (note: InkNote) => AnchorRect | null;
    bodySize: number;
    penActive: boolean;
    /** Párrafo más cercano al punto donde empezó el trazo. */
    anchorAt: (screenX: number, screenY: number) => { offset: number; rect: AnchorRect } | null;
    onFinishStroke: (offset: number, stroke: InkStroke) => void;
    color: InkColor;
    eraser: boolean;
    onErase: (noteId: string) => void;
    /** Alto del chrome superior: la capa arranca debajo para no taparlo. */
    top: number;
    /** Alto del tablero inferior, por la misma razón. */
    bottom: number;
}

const STROKE_WIDTH_EM = 0.07;
/** Puntos más juntos que esto son ruido del dedo, no intención. */
const MIN_POINT_DISTANCE = 1.5;

function inkColor(color: InkColor, tokens: ReadingModeTokens): string {
    if (tokens.highlightUnderline) return tokens.textPrimary;
    if (color === 'red') return tokens.timerOver;
    if (color === 'blue') return tokens.accent;
    return tokens.textPrimary;
}

/**
 * Construye el trazo con curvas cuadráticas entre puntos medios.
 *
 * Unir los puntos con rectas produce el trazo "robótico": se ven los
 * segmentos. Curvar entre los puntos medios, usando el punto capturado como
 * control, da una curva continua que atraviesa la mano del que escribe en vez
 * de perseguirla.
 */
function buildPath(points: { x: number; y: number }[]): SkPath {
    const path = Skia.Path.Make();
    if (!points.length) return path;
    path.moveTo(points[0].x, points[0].y);
    if (points.length === 1) return path;
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
}

/**
 * La capa de tinta.
 *
 * ANCLADA AL PÁRRAFO. Cada nota se ata al bloque sobre el que se empezó a
 * escribir, y sus puntos se guardan relativos a ese bloque en unidades del
 * cuerpo. Al dibujar se pregunta dónde está ese párrafo AHORA: la nota lo
 * sigue cuando cambia el cuerpo, la sangría, la colometría o la reserva del
 * tercio inferior.
 *
 * Antes se anclaba a la PALABRA. Era más preciso y demasiado frágil: cientos
 * de posiciones por página que sólo se actualizaban si `onLayout` volvía a
 * dispararse, cosa que RN no hace si la vista no se movió. Apagar el tablero
 * dejaba quietas a las palabras de arriba, nadie re-reportaba, y la tinta se
 * quedaba sin dónde dibujarse. Un párrafo es igual de significativo como
 * referencia y son unos pocos por página.
 *
 * EL TRAZO NO PASA POR REACT. Los puntos van a un valor compartido que Skia
 * dibuja directo. Meterlos en el estado provocaba un render por punto: lento,
 * con muestras perdidas, y de ahí los segmentos rectos.
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
    const livePath = useSharedValue<SkPath>(Skia.Path.Make());
    const points = useRef<{ x: number; y: number }[]>([]);
    const anchor = useRef<{ offset: number; rect: AnchorRect } | null>(null);

    // El lienzo empieza debajo del chrome: sus coordenadas están corridas
    // respecto de las de pantalla.
    const toCanvas = (p: { x: number; y: number }) => ({ x: p.x, y: p.y - top });

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

    const begin = (e: GestureResponderEvent) => {
        const { pageX, pageY } = e.nativeEvent;
        if (eraser) {
            const hit = noteNear(pageX, pageY);
            if (hit) onErase(hit);
            return;
        }
        anchor.current = anchorAt(pageX, pageY);
        points.current = [{ x: pageX, y: pageY }];
        livePath.value = buildPath(points.current.map(toCanvas));
    };

    const extend = (e: GestureResponderEvent) => {
        if (eraser || !anchor.current) return;
        const { pageX, pageY } = e.nativeEvent;
        const last = points.current[points.current.length - 1];
        if (last && Math.hypot(pageX - last.x, pageY - last.y) < MIN_POINT_DISTANCE) return;
        points.current.push({ x: pageX, y: pageY });
        // Asignar el valor compartido redibuja en Skia sin re-renderizar React.
        livePath.value = buildPath(points.current.map(toCanvas));
    };

    const finish = () => {
        if (eraser) return;
        const held = anchor.current;
        const captured = points.current;
        anchor.current = null;
        points.current = [];
        livePath.value = Skia.Path.Make();
        // Un trazo sin ancla no se guarda: mejor perder un garabato suelto que
        // guardar tinta que no sabe a qué se refiere.
        if (!held || captured.length < 2) return;
        onFinishStroke(held.offset, {
            points: captured.map((p) => toNoteSpace(p, held.rect, bodySize)),
            width: STROKE_WIDTH_EM,
            color,
        });
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
                            path={buildPath(
                                stroke.points.map((p) =>
                                    toCanvas(toScreenSpace(p, rect, bodySize)),
                                ),
                            )}
                            color={inkColor(stroke.color, tokens)}
                            style="stroke"
                            strokeWidth={stroke.width * bodySize}
                            strokeCap="round"
                            strokeJoin="round"
                        />
                    ));
                })}

                <Path
                    path={livePath}
                    color={inkColor(color, tokens)}
                    style="stroke"
                    strokeWidth={STROKE_WIDTH_EM * bodySize}
                    strokeCap="round"
                    strokeJoin="round"
                />
            </Canvas>
        </View>
    );
}
