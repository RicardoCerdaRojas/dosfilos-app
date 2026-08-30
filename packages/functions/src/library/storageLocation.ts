/**
 * Ubicación de un archivo en Cloud Storage a partir de la URL que guarda el
 * recurso de biblioteca.
 *
 * Los recursos vienen de tres épocas del producto y guardan la ubicación en
 * tres formatos distintos: `gs://bucket/path`, la URL de descarga de Firebase
 * (`/v0/b/<bucket>/o/<path>`) y la de GCS directa. Un lector nuevo que
 * contemple solo uno funciona en desarrollo y falla contra la biblioteca real.
 *
 * Vivía dentro de `indexStructuredDocument`; se movió acá cuando el selector de
 * páginas necesitó lo mismo, para no tener dos copias que se desincronicen.
 */
export function parseFirebaseStorageLocation(
    url: string,
    defaultBucket: string
): { bucket: string; path: string } {
    if (!url) return { bucket: defaultBucket, path: '' };
    const gsMatch = url.match(/^gs:\/\/([^/]+)\/(.+)$/);
    if (gsMatch) return { bucket: gsMatch[1], path: decodeURIComponent(gsMatch[2]) };
    const fbMatch = url.match(/\/v0\/b\/([^/]+)\/o\/([^?]+)/);
    if (fbMatch) return { bucket: fbMatch[1], path: decodeURIComponent(fbMatch[2]) };
    const gcsMatch = url.match(/^https?:\/\/storage\.googleapis\.com\/([^/]+)\/(.+?)(\?|$)/);
    if (gcsMatch) return { bucket: gcsMatch[1], path: decodeURIComponent(gcsMatch[2]) };
    return { bucket: defaultBucket, path: '' };
}
