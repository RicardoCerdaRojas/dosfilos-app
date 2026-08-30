import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import * as pdfjsLib from 'pdfjs-dist';
import { Loader2, FileWarning } from 'lucide-react';

/**
 * Una hoja del PDF, dibujada en canvas.
 *
 * El visor abre el archivo por URL firmada y deja que pdf.js pida rangos de
 * bytes: de un comentario de 24 MB baja solo las hojas que se miran. Por eso la
 * URL se firma en vez de servirse por la callable — proxear el archivo
 * rompería el pedido por rango y habría que bajarlo entero.
 *
 * El worker se empaqueta con la app en vez de traerse de un CDN. Hay un
 * precedente en el proyecto que lo carga desde unpkg; para una pieza central
 * del flujo de corpus, depender de un tercero para que la pantalla funcione es
 * una fragilidad que no hace falta aceptar.
 */

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url,
).toString();

interface Props {
    /** URL firmada del PDF. `null` mientras se está pidiendo. */
    url: string | null;
    /** Hoja física a mostrar, contada desde 1. */
    sheet: number;
    /** Marca visualmente que la hoja ya está en el carrito. */
    selected: boolean;
    /** Ancho de render en píxeles CSS. */
    width?: number;
}

export function PdfPageViewer({ url, sheet, selected, width = 460 }: Props) {
    const { t } = useTranslation('exegesis');
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const docRef = useRef<pdfjsLib.PDFDocumentProxy | null>(null);
    // Cancela el render anterior cuando el usuario pasa hojas rápido: sin esto,
    // dos renders sobre el mismo canvas se pisan y pdf.js tira
    // "Cannot use the same canvas during multiple render() operations".
    const renderRef = useRef<pdfjsLib.RenderTask | null>(null);
    const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
    const [errorKind, setErrorKind] = useState<'load' | 'page' | null>(null);

    useEffect(() => {
        if (!url) return;
        let cancelled = false;
        setStatus('loading');
        setErrorKind(null);

        const task = pdfjsLib.getDocument({ url, disableAutoFetch: true, disableStream: false });
        task.promise.then(
            doc => {
                if (cancelled) { void doc.destroy(); return; }
                docRef.current = doc;
                setStatus('ready');
            },
            (err: unknown) => {
                if (cancelled) return;
                console.error('[PdfPageViewer] no se pudo abrir el documento', err);
                setErrorKind('load');
                setStatus('error');
            },
        );

        return () => {
            cancelled = true;
            renderRef.current?.cancel();
            void task.destroy();
            docRef.current = null;
        };
    }, [url]);

    useEffect(() => {
        const doc = docRef.current;
        const canvas = canvasRef.current;
        if (status !== 'ready' || !doc || !canvas) return;
        if (sheet < 1 || sheet > doc.numPages) return;

        let cancelled = false;
        renderRef.current?.cancel();

        doc.getPage(sheet).then(
            page => {
                if (cancelled) return;
                const base = page.getViewport({ scale: 1 });
                // Se dibuja a la densidad real de la pantalla: en un retina, un
                // canvas a escala 1 se ve borroso justo donde el usuario está
                // leyendo tipografía chica para decidir.
                const dpr = Math.min(window.devicePixelRatio || 1, 2);
                const scale = (width / base.width) * dpr;
                const viewport = page.getViewport({ scale });
                const ctx = canvas.getContext('2d');
                if (!ctx) return;

                canvas.width = Math.floor(viewport.width);
                canvas.height = Math.floor(viewport.height);
                canvas.style.width = `${width}px`;
                canvas.style.height = `${Math.floor(viewport.height / dpr)}px`;

                const task = page.render({ canvas, canvasContext: ctx, viewport });
                renderRef.current = task;
                task.promise.catch((err: unknown) => {
                    // Cancelar un render es normal al pasar hojas rápido.
                    if (err && (err as { name?: string }).name === 'RenderingCancelledException') return;
                    console.error('[PdfPageViewer] no se pudo dibujar la hoja', err);
                    if (!cancelled) { setErrorKind('page'); setStatus('error'); }
                });
            },
            (err: unknown) => {
                if (cancelled) return;
                console.error('[PdfPageViewer] no se pudo leer la hoja', err);
                setErrorKind('page');
                setStatus('error');
            },
        );

        return () => { cancelled = true; renderRef.current?.cancel(); };
    }, [sheet, status, width]);

    if (status === 'error') {
        return (
            <div className="flex flex-col items-center justify-center gap-2 py-16 px-6 text-center">
                <FileWarning className="h-5 w-5 text-warning" aria-hidden="true" />
                <p className="text-sm text-muted-foreground max-w-xs">
                    {errorKind === 'load'
                        ? t('paperSetup.subSteps.corpus.picker.viewer.loadFailed')
                        : t('paperSetup.subSteps.corpus.picker.viewer.pageFailed')}
                </p>
            </div>
        );
    }

    return (
        <div className="relative flex justify-center py-4">
            {status !== 'ready' && (
                <div className="absolute inset-0 flex items-center justify-center gap-2 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    <span className="text-sm">{t('paperSetup.subSteps.corpus.picker.viewer.loading')}</span>
                </div>
            )}
            <canvas
                ref={canvasRef}
                aria-label={t('paperSetup.subSteps.corpus.picker.viewer.sheetLabel', { sheet })}
                className={`rounded-sm bg-card shadow-md transition-opacity ${
                    status === 'ready' ? 'opacity-100' : 'opacity-0'
                } ${selected ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : ''}`}
            />
        </div>
    );
}
