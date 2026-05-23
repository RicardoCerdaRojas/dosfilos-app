# ADR-001 — Corrección pastoral anclada en confesión declarada por el propio pastor

## Estado

`accepted`

## Fecha

2026-05-22

## Contexto

La iniciativa de pastoral fidelity requiere un mecanismo para corregir observaciones pastorales erradas sin caer en autoritarismo del sistema. Tres modos de fallo a distinguir:

1. Ignorancia inocente (formación parcial)
2. Ignorancia doctrinal (rechazo previo de doctrinas)
3. Intencionalidad (falso maestro consciente)

Cualquier solución debe satisfacer:

- **No imponer una posición denominacional del sistema** — Preach no es una iglesia.
- **No dejar al pastor sin estructura** — ChatGPT genérico no corrige.
- **Honrar Apolos pattern (Hch 18:26)**: corrección privada, gentil, con más texto, no con autoridad.
- **Detectar deriva sistemática** — falso maestro no debe encontrar enabling.
- **Mantener stake del pastor en su propia formación** — sistema no es obispo.

El motor de citas actual valida identidad de fuente pero no contenido ni convicción. No suficiente.

## Decisión

El pastor declara una **confesión teológica personal** al onboarding. Esa confesión funciona como **Testigo 3** del mecanismo de validación de tres testigos.

El sistema usa la confesión que el propio pastor declaró como ancla — no impone una. El disenso se mide contra **su propia confesión**, no contra una posición del sistema.

Estructura:

- Confesiones soportadas en v1 (lista exacta TBD pregunta Fase 0, opciones propuestas):
  - Confesión de Westminster (WCF)
  - Confesión Bautista de Londres 1689
  - 39 Articles (anglicana)
  - Lausanne Covenant + Manila + Cape Town
  - Catecismo Mayor de la Iglesia Católica
  - Confesión de Augsburgo
  - "No-confesional declarado" (usa solo credos ecuménicos clásicos)
- Cada confesión se carga con su texto + tagging por tema (justificación, eclesiología, escatología, sacramentos, etc.)
- Al onboarding, pastor selecciona UNA. Editable solo con justificación escrita (audit log).

Escalado de disenso (de los tres testigos combinados):

| Disensos | Acción |
|---|---|
| 0 | Pasa sin fricción |
| 1 | Nota informativa |
| 2 | Bloqueo blando: respuesta escrita ≥50 chars |
| 3 | Bloqueo duro: invoke Faculty doctrinal + declaración ≥100 chars |

**Excepción — bloqueo absoluto sin override**: claims que niegan credos ecuménicos clásicos (Nicea 325, Calcedonia 451). Lista exacta TBD en ADR de Fase 2. Esto NO es partisanship — son límites cristianos clásicos compartidos por toda confesión apostólica.

## Alternativas consideradas

| Alternativa | Por qué descartada |
|---|---|
| **Sistema impone confesión única** (ej. Reformed) | Excluye usuarios de otras tradiciones. Subjetiviza al sistema en disputas denominacionales. |
| **No anclar a confesión, solo Escritura + paralelos** | Insuficiente — Escritura interpretada varía por marco. Sin ancla confesional, "tres testigos" se reduce a "dos testigos + LLM bias". |
| **Confesión opcional editable después** | Diluye Testigo 3 — pastores skippean al onboarding y nunca lo configuran. Hace el mecanismo aspiracional. |
| **Confesión derivada automáticamente del comportamiento** | Peligroso — sistema infiere posición teológica del usuario sin consentimiento. Falla en pastores en transición. |
| **Solo credos ecuménicos como ancla universal** | Demasiado amplio — no detecta deriva en doctrinas distintivas (paedobautismo vs. credo, etc.). Pierde resolución. |
| **Comité de pastores humanos revisa** | No escala. Costoso. Crea cuello de botella. |

## Consecuencias

### Positivas

- Pastor recibe corrección desde **su propia tradición**, no desde una imposición externa. Más probable que acepte.
- Sistema se mantiene confesionalmente neutral — opera en cualquier denominación cristiana clásica.
- Deriva detectable: si el pastor empieza a rechazar sistemáticamente su propia confesión, el audit lo revela. Self-evidence para conversación pastoral.
- Credos ecuménicos como base evita bloquear al sistema en disputas denominacionales (paedo vs. credo no es Nicea).

### Negativas

- Requiere mantenimiento de un catálogo de confesiones con tagging por tema (~3-5 días iniciales + curación ongoing).
- Pastores no-confesionales o de tradiciones muy específicas (carismáticos, dispensacionalistas no-confesionales formales, iglesias indígenas) pueden no encajar. Mitigación: opción "no-confesional declarado" usa solo credos ecuménicos.
- Falsa sensación de seguridad: pastor puede declarar confesión X y no conocerla. Mitigación: Faculty doctrinal en bloqueo duro expone tensiones específicas.

### Neutrales

- Onboarding se alarga (~2-3 min adicionales).
- Pricing puede justificar tier "ministerio confesional" con confesión custom uploaded.

## Impacto

- **Código afectado**:
  - Onboarding flow (selector)
  - User profile schema (`declaredConfession: ConfessionId`)
  - Nueva colección `confessions/` con textos + tagging
  - Three witnesses orchestrator (consume confesión)
- **Fases impactadas**: 0 (catálogo + selector), 2 (testigo 3 + escalado)
- **Migraciones requeridas**: backfill confesión para users existentes (lazy al primer proyecto post-launch)
- **Reversibilidad**: media — el catálogo + selector es eliminable pero remover el mecanismo de tres testigos requiere repensar la validación

## Referencias

- Phase doc: [phase-0-foundations.md](../phases/phase-0-foundations.md), [phase-2-three-witnesses.md](../phases/phase-2-three-witnesses.md)
- Architecture: [01-architecture.md § Tres testigos](../01-architecture.md#componente-3-tres-testigos-para-validación)
- Memoria: `priorities_repositioning`, `feedback_clarify_product_intent`
