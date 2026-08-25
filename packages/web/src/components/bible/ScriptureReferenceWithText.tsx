import { scriptureLookupRef } from '@dosfilos/domain';
import { LocalBibleService } from '@/services/LocalBibleService';

interface Props {
    /** Referencia tal como la escribió el pastor: "Salmo 139:7-12", "Jonás 1:3a". */
    reference: string;
    /** Cómo renderizar la referencia en sí (enlace, chip, etc.). */
    renderReference: (reference: string) => React.ReactNode;
}

/**
 * Una referencia cruzada CON su texto.
 *
 * Un listado de referencias sin texto obliga al pastor a abrir cada una para
 * saber qué dice — justo mientras revisa el sermón de un vistazo, que es lo que
 * el manuscrito existe para permitir. La cita es el dato; el texto es lo que se
 * predica.
 *
 * SI EL TEXTO NO SE PUEDE RESOLVER, SE MUESTRA LA REFERENCIA SOLA. Pasa con
 * libros fuera de la Biblia local o con una referencia mal escrita, y en ese
 * caso perder la referencia sería peor que no tener el texto.
 *
 * `scriptureLookupRef` normaliza la notación homilética de medio versículo
 * ("1:3a" → "1:3"), que el parser bíblico rechaza. La ETIQUETA conserva lo que
 * él escribió: saber qué mitad predica es suyo.
 */
export function ScriptureReferenceWithText({ reference, renderReference }: Props) {
    const texto = LocalBibleService.getVerses(scriptureLookupRef(reference) ?? '');

    if (!texto) return <>{renderReference(reference)}</>;

    return (
        <div className="space-y-0.5">
            {renderReference(reference)}
            <p className="text-sm text-muted-foreground leading-relaxed">{texto}</p>
        </div>
    );
}
