# 📚 Sistema de Configuración de Prompts Homiléticos

> **Sistema de Prompts Mantenible y Versionado**  
> Actualizado: 2025-12-11

---

## 🎯 Propósito

Este directorio contiene **guías editables** que controlan cómo la IA genera:
- Proposiciones homiléticas
- Bosquejos detallados
- Aplicaciones contemporáneas  
- Consistencia de tono
- Referencias bíblicas

**Ventajas del sistema:**
- ✅ Editable sin recompilar código
- ✅ Versionado en Git (historial completo)
- ✅ Markdown (fácil de leer/editar)
- ✅ Centralizado (un solo lugar)
- ✅ Documentado (explicaciones claras)

---

## 📁 Estructura de Archivos

```
/packages/infrastructure/config/prompts/
├── README.md (este archivo)
└── homiletics/
    ├── proposition-guidelines.md      ← Estructura proposición
    ├── outline-instructions.md        ← Estructura bosquejo
    ├── application-template.md        ← Template aplicaciones
    ├── tone-consistency.md            ← Guías de tono
    └── scripture-references.md        ← Criterios referencias
```

---

## 🔧 Cómo Funciona

### **1. Edición**
1. Abre el archivo `.md` que quieres mejorar
2. Edita las instrucciones, ejemplos o criterios
3. Guarda el archivo

### **2. Versionado**
```bash
git add .
git commit -m "feat: mejorar instrucciones de proposición para incluir más ejemplos"
git push
```

### **3. Aplicación**
- **Desarrollo local:** Cambios se aplican inmediatamente
- **Producción:** Se aplican en el siguiente deploy

### **4. Rollback (si algo sale mal)**
```bash
git log -- proposition-guidelines.md  # Ver historial
git checkout [commit-hash] -- proposition-guidelines.md  # Volver a versión anterior
```

---

## 📖 Guía de Uso

### **Para Mejorar Proposiciones**

**Archivo:** `proposition-guidelines.md`

**Qué editar:**
- Criterios de estructura
- Ejemplos por tono
- Errores comunes
- Template de generación

**Cuándo editar:**
- Proposiciones muy genéricas → Mejorar sección "Errores Comunes"
- Necesitas más ejemplos → Agregar a "Ejemplos de Proposiciones Excelentes"
- Cambio de estándar → Actualizar "Estructura Requerida"

### **Para Mejorar Bosquejos**

**Archivo:** `outline-instructions.md`

**Qué editar:**
- Cantidad de puntos óptima
- Longitud de descripciones
- Patrones de flujo lógico
- Ejemplos completos

### **Para Mejorar Aplicaciones**

**Archivo:** `application-template.md`

**Qué editar:**
- Criterios de especificidad
- Áreas de vida a cubrir
- Distribución óptima
- Ejemplos contextualizados

### **Para Mejorar Consistencia de Tono**

**Archivo:** `tone-consistency.md`

**Qué editar:**
- Definiciones de tonos
- Marcadores lingüísticos
- Matriz de verificación

### **Para Mejorar Referencias**

**Archivo:** `scripture-references.md`

**Qué editar:**
- Cantidad por punto
- Tipos de referencias
- Criterios de selección

---

## 🔄 Integración con Código

Estos archivos son leídos por:

```
ApproachDevelopmentPromptBuilder.ts
  ↓
  lee: proposition-guidelines.md
  lee: outline-instructions.md
  lee: application-template.md
  lee: tone-consistency.md
  lee: scripture-references.md
  ↓
  construye: Prompt completo para Gemini
  ↓
  genera: Proposición + Bosquejo desarrollado
```

**Función clave:**
```typescript
// En ApproachDevelopmentPromptBuilder.ts
private async loadPropositionGuidelines(): Promise<string> {
    const path = '/config/prompts/homiletics/proposition-guidelines.md';
    return await fs.readFile(path, 'utf-8');
}
```

---

## 📊 Ejemplos de Mejoras Comunes

### **Ejemplo 1: Proposiciones muy académicas**

**Problema:** Proposiciones usan lenguaje demasiado técnico

