import { ReactNode } from 'react';

interface Props {
    /** Aviso de contexto del paso. Ocupa lo que necesite y no más. */
    banner?: ReactNode;
    children: ReactNode;
}

/**
 * El marco de un paso del asistente: el aviso arriba, el trabajo llenando lo
 * que queda.
 *
 * EL PASO LLENA SU CONTENEDOR — NO RESTA CONTRA `100vh`. Los tres pasos abrían
 * con `height: calc(100vh - 130px)`, que es adivinar cuánto miden la barra
 * superior y la fila de pasos. Cuando no acertaba —y no acertaba— el paso
 * sobraba unos píxeles, la página entera ganaba una barra de scroll, y al
 * pulsar una pestaña el navegador la traía a la vista corriendo todo hacia
 * abajo. El asistente ya le da un alto definido (`flex-1` de una columna
 * `h-full`): basta con llenarlo.
 *
 * Y EL AVISO NO LE ROBA ALTO AL TRABAJO. Iba como hermano suelto del cuerpo,
 * así que cuando aparecía —viniendo de un paper o de Faculty— empujaba al paso
 * fuera del contenedor y devolvía el mismo scroll. Acá el cuerpo se queda con
 * lo que sobre, exista el aviso o no.
 */
export function WizardStepShell({ banner, children }: Props) {
    return (
        <div className="h-full flex flex-col overflow-hidden">
            {/* SIN PADDING EN LA RANURA. El aviso devuelve `null` cuando no
                hay contexto derivado, y un contenedor con `pt-2` alrededor de
                nada deja el paso 8px más abajo sin que se vea por qué. El
                espacio lo pone el aviso, que es quien sabe si existe. */}
            <div className="shrink-0">{banner}</div>
            <div className="flex-1 min-h-0">{children}</div>
        </div>
    );
}
