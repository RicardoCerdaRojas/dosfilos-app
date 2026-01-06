# Plan de Pruebas: Mejoras en Prompts de IA

## Fecha: 2025-12-18
## Branch: `feature/library-ai-improvements`

---

## 🎯 Objetivo

Verificar que los cambios en los prompts de IA funcionan correctamente:
1. ✅ Método hermenéutico histórico-gramatical-literal está explícito
2. ✅ Fuentes evangélicas recomendadas aparecen cuando no hay biblioteca
3. ✅ IA mantiene identidad evangélica de la plataforma

---

## 🧪 OPCIÓN 1: Prueba con Logging (Recomendado)

### Preparación
1. ✅ Logging agregado temporalmente en `GeminiSermonGenerator.ts` línea 97-105
2. Ejecuta `npm run dev` en `packages/web`

### Escenario de Prueba A: Usuario SIN Biblioteca

**Pasos**:

1. **Abre la consola del navegador** (F12 → Console)

2. **Navega a**: `http://localhost:5173/dashboard/generate-sermon`

3. **Inicia un nuevo sermón**:
   - Passage: `Juan 3:16`
   - Click "Continue to Exegesis"

4. **Verifica en la consola del TERMINAL** (donde corre npm run dev):
   - Busca el bloque: `📝 EXEGESIS PROMPT (First 1000 chars):`
   - **DEBE contener**:
     ```
     **MÉTODO HERMENÉUTICO DE DOS FILOS**:
     Utiliza un enfoque histórico-gramatical-literal, priorizando:
     1. La intención del autor original en su contexto histórico
     2. El significado literal del texto en sus idiomas originales (griego/hebreo)
     ```

5. **Si NO tienes documentos en biblioteca**, también DEBE aparecer:
   ```
   ## 📚 FUENTES TEOLÓGICAS RECOMENDADAS (Conocimiento General)
   
   Como no tienes acceso a la biblioteca personal del pastor...
   
   **Comentarios Bíblicos Estándar**:
   - Nuevo Comentario Bíblico Siglo XXI
   - Comentario Bíblico Mundo Hispano
   ```

**✅ Resultado Esperado**:
- Método hermenéutico visible en el prompt
- Fuentes recomendadas presentes si no hay biblioteca
- Generación de exégesis exitosa

---

### Escenario de Prueba B: Usuario CON Biblioteca

**Pasos**:

1. **Asegúrate de tener al menos 1 documento en tu biblioteca**:
   - Ve a `/dashboard/library`
   - Si no tienes, sube un PDF teológico

2. **Configura el generador para usar biblioteca**:
   - Ve a Settings del generador
   - Activa documentos de biblioteca para Exégesis

3. **Repite Prueba A**

**✅ Resultado Esperado**:
- Método hermenéutico visible
- **NO** aparecen fuentes recomendadas (porque tienes biblioteca)
- **SÍ** aparece: "ADEMÁS, TIENES ACCESO A LOS SIGUIENTES LIBROS..."

---

## 🧪 OPCIÓN 2: Prueba de Chat Interactivo

### Escenario C: Chat Sin Biblioteca

**Pasos**:

1. **Genera exégesis** de cualquier pasaje (ej. Juan 3:16)

2. **En el chat**, pregunta algo como:
   ```
   "¿Cuál es el contexto histórico de este pasaje?"
   ```

3. **Observa la respuesta de la IA**:
   - DEBE incluir frases como:
     - "Basado en mi conocimiento general de fuentes evangélicas..."
     - "Como señalan comentaristas evangélicos..."
     - "Según el consenso exegético..."

**✅ Resultado Esperado**:
- IA declara explícitamente que usa conocimiento general
- Referencias genéricas (no citas específicas inventadas)
- Mantiene enfoque histórico-gramatical

---

### Escenario D: Chat Con Biblioteca

**Pasos**:

1. **Asegura biblioteca activa** con documentos

2. **En el chat**, pregunta sobre algo específico de tus documentos:
   ```
   "¿Qué dice [nombre de tu libro] sobre este pasaje?"
   ```

3. **Observa la respuesta**:
   - DEBE citar específicamente tus libros
   - Formato: "(Autor, Título)"

**✅ Resultado Esperado**:
- Citas específicas de biblioteca
- NO menciona "conocimiento general"

---

## 🧪 OPCIÓN 3: Verificación de Sesgo Teológico

### Escenario E: Pregunta Controversial

**Pasos**:

1. **En cualquier fase**, pregunta en el chat:
   ```
   "¿Cuál es la interpretación alegórica de este pasaje?"
   ```

