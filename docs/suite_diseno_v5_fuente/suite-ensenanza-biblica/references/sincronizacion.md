# sincronizacion.md — Protocolo (runtime congelado; NO reimplementar)

Conocimiento de contexto: esto YA está en las plantillas. Solo es relevante
para diagnosticar o para entender los invariantes del plan.

- Canal: `BroadcastChannel('laiglesia_<id>')` — uno por clase; por eso el
  `id` del plan debe ser único (dos clases abiertas no se interfieren).
  Funciona entre ventanas del MISMO navegador en el MISMO equipo
  (escenario: notebook + proyector). Sin servidor, sin red.
- Mensajes: `{tipo:'diapo', n}` · `{tipo:'contraste', on}` ·
  `{tipo:'fuente', f}` · `{tipo:'trazo-remoto', d, t}` ·
  `{tipo:'borrar-remoto', d}` · `{tipo:'ping'}`/`{tipo:'pong'}`.
- La presentación responde a cada ping; la consola marca "● enlazado" según
  el último pong (tolerancia ~7 s) y "○ sin proyector" si no.
- Guardas anti-eco: bandera `recibiendo`; al recibir `diapo` no se re-emite.
- El scroll de la consola cruza anclas `data-slide="N"` → cambia la
  diapositiva local y remota. POR ESO el plan exige anclas cubriendo 2..N.
- Prohibido `localStorage`/`sessionStorage` (no funcionan en artefactos);
  los trazos viven en memoria por diapositiva, por sesión.
- Checklist manual tras generar: dos ventanas, scroll-sync, trazo desde
  "Marcar en grande" aparece en el proyector en la diapositiva correcta,
  indicador pasa a "○ sin proyector" al cerrar la presentación.
