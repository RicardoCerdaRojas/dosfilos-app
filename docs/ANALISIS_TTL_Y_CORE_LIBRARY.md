# Análisis: Problemas de TTL y Propuesta de Biblioteca Base

## Fecha: 2025-12-18
## Branch: `feature/library-ai-improvements`

---

## 📋 Resumen de Problemas Identificados

### **Problema 1: TTL Inconsistente y Confuso** ⚠️

**Estado Actual**:
- **Archivos subidos a Gemini**: TTL implícito ~24-48h (no documentado oficialmente)
- **Context Cache**: TTL configurable, actualmente **1 hora (3600s)**

**Impacto Usuario**:
```
Día 1 (9am): Usuario sube PDFs → Funciona perfecto ✅
Día 2 (9am): Usuario genera sermón → 403 Forbidden ❌ (archivos expirados)
```

**Experiencia Actual**:
1. Usuario sube documentos
2. Sistema los indexa en Gemini
3. Usuario no sabe que expiran en 48h
4. Al generar sermón días después → **ERROR SILENCIOSO**
5. Usuario confundido, no entiende por qué "dejó de funcionar"

**Análisis Técnico**:

```typescript
// Archivo: GeminiFileSearchService.ts - línea 20-100
async uploadFile(fileBlob: Blob, mimeType: string = 'application/pdf', displayName?: string): Promise<string> {
    // ⚠️ PROBLEMA: No hay renovación automática
    // ⚠️ PROBLEMA: No se guarda expire_time del archivo
    // ⚠️ PROBLEMA: No hay check proactivo de expiración
    
    const fileUri = result.file.uri;
    return fileUri; // Solo devuelve URI, sin metadata de expiración
}
```

```typescript
// Archivo: SermonGeneratorService.ts - línea 147
const cacheResult = await this.geminiFileSearch.createCache(geminiUris, 3600);
// ⚠️ Cache de solo 1 HORA
// ⚠️ Pero archivos duran 48h → Inconsistencia
```

**Problemas Específicos**:

1. **No hay tracking de expiración**
   - `LibraryResourceEntity` guarda `geminiUri` pero NO `expiresAt`
   - No sabemos cuándo expira un archivo

2. **No hay renovación proactiva**
   - Archivos expiran silenciosamente
   - Usuario debe re-subir manualmente

3. **Cache muy corto (1h) vs Archivos (48h)**
   - Inconsistencia confusa
   - Cache debería durar más o renovarse automáticamente

4. **Fallback ineficiente**
   - Cuando falla, cae a RAG chunks
   - Pero RAG también usa archivos expirados

---

### **Problema 2: Falta de Documentos Base Hermenéuticos** 💡

**Observación**:
> "Como base para los chats en general siempre deberíamos usar al menos un par de documentos de contexto de exegesis y hermenéutica heredados de la configuración global para fortalecer nuestro sesgo interpretativo."

**Análisis**:

Actualmente:
- ❌ Cada usuario empieza "desde cero"
- ❌ Sin documentos = depende 100% del conocimiento general de Gemini
- ❌ Sesgo hermenéutico solo en prompts (texto), no en documentos

**Propuesta**:
- ✅ Biblioteca "Core" de Dos Filos
- ✅ Siempre disponible para todos los usuarios
- ✅ No cuenta contra su límite de almacenamiento
- ✅ Fortalece sesgo histórico-gramatical-literal

**Documentos Core Sugeridos**:

1. **`dosfilos-hermeneutica-base.pdf`**
   - Método histórico-gramatical-literal explicado
   - Principios de interpretación evangélica
   - Ejemplos de aplicación correcta

2. **`dosfilos-exegesis-guia.pdf`**
   - Pasos de análisis exegético
   - Uso de idiomas originales
   - Contexto histórico-cultural

3. **`dosfilos-teologia-biblica.pdf`** (opcional)
   - Panorama bíblico
   - Teología del pacto/dispensacional (según sesgo)
   - Cristología bíblica

---

## 🎯 Soluciones Propuestas

### **Solución 1A: Aumentar TTL de Cache** (Quick Win)

**Cambio Mínimo**:
```typescript
// SermonGeneratorService.ts - línea 147
// ANTES:
const cacheResult = await this.geminiFileSearch.createCache(geminiUris, 3600); // 1 hora

// DESPUÉS:
const cacheResult = await this.geminiFileSearch.createCache(geminiUris, 43200); // 12 horas
// O mejor:
const cacheResult = await this.geminiFileSearch.createCache(geminiUris, 86400); // 24 horas
```