**Solución:**
1. Abrir `proposition-guidelines.md`
2. Ir a sección "Tono Pastoral/Exhortativo"
3. Agregar más ejemplos de lenguaje accesible
4. Reforzar instrucción: "Evitar jerga teológica sin explicar"

### **Ejemplo 2: Aplicaciones vagas**

**Problema:** "Sé más humilde" en lugar de acciones concretas

**Solución:**
1. Abrir `application-template.md`
2. Reforzar sección "ESPECÍFICA (no vaga)"
3. Agregar más ejemplos de especificidad
4. Actualizar template con: "[CONTEXTO] + [ACCIÓN] + [RESULTADO]"

### **Ejemplo 3: Bosquejos sin flujo**

**Problema:** Puntos desconectados entre sí

**Solución:**
1. Abrir `outline-instructions.md`
2. Mejorar sección "Flujo Lógico del Bosquejo"
3. Agregar más patrones de progresión
4. Incluir checklist de verificación de flujo

---

## ✅ Checklist de Mantenimiento

### **Mensual**
- [ ] Revisar últimos 10 sermones generados
- [ ] Identificar patrones de problemas
- [ ] Actualizar archivo(s) relevante(s)
- [ ] Commit con mensaje descriptivo

### **Trimestral**
- [ ] Revisar todos los archivos
- [ ] Actualizar ejemplos si contexto cambió
- [ ] Verificar que instrucciones sigan siendo claras
- [ ] Solicitar feedback de usuarios

### **Anual**
- [ ] Revisión completa del sistema
- [ ] Considerar nuevos tonos o enfoques
- [ ] Actualizar basado en mejores prácticas
- [ ] Documentar cambios mayores

---

## 🚨 Consideraciones Importantes

### **Qué SÍ hacer:**
✅ Editar libremente para mejorar
✅ Agregar más ejemplos
✅ Refinar criterios basados en resultados
✅ Documentar el "por qué" de los cambios
✅ Hacer commits pequeños y frecuentes

### **Qué NO hacer:**
❌ Eliminar secciones estructurales clave
❌ Cambiar el formato JSON requerido
❌ Hacer cambios sin testear resultados
❌ Editar directamente en producción
❌ Borrar ejemplos sin reemplazarlos

---

## 🎓 Convenciones de Edición

### **Formato Markdown**
- Usar headers (`#`, `##`, `###`) para estructura
- Listas para criterios (`-`, `1.`)
- Code blocks para ejemplos técnicos
- Emojis para visual clarity (✅ ❌ 🎯)

### **Lenguaje**
- Imperativo para instrucciones ("Genera...", "Usa...")
- Segunda persona para guías ("Debes...", "Evita...")
- Ejemplos claros (✅ bueno, ❌ malo)

### **Commits**
```
feat: agregar ejemplos de proposiciones evangelísticas
fix: corregir criterio de longitud de proposición
docs: actualizar sección de errores comunes
refactor: reorganizar guías de tono por claridad
```

---

## 🔍 Debugging

Si los resultados no mejoran después de editar:

### **1. Verificar que el archivo se cargó**
```typescript
console.log('Loaded guidelines:', guidelines.substring(0, 100));
```

### **2. Verificar sintaxis Markdown**
- Linters: markdownlint, prettier
- Previsualizar en GitHub

### **3. Verificar que las instrucciones son claras**
- ¿Son específicas?
- ¿Tienen ejemplos?
- ¿Son accionables?

### **4. Iterar**
- Hacer cambio pequeño
- Testear resultado
- Ajustar según necesidad

---

## 📞 Soporte

**Mantenedor principal:** Ricardo Cerda  
**Email:** ricardocerda@gmail.com  
**Repositorio:** RicardoCerdaRojas/dosfilos-app

Para preguntas o sugerencias, crear un issue en GitHub con tag `[prompts]`.

---

## 🎯 Roadmap Futuro

### **Próximas Mejoras Planeadas:**
- [ ] Sistema de A/B testing de prompts
- [ ] Métricas de calidad (scoring automático)
- [ ] Versionado de prompts por enfoque
- [ ] UI para edición (2024 Q4)
- [ ] Multi-idioma (inglés, portugués)

---

**Última actualización:** 2025-12-11  
**Versión del sistema:** 1.0.0
