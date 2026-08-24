import { Resend } from 'resend';

// La clave viene de SECRET MANAGER: las 14 funciones que envían correo la
// declaran con `secrets: ['RESEND_API_KEY']` (migrado 2026-08-24). Antes se
// horneaba desde `packages/functions/.env` en el deploy — un archivo que CI no
// tiene, por estar en `.gitignore`, así que cada despliegue automático dejaba
// producción sin clave.
//
// El fallback legacy `functions.config().resend.apikey` se quitó porque llamar
// a `functions.config()` al cargar el módulo revienta en Gen 2 y tumba el
// contenedor en frío — arrastrando a CUALQUIER función cuyo bundle importe este
// archivo (cancelExtraction rompió el deploy en mayo de 2026 por eso).
const apiKey = process.env.RESEND_API_KEY;

// EL AVISO SE EMITE AL CARGAR EL MÓDULO, y este archivo lo importan de forma
// transitiva decenas de funciones que NO envían correo. Para ellas la ausencia
// de clave es lo esperado —no la declaran porque no la necesitan— y el aviso
// era ruido que llenaba los logs de producción con una alarma falsa.
//
// Ahora sólo avisa donde importa: si una función DECLARA el secreto, la clave
// tiene que estar; si no lo declara, no la necesita y no hay nada que reportar.
if (!apiKey) {
    console.debug('[resend] sin RESEND_API_KEY en este contenedor — sólo importa si esta función envía correo.');
}

// Dummy key keeps `new Resend()` from throwing during cold-start of
// functions that don't actually send email. Real send paths still fail
// loudly when the key is missing.
export const resend = new Resend(apiKey || 're_missing_key');
