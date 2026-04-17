/**
 * GetVerseTextUseCase
 *
 * Retrieves the raw Hebrew verse (text + word tokens) from the MorphHB
 * provider without invoking the AI analysis service.
 *
 * Used to show an immediate verse preview when navigating with ◀/▶,
 * before the student decides to trigger the full analysis.
 */

import type { IHebrewBibleProvider, HebrewVerse } from '@dosfilos/domain';

export interface GetVerseTextInput {
  readonly morphhbKey: string;
  readonly chapter: number;
  readonly verse: number;
}

export class GetVerseTextUseCase {
  constructor(
    private readonly bibleProvider: IHebrewBibleProvider & {
      loadBook(key: string): Promise<void>;
    },
  ) {}

  async execute(input: GetVerseTextInput): Promise<HebrewVerse> {
    const { morphhbKey, chapter, verse } = input;
    // Book is likely already loaded (bookIndex was loaded first), but guard anyway
    await this.bibleProvider.loadBook(morphhbKey);
    return this.bibleProvider.getVerse(morphhbKey, chapter, verse);
  }
}
