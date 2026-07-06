# Preach — Fidelidad pastoral: narrativa de valor

> Doc para pitch / founder log. Qué construimos, por qué es defendible, y qué
> gana el pastor. Estado a 2026-07-05.

## En una frase

Preach pasó de *"te genero un sermón"* a *"me encuentro con tu texto de verdad, y
si te corrijo, lo hago con Escritura que sé que es real y que sí dice lo
contrario"*. **Profundidad + confianza** — las dos cosas que un pastor necesita
para apoyar su predicación en una herramienta.

## El problema que resolvimos

Dos fallas silenciosas mataban la confianza de un pastor:

1. **Aplanamiento del texto.** Un pasaje de 20 versos se trataba igual que uno de
   uno. Se perdían alusiones al Antiguo Testamento, movimientos argumentales,
   ilustraciones, lecturas erróneas frecuentes. El sermón salía chato.

2. **Escritura fabricada.** Cuando el estudio corregía una lectura errónea del
   pastor (ej. *"aquí se pierde la salvación"*), el verso correctivo podía ser
   **inventado por el modelo** o **no refutar** de verdad la lectura. Confrontar a
   un pastor con un versículo falso es peor que no confrontarlo: rompe la
   credibilidad de todo el producto.

## Qué construimos

### 1. Cobertura adaptativa al pasaje

El sistema lee el pasaje y detecta lo que de verdad contiene — alusiones al AT,
lecturas erróneas frecuentes, ilustraciones, paralelismos, personajes, cruces
textuales, movimientos — y **condiciona el estudio guiado para que el sermón
cubra lo que ese pasaje exige**. Un pasaje grande deja de perder su profundidad.

### 2. Fidelidad del ancla (el diferenciador)

Toda ancla con la que el sistema confronta una lectura errónea cumple, **por
construcción**, tres cosas:

- **Es real** — el verso existe, verificado de forma determinista en el momento de
  usarlo (no se hereda de un dato guardado que pudo quedar viejo).
- **Refuta de verdad** — un evaluador teológico lo confirma y un humano responsable
  lo aprueba antes de que entre en juego.
- **Si no se puede garantizar, no confronta.** *Fail-closed*: preferimos no
  confrontar antes que confrontar con dato flojo.

Sobre esto vive un **piso curado** de lecturas peligrosas (pierde-salvación,
prosperidad, legalismo, "no criticar al ungido", maldición generacional, etc.),
cada una con su ancla verificada. Se amplía como **dato** (sin desplegar código),
revisado antes de activarse.

## Medición honesta (A/B, 2026-07-05)

Corrimos el A/B sobre 15 lecturas peligrosas: el modelo crudo (Sonnet) propone el
verso que refuta; nuestro gate lo filtra. Resultado, sin spin:

- **Fabricadas (verso no existe): 0%.** Los modelos frontera **casi no inventan
  referencias bíblicas conocidas** — saben que Juan 10:28-29 existe.
- **No-refutan (existe pero no refuta): 7%** (1/15, el caso "diezmo→prosperidad",
  una mala aplicación). Nuestro adjudicador conservador lo bloqueó.
- **Bloqueado por el gate: 7%.** (Y el A/B fue generoso con el crudo: best-of-5
  versos; en un sermón real se compromete con uno → la tasa real sería mayor.)

**Lectura franca:** para **anclas bíblicas sobre pasajes comunes**, un buen modelo
ya está bastante bien solo. El valor de la fidelidad del ancla ahí NO es un % de
fabricación dramático — es la **garantía** (0% vs una cola no-cero en pasajes
oscuros), el catch de **malas aplicaciones** (que el modelo "refuta" con
sobre-confianza), y la **reproducibilidad + responsable humano**.

### Los dos modos de falla (clave del foso)

El número dramático NO está en los versos — está en las **citas atribuidas a
autores**:

| Modo de falla | Tasa de fabricación del modelo crudo |
|---|---|
| Referencia bíblica (¿existe el verso?) | **baja** — conoce el canon |
| Cita atribuida a un comentarista (¿lo dijo?) | **alta** — inventa qué "dijo" un teólogo |

En un solo sermón real, el redactor fabricó **4 citas** atribuidas a autores
reales (Kistemaker, Green) que no están en la fuente. Ese es el riesgo grande y
medible — y donde el foso pesa de verdad: **nunca ponemos palabras falsas en boca
de un autor real**. (Trabajo en curso: propuesta de fidelidad-en-redacción.)

## Por qué es defendible (el foso)

No hicimos al modelo "más inteligente". Hicimos algo que un modelo general, por
mejor que sea, **no puede ofrecer solo con prompting**:

- **Cero citas fabricadas, garantizado.** La existencia del verso es un chequeo
  **determinista** contra el canon, no una probabilidad. Un modelo general —
  incluso frontera — alucina referencias y afirma que un verso "refuta" cuando no.
  Ninguna cantidad de prompt elimina eso; la verificación determinista sí.
- **Comportamiento garantizado, no solo mejorado.** El sistema **se rehúsa** cuando
  no puede verificar. Un agente general confronta con seguridad aunque esté
  equivocado. Es otro eje: garantía de comportamiento, no puntaje de calidad.
- **Reproducible y auditable.** Las decisiones núcleo son funciones puras,
  testeadas, con guardas probadas por reversión (si alguien afloja el gate, rompe
  el CI). El comportamiento no deriva corrida a corrida.
- **Responsable nombrado.** Un humano aprueba las correcciones peligrosas. Un
  modelo no da rendición de cuentas; una institución sí.

## Dónde está hoy

- **Piso curado + fidelidad del ancla:** vivo; confronta para los usuarios en
  dogfood (tras los flags).
- **Medición en sombra:** corre para todos — mide cuánto acierta el detector antes
  de ampliar la protección.
- **Admin completo:** curar / editar / borrar / aprobar, con revisor responsable.

## El límite honesto (qué NO hace)

- Cubre lecturas **falsas y refutables** (hay un verso que dice lo contrario). NO
  cubre **malas aplicaciones de versos verdaderos** (ej. *"todo lo puedo = puedo
  lograr cualquier meta"* — la frase es cierta, no hay verso que la contradiga) ni
  **tensiones teológicas** donde tradiciones fieles difieren. Ahí no imponemos.
- El piso curado hoy es **chico** (decenas de entradas). La escala a volumen
  depende de un módulo de catálogos (fase siguiente), aún no construido.
- La **inteligencia teológica** de fondo es la del modelo subyacente. Nuestro valor
  es el arnés que lo vuelve confiable, no un salto de razonamiento.

## Qué sigue

- **Dogfood:** juntar sesiones reales, revisar la tasa de acierto del detector,
  decidir ampliar la protección a más usuarios.
- **Escala del piso:** módulo de catálogos para poblar lecturas peligrosas a
  volumen con revisión.
- **Número de pitch de las citas atribuidas:** el A/B de versos ya corrió (foso
  chico ahí). El número grande está en las **citas a comentaristas** — pero solo
  se mide creíblemente contra las **fuentes reales cargadas** (que el verificador
  ya chequea al publicar). No sirve un sintético sin fuentes de verdad. Plan:
  instrumentar el verificador existente para contar fabricaciones por sermón y
  **tabular sobre los sermones reales del dogfood** (ya tenemos 1 punto: 4
  fabricadas en 1 sermón). Ese es el titular defendible.
