# Registro de ediciones por serie

Una **edición** es una capa fina de diseño propia de UNA serie: un gesto
distintivo validado una vez que rige todas las clases de esa serie. El
sistema evoluciona ENTRE series (frescura), nunca dentro de una
(coherencia). El plan la declara con `"edicion": "<clave>"` (contrato 1.4).

Constitución (exigida por validar.py): selectores en ámbito `.diapo`
(o `@`/`body.alto-contraste`); colores SOLO `var(--token)`,
`currentColor` o `transparent`; sin `vw`/`vh`, `position:fixed` ni
scroll; `font-size` ≥ 13px. Crear una edición = sesión de diseño:
QA visual con `scripts/capturar.py` antes de adoptarla.

| Clave | Serie | Gesto | Estado |
|---|---|---|---|
| `diseno-divino` | El diseño divino para los hombres de la iglesia | Rombo de la serie en kickers y riel de secuencia | Demo — pendiente de aprobación del docente |
