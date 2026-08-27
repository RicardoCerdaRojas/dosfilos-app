# Dos Filos Preach — app tablet

App móvil/tablet de Dos Filos para **predicar** (módulo Púlpito) y, en una segunda
entrega, **redactar** (módulo Redactor). El plan ejecutable vive en
[`docs/app-mobile/pulpito-plan.md`](../../docs/app-mobile/pulpito-plan.md); las decisiones
estructurales (M-01..M-09) y el roadmap F0–F4 están ahí.

- **Nombre**: Dos Filos Preach
- **Bundle id / package**: `com.dosfilos.preach` (iOS y Android)
- **Plataformas**: iOS y Android desde F0. Soporte e-ink de primera clase (BOOX) — ver M-09.

## Estado (F0 — cimientos)

Fase F0 en curso. Base actual: Expo SDK 52 / React Native 0.76 (herencia del fork de
febrero 2026). Pendiente en F0: upgrade a Expo 56, `@react-native-firebase` + App Check,
Metro configurado para el workspace (`@dosfilos/domain` importable), tokens de tema con 5
modos (incluido tinta electrónica) y CI job mobile.

Qué quedó del fork y qué se eliminó: ver §3 del plan. Los módulos Eventos, Tutor, Study y
Donate fueron eliminados en F0; el módulo Biblia y el patrón de auth se rescatan.

## Desarrollo

```bash
# desde la raíz del monorepo
npm run mobile            # expo start
npm run mobile:ios        # build + run iOS
npm run mobile:android    # build + run Android
```

> **Nota**: a partir de la adopción de `@react-native-firebase` + App Check (F0) la app no
> corre en Expo Go: se usan dev builds (EAS). Los debug tokens de App Check para
> dispositivos internos se documentarán aquí cuando se provisionen.

## Estructura

- `app/` — rutas (Expo Router): `(auth)`, `(tabs)` con Inicio / Biblia / Sermones.
- `src/domain`, `src/data`, `src/core`, `src/presentation` — capas propias del cliente.
- `stitch_design.mobile/` — diseños de referencia (Stitch, feb 2026). Solo referencia
  visual; `preaching_mode_(tablet)` coincide con el plan de Púlpito.