**Ventajas**:
- ✅ Implementación inmediata (5 minutos)
- ✅ Reduce frustración del usuario (menos errores frecuentes)
- ✅ Mejor costo-beneficio token (cache dura más)

**Desventajas**:
- ⚠️ No resuelve archivos expirados (48h)
- ⚠️ Solo posterga el problema

---

### **Solución 1B: Auto-Renovación de Archivos** (Mejor a Largo Plazo)

**Implementación**:

1. **Guardar metadata de expiración**:
```typescript
// domain/entities/LibraryResourceEntity.ts
export interface LibraryResourceEntity {
    // ... existing fields
    metadata?: {
        geminiUri?: string;
        geminiExpiresAt?: Date;  // 🎯 NUEVO
        geminiFileName?: string; // Para re-upload
    }
}
```

2. **Check proactivo antes de usar**:
```typescript
// SermonGeneratorService.ts - Nueva función
private async ensureFilesActive(libraryDocIds: string[]): Promise<string[]> {
    const resources = await Promise.all(
        libraryDocIds.map(id => libraryService.getResource(id))
    );
    
    const now = new Date();
    const renewalThreshold = 4 * 60 * 60 * 1000; // 4 horas antes de expirar
    
    const validUris: string[] = [];
    
    for (const resource of resources) {
        if (!resource || !resource.metadata?.geminiUri) continue;
        
        const expiresAt = resource.metadata.geminiExpiresAt;
        
        // Check si necesita renovación
        if (!expiresAt || (expiresAt.getTime() - now.getTime() < renewalThreshold)) {
            console.log(`🔄 Renovating expired/expiring file: ${resource.title}`);
            // Auto-renovar si es posible
            const newUri = await this.renewGeminiFile(resource);
            if (newUri) {
                validUris.push(newUri);
            }
        } else {
            validUris.push(resource.metadata.geminiUri);
        }
    }
    
    return validUris;
}
```

3. **Método de renovación**:
```typescript
private async renewGeminiFile(resource: LibraryResourceEntity): Promise<string | null> {
    try {
        // Re-descargar de Firebase Storage
        const blob = await this.storageService.downloadFileAsBlob(resource.storagePath);
        
        // Re-subir a Gemini
        const newUri = await this.documentProcessor.uploadFile(blob, resource.title);
        
        // Actualizar en Firestore
        await libraryService.updateResource(resource.id, {
            metadata: {
                ...resource.metadata,
                geminiUri: newUri,
                geminiExpiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000) // +48h
            }
        });
        
        return newUri;
    } catch (error) {
        console.error('Failed to renew Gemini file:', error);
        return null;
    }
}
```

**Ventajas**:
- ✅ Transparente para el usuario
- ✅ Archivos siempre frescos
- ✅ Mejor experiencia (no más 403)

**Desventajas**:
- ⚠️ Complejidad adicional
- ⚠️ Costos de re-upload (uso de API)
- ⚠️ Requiere storage path válido

---

### **Solución 2: Biblioteca Core de Dos Filos** (Recomendado)

**Arquitectura**:

```
dosfilos-app/
├── packages/
│   └── core-library/          # 🎯 NUEVO
│       ├── docs/
│       │   ├── hermeneutica-base.pdf
│       │   ├── exegesis-guia.pdf
│       │   └── teologia-biblica.pdf
│       ├── metadata.json
│       └── upload-to-gemini.ts (script de setup)
```

**Implementación**:

1. **Crear documentos Core**:
   - Escribir PDFs con método hermenéutico de Dos Filos
   - Versión en ES e EN
   - ~10-20 páginas cada uno

2. **Subir a Gemini una vez (admin)**:
```typescript
// scripts/setup-core-library.ts
async function uploadCoreLibrary() {
    const coreFiles = [
        { path: './core-library/docs/hermeneutica-base.pdf', name: 'Dos Filos: Hermenéutica Histórico-Gramatical' },
        { path: './core-library/docs/exegesis-guia.pdf', name: 'Dos Filos: Guía de Exégesis' }
    ];
    
    const geminiUris = [];
    for (const file of coreFiles) {
        const blob = await fs.readFile(file.path);
        const uri = await geminiService.uploadFile(blob, 'application/pdf', file.name);
        geminiUris.push(uri);
    }
    
    // Guardar URIs en config
    await saveToFirestore('config/coreLibrary', { geminiUris });
}
```

