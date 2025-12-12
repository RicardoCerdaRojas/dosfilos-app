# Propuesta de Rediseño: Plan de Predicación

## 📋 Análisis del Estado Actual

### Problemas Identificados:

1. **Mal uso del espacio**: Lista vertical simple desperdicia espacio en pantallas grandes
2. **Información faltante**: No muestra el pasaje bíblico de cada sermón
3. **Terminología confusa**: "Serie" no refleja la función real de planificación
4. **Gestión de fechas limitada**: No hay vista de calendario para administrar fechas
5. **Escalabilidad**: Difícil de usar con 100+ sermones (ej: plan de Mateo completo)
6. **Navegación pobre**: Scroll infinito sin agrupación ni filtros

## 🎯 Objetivos de la Mejora

1. **Renombrar** "Serie" → "Plan de Predicación"
2. **Agregar vista de calendario** para mejor gestión temporal
3. **Mostrar pasajes bíblicos** prominentemente
4. **Soportar escala** de 4 a 100+ sermones
5. **Mejorar visualización** del progreso y estado
6. **Facilitar reorganización** mediante drag & drop

## 🏗️ Arquitectura Propuesta (SOLID + Clean Architecture)

### Capa de Dominio (Domain Layer)

```typescript
// packages/domain/src/entities/PreachingPlan.ts
export interface PreachingPlan {
  id: string;
  userId: string;
  title: string;
  description: string;
  type: 'thematic' | 'book' | 'lectionary' | 'custom';
  
  // Metadata por tipo
  metadata: {
    // Para tipo 'book'
    biblicalBook?: string;
    totalChapters?: number;
    
    // Para tipo 'thematic'
    theme?: string;
    season?: 'advent' | 'christmas' | 'lent' | 'easter' | 'pentecost' | 'ordinary';
    
    // Configuración de visualización
    viewPreference?: 'calendar' | 'list' | 'kanban';
    groupBy?: 'month' | 'quarter' | 'book' | 'status';
  };
  
  startDate: Date;
  endDate?: Date;
  coverUrl?: string;
  
  // Estadísticas calculadas
  stats: {
    total: number;
    planned: number;
    inProgress: number;
    completed: number;
    preached: number;
  };
  
  // Sermones planificados
  plannedSermons: PlannedSermon[];
  
  createdAt: Date;
  updatedAt: Date;
}

export interface PlannedSermon {
  id: string;
  week: number;
  title: string;
  description: string;
  passage: string;  // 📌 CRÍTICO: Siempre mostrar
  scheduledDate?: Date;
  actualPreachDate?: Date;  // Fecha real de predicación
  
  // Referencias
  draftId?: string;
  sermonId?: string;
  
  // Estado
  status: 'planned' | 'in_progress' | 'ready' | 'preached';
  
  // Tags semánticos
  tags?: string[];
  
  // Progreso del draft
  wizardProgress?: {
    currentStep: number;
    lastSaved: Date;
  };
}
```

### Servicios (Application Layer)

```typescript
// packages/application/src/services/PreachingPlanService.ts
export interface IPreachingPlanService {
  // CRUD básico
  createPlan(data: CreatePlanDTO): Promise<PreachingPlan>;
  updatePlan(id: string, data: UpdatePlanDTO): Promise<PreachingPlan>;
  deletePlan(id: string): Promise<void>;
  getPlan(id: string): Promise<PreachingPlan | null>;
  getUserPlans(userId: string): Promise<PreachingPlan[]>;
  
  // Gestión de sermones
  addSermonToPlan(planId: string, sermon: PlannedSermon): Promise<void>;
  removeSermonFromPlan(planId: string, sermonId: string): Promise<void>;
  reorderSermons(planId: string, sermonIds: string[]): Promise<void>;
  
  // Gestión de fechas
  rescheduleSermon(
    planId: string, 
    sermonId: string, 
    newDate: Date
  ): Promise<void>;
  
  bulkReschedule(
    planId: string,
    updates: Array<{ sermonId: string; newDate: Date }>
  ): Promise<void>;
  
  // Generación inteligente
  generateBookPlan(
    bookName: string,
    startDate: Date,
    frequency: 'weekly' | 'biweekly'
  ): Promise<PlannedSermon[]>;
  
  generateThematicPlan(
    theme: string,
    seasonDates: { start: Date; end: Date },
    sermonCount: number
  ): Promise<PlannedSermon[]>;
}
```

## 🎨 Propuestas de UI/UX

### 1. Vista de Calendario (Principal)

**Características:**
- Vista mensual con los sermones del mes
- Drag & drop para reprogramar
- Colores por estado (Planificado, En Desarrollo, Listo, Predicado)
- Click en sermón abre panel lateral con detalles
- Navegación mes/trimestre/año

**Ventajas:**
- Visualización temporal clara
- Fácil para reprogramar
- Ideal para planificación a largo plazo
- Detecta conflictos de fechas

### 2. Vista de Lista Mejorada (Alternativa)

