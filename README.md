# DosFilos.Preach

Sistema de herramientas para pastores y predicadores con gestor y generador de sermones basado en IA.

## 🏗️ Arquitectura

Este proyecto sigue los principios de **Clean Architecture** y **SOLID**, organizado en un monorepo con los siguientes paquetes:

- **`packages/domain`**: Entidades, casos de uso e interfaces (capa de dominio)
- **`packages/infrastructure`**: Implementaciones de Firebase, Gemini AI, etc.
- **`packages/application`**: Servicios de aplicación, DTOs y mappers
- **`packages/web`**: Aplicación React (UI)
- **`packages/functions`**: Firebase Cloud Functions

## 🚀 Inicio Rápido

### Prerrequisitos

- Node.js >= 20.0.0
- Yarn 1.x (`npm install -g yarn` si no lo tenés)
- Firebase CLI (`npm install -g firebase-tools`)

### Instalación

```bash
# Instalar dependencias (usa yarn por los workspaces)
yarn install

# Configurar Firebase (primera vez)
firebase login
firebase init

# Iniciar desarrollo
yarn dev
```

> **Nota:** el repo usa **yarn 1.x workspaces**. NO ejecutes `npm install` —
> regenera un `package-lock.json` que diverge del `yarn.lock` y hace fallar CI.
> Si por error lo hiciste, borralo (`.gitignore` lo bloquea de todas formas).

### Scripts Disponibles

```bash
yarn dev             # Inicia el servidor de desarrollo
yarn build           # Construye para producción
yarn preview         # Preview de la build de producción
yarn lint            # Ejecuta linting en todos los paquetes
yarn type-check      # Verifica tipos TypeScript
yarn test            # Ejecuta tests
yarn test:watch      # Ejecuta tests en modo watch
```

## 📁 Estructura del Proyecto

```
dosfilos-app/
├── packages/
│   ├── domain/              # Capa de Dominio
│   │   ├── entities/        # Entidades del negocio
│   │   ├── use-cases/       # Casos de uso
│   │   ├── repositories/    # Interfaces de repositorios
│   │   └── services/        # Interfaces de servicios
│   ├── infrastructure/      # Capa de Infraestructura
│   │   ├── firebase/        # Implementaciones Firebase
│   │   ├── ai/              # Proveedores de IA
│   │   └── config/          # Configuraciones
│   ├── application/         # Capa de Aplicación
│   │   ├── services/        # Servicios de aplicación
│   │   ├── dtos/            # Data Transfer Objects
│   │   └── mappers/         # Mappers
│   ├── web/                 # Aplicación React
│   │   ├── components/      # Componentes UI
│   │   ├── pages/           # Páginas
│   │   ├── hooks/           # Custom hooks
│   │   └── store/           # Estado global
│   └── functions/           # Firebase Functions
├── firebase.json            # Configuración Firebase
├── firestore.rules          # Reglas de seguridad Firestore
└── storage.rules            # Reglas de seguridad Storage
```

## 🔧 Tecnologías

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS
- **Backend**: Firebase (Firestore, Storage, Functions, Hosting, Auth)
- **IA**: Google Gemini API
- **State Management**: Zustand
- **Forms**: React Hook Form + Zod
- **Testing**: Vitest, React Testing Library, Playwright

## 🌿 Estrategia de Branching

- `main`: Producción (protegida, solo merge via PR)
- `develop`: Pre-producción/Preview (protegida, solo merge via PR)
- `feature/*`: Features en desarrollo

### Workflow

1. Crear feature branch desde `develop`
2. Desarrollar y hacer commits
3. Crear PR hacia `develop`
4. Aprobar PR → Auto-deploy a preview
5. Crear PR de `develop` a `main`
6. Aprobar PR → Deploy a producción

## 📝 Convenciones de Código

- Usar TypeScript strict mode
- Seguir principios SOLID
- Escribir tests para casos de uso
- Usar Conventional Commits
- Formatear con Prettier antes de commit

## 🧪 Testing

```bash
# Unit tests
npm run test:unit

# Watch mode
npm run test:watch

# Coverage
npm run test:coverage
```

## 🚀 Deployment

### Preview (develop)
```bash
firebase hosting:channel:deploy preview
```

### Producción (main)
```bash
npm run build
firebase deploy
```

## 📚 Documentación

- [Plan de Implementación](docs/implementation_plan.md)
- [Arquitectura](docs/architecture.md)
- [Guía de Contribución](docs/contributing.md)

## 📄 Licencia

Privado - Todos los derechos reservados

## 👥 Equipo

DosFilos.Preach - Sistema de herramientas pastorales
