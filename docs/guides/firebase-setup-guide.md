# Guía de Configuración de Firebase

## Paso 1: Obtener las Credenciales de Firebase

1. Ve a [Firebase Console](https://console.firebase.google.com/)
2. Selecciona tu proyecto DosFilos
3. Haz clic en el ícono de engranaje ⚙️ (Configuración del proyecto)
4. En la pestaña "General", baja hasta "Tus apps"
5. Si no has creado una app web, haz clic en el ícono `</>` (Web)
6. Registra la app con el nombre "DosFilos Web"
7. Copia la configuración que aparece (firebaseConfig)

## Paso 2: Crear el Archivo .env.local

Crea el archivo `.env.local` en la carpeta `packages/web/`:

```bash
cd packages/web
touch .env.local
```

## Paso 3: Copiar las Credenciales

Abre el archivo `.env.local` y pega las credenciales con este formato:

```env
# Firebase Configuration
VITE_FIREBASE_API_KEY=AIzaSy...
VITE_FIREBASE_AUTH_DOMAIN=dosfilosapp.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=dosfilosapp
VITE_FIREBASE_STORAGE_BUCKET=dosfilosapp.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abc123

# Gemini AI Configuration (opcional por ahora)
VITE_GEMINI_API_KEY=
```

**Importante:** Reemplaza los valores con los de tu proyecto Firebase.

## Paso 4: Habilitar Servicios en Firebase

### 4.1 Authentication

1. En Firebase Console, ve a "Authentication"
2. Haz clic en "Comenzar"
3. Habilita "Correo electrónico/contraseña"
4. Guarda los cambios

### 4.2 Firestore Database

1. En Firebase Console, ve a "Firestore Database"
2. Haz clic en "Crear base de datos"
3. Selecciona "Comenzar en modo de prueba" (las reglas ya están configuradas en el código)
4. Selecciona la ubicación más cercana (por ejemplo: `southamerica-east1`)
5. Haz clic en "Habilitar"

### 4.3 Storage

1. En Firebase Console, ve a "Storage"
2. Haz clic en "Comenzar"
3. Acepta las reglas predeterminadas (las reglas ya están configuradas en el código)
4. Selecciona la misma ubicación que Firestore
5. Haz clic en "Listo"

## Paso 5: Desplegar las Reglas de Seguridad

Desde la raíz del proyecto, ejecuta:

```bash
# Inicializar Firebase CLI (si no lo has hecho)
firebase login

# Seleccionar tu proyecto
firebase use --add
# Selecciona tu proyecto y dale el alias "default"

# Desplegar las reglas de seguridad
firebase deploy --only firestore:rules,storage:rules
```

## Paso 6: Verificar la Configuración

1. Reinicia el servidor de desarrollo:
```bash
npm run dev
```

2. Abre el navegador en `http://localhost:5173/`

3. Abre la consola del navegador (F12)

4. No deberías ver errores de Firebase

## Estructura de Archivos Creados

```
dosfilosPreach/
├── packages/
│   ├── domain/
│   │   └── src/
│   │       ├── entities/
│   │       │   ├── User.ts          ✅ Entidad User
│   │       │   └── Sermon.ts        ✅ Entidad Sermon
│   │       └── repositories/
│   │           ├── IAuthRepository.ts      ✅ Interface Auth
│   │           └── ISermonRepository.ts    ✅ Interface Sermon
│   │
│   ├── infrastructure/
│   │   └── src/
│   │       ├── config/
│   │       │   └── firebase.ts      ✅ Configuración Firebase
│   │       └── firebase/
│   │           ├── FirebaseAuthRepository.ts    ✅ Implementación Auth
│   │           └── FirebaseSermonRepository.ts  ✅ Implementación Sermon
│   │
│   └── web/
│       ├── .env.local               ⚠️  CREAR ESTE ARCHIVO
│       └── src/
│           └── context/
│               └── firebase-context.tsx  ✅ React Context
│
├── firestore.rules                  ✅ Reglas de seguridad Firestore
└── storage.rules                    ✅ Reglas de seguridad Storage
```

## Solución de Problemas

### Error: "Firebase: Error (auth/invalid-api-key)"
- Verifica que hayas copiado correctamente el API Key
- Asegúrate de que el archivo `.env.local` esté en `packages/web/`
- Reinicia el servidor de desarrollo

### Error: "Firebase: Error (auth/project-not-found)"
- Verifica que el `VITE_FIREBASE_PROJECT_ID` sea correcto
- Asegúrate de que el proyecto existe en Firebase Console

### Las reglas de seguridad no se aplican
- Ejecuta `firebase deploy --only firestore:rules,storage:rules`
- Verifica que estés usando el proyecto correcto con `firebase use`

## Próximos Pasos

Una vez configurado Firebase:

1. ✅ Crear un usuario de prueba
2. ✅ Probar la autenticación
3. ✅ Crear un sermón de prueba
4. ✅ Verificar que se guarde en Firestore

¡Tu proyecto DosFilos.Preach está listo para comenzar a desarrollar features! 🚀
