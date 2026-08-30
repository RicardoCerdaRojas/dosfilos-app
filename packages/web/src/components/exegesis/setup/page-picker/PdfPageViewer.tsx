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

/**
 * Recursos que pdf.js pide por URL mientras renderiza. Los copia a `public/`
 * el script `copy-pdfjs-assets.mjs` antes de `dev` y de `build`.
 *
 * Faltando, no hay error: la hoja sale EN BLANCO. Medido contra la biblioteca
 * real — la mitad de los comentarios son escaneos que guardan cada página como
 * imagen JPEG 2000 con máscara JBIG2, y pdf.js decodifica las dos con
 * WebAssembly que busca acá. Y los cmaps y las fuentes estándar son lo que
 * hace que el griego y el hebreo salgan como letras y no como cajas vacías.
 */
const PDFJS_ASSETS = {
    wasmUrl: '/pdfjs/wasm/',
    cMapUrl: '/pdfjs/cmaps/',
    cMapPacked: true,
    standardFontDataUrl: '/pdfjs/standard_fonts/',
} as const;

interface Props {
    /** URL firmada del PDF. `null` mientras se está pidiendo. */
    url: string | null;
    /** Hoja física a mostrar, contada desde 1. */
    sheet: number;
    /** Marca visualmente que la hoja ya está en el carrito. */
    selected: boolean;
}

/**
 * Margen alrededor de la hoja dentro del panel, en píxeles.
 */
const STAGE_PADDING = 24;

export function PdfPageViewer({ url, sheet, selected }: Props) {
    const { t } = useTranslation('exegesis');
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const docRef = useRef<pdfjsLib.PDFDocumentProxy | null>(null);
    // Cancela el render anterior cuando el usuario pasa hojas rápido: sin esto,
    // dos renders sobre el mismo canvas se pisan y pdf.js tira
    // "Cannot use the same canvas during multiple render() operations".
    const renderRef = useRef<pdfjsLib.RenderTask | null>(null);
    const stageRef = useRef<HTMLDivElement>(null);
    const [stage, setStage] = useState({ width: 0, height: 0 });
    const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
    const [errorKind, setErrorKind] = useState<'load' | 'page' | null>(null);

    // La hoja se ajusta al panel para que entre ENTERA. Al recorrer un libro
    // decidiendo qué sirve, ver media página y tener que scrollear para ver el
    // resto convierte cada hoja en dos gestos.
    useEffect(() => {
        const el = stageRef.current;
        if (!el) return;
        const observer = new ResizeObserver(entries => {
            const box = entries[0]?.contentRect;
            if (box) setStage({ width: box.width, height: box.height });
        });
        observer.observe(el);
        return () => observer.disconnect();
    }, []);

    useEffect(() => {
        if (!url) return;
        let cancelled = false;
        setStatus('loading');
        setErrorKind(null);

        const task = pdfjsLib.getDocument({
            url,
            disableAutoFetch: true,
            disableStream: false,
            ...PDFJS_ASSETS,
        });
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
        if (stage.width <= 0 || stage.height <= 0) return;

        let cancelled = false;
        renderRef.current?.cancel();

        doc.getPage(sheet).then(
            page => {
                if (cancelled) return;
                const base = page.getViewport({ scale: 1 });
                // Entra entera: se toma el menor de los dos ajustes, el de ancho
                // y el de alto.
                const fit = Math.min(
                    (stage.width - STAGE_PADDING * 2) / base.width,
                    (stage.height - STAGE_PADDING * 2) / base.height,
                );
                const cssScale = Math.max(fit, 0.1);
                // Se dibuja a la densidad real de la pantalla: en un retina, un
                // canvas a escala 1 se ve borroso justo donde el usuario está
                // leyendo tipografía chica para decidir.
                const dpr = Math.min(window.devicePixelRatio || 1, 2);
                const viewport = page.getViewport({ scale: cssScale * dpr });
                const ctx = canvas.getContext('2d');
                if (!ctx) return;

                canvas.width = Math.floor(viewport.width);
                canvas.height = Math.floor(viewport.height);
                canvas.style.width = `${Math.floor(base.width * cssScale)}px`;
                canvas.style.height = `${Math.floor(base.height * cssScale)}px`;

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
    }, [sheet, status, stage.width, stage.height]);

    if (status === 'error') {
        return (
            <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center">
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
        <div ref={stageRef} className="relative flex h-full w-full items-center justify-center overflow-hidden">
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
