# Internationalization (i18n) System

## Overview

This project uses `react-i18next` for internationalization, following **SOLID principles** and **clean architecture** practices.

## Architecture

```
src/i18n/
├── components/          # UI components for i18n
│   └── LanguageSwitcher.tsx
├── config/             # Configuration files
│   └── i18n.ts
├── hooks/              # Custom hooks
│   └── useTranslation.ts
├── locales/            # Translation files organized by language
│   ├── en/
│   │   ├── common.json
│   │   ├── landing.json
│   │   └── navigation.json
│   └── es/
│       ├── common.json
│       ├── landing.json
│       └── navigation.json
├── types.ts            # TypeScript type definitions
└── index.ts            # Public exports
```

## Features

✅ **Type-safe translations** with TypeScript  
✅ **Automatic language detection** from browser settings  
✅ **Persistence** in localStorage  
✅ **Namespace organization** for better code splitting  
✅ **Clean component API** with custom hooks  
✅ **SOLID principles** implementation

## Supported Languages

- 🇪🇸 Spanish (es) - Default
- 🇺🇸 English (en)

## Usage

### Basic Usage

```tsx
import { useTranslation } from '@/i18n';

function MyComponent() {
  const { t } = useTranslation('common');
  
  return <h1>{t('welcome')}</h1>;
}
```

### Using Multiple Namespaces

```tsx
import { useTranslation } from '@/i18n';

function MyPage() {
  const { t } = useTranslation('landing');
  const { t: tNav } = useTranslation('navigation');
  
  return (
    <div>
      <h1>{t('hero.title')}</h1>
      <nav>{tNav('features')}</nav>
    </div>
  );
}
```

### Language Switcher Component

```tsx
import { LanguageSwitcher } from '@/i18n';

function Navigation() {
  return (
    <nav>
      <LanguageSwitcher variant="ghost" showLabel={true} />
    </nav>
  );
}
```

## Translation Keys Structure

### Common Namespace
```json
{
  "buttons": {
    "getStarted": "...",
    "watchDemo": "..."
  },
  "loading": "...",
  "error": "..."
}
```

### Navigation Namespace
```json
{
  "logo": "...",
  "features": "...",
  "pricing": "..."
}
```

### Landing Namespace
```json
{
  "hero": {
    "badge": "...",
    "title": {
      "part1": "...",
      "part2": "..."
    },
    "subtitle": {...},
    "badges": {...},
    "cta": {...}
  },
  "metrics": {...},
  "transformation": {...}
}
```

## Adding a New Language

1. Add language to `SUPPORTED_LANGUAGES` in `src/i18n/types.ts`
2. Create translation files in `src/i18n/locales/{langCode}/`
3. Import in `src/i18n/config/i18n.ts`
4. Add translations to resources object

Example for French:

```typescript
// types.ts
export type SupportedLanguage = 'en' | 'es' | 'fr';

export const SUPPORTED_LANGUAGES = {
  // ... existing
  fr: {
    code: 'fr',
    name: 'French',
    nativeName: 'Français',
    flag: '🇫🇷'
  }
} as const;
```

```typescript
// config/i18n.ts
import landingFr from '../locales/fr/landing.json';

// In resources object:
resources: {
  // ... existing
  fr: {
    landing: landingFr,
    // ... other namespaces
  }
}
```

## Adding a New Namespace

1. Add to `TranslationNamespace` type in `src/i18n/types.ts`
2. Create JSON files for each language: `locales/{lang}/{namespace}.json`
3. Import and add to resources in `config/i18n.ts`

## Best Practices

### ✅ DO:
- Use nested keys for related translations: `hero.title.part1`
- Keep keys semantic and descriptive
- Organize by feature/page using namespaces
- Use the same structure across all languages
- Leverage TypeScript for type safety

### ❌ DON'T:
- Hardcode strings in components
- Mix languages in the same file
- Use abbreviated or cryptic key names
- Forget to add translations for all languages

## SOLID Principles Applied

### Single Responsibility Principle (SRP)
- Each file has one clear purpose (types, config, hooks, components)
- Translation files organized by namespace

### Open/Closed Principle (OCP)
- Easy to add new languages without modifying existing code
- LanguageSwitcher is extensible for new languages

### Liskov Substitution Principle (LSP)
- Consistent interfaces across all language implementations

### Interface Segregation Principle (ISP)
- Separate namespaces for different concerns (landing, navigation, common)
- Custom hook provides only what's needed

### Dependency Inversion Principle (DIP)
- Components depend on the i18n abstraction, not concrete implementations
- Centralized configuration

## Development

### Type Safety

The system is fully typed. TypeScript will catch:
- Missing translation keys
- Typos in namespace names  
- Invalid language codes

### Testing Translations

```tsx
// Switch language programmatically
const { changeLanguage } = useTranslation();

changeLanguage('en'); // Switch to English
changeLanguage('es'); // Switch to Spanish
```

## Migration Guide

To add i18n to an existing component:

**Before:**
```tsx
<h1>Exégesis profunda.</h1>
```

**After:**
```tsx
import { useTranslation } from '@/i18n';

function MyComponent() {
  const { t } = useTranslation('landing');
  return <h1>{t('hero.title.part1')}</h1>;
}
```

## Performance

- Translations are loaded eagerly on app init
- Minimal bundle size impact (~10KB gzipped)
- No runtime translation overhead
- localStorage caching for language preference

## Troubleshooting

### Translations not showing
- Check if i18n is initialized in `main.tsx`
- Verify translation key exists in JSON file
- Check browser console for i18n warnings

### Language not persisting
- Check localStorage for `dosfilos-language` key
- Verify `LanguageDetector` is configured correctly

### TypeScript errors
- Ensure translation files are properly imported
- Check namespace and key names match types

## Resources

- [react-i18next Documentation](https://react.i18next.com/)
- [i18next Documentation](https://www.i18next.com/)
