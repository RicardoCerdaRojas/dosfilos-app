## Caso patológico — modelo emite blockquote inline

Aquí el modelo concatenó lo que debía ser multi-línea en una sola línea con separadores " > " literales en lugar de saltos de línea reales:

> **Nota:** Tres aspectos clave: > * **Aspecto A:** primer punto importante. > * **Aspecto B:** segundo punto. > * **Aspecto C:** tercer punto. > > Cierre del callout en su propia línea.

El normalizador debe convertir esto en un callout estructurado.
