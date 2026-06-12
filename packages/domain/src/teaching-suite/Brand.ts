import type { Artefacto, TeachingPlan } from './TeachingPlan';

/** Una fuente de la marca (woff2 incrustada como @font-face base64). */
export interface MarcaFont {
  archivo: string; // path relativo (clave para localizar los bytes)
  familia: string;
  peso: string | number;
  estilo: string;
}

/** Perfil de marca (réplica de `assets/marcas/<clave>/marca.json`). */
export interface Marca {
  nombre: string;
  tokens: Record<string, string>; // 9 tokens hex (oscuro, panel, …, alerta)
  fuente?: string; // pila CSS de interfaz
  fuente_titulos?: string;
  fuente_escritura?: string;
  fuentes?: MarcaFont[];
  logo: string;
  icono?: string;
  css_extra?: string; // nombre de archivo (extra.css)
  pie_serie?: string;
  footer_largo?: string;
}

/**
 * Bundle de assets de marca YA CARGADOS (el I/O de Firestore/Storage vive en el
 * callable; el inyector es puro). Las fuentes y el icono vienen como base64.
 */
export interface BrandBundle {
  marca: Marca;
  fontBase64: Record<string, string>; // archivo → base64 (woff2)
  logoB64: string;
  iconoB64?: string;
  cssExtra?: string; // contenido de extra.css (ya leído)
}

export interface InjectAssets {
  templates: Partial<Record<Artefacto, string>>; // texto de las plantillas declaradas
  brand: BrandBundle;
  edicionCss?: string; // contenido de edicion.css (si el plan declara edición)
}

export type InjectResult = Partial<Record<Artefacto, string>>;

/** Marca el contrato del input para que el tipo de `injectArtifacts` sea explícito. */
export type InjectInput = { plan: TeachingPlan; assets: InjectAssets };
