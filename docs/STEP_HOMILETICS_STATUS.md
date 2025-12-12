# ⚠️ ESTADO ACTUAL: StepHomiletics Parcialmente Refactorizado

## 📊 Progreso

✅ **Completado**:
1. Imports actualizados (hooks agregados)
2. Hooks inicializados (`chatHook`, `refineSectionWithCache`)
3. `handleGenerate` actualizado para capturar `cacheName`

⏳ **Pendiente**:
4. Reemplazar función `handleSendMessage` completa
5. Actualizar props de `ChatInterface`
6. Limpiar código muerto

## 🚨 Situación

El archivo tiene **MUCHOS errores** porque la función `handleSendMessage` (400+ líneas) aún usa:
- `setMessages` (no existe, ahora es `chatHook.setMessages`)
- `messages` (ahora es `chatHook.messages`)
- `isAiProcessing` (ahora es `chatHook.isAiProcessing`)
- `setIsAiProcessing` (usar `chatHook`)
- `libraryResources` (ahora es `chatHook.libraryResources`)
- `selectedStyle` (ahora es `chatHook.selectedStyle`)
- etc.

## 💡 Dos Opciones

### Opción 1: Reemplazo Completo Automático (Riesgoso)
Yo reemplazo toda la función `handleSendMessage` (400+ líneas) con código que usa hooks.

**Pro**: Rápido  
**Con**: Alto riesgo de romper algo, difícil de revisar

### Opción 2: REVERT + Guía Manual (Recomendado) ⭐
1. Hago REVERT de StepHomiletics (volvemos al estado original funcional)
2. Te doy una guía PASO A PASO con diff claro
3. Tú aplicas los cambios uno por uno, entendiendo cada paso
4. Menor riesgo, mayor comprensión

## 🎯 Mi Recomendación

Dado que:
- St

epHomiletics tiene 700+ líneas
- El código funciona actualmente (sin cache)
- La refactorización es compleja
- Ya tienes documentación completa

**Sugiero**: 

### **Plan C - Implementación Incremental Simple**

**NO usar hooks en StepHomiletics/StepDraft por ahora**  
**SÍ implementar solo la funcionalidad del cache manualmente**

---

## 📋 Plan C - Implementación Mínima del Cache

### Lo que necesitas cambiar en StepHomiletics (5 puntos):

#### 1. **Actualizar `handleGenerate`** ✅ (YA HECHO)
```typescript
const { homiletics: result, cacheName: newCacheName } = 
    await sermonGeneratorService.generateHomiletics(...);

if (newCacheName) {
    setCacheName(newCacheName);
}
```

#### 2. **Agregar `handleRefreshContext`** (25 líneas)
```typescript
const handleRefreshContext = async () => {
    try {
        toast.loading('Regenerando contexto (Cache)...');
        const effectiveResourceIds = selectedResourceIds.length > 0
            ? selectedResourceIds
            : (config?.[WorkflowPhase.HOMILETICS]?.libraryDocIds || []);

        const result = await sermonGeneratorService.refreshContext({
            ...config?.[WorkflowPhase.HOMILETICS],
            libraryDocIds: effectiveResourceIds
        } as any);
        
        if (result.cacheName) {
            setCacheName(result.cacheName);
            setMessages([]);
            toast.dismiss();
            toast.success(`Contexto regenerado con ${result.cachedResources?.length || 0} recurso(s)`);
        }
    } catch (error: any) {
        toast.dismiss();
        toast.error('Error al regenerar contexto');
    }
};
```

#### 3. **En modo refinamiento (línea ~230-280)**: Agregar fallback a cache
```typescript
// ANTES de llamar a aiService.refineContent:
if (cacheName) {
    console.log('🚀 Using cache for refinement');
    const cachedResources = libraryResources
        .filter(r => effectiveResourceIds.includes(r.id) && r.metadata?.geminiUri)
        .map(r => ({ title: r.title, author: r.author }));
    
    aiResponse = await sermonGeneratorService.refineContent(contentString, instruction, {
        cacheNameame,
        cachedResources
    });
} else {
    // Código actual de RAG...
}
```

#### 4. **En chat general (línea ~398-410)**: Pasar cacheName
```typescript
const response = await generatorChatService.sendMessage(message, {
    passage: passage || '',
    currentContent: homiletics,
    focusedSection: null,
    libraryResources: libraryResources,
    phaseResources: phaseResources as any,
    cacheName: cacheName || undefined  // ← AGREGAR ESTA LÍNEA
});
```

#### 5. **En ChatInterface props (línea ~648-667)**: Agregar activeContext
```typescript
<ChatInterface
    // ... props existentes ...
    activeContext={{
        isCached: !!cacheName,
        resources: libraryResources.map(r => ({ title: r.title, author: r.author }))
    }}
    onRefreshContext={handleRefreshContext}
/>
```

---

## ✅ Resultado Final

Con estos 5 cambios mínimos:
- ✅ Cache funciona en generación
- ✅ Cache funciona en refinamiento
- ✅ Cache funciona en chat general
- ✅ Botón "Regenerar Contexto" funciona
- ✅ NO rompemos código existente
- ✅ NO duplicamos tanto código

**Tiempo estimado**: 15-20 minutos  
**Riesgo**: BAJO (cambios pequeños y localizados)

---

## 🤔 ¿Qué Hacemos?

**A)** REVERT StepHomiletics y seguir Plan C (cambios mínimos) ⭐ **Recomendado**  
**B)** Continuar con refactorización completa (alto riesgo)  
**C)** Pausar y revisar manualmente

---

**Mi voto**: **Opción A (Plan C)** - Pragmático, seguro, rápido.

Los hooks quedan creados para refactorización futura cuando tengas más tiempo.