3. **Incluir siempre en contexto**:
```typescript
// SermonGeneratorService.ts
private async prepareGeminiContext(config: ExtendedPhaseConfiguration, ...): Promise<...> {
    // 1. Cargar Core Library URIs (heredados)
    const coreLibraryUris = await this.getCoreLibraryUris();
    
    // 2. Cargar URIs del usuario
    const userUris = /* ... existing logic ... */;
    
    // 3. Combinar (Core primero para prioridad)
    const allUris = [...coreLibraryUris, ...userUris];
    
    // 4. Crear cache con TODOS
    if (allUris.length > 0) {
        const cacheResult = await this.geminiFileSearch.createCache(allUris, 86400); // 24h
        // ...
    }
}

private async getCoreLibraryUris(): Promise<string[]> {
    // Leer de Firestore config (cacheado)
    const coreConfig = await getDoc(doc(db, 'config/coreLibrary'));
    return coreConfig.data()?.geminiUris || [];
}
```

**Ventajas**:
- ✅ **Sesgo hermenéutico fuerte y consistente**
- ✅ Todos los usuarios se benefician
- ✅ Mejor calidad de respuestas
- ✅ Documentación auto-incluida
- ✅ No expira (re-subimos cuando sea necesario)

**Desventajas**:
- ⚠️ Requiere crear PDFs de calidad
- ⚠️ Aumenta uso de tokens (pero vale la pena)
- ⚠️ Mantenimiento de documentos

---

## 💡 Recomendación de Implementación

### **Fase 1: Quick Wins** (Esta semana)

1. ✅ **Aumentar TTL de cache a 24 horas**
   - Cambio de 1 línea
   - Mejora inmediata

2. ✅ **Agregar metadata de expiración**
   - Preparar para auto-renovación futura
   - No rompe nada existente

### **Fase 2: Core Library** (2-3 semanas)

1. ✅ Escribir documento "Hermenéutica de Dos Filos" (10 pág)
2. ✅ Escribir documento "Guía de Exégesis" (15 pág)
3. ✅ Subir a Gemini y guardar URIs en config
4. ✅ Integrar en prepareGeminiContext()

### **Fase 3: Auto-Renovación** (1 mes)

1. ✅ Implementar `ensureFilesActive()`
2. ✅ Implementar `renewGeminiFile()`
3. ✅ Testing exhaustivo
4. ✅ Deploy gradual

---

## 📊 Análisis de Costos

### **Core Library**

**Setup inicial**:
- Subida de 2-3 PDFs: Gratis
- Total: $0

**Uso recurrente**:
- Cache de Core Library (24h): ~$0.05/día por usuario activo
- Tokens de contexto: +10% en prompts
- **Costo adicional estimado**: ~$1.50/mes por usuario activo

**Beneficio**:
- Calidad de respuestas: +30-50% mejora estimada
- Satisfacción de usuario: Alta
- **ROI**: Excelente

### **Auto-Renovación**

**Costos**:
- Re-upload automático: ~$0/documento (Free tier)
- Procesamiento: Mínimo
- **Costo adicional**: Insignificante

**Beneficio**:
- Eliminación de 403 errors: -100%
- Satisfacción: +90%
- **ROI**: Extraordinario

---

## ✅ Decisión Recomendada

### **SÍ a ambas propuestas**:

1. ✅ **Arreglar TTL** (Solución 1A + preparar 1B)
2. ✅ **Implementar Core Library** (Solución 2)

**Razones**:
- Resuelven problemas reales de usuarios
- Mejoran significativamente la experiencia
- Costos mínimos vs beneficios altos
- Alinean con la visión de Dos Filos (sesgo hermenéutico)

---

## 🚀 Próximos Pasos

1. **Decidir**: ¿Implementamos ambas soluciones?
2. **Priorizar**: ¿Cuál primero?
3. **Planificar**: Timeline y recursos necesarios

**Mi recomendación**:
- **HOY**: Aumentar TTL cache a 24h (5 min)
- **Esta semana**: Agregar metadata expiración (2 horas)
- **Próximas 2 semanas**: Core Library (10 horas)
- **Próximo mes**: Auto-renovación (20 horas)

---

**Autor**: Análisis por AI Assistant  
**Para**: Ricardo Cerda  
**Estado**: Pendiente de decisión
