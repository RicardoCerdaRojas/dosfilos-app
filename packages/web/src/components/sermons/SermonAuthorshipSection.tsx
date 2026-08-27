import { useTranslation } from 'react-i18next';
import { PenLine } from 'lucide-react';
import {
    buildSermonAuthorshipSnapshot,
    type SermonAuthorshipSnapshot,
    type SermonElement,
} from '@dosfilos/domain';

interface SermonAuthorshipSectionProps {
    /**
     * Grabado al publicar. Ausente en todo sermón anterior al taller — y ahí
     * esta sección NO SE DIBUJA.
     */
    snapshot?: SermonAuthorshipSnapshot;
    /**
     * Las decisiones VIVAS del borrador, cuando todavía no se ha publicado.
     *
     * Un borrador no tiene snapshot —se graba al publicar— pero sus decisiones
     * existen y son las mismas. Sin esto, el pastor no vería cómo va quedando
     * hasta después de publicar, que es tarde para que le sirva.
     */
    liveElements?: Record<string, SermonElement[]>;
    className?: string;
}

/**
 * ADR-037 — cómo se armó este sermón.
 *
 * SIN SNAPSHOT NO SE MUESTRA NADA, y ésa es la decisión de diseño más
 * importante del componente. Un sermón anterior al taller no tiene decisiones
 * registradas porque el registro no existía, no porque el pastor no aportara
 * ideas. Dibujar acá un "sin medir" —o peor, el estado más bajo— le diría a un
 * pastor con noventa sermones propios que a su trabajo le falta algo. La
 * ausencia de dato no es evidencia: cuando no hay registro, no se dice nada.
 * Misma regla que la insignia de procedencia del borrador.
 *
 * NO HAY PORCENTAJE NI PUNTAJE. El número sería un NIVEL, y el nivel de un
 * sermón aislado no significa nada: un pastor que empieza elige mucho, y elegir
 * es el mecanismo por el que se forma. Lo que significaría algo es la
 * trayectoria entre muchos sermones. Por eso acá se DESCRIBE la forma y el
 * detalle va como recuento, no como calificación — y el sermón que se armó
 * eligiendo lleva la nota que lo sitúa en la curva en vez de un reproche.
 */
export function SermonAuthorshipSection({
    snapshot,
    liveElements,
    className,
}: SermonAuthorshipSectionProps) {
    const { t } = useTranslation('sermonDetail');

    // El grabado manda: es lo que quedó fijo al publicar. Las decisiones vivas
    // sólo entran mientras no exista snapshot — un borrador en curso.
    const lectura = snapshot ?? buildSermonAuthorshipSnapshot(liveElements);

    // Sin registro no hay nada que decir. Tampoco si no quedó ninguna idea.
    if (!lectura || lectura.shape === 'sin-medir' || lectura.shape === 'vacia') return null;

    const propias = lectura.pastor + lectura.editado;

    return (
        <section
            className={['mt-12 pt-6 border-t border-border/60 space-y-3', className ?? '']
                .filter(Boolean)
                .join(' ')}
            aria-label={t('authorship.title')}
        >
            <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
                <PenLine className="h-4 w-4 text-primary" />
                {t('authorship.title')}
            </h2>

            <p className="text-sm text-foreground">{t(`authorship.shape.${lectura.shape}`)}</p>

            {/* El recuento es un HECHO, no una nota: cuántas ideas quedaron y
                cuántas nacieron de él. Sin porcentaje, que es lo que convertiría
                el dato en una calificación. */}
            <p className="text-xs text-muted-foreground">
                {t('authorship.tally', {
                    ideas: lectura.inSermon,
                    propias,
                    secciones: lectura.sectionsDecided,
                })}
            </p>

            {/* DÓNDE ESTÁ EN LA CURVA, no un reproche. Sólo cuando el sermón se
                armó eligiendo: es el caso en que un número desnudo se leería
                como acusación, y es exactamente lo que corresponde hacer al
                principio. */}
            {lectura.shape === 'seleccionada' && (
                <p className="text-xs text-muted-foreground italic">{t('authorship.trajectory')}</p>
            )}
        </section>
    );
}
