/**
 * Sermón de prueba para ver el púlpito SIN backend.
 *
 * POR QUÉ EXISTE. En esta máquina no hay identidad de firma, así que el build
 * de simulador va con `CODE_SIGNING_ALLOWED=NO`, la app queda sin
 * `application-identifier` y Firebase Auth no puede escribir en el keychain
 * (`auth/keychain-error`). Sin login no hay Firestore, y sin Firestore no se
 * puede mirar la pantalla que más decisiones de diseño concentra. Este fixture
 * corta esa dependencia para lo único que no la necesita: ver la tipografía.
 *
 * NO reemplaza la verificación en dispositivo. Los gestos (tap largo, zonas de
 * avance, blackout) y la persistencia real siguen sin verificar hasta que haya
 * firma; esto sirve para la MEDIDA, la colometría, el aparato colapsado, las
 * viñetas, el timer y los cinco modos de luz.
 *
 * El contenido ejercita a propósito cada caso que el modelo de lectura
 * distingue: prosa, subtítulo `###`, cita de bloque, viñetas, marcadores `[N]`,
 * énfasis y un asterisco de viñeta que antes se comía el siguiente ítem.
 */
import type { Sermon } from '@dosfilos/domain';

export const PREVIEW_SERMON_ID = '__preview__';

const CONTENT = `## Ilustración de apertura

Cuando se estrenó la famosa serie LOST, millones de personas nos obsesionamos: los misterios de la isla, el monstruo de humo, los números, la escotilla en la tierra y los secretos científicos. Todos queríamos saber de qué se trataban esos misterios.

Cuando la serie terminó, muchos pensamos que al final todos estaban muertos desde el principio. Sin embargo, los creadores aclararon que todo lo que vivieron fue real. La verdad siempre estuvo a la vista, pero los misterios nos distrajeron.

El público se distrajo con el escenario y se perdió el verdadero mensaje. De la misma manera, al iniciar el libro de Jonás podemos distraernos con los detalles de la huida del profeta y perder de vista el mensaje central de Dios.

## El libro de un vistazo

El libro de Jonás nos introduce a un profeta llamado Jonás, hijo de Amitai, quien profetizó en Israel durante el reinado de Jeroboam II, en el año 800 a.C. Fue contemporáneo de otros profetas como Amós y Oseas.

Este libro, aunque breve, es una **poderosa narrativa** que revela el carácter de Dios y cómo Él actúa en su pueblo y en las naciones [1].

> «At first sight this phrase seems to imply that Jonah believed it possible to escape from God's presence; by fleeing to Tarshish, he would place himself beyond the Lord's jurisdiction. This interpretation, however, is at odds with Jonah's later acknowledgment that the Lord is the God of heaven, who made the sea and the land.»
>
> — David W. Baker, Obadiah, Jonah and Micah [1]

### Referencias cruzadas

- Cuando anduviere por valle de sombra de muerte, no temeré mal alguno, porque tú estarás conmigo.
- ¿Soy yo Dios de cerca solamente, dice Jehová, y no Dios desde muy lejos?

## Implicaciones prácticas

Dios habla, así que vive consciente de su dirección. Nuestra vida debe ser un reflejo de la escucha atenta a lo que Dios ya ha revelado. Esto significa cultivar una sensibilidad espiritual que nos permita reconocer su mano en los detalles cotidianos, siempre en consonancia con lo que su Palabra enseña.

* Lee tu Biblia con constancia.
* Ora pidiendo entendimiento y obediencia.
* Escucha la predicación fiel de su Palabra.

La principal manera en que Dios nos dirige hoy es a través de su Palabra. Por lo tanto, es vital que nos sumerjamos en la lectura y el estudio de la Biblia [1].`;

export const PREVIEW_SERMON: Sermon = {
    id: PREVIEW_SERMON_ID,
    userId: 'preview',
    title: 'El Dios de misericordia que prevalece a la rebeldía de su siervo',
    content: CONTENT,
    bibleReferences: ['Jonás 1:1-3'],
    tags: [],
    status: 'published',
    createdAt: new Date(),
    updatedAt: new Date(),
    isShared: false,
    authorName: 'Vista previa',
    preachingHistory: [],
    citationManifest: {
        version: '1',
        entries: [
            {
                sourceId: 'S1',
                resourceId: 'preview-resource',
                scope: 'personal',
                chunkId: 'preview-chunk',
                title: 'Obadiah, Jonah and Micah',
                author: 'David W. Baker',
                page: '111',
                excerpt:
                    'This interpretation is at odds with Jonah’s later acknowledgment that the Lord is the God of heaven, who made the sea and the land.',
            },
        ],
    },
} as Sermon;
