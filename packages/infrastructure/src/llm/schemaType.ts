/**
 * Tipos de campo para los `responseSchema` que viajan al modelo.
 *
 * POR QUÉ UNA COPIA LOCAL Y NO EL ENUM DEL SDK: `SchemaType` de
 * `@google/generative-ai` es un enum de TypeScript, y un enum existe en
 * RUNTIME. Importarlo desde tres archivos de esquema alcanzaba para que el
 * bundler arrastrara el SDK entero al navegador — un cliente HTTP hacia Google
 * completo, cargado por su nombre, para leer seis strings constantes.
 *
 * Los valores son los mismos del SDK (los de OpenAPI 3.0), así que los esquemas
 * ya escritos no cambian ni una letra. Los `responseSchema` se serializan a JSON
 * en el borde del callable, donde el servidor sí tiene el SDK: nada de esto
 * necesita el paquete de Google del lado del cliente.
 */
export const SchemaType = {
    STRING: 'string',
    NUMBER: 'number',
    INTEGER: 'integer',
    BOOLEAN: 'boolean',
    ARRAY: 'array',
    OBJECT: 'object',
} as const;

export type SchemaType = (typeof SchemaType)[keyof typeof SchemaType];
