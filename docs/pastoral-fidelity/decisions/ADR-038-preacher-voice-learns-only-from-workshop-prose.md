# ADR-038 — La voz del predicador aprende sólo de la prosa que él armó

## Estado

`accepted`

## Fecha

2026-08-27

## Contexto

Fase 4 sub-feature 3 (*voice fingerprint*): que el borrador generado suene al
pastor y no a un texto genérico. Resuelve la homogeneización y la autenticidad.

Al abrirla, dos de las tres sub-features de Fase 4 ya estaban cerradas:
sub-feature 1 (autoría verbatim ≥50%) quedó **superada por
[ADR-037](./ADR-037-socratic-drafting-idea-provenance.md)** — medir palabras
mide *desarrollo*, no origen — y sub-feature 2 (contra-scan) está en producción
desde junio por [ADR-033](./ADR-033-contra-scan-independent-confrontation-step.md).
La voz era la única abierta.

El phase-4 doc dejaba tres preguntas sin responder: **técnica** (fine-tune vs
few-shot vs RAG), **corpus mínimo**, y **privacidad** (los sermones del pastor no
entran a entrenamiento general).

Y había una tensión no resuelta: el prompt del borrador ya lleva un bloque
`PRIMARY VOICE` (la semilla pastoral) y una `SermonPersonalization`. Una tercera
voz podía competir con las dos.

### El riesgo que ningún documento anotaba

Un sermón publicado **pudo salir entero del modelo** por el camino de emergencia.
Aprender de ése sería aprender **nuestra** voz y devolvérsela al pastor como si
fuera la suya — un bucle que se cierra sobre sí mismo y se vuelve más
convincente en cada vuelta, porque el modelo reconoce su propia prosa como
"correcta".

## Decisión

**1. Dos etapas, y la segunda es condicional.** Etapa 1 con *few-shot*:
fragmentos literales de sus sermones viajan en el prompt como muestra de estilo.
Etapa 2 (perfil destilado: ritmo, léxico, cómo abre y cierra) **sólo se
construye si la etapa 1 no resulta estable** — y eso lo decide el fundador
leyendo un borrador en voz alta, no una métrica.

**2. Sólo en la generación del borrador.** En el taller la prosa ya la decide él
frase a frase; ahí la huella aporta menos y arriesga más. En el camino de
emergencia, en cambio, el texto sale entero del modelo y es donde más desentona.

**3. Sólo aprende de sermones armados en el taller.** El discriminador es
`authorshipSnapshot`, **no** `assembledFrom`: la copia publicada no lleva
`wizardProgress`, así que `assembledFrom` no sobrevive a la publicación, pero el
snapshot sí — y sólo existe si hubo decisiones en el taller. Los sermones
anteriores a ese campo **tampoco entran**: no se sabe quién escribió esa prosa, y
una huella construida sobre una suposición suena a él sin serlo.

**4. Cuatro salvaguardas, cada una contra un fallo concreto:**

| Salvaguarda | Qué evita |
|---|---|
| No el mismo pasaje | Copiar el contenido del sermón viejo; el nuevo nacería siendo el anterior |
| Mínimo dos sermones | Con uno, lo destilado no es una voz sino *ese* sermón — un remake |
| El fragmento sale del cuerpo | El saludo es lo más parecido entre un sermón y otro |
| Fragmentos delimitados | Que el sermón del pastor se lea como una instrucción más del prompt |

**5. La instrucción que carga el peso: imitar la VOZ, nunca el CONTENIDO.** Sin
decirlo de forma explícita y al final del bloque, con fragmentos de su sermón de
Jonás el sermón de Santiago hereda las ilustraciones de Jonás — se parecería
mucho al pastor y sería **el sermón equivocado**.

**6. Silencio sin corpus.** Sin material suyo del que aprender, el sermón se
escribe como hoy y **no se le avisa de ninguna carencia**. Misma regla que
gobierna la procedencia del borrador (ADR-037) y la autoría: sin dato, no se
dice nada.

**7. Orden en el prompt: después de `PRIMARY VOICE`.** La voz primaria dice QUÉ
tiene que decir el sermón (su idea, sus observaciones); la huella dice CÓMO suena
cuando lo dice él. Ponerla antes la dejaría compitiendo con el contenido al que
debe servir.

**8. Privacidad.** Nada sale de su cuenta y **nada entrena a ningún modelo**: es
su propio texto, en su propia generación. Por eso se descartó el fine-tune sin
más análisis — habría exigido sacar sus sermones de su cuenta.

## Alternativas consideradas

| Alternativa | Por qué descartada |
|---|---|
| Fine-tune con sus sermones | Exige sacar su texto de su cuenta. La restricción de privacidad la elimina antes de evaluar costo. |
| Empezar por el perfil destilado | Añade un paso que puede destilar mal, antes de saber si hace falta. Se paga sólo si la etapa 1 no alcanza. |
| Aprender de TODOS sus sermones publicados | Los generados enseñarían nuestra propia voz de vuelta. El bucle es el riesgo central de esta feature. |
| Aplicarla también en el taller | Ahí la prosa ya es suya; una voz impuesta sobre lo que está escribiendo se lee como una corrección. |
| Avisar cuando falta corpus | Una carencia anunciada es un reproche por no haber publicado suficiente. |

## Consecuencias

### Positivas

- El camino de emergencia deja de producir prosa genérica, que era su peor
  defecto frente al taller.
- `authorshipSnapshot` (ADR-037, PR #488) resultó ser la pieza que hacía falta:
  el trabajo de autoría habilitó el de voz sin haberlo previsto.
- Reversible: sub-flag `voice_fingerprint` default off, radio de impacto cero.

### Negativas

- El prompt crece ~1.800 caracteres cuando hay corpus. Aceptado: es texto suyo y
  el efecto es directamente el que la feature busca.
- La calidad depende de cuántos sermones haya armado en el taller. Un pastor
  nuevo no la ve — y no se le dice.
- Queda una lectura extra de sermones publicados por generación (best-effort: si
  falla, se genera sin voz).

### Neutrales

- El phase-4 doc queda cerrado en sus tres preguntas abiertas (técnica, corpus
  mínimo, privacidad).

## Impacto

- **Dominio**: `voice/selectVoiceSamples.ts`, `voice/buildVoiceBlock.ts`,
  `GenerationRules.voiceSamples`, flag `voice_fingerprint`.
- **Web**: `draft/loadVoiceSamples.ts`, cableado en `useDraftGeneration`.
- **Infraestructura**: el bloque entra en `prompts-generator` tras `PRIMARY VOICE`.
- **Migraciones**: ninguna — aditivo y opt-in.
- **Reversibilidad**: alta (flag default off).

## Referencias

- Phase doc: `phases/phase-4-authorship-contrascan-voice.md`
- ADRs: ADR-037 (procedencia de ideas — origen de `authorshipSnapshot`),
  ADR-033 (contra-scan, sub-feature 2), ADR-032 (`fidelity_pass` dormante)
- PR: #496
