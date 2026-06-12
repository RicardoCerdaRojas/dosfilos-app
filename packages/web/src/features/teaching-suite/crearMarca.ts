import {
  injectArtifacts,
  processLogo,
  proposePalette,
  type BrandBundle,
  type Marca,
  type MarcaFont,
  type Pixels,
  type TeachingPlan,
} from '@dosfilos/domain';
import { fontFamily } from './assets/fontCatalog';
import { TEMPLATES } from './assets/templates';

/** Pila CSS de interfaz por defecto (no configurable en F2). */
const INTERFAZ_FUENTE =
  "'Inter','Segoe UI',system-ui,-apple-system,Helvetica,Arial,sans-serif";

export interface BrandDraft {
  nombre: string;
  tokens: Record<string, string>;
  fuenteTitulosKey: string;
  fuenteEscrituraKey: string;
  logoB64: string; // PNG con fondo removido (base64, sin prefijo data:)
}

/** Construye el `BrandBundle` (assets de render) desde el borrador de marca. */
export function buildUserBundle(draft: BrandDraft): BrandBundle {
  const titulos = fontFamily(draft.fuenteTitulosKey);
  const escritura = fontFamily(draft.fuenteEscrituraKey);

  // Dedup de variantes por archivo (si títulos y escritura comparten familia).
  const variantsMap = new Map<string, MarcaFont & { base64: string }>();
  for (const fam of [titulos, escritura]) {
    if (fam) for (const v of fam.variants) variantsMap.set(v.archivo, v);
  }
  const fontBase64: Record<string, string> = {};
  const fuentes: MarcaFont[] = [...variantsMap.values()].map((v) => {
    fontBase64[v.archivo] = v.base64;
    return { archivo: v.archivo, familia: v.familia, peso: v.peso, estilo: v.estilo };
  });

  const marca: Marca = {
    nombre: draft.nombre || 'Marca',
    tokens: draft.tokens,
    fuente: INTERFAZ_FUENTE,
    ...(titulos ? { fuente_titulos: titulos.stack } : {}),
    ...(escritura ? { fuente_escritura: escritura.stack } : {}),
    fuentes,
    logo: '(inline)',
    icono: '(inline)',
  };

  return {
    marca,
    fontBase64,
    logoB64: draft.logoB64,
    iconoB64: draft.logoB64, // el logo hace de marca de agua del icono en el preview
    cssExtra: undefined,
  };
}

/** Plan mínimo para previsualizar una marca (ejercita tokens, Escritura y acento). */
export const PREVIEW_PLAN: TeachingPlan = {
  id: 'preview',
  titulo: 'Vista previa de marca',
  serie: 'Suite de Enseñanza',
  genero: 'doctrina',
  marca: 'preview',
  artefactos: ['presentacion'],
  version_contrato: '1.1',
  bloques: [{ nombre: 'Preview', diapo_ini: 1, diapo_fin: 4, min: 10 }],
  diapositivas: [
    {
      n: 1,
      tipo: 'portada',
      kicker: 'Vista previa',
      titulo: 'Tu marca<br>en acción',
      destacado: 'Colores, tipografía y logo',
      meta: 'Suite de Enseñanza',
    },
    {
      n: 2,
      tipo: 'escritura',
      centro: true,
      ref: 'Salmo 19:7',
      texto:
        'La ley de Jehová es perfecta, que convierte el alma; el testimonio de Jehová es fiel, que hace sabio al sencillo.',
    },
    {
      n: 3,
      tipo: 'lista',
      kicker: 'Estructura',
      titulo: 'Lo que verás',
      items: [
        'El color de <b>Escritura</b> marca solo el texto citado',
        'El <b>acento</b> resalta la síntesis interpretativa',
        'La tipografía de títulos y de la Escritura',
        'El logo como marca de agua en la portada',
      ],
    },
    {
      n: 4,
      tipo: 'sintesis',
      texto: 'Una identidad coherente para toda la clase.',
    },
  ],
  notas_resumen: [
    { diapo: 1, rotulo: 'D1', texto: 'Portada.' },
    { diapo: 2, rotulo: 'D2', texto: 'Escritura.' },
    { diapo: 3, rotulo: 'D3', texto: 'Lista.' },
    { diapo: 4, rotulo: 'D4', texto: 'Síntesis.' },
  ],
};

/** Renderiza el HTML de la presentación de preview con el borrador de marca. */
export function renderPreviewHtml(draft: BrandDraft): string {
  const out = injectArtifacts(PREVIEW_PLAN, {
    templates: { presentacion: TEMPLATES.presentacion },
    brand: buildUserBundle(draft),
  });
  return out.presentacion ?? '';
}

/**
 * Procesa un logo subido: remueve el fondo, recorta y reescala ≤520px, y
 * devuelve `{ logoB64, palette }`. Usa el `<canvas>` para el I/O de píxeles y
 * las funciones puras de domain para la lógica.
 */
export async function processLogoFile(file: File): Promise<{ logoB64: string; palette: Record<string, string> }> {
  const bitmap = await createImageBitmap(file);
  const c0 = document.createElement('canvas');
  c0.width = bitmap.width;
  c0.height = bitmap.height;
  const ctx0 = c0.getContext('2d');
  if (!ctx0) throw new Error('No se pudo crear el contexto del canvas');
  ctx0.drawImage(bitmap, 0, 0);
  const img = ctx0.getImageData(0, 0, c0.width, c0.height);

  const processed: Pixels = processLogo({ width: img.width, height: img.height, data: img.data });
  const palette = proposePalette(processed);

  // Reescala a ≤520px de ancho (como crear_marca.py) y exporta PNG.
  const scale = processed.width > 520 ? 520 / processed.width : 1;
  const dw = Math.max(1, Math.round(processed.width * scale));
  const dh = Math.max(1, Math.round(processed.height * scale));

  const src = document.createElement('canvas');
  src.width = processed.width;
  src.height = processed.height;
  const sctx = src.getContext('2d');
  if (!sctx) throw new Error('No se pudo crear el contexto del canvas');
  sctx.putImageData(new ImageData(processed.data, processed.width, processed.height), 0, 0);

  const dst = document.createElement('canvas');
  dst.width = dw;
  dst.height = dh;
  const dctx = dst.getContext('2d');
  if (!dctx) throw new Error('No se pudo crear el contexto del canvas');
  dctx.imageSmoothingQuality = 'high';
  dctx.drawImage(src, 0, 0, dw, dh);

  const dataUrl = dst.toDataURL('image/png');
  const logoB64 = dataUrl.split(',')[1] ?? '';
  return { logoB64, palette };
}
