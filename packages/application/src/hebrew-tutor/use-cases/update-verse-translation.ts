/**
 * UpdateVerseTranslationUseCase
 *
 * Allows an editor to patch the literal or fluid translation of a cached
 * verse analysis without discarding the full morphological analysis.
 *
 * This is intentionally a thin orchestration layer: validation is minimal
 * (non-empty strings) and the operation is delegated entirely to the
 * repository, which decides how to persist the change.
 */

import type { IHebrewSessionRepository } from '@dosfilos/domain';

export interface UpdateVerseTranslationInput {
  /** Verse reference, e.g. "Jonah.3.2" */
  reference: string;
  /** New literal translation, if being updated */
  literalTranslation?: string;
  /** New fluid translation, if being updated */
  fluidTranslation?: string;
}

export class UpdateVerseTranslationUseCase {
  constructor(private readonly repository: IHebrewSessionRepository) {}

  async execute(input: UpdateVerseTranslationInput): Promise<void> {
    const { reference, literalTranslation, fluidTranslation } = input;

    if (!reference) {
      throw new Error('UpdateVerseTranslation: reference is required');
    }

    const hasUpdate =
      (literalTranslation !== undefined && literalTranslation.trim().length > 0) ||
      (fluidTranslation !== undefined && fluidTranslation.trim().length > 0);

    if (!hasUpdate) {
      throw new Error('UpdateVerseTranslation: at least one translation field must be provided');
    }

    await this.repository.updateTranslation(reference, {
      literalTranslation: literalTranslation?.trim(),
      fluidTranslation: fluidTranslation?.trim(),
    });
  }
}
