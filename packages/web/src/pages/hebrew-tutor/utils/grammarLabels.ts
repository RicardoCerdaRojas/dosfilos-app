/**
 * grammarLabels.ts
 *
 * Shared mapping of GrammaticalCategory enum values → Spanish display labels.
 *
 * Single source of truth — used by:
 *  - DiscoveryModePage (category badge on word card)
 *  - ParticleQuickPanel (category header + chip)
 *  - Any future consumer that needs to display grammatical categories
 *
 * Keys are lowercase to allow case-insensitive lookup.
 */

export const GRAMMATICAL_CATEGORY_LABELS: Readonly<Record<string, string>> = {
  // ── Verbs ──────────────────────────────────────────────
  verb:                       'Verbo',
  participle:                 'Participio',
  infinitive:                 'Infinitivo',
  infinitive_absolute:        'Infinitivo Absoluto',
  infinitive_construct:       'Infinitivo Constructo',

  // ── Nominals ───────────────────────────────────────────
  noun:                       'Sustantivo',
  proper_noun:                'Nombre Propio',
  adjective:                  'Adjetivo',
  numeral:                    'Numeral',

  // ── Pronouns ───────────────────────────────────────────
  pronoun:                    'Pronombre',
  personal_pronoun:           'Pronombre Personal',
  demonstrative_pronoun:      'Pronombre Demostrativo',
  relative_pronoun:           'Pronombre Relativo',
  interrogative_pronoun:      'Pronombre Interrogativo',
  indefinite_pronoun:         'Pronombre Indefinido',

  // ── Particles & function words ─────────────────────────
  preposition:                'Preposición',
  conjunction:                'Conjunción',
  article:                    'Artículo',
  particle:                   'Partícula',
  adverb:                     'Adverbio',
  interjection:               'Interjección',
  interrogative:              'Interrogativo',
  negative:                   'Negación',
  relative:                   'Relativo',
};

/**
 * Returns the Spanish display label for a given grammatical category value.
 * Lookup is case-insensitive. Falls back to the raw value if no mapping exists.
 *
 * @param category - Raw GrammaticalCategory value (e.g. 'PROPER_NOUN')
 * @param fallback - What to show if the category is null/undefined
 */
export function getGrammaticalCategoryLabel(
  category: string | null | undefined,
  fallback = 'Desconocido',
): string {
  if (!category) return fallback;
  return GRAMMATICAL_CATEGORY_LABELS[category.toLowerCase()] ?? category;
}
