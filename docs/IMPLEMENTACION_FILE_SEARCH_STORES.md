# Implementación: Sistema de 3 File Search Stores

## Estado: EN PROGRESO
## Iniciado: 2025-12-18

---

## ✅ Completado

### **Domain Layer** (/packages/domain/)

1. ✅ `FileSearchStoreEntity.ts`
   - Entidades para File Search Stores
   - Enums para contextos (EXEGESIS, HOMILETICS, GENERIC)
   - Metadata de archivos y configuración

2. ✅ `IFileSearchService.ts` (ports/)
   - Interface para operaciones de File Search
   - Interface para Core Library Service
   - Siguiendo Dependency Inversion Principle

3. ✅ Exports en `domain/index.ts`  
   - FileSearchStoreEntity exportado
   - IFileSearchService exportado

---

## 🔄 En Progreso

### **Infrastructure Layer** (/packages/infrastructure/)

**Siguiente**: Implementar `GeminiFileSearchService`

```typescript
// packages/infrastructure/src/gemini/GeminiFileSearchService.ts

import { IFileSearchService } from '@dosfilos/domain';
import { GoogleGenerativeAI } from '@google/generative-ai';

/**
 * Concrete implementation of IFileSearchService for Gemini API
 * Single Responsibility: Handle Gemini File Search API operations
 */
export class GeminiFileSearchService implements IFileSearchService {
    
    constructor(private apiKey: string) {
        this.genAI = new GoogleGenerativeAI(apiKey);
    }
    
    async uploadFile(
        fileBlob: Blob,
        mimeType: string,
        displayName: string
    ): Promise<string> {
        // Implementation...
    }
    
    async createFileSearchStore(
        fileUris: string[],
        displayName?: string
    ): Promise<{ name: string; createTime: Date }> {
        // Implementation...
    }
    
    async deleteFileSearchStore(storeName: string): Promise<void> {
        // Implementation...
    }
    
    async listFileSearchStores(): Promise<FileSearchStoreEntity[]> {
        // Implementation...
    }
}
```

---

### **Application Layer** (/packages/application/)

**Siguiente**: Implementar `CoreLibraryService`

```typescript
// packages/application/src/services/CoreLibraryService.ts

import { ICoreLibraryService, IFileSearchService, FileSearchStoreContext } from '@dosfilos/domain';

/**
 * Use Case: Manage Core Library File Search Stores
 * Single Responsibility: Orchestrate store creation and management
 * Open/Closed: Can be extended without modification
 */
export class CoreLibraryService implements ICoreLibraryService {
    
    constructor(
        private fileSearchService: IFileSearchService,
        private storageService: IStorageService,
        private configRepository: any // Firestore access
    ) {}
    
    async ensureStoresReady(): Promise<void> {
        // Load config from Firestore
        // Check if stores exist
        // Create missing stores
        // Save config
    }
    
    getStoreId(context: FileSearchStoreContext): string {
        // Return store ID for context
    }
    
    isInitialized(): boolean {
        // Check if all 3 stores are ready
    }
    
    async recreateStores(): Promise<void> {
        // Delete old stores
        // Create new stores
    }
}
```

---

## 📋 Plan de Implementación

### **Fase 1: Infrastructure** (Hoy - 2 horas)

1. ✅ Implementar `GeminiFileSearchService`
2. ✅ Tests unitarios
3. ✅ Export en infrastructure/index

### **Fase 2: Application** (Hoy - 2 horas)

1. ✅ Implementar `CoreLibraryService`
2. ✅ Configurar inyección de dependencias
3. ✅ Tests unitarios

### **Fase 3: Web Integration** (Mañana - 3 horas)

1. ✅ Loading screen component
2. ✅ Integrar en AuthProvider
3. ✅ Modificar generadores para usar stores
4. ✅ Error handling

### **Fase 4: Testing E2E** (Mañana - 2 horas)

1. ✅ Testing de flujo completo
2. ✅ Verificar costos
3. ✅ Verificar citaciones

### **Fase 5: Deployment** (siguientes días)

1. ✅ Subir archivos core a Firebase Storage
2. ✅ Deploy backend
3. ✅ Deploy frontend
4. ✅ Monitoring

---

## 📊 Principios SOLID Aplicados

### **S - Single Responsibility**
- `GeminiFileSearchService`: Solo maneja API de Gemini
- `CoreLibraryService`: Solo orquesta stores
- `AuthProvider`: Solo maneja autenticación y preparación inicial

### **O - Open/Closed**
- Interfaces permiten extender sin modificar
- Nuevos contextos se agregan fácilmente

### **L - Liskov Substitution**
- Cualquier implementación de `IFileSearchService` funciona
- Tests pueden usar mocks

### **I - Interface Segregation**
- `IFileSearchService`: Solo operaciones de File Search
- `ICoreLibraryService`: Solo gestión de stores
- Clientes usan solo lo que necesitan

### **D - Dependency Inversion**
- Application depende de ports (interfaces)
- Infrastructure implementa ports
- No hay dependencias concretas en domain/application

---

## 🏗️ Clean Architecture Layers

```
┌──────────────────────────────────────┐
│  Web (Presentation)                  │
│  - AuthProvider                      │
│  - LoadingScreen                     │
│  - SermonWizard                      │
└─────────────┬────────────────────────┘
              ↓ depends on
┌──────────────────────────────────────┐
│  Application (Use Cases)             │
│  - CoreLibraryService                │
│  - SermonGeneratorService            │
└─────────────┬────────────────────────┘
              ↓ depends on
┌──────────────────────────────────────┐
│  Domain (Business Rules)             │
│  - FileSearchStoreEntity             │
│  - IFileSearchService (port)         │
│  - ICoreLibraryService (port)        │
└─────────────┬────────────────────────┘
              ↑ implemented by
┌──────────────────────────────────────┐
│  Infrastructure (External)           │
│  - GeminiFileSearchService           │
│  - FirebaseStorageService            │
└──────────────────────────────────────┘
```

---

## 🎯 Siguiente Paso

**Implementar GeminiFileSearchService**

¿Continuo con la implementación?

---

**Autor**: Implementación siguiendo Clean Architecture & SOLID  
**Para**: Ricardo Cerda  
**Status**: ✅ Domain completado, ⏳ Infrastructure en progreso
