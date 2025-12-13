# Refactorización de Steps del Generador de Sermones

## ✅ Hooks Creados

### 1. `useSermonStepChat`
**Ubicación**: `/packages/web/src/hooks/useSermonStepChat.ts`

**Responsabilidad**: Maneja toda la lógica del chat para cualquier step

**Características**:
- ✅ Gestión de cache de Gemini
- ✅ Carga de recursos de biblioteca
- ✅ Validación de contexto con conocimiento de recursos
- ✅ Integración completa con GeneratorChatService
- ✅ Manejo de estilos de coaching
- ✅ Regeneración de contexto
- ✅ Construcción de `activeContext` para ChatInterface

**Uso**:
```typescript
const chatHook = useSermonStepChat({
    phase: WorkflowPhase.EXEGESIS,
    contentType: 'exegesis',
    configId: config?.id,
    passage,
    currentContent: exegesis,
    onContentUpdate: setExegesis,
    userId: user?.uid,
    config,
    selectedResourceIds,
    cacheName,
    setCacheName
});

// Disponible:
chatHook.messages
chatHook.isAiProcessing
chatHook.handleSendMessage
chatHook.handleRefreshContext
chatHook.activeContext
// ... y más
```

### 2. `useSermonSectionRefinement`
**Ubicación**: `/packages/web/src/hooks/useSermonSectionRefinement.ts`

**Responsabilidad**: Maneja el refinamiento de secciones con cache o RAG

**Características**:
- ✅ Detección automática de cache vs RAG
- ✅ Parsing inteligente de respuestas (JSON, texto, arrays)
- ✅ Manejo de fuentes y citas
- ✅ Formateo consistente

**Uso**:
```typescript
const { refineSectionWithCache } = useSermonSectionRefinement({
    phase: WorkflowPhase.EXEGESIS,
    contentType: 'exegesis',
    currentContent: exegesis,
    onContentUpdate: setExegesis,
    passage,
    libraryResources: chatHook.libraryResources,
    getEffectiveResourceIds: chatHook.getEffectiveResourceIds,
    cacheName: chatHook.cacheName,
    config,
    selectedResourceIds
});

// Usar:
const { refinedContent, sources } = await refineSectionWithCache(
    sectionId,
    sectionLabel,
    sectionPath,
    currentContent,
    userMessage,
    formattingInstructions
);
```

## 🔧 Impacto en los Steps

### Antes (StepExegesis.tsx):
- 1003 líneas
- Lógica de chat mezclada con UI
- Duplicación con otros steps

### Después (con hooks):
- ~600-700 líneas estimadas
- Lógica separada en hooks reutilizables
- Fácil de mantener y testear

## 📋 Próximos Pasos

1. ✅ Hooks creados
2. ⏳ Refactorizar StepExegesis para usar los hooks
3. ⏳ Probar que StepExegesis funciona correctamente
4. ⏳ Aplicar refactorización a StepHomiletics
5. ⏳ Aplicar refactorización a StepDraft

## 🎯 Beneficios

**Código Limpio**:
- Un cambio en la lógica de chat se propaga a todos los steps
- No más copy-paste de código

**Testeable**:
- Los hooks se pueden testear independientemente
- Lógica de negocio separada de UI

**Mantenible**:
- Bugs se arreglan en un solo lugar
- Nuevas features se agregan una vez

**Escalable**:
- Agregar un nuevo step es trivial
- Reusar lógica en otros componentes (ej: modal de edición rápida)

## 📊 Métricas de Reducción de Código

Estimado:
- **Antes**: 3 files × ~900 líneas = ~2700 líneas
- **Después**: 2 hooks (~500 líneas) + 3 files refactorizados (~600 cada uno) = ~2300 líneas
- **Reducción**: ~400 líneas (15% menos código)
- **Reducción de duplicación**: ~80%

## ⚠️ Consideraciones

- Los hooks son **genéricos** pero **no rígidos**: aceptan configuración específica por step
- **Backward compatible**: si un step necesita lógica custom, puede extender los hooks
- **Progressive enhancement**: podemos seguir mejorando los hooks sin tocar los steps