**Características:**
- Agrupación por mes/trimestre
- Tabla con columnas: # | Título | Pasaje | Fecha | Estado | Acciones
- Filtros: Por estado, Por mes, Por libro bíblico
- Búsqueda por título o pasaje
- Orden: Por fecha, Por orden de serie, Manual (drag & drop)

**Ventajas:**
- Densidad de información
- Fácil escaneo visual
- Búsqueda rápida

### 3. Vista Kanban (Opcional)

**Características:**
- Columnas: Planificado | En Desarrollo | Listo | Predicado
- Drag & drop entre estados
- Cards con: Título, Pasaje, Fecha
- Contador por columna

**Ventajas:**
- Seguimiento de progreso
- Gestión de workflow
- Visual y simple

## 📱 Componentes Propuestos

### PreachingPlanDetails Component

```tsx
// Estructura modular
<PreachingPlanDetails>
  {/* Header mejorado */}
  <PlanHeader 
    plan={plan}
    onEdit={handleEdit}
    onGenerateAI={handleGenerateAI}
  />
  
  {/* Controles de vista */}
  <ViewControls
    currentView={viewMode}
    onViewChange={setViewMode}
    filters={filters}
    onFilterChange={setFilters}
  />
  
  {/* Contenido principal - cambia según vista */}
  {viewMode === 'calendar' && (
    <CalendarView 
      sermons={sermons}
      onReschedule={handleReschedule}
      onSelect={setSelectedSermon}
    />
  )}
  
  {viewMode === 'list' && (
    <ListView
      sermons={sermons}
      groupBy={groupBy}
      onReorder={handleReorder}
      onSelect={setSelectedSermon}
    />
  )}
  
  {viewMode === 'kanban' && (
    <KanbanView
      sermons={sermons}
      onStatusChange={handleStatusChange}
      onSelect={setSelectedSermon}
    />
  )}
  
  {/* Panel lateral de detalles */}
  <SermonDetailPanel
    sermon={selectedSermon}
    onClose={() => setSelectedSermon(null)}
    onStartDraft={handleStartDraft}
    onEdit={handleEditSermon}
  />
</PreachingPlanDetails>
```

### CalendarView Component (Prioritario)

```tsx
interface CalendarViewProps {
  sermons: PlannedSermon[];
  currentMonth: Date;
  onReschedule: (sermonId: string, newDate: Date) => Promise<void>;
  onSelect: (sermon: PlannedSermon) => void;
}

// Usa react-big-calendar o headlessui
// Implementa drag & drop con @dnd-kit
```

### ListView Component (Tabla mejorada)

```tsx
interface ListViewProps {
  sermons: PlannedSermon[];
  groupBy: 'month' | 'quarter' | 'status' | 'book';
  sortBy: 'date' | 'order' | 'title';
  filters: SermonFilters;
}

// Usa shadcn Table component
// Implementa virtualization con @tanstack/react-virtual para 100+ items
```

## 🔄 Flujos de Interacción Mejorados

### 1. Crear Plan de Predicación

```
Usuario → "Nuevo Plan" → Dialog con wizard:
  Paso 1: Tipo (Libro, Temático, Personalizado)
  Paso 2: Detalles (Nombre, fechas, etc.)
  Paso 3: Generar sermones (AI assisted)
  Paso 4: Revisar y ajustar
```

### 2. Gestionar Fechas

```
Vista Calendario → Drag & drop sermón a nueva fecha → Confirmación → Actualizado
Vista Lista → Click en fecha → DatePicker → Guardar
Bulk Update → Seleccionar múltiples → "Reprogramar seleccionados" → Modal
```

### 3. Desarrollo de Sermón

```
Click en sermón → Panel lateral abre → Mostrar:
  - Pasaje prominente
  - Estado actual
  - Fecha programada
  - Botones: "Desarrollar" | "Continuar" | "Ver"
  - Progress bar si está en desarrollo
```

## 📊 Mejoras de Datos

### 1. Información Adicional por Sermón

```typescript
interface EnhancedPlannedSermon extends PlannedSermon {
  // Contexto bíblico
  passage: string;              // "Mateo 5:1-12"
  passageReference: {
    book: string;               // "Mateo"
    chapter: number;            // 5
    verses: [number, number];   // [1, 12]
  };
  
  // Categorización
  seriesOrder: number;          // Orden en la serie
  biblicalBookOrder?: number;   // Si es plan de libro
  
  // Preparación
  preparationStartDate?: Date;  // Cuándo empezar a preparar
  reviewDate?: Date;            // Fecha de revisión final
  
  // Tracking
  views?: number;               // Cuántas veces se predicó
  feedback?: string[];          // Notas post-predicación
}
```

### 2. Generación Inteligente

```typescript
// AI-assisted plan generation
async generateBookPlan(params: {
  book: string;
  startDate: Date;
  frequency: 'weekly' | 'biweekly';
  skipDates?: Date[];  // Feriados, vacaciones
}) {
  // 1. Obtener estructura del libro (capítulos/perícopes)
  // 2. Dividir en secciones lógicas
  // 3. Generar títulos sugeridos
  // 4. Calcular fechas considerando frecuencia
  // 5. Retornar plan completo
}
```

