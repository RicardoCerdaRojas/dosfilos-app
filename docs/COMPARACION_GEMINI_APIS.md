# Diferencias: Files API vs File Search vs Context Caching

## Fecha: 2025-12-18

---

## 🎯 Los 3 Sistemas de Gemini Explicados

```
┌─────────────────────────────────────────────────────────────┐
│                    1. FILES API                              │
│  (Sistema Base de Upload)                                   │
│                                                              │
│  ¿Qué es?                                                   │
│  • Sistema básico para subir archivos (PDF, imágenes, etc) │
│  • Los archivos se almacenan en servidores de Google       │
│  • Devuelve un URI (ej: files/abc123)                      │
│                                                              │
│  ¿Costo?                                                    │
│  • GRATIS ✅                                                │
│  • Storage gratis por 48 horas                             │
│  • Límite: 20 GB por proyecto                              │
│                                                              │
│  ¿Para qué sirve?                                          │
│  • Permitir que Gemini "vea" el contenido de archivos      │
│  • Base para File Search y Context Caching                 │
└─────────────────────────────────────────────────────────────┘
                            ↓
        ┌───────────────────┴────────────────────┐
        │                                        │
        ↓                                        ↓
┌──────────────────────┐           ┌──────────────────────────┐
│  2. FILE SEARCH      │           │  3. CONTEXT CACHING      │
│  (Búsqueda RAG)      │           │  (Cache de Tokens)       │
└──────────────────────┘           └──────────────────────────┘

```

---

## 📋 Comparación Detallada

### **1️⃣ FILES API** (Base Foundation)

**¿Qué es?**
- Sistema básico de upload de archivos a Gemini
- Archivos quedan "disponibles" para que Gemini los procese

**Características**:
- ✅ Soporta: PDF, imágenes, video, audio, texto
- ✅ Máximo 2 GB por archivo
- ✅ Storage automático por 48 horas
- ✅ Puedes referenciar archivos por URI

**Costo**:
- Upload: **GRATIS** ✅
- Storage (48h): **GRATIS** ✅

**Ejemplo de uso**:
```typescript
// Subir archivo
const file = await geminiService.uploadFile(blob, 'application/pdf');
// Devuelve: "files/abc123xyz"

// Usar en prompt directo (Multimodal)
const result = await model.generateContent({
    contents: [{
        role: 'user',
        parts: [
            { fileData: { fileUri: 'files/abc123xyz' } },
            { text: '¿Qué dice este PDF?' }
        ]
    }]
});
```

**Limitaciones**:
- ⚠️ Gemini lee TODO el archivo cada vez
- ⚠️ No hay búsqueda semántica
- ⚠️ Costoso en tokens si el archivo es grande

---

### **2️⃣ FILE SEARCH** (RAG Automático)

**¿Qué es?**
- Feature de Gemini que hace **búsqueda semántica** en archivos
- Crea automáticamente embeddings del contenido
- Devuelve solo las partes **relevantes** del documento

**Características**:
- ✅ Búsqueda inteligente (RAG automático)
- ✅ Procesa múltiples archivos a la vez
- ✅ Cita fuentes automáticamente (grounding metadata)
- ✅ Más eficiente que leer archivos completos

**Costo**:
- Indexación inicial: **$0.135 per 1M tokens** (embeddings)
- Storage: **GRATIS** ✅
- Query embeddings: **GRATIS** ✅
- Retrieved tokens: **Costo normal de input tokens** ($0.30/1M para Flash)

**Ejemplo de uso**:
```typescript
// Crear un File Search Store (índice de documentos)
const store = await geminiService.createFileSearchStore([
    'files/abc123',
    'files/def456',
    'files/ghi789'
]);

// Hacer query con búsqueda semántica
const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    tools: [{
        fileSearch: {
            fileSearchStoreNames: [store.name]
        }
    }]
});

const result = await model.generateContent('¿Qué dice sobre exégesis?');
// Gemini busca solo las partes relevantes, no lee todo
```

**Ventajas**:
- ✅ Solo procesa partes relevantes (ahorro de tokens)
- ✅ Búsqueda semántica inteligente
- ✅ Citas automáticas

**Limitaciones**:
- ⚠️ Límite de 1000 páginas totales por store
- ⚠️ Requiere crear y gestionar "stores"
- ⚠️ Más complejo de implementar

---

### **3️⃣ CONTEXT CACHING** (Pre-procesamiento de Tokens)

**¿Qué es?**
- Sistema para **pre-procesar y cachear tokens** de input
- Los tokens se procesan UNA VEZ y se reutilizan en múltiples requests
- Ahorra tiempo y reduce costo de input tokens

**Características**:
- ✅ Tokens se procesan solo una vez
- ✅ Descuento en input tokens (de $0.30 a $0.03 para Flash)
- ✅ TTL customizable (mínimo 1 minuto, sin máximo)
- ✅ Compatible con archivos, texto, o cualquier input

**Costo**:
- Storage: **$1.00 per 1M tokens per hour** 💰
- Input con cache: **$0.03 per 1M tokens** (90% descuento)
- Output: **Normal** ($2.50/1M)

