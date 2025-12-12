# Plan de Implementación: Cache de Gemini en StepHomiletics y StepDraft

## Objetivo
Aplicar todas las mejoras del cache de Gemini que implementamos en StepExegesis a los otros dos steps (Homilética y Draft).

## Cambios Necesarios

### 1. **Estado del Componente**
Agregar estados para:
- `cacheName: string | null`
- `lastContextRefresh: Date | null`  
- `libraryResources: LibraryResourceEntity[]`

### 2. **Carga de Recursos de Biblioteca**
Agregar useEffect para cargar recursos (igual que StepExegesis):
```typescript
useEffect(() => {
    const loadLibrary = async () => {
        if (!user?.uid) return;
        try {
            const resources = await libraryService.getUserResources(user.uid);
            setLibraryResources(resources);
        } catch (error) {
            console.warn('Could not load library resources:', error);
        }
    };
    loadLibrary();
}, [user?.uid]);
```

### 3. **Función handleRefreshContext**
Agregar función para regenerar contexto (igual que StepExegesis):
```typescript
const handleRefreshContext = async () => {
    // Calcular effectiveResourceIds
    // Llamar a sermonGeneratorService.refreshContext()
    // Actualizar cacheName y lastContextRefresh
    // Limpiar mensajes del chat
    // Mostrar toast con feedback
};
```

### 4. **Mejorar handleGenerate**
Actualizar para crear/actualizar cache al generar:
```typescript
const handleGenerate = async () => {
    // ... código existente ...
    
    // For StepHomiletics:
    const { homiletics: result, cacheName: newCacheName } = 
        await sermonGeneratorService.generateHomiletics(exegesis, rules, homileticsConfig, user?.uid);
    
    // For StepDraft:
    const { draft: result, cacheName: newCacheName } = 
        await sermonGeneratorService.generateSermonDraft(homiletics, rules, draftConfig, user?.uid);
    
    if (newCacheName) {
        setCacheName(newCacheName);
        setLastContextRefresh(new Date());
    }
};
```

### 5. **Reemplazar lógica de Chat**
Cambiar de lógica personalizada a `GeneratorChatService`:

**Chat General** (sin sección expandida):
```typescript
// Reemplazar código actual por:
const response = await generatorChatService.sendMessage(message, {
    passage, // O el contexto apropiado
    currentContent: homiletics, // O draft
    focusedSection: null,
    libraryResources: effectiveResources,
    phaseResources: phaseResources as any,
    cacheName: cacheName || undefined
});
```

**Modo Refinamiento** (con sección expandida):
```typescript
// Ya existe lógica similar, solo asegurar que use:
if (cacheName) {
    // Usar sermonGeneratorService.refineContent() con cache
} else {
    // Fallback a RAG manual
}
```

### 6. **Validador de Contexto Mejorado**
Agregar lista de recursos disponibles al validador:
```typescript
const availableResources = libraryResources
    .filter(r => effectiveResourceIds.includes(r.id))
    .map(r => `${r.title} (${r.author})`)
    .join(', ');

const libraryContext = availableResources 
    ? `\n\nRecursos disponibles en biblioteca: ${availableResources}`
    : '';

const enhancedContext = `${currentContextStr.substring(0, 500)}${libraryContext}`;
const validation = await aiService.validateContext(message, enhancedContext);
```

### 7. **Pasar Props a ChatInterface**
Actualizar props:
```typescript
<ChatInterface
    // ... props existentes ...
    activeContext={{
        isCached: !!cacheName,
        lastRefresh: lastContextRefresh,
        resources: effectiveResources.map(r => ({ title: r.title, author: r.author }))
    }}
    onRefreshContext={handleRefreshContext}
/>
```

### 8. **Actualizar SermonGeneratorService**
Verificar que `generateHomiletics` y `generateSermonDraft` retornen el `cacheName`:

```typescript
// En SermonGeneratorService.ts
async generateHomiletics(...): Promise<{ homiletics: HomileticalAnalysis; cacheName?: string }> {
    // ...prepareGeminiContext...
    const homiletics = await this.generator.generateHomiletics(...);
    return { homiletics, cacheName };
}

async generateSermonDraft(...): Promise<{ draft: SermonContent; cacheName?: string }> {
    // ...prepareGeminiContext...
    const draft = await this.generator.generateSermonDraft(...);
    return { draft, cacheName };
}
```

## Archivos a Modificar

1. ✅ `/packages/web/src/pages/sermons/generator/StepHomiletics.tsx`
2. ✅ `/packages/web/src/pages/sermons/generator/StepDraft.tsx`
3. ✅ `/packages/application/src/services/SermonGeneratorService.ts` (si no retorna cacheName)

## Orden de Implementación

1. Primero verificar/actualizar SermonGeneratorService
2. Luego StepHomiletics  
3. Finalmente StepDraft

## Notas Importantes

- El WorkflowPhase correcto para Homiletics es `WorkflowPhase.HOMILETICS`
- El WorkflowPhase correcto para Draft es `WorkflowPhase.DRAFTING`
- Cada step tiene su propio config: `config[WorkflowPhase.HOMILETICS]` o `config[WorkflowPhase.DRAFTING]`
- El chat debe inicializarse con `generatorChatService.initializeForSermon(config.id, 'homiletics')` o `'sermon'`

