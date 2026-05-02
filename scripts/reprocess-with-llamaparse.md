# Re-extraer un library_resource con LlamaParse

Útil cuando un PDF grande (>1000 págs, ej: NTG 28) cayó a
`fallback-pdfparse` porque el storage trigger (540s timeout) no le
alcanzó a LlamaParse, y querés forzar la re-extracción usando la
callable `reprocessWithLlamaParse` que tiene 15 min.

## Uso

```bash
node scripts/reprocess-llamaparse.mjs <resourceId> [--force]
```

Ejemplos:

```bash
# NTG 28 — re-extraer aunque ya esté como llamaparse
node scripts/reprocess-llamaparse.mjs 406843cb-5dc2-4317-a672-45d5bf8fb1d1 --force

# Otro recurso — sin force (idempotente; salta si ya está en LlamaParse)
node scripts/reprocess-llamaparse.mjs <id-del-recurso>
```

## Cómo conseguir el resourceId

- Click en el recurso desde la biblioteca → la URL contiene el id
- O Firestore Console → `library_resources` → el doc con el título que buscás

## Auth (sin password)

Usa el mismo patrón de los otros scripts del repo: Application Default
Credentials de gcloud. No necesitas password ni service account JSON.

Pre-requisito (una sola vez):

```bash
gcloud auth application-default login
```

(Probablemente ya lo tienes hecho si usas `firebase deploy` o
`gcloud functions logs`.)

Cómo funciona internamente:
1. `firebase-admin` (con ADC) busca el usuario `rdocerda@gmail.com` y
   minta un custom token.
2. `firebase` (web SDK) hace `signInWithCustomToken` con ese token →
   genera un ID token con el email correcto.
3. La callable acepta porque `request.auth.token.email` ahora coincide
   con el check de admin.

Si querés invocar como otro usuario admin, pasale `--as`:

```bash
node scripts/reprocess-llamaparse.mjs <id> --as alguien@dosfilos.app --force
```

## Qué pasa después de exitoso

- `textExtractionStatus` → `'ready'`
- `extractionVersion` → `'3.0-llamaparse'`
- El trigger `autoIndexOnExtractionReady` dispara automáticamente y
  genera chunks + embeddings
- En la biblioteca, el badge cambia de "Básico" a "Premium" y el
  recurso queda usable como fuente en proyectos exegéticos / Faculty

No tienes que clicar "Procesar pendientes" — el auto-index hace el
trabajo.

## Si el script time-outea (>15 min)

Significa que LlamaParse necesita más tiempo del que la callable
puede esperar. Para PDFs así (>1500 págs típicamente), las opciones
son:

1. **Partir el PDF** en mitades y subir como dos resources separados
2. **Aceptar pdf-parse** para ese libro específico (perdés estructura
   pero el texto plano es citable)
3. **Migrar a Cloud Run job** (60 min timeout) — refactor de
   arquitectura, fuera de scope v1.6

## Variantes del comando equivalente desde DevTools del navegador

Si no tenés Node a mano, podés pegar este snippet en la consola del
navegador (logueado como admin):

```js
(async () => {
  const { getFunctions, httpsCallable } = await import('firebase/functions');
  const { getApp } = await import('firebase/app');
  const fn = httpsCallable(getFunctions(getApp(), 'us-central1'),
    'reprocessWithLlamaParse', { timeout: 16 * 60 * 1000 });
  console.time('reprocess');
  const result = await fn({ resourceId: '<ID>', force: true });
  console.timeEnd('reprocess');
  console.log(result.data);
})();
```
