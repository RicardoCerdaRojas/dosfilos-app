# Feature ID Audit Report

Generated: 2026-01-09T22:07:35.573Z

## Summary

- **Total in Firebase**: 12
- **Total in Code**: 24
- **Common**: 10
- **Only in Firebase**: 2
- **Only in Code**: 14

## ⚠️ CRITICAL: Features in Code but NOT in Firebase

These features are referenced in code but don't exist in any plan:

- `admin:analytics`
- `admin:manage_users`
- `admin:plans`
- `admin:system_config`
- `admin:users`
- `admin:view_analytics`
- `md:hidden`
- `module:biblioteca`
- `module:configuracion`
- `module:dashboard`
- `module:generar`
- `module:greek_tutor`
- `module:planes`
- `module:sermones`

## ⚡ WARNING: Features in Firebase but NOT in Code

These features exist in plans but are never referenced in code:

- `counseling:booking`
- `courses:download`

## ✅ Common Features (Consistent)

- `courses:certificates`
- `courses:view`
- `library:semantic_search`
- `library:unlimited_storage`
- `library:upload`
- `sermon:advanced_homiletics`
- `sermon:ai_assistant`
- `sermon:create`
- `sermon:custom_templates`
- `sermon:export_pdf`

## Plan Feature Breakdown

### Plan: basic

✅ `sermon:create`
✅ `sermon:export_pdf`
✅ `library:upload`

### Plan: enterprise

✅ `sermon:create`
✅ `sermon:ai_assistant`
✅ `sermon:advanced_homiletics`
✅ `sermon:export_pdf`
✅ `sermon:custom_templates`
✅ `library:upload`
✅ `library:semantic_search`
✅ `library:unlimited_storage`
✅ `courses:view`
⚠️ `courses:download`
✅ `courses:certificates`
⚠️ `counseling:booking`

### Plan: free

✅ `sermon:create`
✅ `sermon:export_pdf`
✅ `library:upload`

### Plan: pro

✅ `sermon:create`
✅ `sermon:ai_assistant`
✅ `sermon:export_pdf`
✅ `library:upload`
✅ `library:semantic_search`

### Plan: team

✅ `sermon:create`
✅ `sermon:ai_assistant`
✅ `sermon:advanced_homiletics`
✅ `sermon:export_pdf`
✅ `sermon:custom_templates`
✅ `library:upload`
✅ `library:semantic_search`
