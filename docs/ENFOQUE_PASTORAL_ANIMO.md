# Nuevo Enfoque: Pastoral con Tono de Ánimo

## Fecha de Implementación
2025-12-11

## Descripción del Cambio

Se agregó un nuevo enfoque homilético **"Pastoral con tono de ánimo"** al generador de enfoques. Este enfoque se diferencia del enfoque exhortativo tradicional, centrándose específicamente en:

- **Consolar** y traer esperanza
- **Animar** a través de verdades doctrinales
- **Fortalecer** la confianza y fe de la iglesia

## Motivación

El enfoque exhortativo tradicional tiende a motivar a la acción, mientras que el enfoque pastoral con tono de ánimo se centra en:
- Traer consuelo a través de la doctrina
- Dar esperanza en momentos de desánimo
- Fortalecer la seguridad de la fe
- Animar basándose en las verdades teológicas sólidas

## Archivos Modificados

### 1. `packages/domain/src/entities/HomileticalApproach.ts`

**Cambio:** Se agregó `'de ánimo'` como nuevo tipo de tono para sermones.

```typescript
export type SermonTone =
    | 'exhortativo'     // Encouraging, uplifting
    | 'de ánimo'        // Comforting, hope-giving, faith-strengthening  ← NUEVO
    | 'didáctico'       // Teaching, instructional
    | 'frontal'         // Direct, confrontational
    | 'académico'       // Scholarly, analytical
    | 'conversacional'  // Casual, relatable
    | 'persuasivo';     // Convincing, compelling
```

### 2. `packages/infrastructure/src/gemini/prompts/HomileticsPromptBuilder.ts`

**Cambios realizados:**

#### a) Agregado nuevo tipo de enfoque en las instrucciones:

```typescript
2. **Pastoral con tono de ánimo**: Enfocado en traer esperanza y fortalecer la confianza
   - Tono: De ánimo, consolador
   - Para: Creyentes que necesitan consuelo, esperanza y fortalecimiento de la fe
   - Nota: A través de la doctrina, busca animar y dar seguridad espiritual
```

#### b) Actualizada la lista de tonos disponibles:

```typescript
3. **Tono**: exhortativo, de ánimo, didáctico, frontal, académico, conversacional, o persuasivo
```

#### c) Agregado ejemplo en el JSON de salida:

```typescript
{
  id: "pastoral-2",
  type: "pastoral",
  direction: "Traer esperanza y fortalecer la confianza en Dios",
  tone: "de ánimo",
  purpose: "Consolar y animar a través de la doctrina de la fidelidad de Dios",
  suggestedStructure: "Introducción empática → Verdades doctrinales → Aplicación esperanzadora",
  targetAudience: "Creyentes desanimados que necesitan fortalecimiento de fe",
  // ...
}
```

## Impacto en la UI

El componente `ApproachCard.tsx` ya está preparado para mostrar el nuevo tono. La interfaz mostrará:

- Un badge con el tono "de ánimo" junto al tipo de enfoque
- La dirección, propósito y audiencia objetivo específicos
- La estructura sugerida y las aplicaciones contemporáneas

## Uso en la Generación de Sermones

Ahora, cuando el usuario genere enfoques homiléticos, la IA podrá:

1. Identificar pasajes que se prestan para consuelo y ánimo
2. Generar enfoques pastorales con tono de ánimo cuando sea apropiado
3. Diferenciar entre sermones exhortativos (que motivan a la acción) y sermones de ánimo (que consuelan y fortalecen la fe)

## Ejemplo de Uso

Para un pasaje como **Filipenses 2:1-11**, la IA podría generar:

### Enfoque Pastoral Exhortativo:
- **Tono:** Exhortativo
- **Dirección:** "Adoptar la mentalidad de Cristo en la comunidad"
- **Propósito:** Motivar a la iglesia a practicar la humildad

### Enfoque Pastoral con Tono de Ánimo:
- **Tono:** De ánimo
- **Dirección:** "Encontrar esperanza en el ejemplo de Cristo"
- **Propósito:** Consolar a los creyentes recordándoles que Cristo se identifica con su sufrimiento
- **Audiencia:** Creyentes desanimados o pasando por dificultades

## Conclusión

Este cambio enriquece las opciones homiléticas disponibles, permitiendo a los pastores elegir un enfoque más matizado que se adapte mejor a las necesidades de su congregación, especialmente en contextos donde el consuelo y la esperanza son más apropiados que la exhortación a la acción.
