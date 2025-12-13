# 🚨 CRÍTICO: Restablecer Caché en Fase 2

> **ESTADO:** ⚠️ TEMPORAL - Caché DESACTIVADO en Fase 2  
> **FECHA DESACTIVACIÓN:** 2025-12-11  
> **RAZÓN:** Caché antiguo contiene prompts sin estructura sustantivada  
> **ACCIÓN REQUERIDA:** Restablecer caché cuando sistema esté estable

---

## ⚠️ ESTADO ACTUAL

### **Código Modificado:**
```typescript
// Archivo: /packages/infrastructure/src/gemini/GeminiSermonGenerator.ts
// Línea: ~541

// 🚨 IMPORTANT: Don't use cache for Phase 2
console.log('⚠️  NOT using cache for Phase 2 to ensure fresh instructions are applied');
const model = this.getModel(); // No cacheName = fresh model ❌
```

### **Impacto:**
- ❌ **Costos:** +50% (reenvía toda la exégesis en cada generación)
- ❌ **Latencia:** +2-3 segundos por sermón
- ✅ **Benefit:** Siempre usa instrucciones más recientes

---

## 🎯 PLAN DE RESTABLECIMIENTO

### **FASE 1: Estabilización (1-2 semanas)**
**Objetivo:** Probar el nuevo sistema de prompts sustantivados

**Checklist:**
- [ ] Generar 10+ sermones con estructura sustantivada
- [ ] Verificar que proposiciones tengan los 8 elementos
- [ ] Verificar sincronización de títulos
- [ ] Confirmar que no hay regresiones
- [ ] Usuarios reportan satisfacción con calidad

**Mientras tanto:** Caché DESACTIVADO está bien (prioridad = calidad)

---

### **FASE 2: Implementación de Versioning** ⭐
**Objetivo:** Invalidar caché automáticamente cuando cambien instrucciones

#### **Paso 1: Agregar Versión a Archivos MD**
```markdown
---
prompt_version: "2.0.0"
last_updated: "2025-12-11"
---

# Guía para Proposiciones Homiléticas
...
```

#### **Paso 2: Trackear Versión en Código**
```typescript
// En ApproachDevelopmentPromptBuilder.ts
private readonly PROMPT_VERSION = "2.0.0"; // ← Actualizar cuando cambien MDs

build(): string {
    const prompt = this.buildSections();
    
    // Incluir versión en metadata del prompt
    return `
<!-- PROMPT_VERSION: ${this.PROMPT_VERSION} -->
${prompt}
    `;
}
```

#### **Paso 3: Comparar Versión Antes de Usar Caché**
```typescript
// En GeminiSermonGenerator.ts
async developSelectedApproach(...) {
    const currentPromptVersion = "2.0.0"; // De ApproachDevelopmentPromptBuilder
    
    // Obtener versión del caché (si existe)
    const cachedVersion = await this.getCachedPromptVersion(cacheName);
    
    if (cacheName && cachedVersion === currentPromptVersion) {
        console.log(`✅ Using cache (version ${cachedVersion} matches)`);
        const model = this.getModel(cacheName);
    } else {
        if (cachedVersion) {
            console.log(`⚠️  Cache version mismatch (cached: ${cachedVersion}, current: ${currentPromptVersion})`);
            console.log(`🔄 Creating new cache with updated prompts...`);
        }
        const model = this.getModel(); // Fresh model
        // TODO: Crear nuevo caché con versión actual
    }
    
    // ... resto del código
}
```

#### **Paso 4: Metadata en Caché**
```typescript
interface CacheMetadata {
    version: string;
    createdAt: Date;
    promptFiles: {
        proposition: string; // hash del contenido
        outline: string;
        application: string;
        // ...
    };
}

// Al crear caché
const cacheMetadata: CacheMetadata = {
    version: "2.0.0",
    createdAt: new Date(),
    promptFiles: {
        proposition: hashMD5(propositionGuidelinesMD),
        outline: hashMD5(outlineInstructionsMD),
        // ...
    }
};
```

---

### **FASE 3: Restablecer Caché** 🎉
**Una vez implementado versioning:**

