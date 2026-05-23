# Phase 4 — Indicador de autoría + contra-scan + voice fingerprint

## Estado

`planning` — placeholder. Detalle se completa al cierre de Fase 3.

## Objetivo

Tres sub-features que cierran el modelo de autoría pastoral:

1. **Autoría verbatim tracker**: diff entre draft AI y final del pastor por sección; badge visible; gate publish ≥50% verbatim.
2. **Contra-scan obligatorio**: surface chunks de la biblioteca que disienten del claim central; pastor marca uno como "considerado" con nota ≥100 chars. Implementa Hch 20:27.
3. **Voice fingerprint** (tardía): adapter de estilo desde sermones previos del pastor para que output suene a ÉL. Resuelve homogeneización + autenticidad.

## Prerequisitos

- Fase 3 completa (fidelity pass establece quality floor)
- Corpus de sermones previos del pastor (para voice fingerprint) — opcional, pastor sin corpus usa default

## Decisiones tomadas

Ninguna ADR específica aún. Basadas en [01-architecture.md §§ 6, 7, 8](../01-architecture.md).

## Decisiones pendientes (TBD al iniciar fase)

- Algoritmo de diff (word-level vs sentence-level vs semantic)
- Default verbatim threshold (¿50%? configurable por confesión?)
- Cuántos chunks contra-posición surface (¿exactamente 3, o "hasta 5"?)
- Mínimo de chunks contra-scan disponibles para activar el gate (qué pasa si la biblioteca es pequeña)
- Voice fingerprint: técnica (fine-tune vs few-shot vs RAG con sermones previos)
- Voice fingerprint: corpus mínimo (¿5 sermones? ¿10?)
- Voice fingerprint: privacidad — sermones del pastor no entran a entrenamiento general

## Arquitectura propuesta (alto nivel)

### Sub-feature 1: Autoría verbatim tracker

```typescript
interface AuthorshipTracker {
  computeVerbatim(originalDraft: string, finalText: string): VerbatimReport;
}

interface VerbatimReport {
  bySection: SectionVerbatim[];
  overall: number;          // 0-1
  gateStatus: 'pass' | 'block';
}
```

### Sub-feature 2: Contra-scan

```typescript
interface ContraScan {
  findDissentingChunks(centralIdea: string, library: LibraryRef): Promise<DissentingChunk[]>;
  recordConsideration(chunkId: string, note: string): void;
}
```

### Sub-feature 3: Voice fingerprint

TBD — técnica abierta. Posibles:
- Fine-tune adapter (costoso, calidad alta, privacidad complicada)
- Few-shot prompting con 3-5 sermones previos (barato, calidad media, fácil)
- RAG: chunks de estilo del pastor + instrucción "imita esta voz" (barato, calidad media-alta)

Recomendación tentativa: empezar con few-shot, evaluar.

## Reuso identificado

- Library + recommendations (PR #93) → contra-scan base
- Editor del sermón → surface de autoría
- Sermones existentes del pastor → corpus de voice fingerprint
- Wizard publish gate (extender)

## Detalle TBD

- Diff algorithm choice
- Voice fingerprint technique decision
- UX del badge de autoría
- UX del contra-scan panel

## Bitácora

- **2026-05-22** — Placeholder creado.
