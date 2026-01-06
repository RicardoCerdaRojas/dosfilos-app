# Guía de Implementación: Cache de Gemini en StepHomiletics y StepDraft

## ✅ Estado Actual
- **StepExegesis**: ✅ Funciona perfectamente con cache
- **StepHomiletics**: ⏳ Pendiente de implementar
- **StepDraft**: ⏳ Pendiente de implementar

## 🎯 Objetivo
Replicar la funcionalidad del cache de Gemini que ya funciona en StepExegesis a los otros dos steps.

## 📋 Checklist para cada Step

### Para StepHomiletics:

1. **Estado del cacheName** ✅ (Ya existe en WizardContext)
   - El `cacheName` ya está disponible via `useWizard()`
   - Solo necesitas asegurarte de usarlo

2. **Actualizar handleGenerate** (Alto Priority)
   ```typescript
   const handleGenerate = async () => {
       // ... código existente ...
       
       const homileticsConfig = config?.[WorkflowPhase.HOMILETICS];
       
       // Cambiar esta línea:
       // const result = await sermonGeneratorService.generateHomiletics(...);
       
       // Por esta:
       const { homiletics: result, cacheName: newCacheName } = 
           await sermonGeneratorService.generateHomiletics(
               exegesis, 
               rules, 
               homileticsConfig, 
               user?.uid
           );
       
       setHomiletics(result);
       
       // Guardar el cacheName
       if (newCacheName) {
           setCacheName(newCacheName);
       }
   };
   ```

3. **Función handleRefreshContext** (Copiar de StepExegesis)
   ```typescript
   const handleRefreshContext = async () => {
       try {
           toast.loading('Regenerando contexto (Cache)...');
           
           const effectiveResourceIds = selectedResourceIds.length > 0
               ? selectedResourceIds
               : (config?.[WorkflowPhase.HOMILETICS]?.libraryDocIds || []);

           const refreshConfig = {
               ...config?.[WorkflowPhase.HOMILETICS],
               libraryDocIds: effectiveResourceIds
           };

           const result = await sermonGeneratorService.refreshContext(refreshConfig as any);
           
           if (result.cacheName) {
               setCacheName(result.cacheName);
               setMessages([]); // Limpiar chat
               toast.dismiss();
               toast.success(`Contexto regenerado con ${result.cachedResources?.length || 0} recurso(s)`);
           } else {
               toast.dismiss();
               toast.info(`Contexto actualizado (Sin caché)`);
           }
       } catch (error: any) {
           console.error('Error refreshing context:', error);
           toast.dismiss();
           toast.error('Error al regenerar contexto');
       }
   };
   ```

4. **Actualizar handleSendMessage - Modo Chat General**
   ```typescript
   // En la parte que llama al GeneratorChatService
   const response = await generatorChatService.sendMessage(message, {
       passage,
       currentContent: homiletics,
       focusedSection: null,
       libraryResources: effectiveResources,
       phaseResources: phaseResources as any,
       cacheName:cacheName || undefined  // ← AGREGAR ESTA LÍNEA
   });
   ```

5. **Actualizar handleSendMessage - Modo Refinamiento**
   ```typescript
   // Cuando expandedSectionId está activo
   if (cacheName) {
       console.log('🚀 Using Gemini Cache for refinement:', cacheName);
       
       const effectiveResourceIds = // ... calcular effective IDs
       const cachedResources = libraryResources
           .filter(r => effectiveResourceIds.includes(r.id) && r.metadata?.geminiUri)
           .map(r => ({ title: r.title, author: r.author }));

       aiResponse = await sermonGeneratorService.refineContent(
           contentString, 
           instruction, 
           { 
               cacheName, 
               cachedResources 
           }
       );
   } else {
       // RAG manual fallback
   }
   ```

6. **Actualizar ChatInterface props**
   ```typescript
   <ChatInterface
       // ... props existentes ...
       activeContext={{
           isCached: !!cacheName,
           lastRefresh: lastContextRefresh,  // Agregar este estado
           resources: effectiveResources.map(r => ({ title: r.title, author: r.author }))
       }}
       onRefreshContext={handleRefreshContext}
   />
   ```

7. **Estados adicionales necesarios**
   ```typescript
   const [lastContextRefresh, setLastContextRefresh] = useState<Date | null>(null);
   ```

### Para StepDraft:

**EXACTAMENTE LOS MISMOS PASOS**, pero:
- Cambiar `WorkflowPhase.HOMILETICS` por `WorkflowPhase.DRAFTING`
- Cambiar `homiletics` por `draft`
- Cambiar `setHomiletics` por `setDraft`
- Usar `generateSermonDraft` en lugar de `generateHomiletics`

## 🔍 Cómo Verificar que Funciona

Después de implementar en cada step:

1. **Genera contenido nuevo**
   - Debe mostrar en consola: `✅ Cache created: cachedContents/...`
   - El `cacheName` debe guardarse en el state

2. **Regenera contexto**
   - Click en "Regenerar Contexto"
   - Debe mostrar toast con "Contexto regenerado con X recurso(s)"
   - Los mensajes del chat deben limpiarse

3. **Usa el chat general**
   - Haz una pregunta sobre un autor de tu biblioteca
   - En consola debe aparecer: `🚀 [GeneratorChat] Using Gemini Cache`
   - Debe responder rápido (3-5 seg)
   - Debe citar correctamente las fuentes

4. **Usa el modo refinamiento**
   - Expande una sección y pide refinamiento
   - En consola debe aparecer: `🚀 Using Gemini Cache for refinement`
   - Debe aplicar el cambio correctamente

## 📦 Archivos para Referencia

Si te quedas atascado, puedes consultar:
- `/packages/web/src/pages/sermons/generator/StepExegesis.tsx` (implementación completa)
- `/packages/application/src/services/GeneratorChatService.ts` (lógica del chat)
- `/packages/infrastructure/src/gemini/prompts-generator.ts` (system prompts)

## 💡 Tips

- **Copia y pega con cuidado**: La lógica es idéntica, solo cambian los nombres de variables
- **Prueba incremental**: Implementa una característica a la vez y prueba
- **Logs son tus amigos**: Usa console.log para verificar que el cacheName se pasa correctamente
- **Los hooks están listos**: Si en el futuro quieres refactorizar más, los hooks `useSermonStepChat` y `useSermonSectionRefinement` ya están creados y listos para usar

## ⏱️ Tiempo Estimado

- StepHomiletics: 30-45 minutos
- StepDraft: 30-45 minutos
- Testing de ambos: 15-30 minutos

**Total: ~2 horas** para tener los 3 steps completos con cache de Gemini
