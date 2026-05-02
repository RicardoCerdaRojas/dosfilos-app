# Re-extraer un library_resource con LlamaParse (callable, 900s timeout)

Útil cuando un PDF grande (>1000 págs) cayó a `fallback-pdfparse` porque el
storage trigger (540s timeout) no le alcanzó a LlamaParse, y querés forzar la
re-extracción usando la callable que tiene 15 min.

La callable es admin-only (`request.auth.token?.email !== 'rdocerda@gmail.com'`),
así que el camino más rápido es invocarla desde la consola del navegador
mientras estás logueado como admin.

---

## Paso 1 — Conseguir el resourceId

Lo encuentras en la URL al hacer click en el recurso desde la biblioteca, o
en el Firestore console: `library_resources/{id}`.

Para NTG en este caso es: `406843cb-5dc2-4317-a672-45d5bf8fb1d1`

---

## Paso 2 — Pegar este snippet en DevTools Console

Abrir la app en `localhost:5173/dashboard/library` (logueado), F12 → Console,
pegar:

```js
(async () => {
  const { getFunctions, httpsCallable } = await import('firebase/functions');
  const { getApp } = await import('firebase/app');

  const RESOURCE_ID = '406843cb-5dc2-4317-a672-45d5bf8fb1d1'; // ← ajustar
  const FORCE = true; // re-extraer aunque ya esté como llamaparse

  const functions = getFunctions(getApp(), 'us-central1');
  const reprocess = httpsCallable(functions, 'reprocessWithLlamaParse');

  console.log(`Invoking reprocessWithLlamaParse for ${RESOURCE_ID}...`);
  console.time('reprocess');
  try {
    const result = await reprocess({ resourceId: RESOURCE_ID, force: FORCE });
    console.timeEnd('reprocess');
    console.log('✅ Result:', result.data);
  } catch (err) {
    console.timeEnd('reprocess');
    console.error('❌ Failed:', err);
  }
})();
```

Esperá hasta 15 min. Vas a ver el log final con el conteo de páginas extraídas
y el `extractionVersion: '3.0-llamaparse'`.

Después, en la biblioteca el badge del recurso pasará de "Básico" a
"Premium" (auto-index dispara automáticamente cuando la extracción flips a
ready con extractionVersion auto-indexable).

---

## Por qué no es un script Node

La callable verifica `request.auth.token.email` para autorizar admin. Hacer la
misma verificación desde un script Node requeriría:
1. Email/password del usuario en variables de entorno
2. SDK de Firebase web (no admin) para signin con email/password
3. Tokens cacheados localmente

Es más cómodo pegar en DevTools donde ya estás autenticado. Si necesitas
automatizarlo, pedímelo y armamos el script con login no-interactivo.
