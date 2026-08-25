import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface WizardLayoutProps {
  leftPanel: ReactNode;
  rightPanel: ReactNode;
  /**
   * Banda superior que CRUZA LAS DOS COLUMNAS.
   *
   * El encabezado del paso vivía dentro de la columna izquierda, así que el
   * chat arrancaba más arriba que el contenido y las dos columnas no
   * encuadraban. Acá el borde superior es uno solo y el chat empieza donde
   * empieza el trabajo.
   */
  header?: ReactNode;
  className?: string;
}

export function WizardLayout({ leftPanel, rightPanel, header, className }: WizardLayoutProps) {
  const columnas = (
    <div className={cn(
      "flex flex-col lg:flex-row gap-4 flex-1 min-h-0 overflow-hidden",
      !header && "h-full",
      className
    )}>
      {/* Left Panel - Canvas */}
      <div className="flex-1 min-w-0 overflow-hidden flex flex-col">
        {leftPanel}
      </div>

      {/*
        Right Panel - Chat + Controls

        `lg:w-auto`, no un 35% fijo. El panel de chat que va acá dentro
        (`ResizableChatPanel`) define su propio ancho en píxeles, y el pastor lo
        arrastra. Con un 35% rígido afuera, cuando el panel medía menos que ese
        35% quedaba una franja muerta a la derecha: el contenido se veía corrido
        a la izquierda con la ventana a medio usar. Pasaba en los tres pasos.

        Ahora el contenedor se ajusta a su contenido y la columna izquierda
        (`flex-1`) se queda con todo lo que sobra. El `min-w` es para los
        estados vacíos, que ponen una tarjeta informativa sin ancho propio y
        colapsarían al ancho del texto.
      */}
      <div className="w-full lg:w-auto lg:min-w-[320px] lg:max-w-[60%] flex-shrink-0 flex flex-col overflow-hidden">
        {rightPanel}
      </div>
    </div>
  );

  if (!header) return columnas;

  return (
    <div className="h-full flex flex-col gap-4 overflow-hidden">
      {header}
      {columnas}
    </div>
  );
}