```typescript
// REVERTIR el cambio temporal
async developSelectedApproach(...) {
    // Versión FINAL (con caché inteligente)
    const currentVersion = ApproachDevelopmentPromptBuilder.PROMPT_VERSION;
    const cachedVersion = await this.getCacheVersion(cacheName);
    
    const useCached = cacheName && cachedVersion === currentVersion;
    
    console.log(useCached 
        ? `✅ Using cache (v${currentVersion})` 
        : `🔄 Creating fresh cache (v${currentVersion})`
    );
    
    const model = this.getModel(useCached ? cacheName : undefined);
    // ...
}
```

**Resultado:**
- ✅ Caché se usa cuando es válido (ahorro de $$)
- ✅ Se invalida automáticamente cuando cambias archivos MD
- ✅ No necesitas recordar invalidarlo manualmente

---

## 📊 Métricas para Decidir Cuándo Restablecer

### **Indicadores de Que Es Seguro:**
1. ✅ 15+ sermones generados sin problemas
2. ✅ 0 reportes de proposiciones incorrectas en última semana
3. ✅ Feedback positivo de usuarios
4. ✅ Archivos MD no han cambiado en 3+ días
5. ✅ Sistema de versioning implementado y probado

### **Cuando Ver Estos Indicadores:**
→ **RESTABLECER CACHÉ** con versioning

---

## 🔔 Alertas y Recordatorios

### **Recordatorios Automáticos:**
```typescript
// Agregar en startup del servidor
if (process.env.NODE_ENV === 'development') {
    const daysSinceDisabled = daysBetween('2025-12-11', new Date());
    
    if (daysSinceDisabled > 14) {
        console.warn('⚠️  REMINDER: Cache has been disabled for 2+ weeks');
        console.warn('    Consider re-enabling with versioning system');
        console.warn('    See: docs/RESTORE_CACHE_PHASE2.md');
    }
}
```

### **TODO Comentario en Código:**
```typescript
// 🚨 TODO (2025-12-25): Re-enable cache with versioning
// See: /docs/RESTORE_CACHE_PHASE2.md
// Tracking issue: #XXX
```

---

## 📝 Checklist de Implementación

### **Antes de Restablecer Caché:**
- [ ] Versioning system implementado
- [ ] MD files tienen `prompt_version`
- [ ] Código compara versiones antes de usar caché
- [ ] Testing: Cambiar version en MD invalida caché
- [ ] Testing: Mismo version reutiliza caché
- [ ] Documentación actualizada
- [ ] Usuarios notificados del cambio

### **Al Restablecer:**
- [ ] Revertir cambio en `GeminiSermonGenerator.ts:~541`
- [ ] Agregar lógica de versioning
- [ ] Deploy a staging
- [ ] Probar 5+ sermones
- [ ] Verificar costos se redujeron
- [ ] Verificar latencia mejoró
- [ ] Deploy a producción
- [ ] Monitorear por 48 horas

---

## 🎓 Lecciones Aprendidas

### **Por Qué Pasó Esto:**
1. Caché se creó con prompt antiguo (ayer)
2. Nuevas instrucciones se agregaron hoy
3. Caché no se invalidó automáticamente
4. Gemini usó caché antiguo → Resultados incorrectos

### **Cómo Prevenir en Futuro:**
1. ✅ **Versioning:** Siempre incluir versión en prompts
2. ✅ **Validación:** Comparar versión antes de usar caché
3. ✅ **Invalidación:** Auto-invalidar cuando versión cambia
4. ✅ **Alertas:** Notificar cuando caché está desincronizado

---

## 📞 Contacto y Seguimiento

**Responsable:** Ricardo Cerda  
**Issue Tracking:** (Crear issue en GitHub)  
**Fecha Objetivo Restablecimiento:** 2025-12-25  
**Review Semanal:** Cada lunes verificar estado

---

## 🔗 Referencias

- **Código Modificado:** `/packages/infrastructure/src/gemini/GeminiSermonGenerator.ts:541`
- **Prompts MD:** `/packages/infrastructure/config/prompts/homiletics/`
- **Documentación:** `/docs/PROMPTS_SYSTEM_INTEGRATION.md`
- **Gemini Caching Docs:** https://ai.google.dev/gemini-api/docs/caching

---

**ÚLTIMA ACTUALIZACIÓN:** 2025-12-11 14:03 -03:00  
**ESTADO:** ⚠️ CACHÉ DESACTIVADO - ACCIÓN REQUERIDA  
**PRÓXIMA REVISIÓN:** 2025-12-18