2. **Observa la respuesta**:
   - La IA DEBERÍA priorizar interpretación literal-histórica
   - Puede mencionar alegoría como complemento, pero NO como primaria

**✅ Resultado Esperado**:
- IA mantiene enfoque histórico-gramatical
- Explica por qué el método literal es prioritario

---

### Escenario F: Comparación de Métodos

**Pasos**:

1. **Pregunta en chat**:
   ```
   "Compara la interpretación histórico-gramatical con otros métodos hermenéuticos para este pasaje"
   ```

2. **Observa la respuesta**:
   - DEBE identificar histórico-gramatical como método de Dos Filos
   - Puede mencionar otros, pero clarificar cuál usa la plataforma

**✅ Resultado Esperado**:
- Clara identificación del método de la plataforma
- Explicación educativa pero sesgada hacia el método oficial

---

## 📊 Checklist de Verificación

### Método Hermenéutico Explícito
- [ ] Prompt contiene "MÉTODO HERMENÉUTICO DE DOS FILOS"
- [ ] Menciona "histórico-gramatical-literal"
- [ ] Lista las 4 prioridades del método
- [ ] Identifica como "predicador evangélico"

### Fuentes Recomendadas (Sin Biblioteca)
- [ ] Aparece sección "📚 FUENTES TEOLÓGICAS RECOMENDADAS"
- [ ] Lista comentarios estándar (Siglo XXI, Mundo Hispano, Keener)
- [ ] Lista léxicos (Tuggy, Vine, Strong)
- [ ] Lista teología sistemática (Grudem, Berkhof)
- [ ] Incluye instrucciones de transparencia

### Comportamiento de la IA
- [ ] Declara "conocimiento general" cuando no hay biblioteca
- [ ] NO inventa citas específicas sin biblioteca
- [ ] Cita libros específicos CON biblioteca
- [ ] Mantiene sesgo histórico-gramatical en respuestas

---

## 🚨 Problemas Potenciales y Soluciones

### Problema 1: No veo logs en terminal
**Solución**: 
- Asegúrate que npm run dev esté corriendo
- Verifica que estás mirando la terminal correcta
- Los logs aparecen cuando generas exégesis, no antes

### Problema 2: Fuentes recomendadas no aparecen
**Verificar**:
- ¿Tienes documentos en biblioteca?
- Si SÍ → Correcto, no deberían aparecer
- Si NO → Revisa que `config.documents` y `config.cachedResources` estén vacíos

### Problema 3: IA sigue mencionando "método no especificado"
**Verificar**:
- Asegúrate de haber guardado cambios en `prompts-generator.ts`
- Reinicia npm run dev
- Verifica que no haya caché de módulos

---

## 🧹 Limpieza Post-Pruebas

Una vez verificado todo, **REMOVER** el logging temporal:

```typescript
// ELIMINAR estas líneas de GeminiSermonGenerator.ts:
console.log('═══════════════════════════════════════════════════════');
console.log('📝 EXEGESIS PROMPT (First 1000 chars):');
console.log('═══════════════════════════════════════════════════════');
console.log(prompt.substring(0, 1000));
console.log('═══════════════════════════════════════════════════════');
```

O mejor, hacer commit separado de pruebas y luego revertirlo:
```bash
git add packages/infrastructure/src/gemini/GeminiSermonGenerator.ts
git commit -m "test: Add temporary logging for prompt verification"
# Después de probar:
git revert HEAD  # Revierte el logging
```

---

## 📝 Reporte de Resultados

Usa esta tabla para documentar tus pruebas:

| Escenario | Fecha | ✅/❌ | Observaciones |
|-----------|-------|-------|---------------|
| A: Sin Biblioteca | | | |
| B: Con Biblioteca | | | |
| C: Chat Sin Biblioteca | | | |
| D: Chat Con Biblioteca | | | |
| E: Pregunta Controversial | | | |
| F: Comparación Métodos | | | |

---

## 🎯 Criterio de Éxito

**TODAS** estas condiciones deben cumplirse:

1. ✅ Método hermenéutico visible en prompt
2. ✅ Fuentes recomendadas cuando no hay biblioteca
3. ✅ IA declara transparencia sobre fuentes
4. ✅ Sesgo teológico se mantiene en respuestas
5. ✅ NO se inventan citas específicas sin biblioteca
6. ✅ Generación exitosa de sermones en todos los escenarios

---

**Autor**: Plan de pruebas por AI Assistant  
**Para**: Ricardo Cerda  
**Status**: 🧪 Listo para ejecutar
