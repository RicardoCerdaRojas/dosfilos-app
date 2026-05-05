import type { StyleManifestValidationIssue } from '@dosfilos/domain';

/**
 * Resolves a validation issue's `code` to a human-readable string via
 * the i18n table at `directory.styleGuides.editor.validation.{code}`.
 * Returns the first issue matching `(path, severity)` or null.
 *
 * Centralized here so each tab component doesn't repeat the lookup
 * incantation. The i18n table provides interpolation tokens like
 * `{{placeholder}}` for codes that need contextual data.
 */
export function issueLabel(
    issues: ReadonlyArray<StyleManifestValidationIssue>,
    path: string,
    severity: 'error' | 'warning',
    t: (key: string, opts?: Record<string, unknown>) => string,
): string | null {
    const issue = issues.find(i => i.path === path && i.severity === severity);
    if (!issue) return null;
    return t(`directory.styleGuides.editor.validation.${issue.code}`, issue.context);
}

/**
 * Variant for path-prefix matching — used by `AdditionalRulesTab`
 * where each entry has a path like `additionalRules.0`,
 * `additionalRules.1`, etc.
 */
export function issueLabelByPrefix(
    issues: ReadonlyArray<StyleManifestValidationIssue>,
    pathPrefix: string,
    severity: 'error' | 'warning',
    t: (key: string, opts?: Record<string, unknown>) => string,
): Map<string, string> {
    const out = new Map<string, string>();
    for (const issue of issues) {
        if (issue.severity !== severity) continue;
        if (!issue.path.startsWith(pathPrefix)) continue;
        out.set(issue.path, t(`directory.styleGuides.editor.validation.${issue.code}`, issue.context));
    }
    return out;
}