**Ejemplo de uso**:
```typescript
// Crear cache con archivos
const cache = await cacheManager.create({
    model: 'models/gemini-2.5-flash',
    contents: [
        {
            role: 'user',
            parts: [
                { fileData: { fileUri: 'files/abc123' } },
                { fileData: { fileUri: 'files/def456' } }
            ]
        }
    ],
    ttl: '172800s' // 48 horas
});
// Devuelve: { name: 'cachedContents/xyz789', expireTime: '...' }

// Usar cache en requests
const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    cachedContent: 'cachedContents/xyz789'
});

// Todos los requests usan el cache
const result1 = await model.generateContent('Pregunta 1');
const result2 = await model.generateContent('Pregunta 2');
// Ambos usan los archivos pre-procesados
```

**Ventajas**:
- ✅ Ahorro masivo en tokens repetidos (90% descuento)
- ✅ Más rápido (tokens ya procesados)
- ✅ Ideal para contexto grande que se reutiliza

**Limitaciones**:
- ⚠️ Costo de storage ($1/1M tokens/hora)
- ⚠️ Requiere gestión de TTL y expiración
- ⚠️ Solo útil si reutilizas el mismo contexto varias veces

---

## 🔄 Cómo se Relacionan

```
PASO 1: FILES API (Upload)
   ↓
[files/abc123.pdf] ← Archivo subido (GRATIS)
   ↓
   ├─→ OPCIÓN A: FILE SEARCH
   │      ↓
   │   [File Search Store] ← Índice con embeddings
   │      ↓
   │   Query semántica → Solo partes relevantes
   │
   └─→ OPCIÓN B: CONTEXT CACHING
          ↓
       [cachedContents/xyz] ← Tokens pre-procesados
          ↓
       Requests reutilizan cache con descuento
```

---

## 📊 ¿Cuál Usar Cuándo?

### **Files API Solo** (Sin File Search ni Cache)

**Usar cuando**:
- ✅ Pocos archivos pequeños
- ✅ No se reutiliza el contexto
- ✅ Procesamiento one-time

**Ejemplo**: Analizar un PDF una sola vez

---

### **Files API + File Search**

**Usar cuando**:
- ✅ Muchos documentos (10-100+)
- ✅ Necesitas búsqueda semántica
- ✅ Solo quieres partes relevantes (ahorro de tokens)

**Ejemplo**: Biblioteca de 50 libros, buscar info específica

**Costo**:
- Indexación inicial: ~$0.135/1M tokens
- Queries: Solo tokens relevantes (eficiente)

---

### **Files API + Context Caching**

**Usar cuando**:
- ✅ Mismo contexto se reutiliza MUCHO
- ✅ Archivos grandes (100-1000 páginas)
- ✅ Múltiples requests con el mismo input

**Ejemplo**: 3-6 libros core que se usan en TODOS los sermones

**Costo**:
- Storage: $1/1M tokens/hora
- Input: $0.03/1M (90% descuento)
- **Ahorro**: Si haces 10+ requests, sale más barato

---

### **¿Puedes combinar File Search + Context Caching?** 🤔

**NO directamente**. Son dos features mutuamente excluyentes:

- **File Search**: Usa su propio sistema de indexación (gratis)
- **Context Caching**: Cachea tokens ya procesados

**Pero puedes**:
- Usar File Search para encontrar documentos relevantes
- Luego crear un Context Cache con esos documentos específicos

---

## 💡 ¿Qué Usamos en Dos Filos?

### **Propuesta Actual: Context Caching** ✅

**Por qué**:
1. ✅ Tenemos pocos documentos core (3-6 libros)
2. ✅ Se reutilizan en TODOS los sermones
3. ✅ Ahorro masivo en tokens (90% descuento)
4. ✅ Más rápido (pre-procesado)

**Arquitectura**:
```
Files API (upload PDFs) → GRATIS
   ↓
Context Cache (3-6 libros) → $13.58 por 48h
   ↓
Todos los requests usan cache → $0.03/1M tokens input
```

---

## 📊 Comparación de Costos (Ejemplo Real)

**Escenario**: 6 libros (850 páginas = 283K tokens), 100 sermones/mes

### **Opción 1: Files API Solo** (Sin cache ni search)

```
Cada sermón lee 283K tokens × 3 fases = 849K tokens input
100 sermones × 849K = 84.9M tokens/mes
Costo: 84.9M × $0.30/1M = $25.47/mes
```

### **Opción 2: File Search**

```
Indexación inicial: 283K × $0.135/1M = $0.038 (one-time)
Cada query recupera ~20K tokens relevantes
100 sermones × 3 fases × 20K = 6M tokens/mes
Costo: 6M × $0.30/1M = $1.80/mes ✅ Más eficiente
```

### **Opción 3: Context Caching** ⭐

```
Storage: $13.58 por ciclo × 15 ciclos/mes = $203.70/mes
Input con cache: 100 sermones × 3 fases × 283K = 84.9M tokens
Costo input: 84.9M × $0.03/1M = $2.55/mes
TOTAL: $206.25/mes

Comparado con Files API solo: Ahorro de 90% en input ($25.47 → $2.55)
```

**Ganador**: Context Caching si tienes >10 usuarios activos

---

## ✅ Conclusión para Dos Filos

**Recomendación**: **Context Caching** ✅

**Razones**:
1. ✅ Documentos core se reutilizan constantemente
2. ✅ Ahorro masivo vs Files API solo
3. ✅ Más rápido (pre-procesado)
4. ✅ Simple de implementar (1 cache global)

**Costo final**: ~$206/mes para base de usuarios ilimitada

---

**Autor**: Clarificación técnica por AI Assistant  
**Para**: Ricardo Cerda  
**Estado**: Documentación completa de APIs
