import { scriptureLookupRef } from '@dosfilos/domain';
import { LocalBibleService } from '@/services/LocalBibleService';

interface Props {
    /** Referencia tal como la escribió el pastor: "Salmo 139:7-12", "Jonás 1:3a". */
    reference: string;
    /** Cómo renderizarla cuando su texto NO se pudo resolver. */
    renderFallback: (reference: string) => React.ReactNode;
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
export function ScriptureReferenceWithText({ reference, renderFallback }: Props) {
    const texto = LocalBibleService.getVerses(scriptureLookupRef(reference) ?? '');

    // Sin texto, se conserva el enlace: sirve para ir a leerlo a otro lado.
    if (!texto) return <>{renderFallback(reference)}</>;

    return (
        <div className="space-y-1">
            {/* LA REFERENCIA COMO ETIQUETA, NO COMO ENLACE.
                Con el texto a la vista el enlace ya no aporta —existía para
                poder leer el versículo— y además rompía la cita: el enlazador
                reconoce hasta el número y dejaba la mitad afuera, mostrando
                "Jonás 1:3 a" en dos pedazos. La etiqueta la muestra entera,
                incluida la notación de medio versículo que él escribió. */}
            <p className="text-sm font-medium text-primary">{reference}</p>
            <p className="text-sm text-muted-foreground leading-relaxed">{texto}</p>
        </div>
    );
}