## 🎯 Plan de Implementación (Fases)

### Fase 0: Vista Dashboard (Semana 1) ⭐ PRIORITARIO
**Objetivo:** Crear vista panorámica del plan con información clave

#### Componentes del Dashboard:

1. **StatsOverview** (Tarjetas de estadísticas)
   - [ ] Total sermones (completados/total)
   - [ ] Próximo sermón (fecha, días restantes, título)
   - [ ] En desarrollo (cantidad, desglose por fase)
   - [ ] Sermones predicados vs pendientes

2. **TimelineView** (Línea temporal visual)
   - [ ] Diseño de timeline horizontal
   - [ ] Marcadores de sermones (pasados/futuros)
   - [ ] Indicador "estás aquí"
   - [ ] Hover para detalles del sermón

3. **UpcomingSermons** (Próximos 30 días)
   - [ ] Tabla compacta: Fecha | Título | Pasaje | Estado
   - [ ] Acciones rápidas por sermón
   - [ ] Ordenamiento por fecha
   - [ ] Destacar urgentes (< 7 días)

4. **AlertsPanel** (Alertas inteligentes)
   - [ ] Sermones sin fecha asignada
   - [ ] Sermones urgentes sin completar
   - [ ] Gaps en calendario
   - [ ] Conflictos de fechas

5. **ProgressChart** (Gráfico de distribución)
   - [ ] Pie chart o donut chart
   - [ ] Estados: Planificado | En Desarrollo | Listo | Predicado
   - [ ] Colores consistentes con badges

6. **BiblicalCoverage** (Solo para tipo 'book')
   - [ ] Mapa visual del libro bíblico
   - [ ] Capítulos cubiertos vs pendientes
   - [ ] Identificación de gaps
   - [ ] Progress bar por libro

7. **QuickActions** (Accesos rápidos)
   - [ ] Botón: Ver Calendario
   - [ ] Botón: Agregar Sermón
   - [ ] Botón: Generar con AI
   - [ ] Botón: Cambiar Vista

#### Métricas Calculadas:
```typescript
interface PlanMetrics {
  totalSermons: number;
  plannedCount: number;
  inProgressCount: number;
  readyCount: number;
  preachedCount: number;
  nextSermon: {
    title: string;
    date: Date;
    daysUntil: number;
    passage: string;
    status: string;
  } | null;
  urgentSermons: PlannedSermon[]; // < 7 días
  withoutDate: PlannedSermon[];
  completionPercentage: number;
  avgDevelopmentTime: number; // días promedio
}
```

### Fase 1: Fundamentos (Semana 1-2)
- [ ] Renombrar "Serie" → "Plan de Predicación" en dominio
- [ ] Agregar campo `passage` obligatorio a PlannedSermon
- [ ] Migrar datos existentes
- [ ] Actualizar UI headers y textos
- [ ] Actualizar rutas (/series → /plans)

### Fase 2: Vista de Lista Mejorada (Semana 3)
- [ ] Agregar columna de Pasaje
- [ ] Implementar agrupación (mes/trimestre)
- [ ] Agregar filtros
- [ ] Mejorar densidad visual
- [ ] Drag & drop para reordenar

### Fase 3: Vista de Calendario (Semana 4-5)
- [ ] Integrar react-big-calendar
- [ ] Implementar drag & drop con @dnd-kit
- [ ] Panel lateral de detalles
- [ ] Navegación temporal
- [ ] Gestión de conflictos

### Fase 4: Generación Inteligente (Semana 6)
- [ ] Wizard de creación de plan
- [ ] AI para generar plan de libro
- [ ] AI para generar plan temático
- [ ] Sugerencias de pasajes

### Fase 5: Optimizaciones (Semana 6)
- [ ] Virtualización para 100+ sermones
- [ ] Bulk operations
- [ ] Export/import
- [ ] Mobile responsive

## 🏆 Beneficios Esperados

1. **Usabilidad**: 3 vistas diferentes para distintas necesidades
2. **Escalabilidad**: Soporta planes de 4 a 100+ sermones
3. **Información**: Pasajes siempre visibles
4. **Flexibilidad**: Fácil reprogramar y reorganizar
5. **Mantenibilidad**: Arquitectura limpia y modular
6. **Extensibilidad**: Fácil agregar nuevas funcionalidades

## 📐 Principios SOLID Aplicados

- **S**ingle Responsibility: Cada componente tiene una responsabilidad clara
- **O**pen/Closed: Extensible sin modificar código existente
- **L**iskov Substitution: Views intercambiables siguiendo mismo contrato
- **I**nterface Segregation: Interfaces específicas por necesidad
- **D**ependency Inversion: Servicios dependen de abstracciones

## 🔍 Siguiente Paso

¿Quieres que proceda con la implementación? Sugiero empezar con:
1. Fase 1 (renombrado + campo passage)
2. Fase 2 (lista mejorada) 

Esto daría mejoras inmediatas sin romper funcionalidad existente.
