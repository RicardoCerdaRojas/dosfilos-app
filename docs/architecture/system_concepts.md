# Mapa de Conceptos y Arquitectura del Sistema: DosFilos

Este documento sirve como **Fuente Única de Verdad** sobre la arquitectura del sistema, la relación entre componentes y las estrategias de inteligencia artificial implementadas.

---

## 1. Página Biblioteca (Knowledge Base)
Gestiona los recursos teológicos del usuario. Es la base para todo el contexto de la IA.

### Componentes de Datos
1.  **Almacenamiento Original (Storage)**
    *   **Tecnología**: Firebase Storage (`gs://...`).
    *   **Qué guarda**: Archivos físicos originales (PDF, EPUB).
    *   **Propósito**: Respaldo, descargas y fuente para re-procesamiento.
2.  **Base de Datos (Metadata)**
    *   **Tecnología**: Firestore (`library_resources`).
    *   **Qué guarda**: Título, autor, estado de indexación, `geminiUri`, etc.

### Procesos de Indexación
1.  **Indexación Vectorial (Embeddings)**
    *   **Servicio**: `RAGService`.
    *   **Proceso**: El texto se divide en fragmentos ("chunks"), se convierten a vectores numéricos (Embeddings) y se guardan.
    *   **Uso**: Permite la **Búsqueda Manual (Standard RAG)**. Esencial para encontrar citas específicas sin cargar todo el libro.
2.  **Indexación AI (Gemini Files)**
    *   **Servicio**: `GeminiFileSearchService` / Cloud Function `syncResourceToGemini`.
    *   **Proceso**: Sube el archivo a la infraestructura de Google Gemini y obtiene un `geminiUri`.
    *   **Estado**: El archivo debe estar `ACTIVE` para usarse.
    *   **Auto-Curación**: El sistema detecta enlaces rotos (404/403) y re-invoca la sincronización automáticamente para obtener nuevos URIs válidos.

---

## 2. Página Configuración y Personas
Define "Quién es la IA" y cómo debe comportarse.

*   **Configuración de Sermones**:
    *   Define los *System Prompts* base para cada fase.
    *   **Experto en Exégesis**: Configurado para rigor académico, análisis lingüístico.
    *   **Experto en Homilética**: Configurado para estructura, retórica y persuasión.
    *   **Experto en Redacción**: Configurado para estilo literario, claridad y tono pastoral.

---

## 3. Generador de Sermones (Core)
El flujo de trabajo principal. Utiliza `GeminiSermonGenerator`.

### Modelos de IA
*   **Modelo Estandarizado**: `models/gemini-1.5-flash-001`.
    *   Elegido por: Estabilidad, ventana de contexto de 1M tokens y soporte oficial para **Context Caching**.

### Estrategias de Contexto (Jerarquía de Prioridad)
El sistema decide inteligentemente cómo inyectar el conocimiento de la biblioteca en la IA:

**🥇 Nivel 1: Context Cache (Ideal)**
*   **Indicador UI**: ⚡ Icono "Cache" (Amarillo).
*   **Mecanismo**: Se crea un "Contenedor Efímero" en Gemini con TODOS los libros completos + Instrucciones.
*   **Ventaja**: Velocidad extrema, menor latencia, la IA "tiene los libros abiertos en la mesa".
*   **Duración**: ~60 minutos (renovable).

**🥈 Nivel 2: Multimodal RAG / Direct Files (Fallback)**
*   **Indicador UI**: 📂 Icono "Archivos Directos" (Azul).
*   **Activación**: Se activa automáticamente si falla la creación del caché (ej. error de API) pero los archivos están sanos (`geminiUri` válido).
*   **Mecanismo**: Se adjuntan los `geminiUri` de los archivos activos directamente al prompt de cada petición.
*   **Ventaja**: Misma calidad de comprensión que el caché (IA ve el libro completo).
*   **Desventaja**: Mayor consumo de ancho de banda/tokens por petición.

**🥉 Nivel 3: Standard RAG (Último Recurso)**
*   **Indicador UI**: 🔍 Icono "Búsqueda Manual" (Azul).
*   **Activación**: Se activa si no hay `geminiUri` válidos ni caché.
*   **Mecanismo**: Busca los 5-10 fragmentos más relevantes en la base vectorial y los pega como texto.
*   **Ventaja**: Robustez total (funciona siempre).
*   **Desventaja**: Contexto limitado (la IA solo ve fragmentos desconectados).

### Herramientas de Interacción
1.  **Fases Generativas (Exégesis, Homilética, Borrador)**:
    *   Procesos "Batch" que generan documentos completos.
    *   Usan la Estrategia de Contexto activa (Caché si existe, sino Fallback).
2.  **Chat Normal (Asistente General)**:
    *   Mantiene el hilo de la conversación.
    *   Usa `GeneratorChatService`.
    *   Tiene acceso al contexto completo (Caché/Archivos) para responder preguntas sobre la biblioteca.
3.  **Chat de Refinamiento (Canvas)**:
    *   Enfocado en mejorar una sección específica.
    *   Usa RAG Vectorial para buscar referencias puntuales si es necesario, sin cargar todo el contexto pesado innecesariamente.
4.  **Regeneración (Self-Correction)**:
    *   Funciones específicas (ej. `regenerateSermonPoint`) que re-escriben partes del contenido basándose en nuevas instrucciones.

---

## Flujo de Resolución de Problemas (Troubleshooting)
1.  **Error "Cache Creation Failed" (404/403)**:
    *   El sistema intenta **Auto-Curación (Self-Healing)**: Re-sube archivos a Gemini.
    *   Si tiene éxito -> Intenta crear Caché de nuevo.
    *   Si Caché falla de nuevo -> Activa **Nivel 2 (Multimodal RAG)** automáticamente. El usuario ve "Contexto Cargado (Modo Directo)".
2.  **Error "Files Expired"**:
    *   El usuario puede pulsar "Regenerar Contexto" manualmente para forzar el ciclo de curación.
