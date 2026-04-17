/**
 * GetBibleNavigationUseCase
 *
 * Returns the list of books and navigation metadata needed by the
 * VerseSelector UI component. Fetches chapter/verse counts for the
 * selected book.
 */

import type { IHebrewBibleProvider, HebrewBook, BookIndex } from '@dosfilos/domain';

export interface GetBooksResult {
  readonly books: readonly HebrewBook[];
}

export interface GetBookIndexResult {
  readonly bookIndex: BookIndex;
}

export class GetBibleNavigationUseCase {
  constructor(
    private readonly bibleProvider: IHebrewBibleProvider & {
      loadBook(key: string): Promise<void>;
    },
  ) {}

  getBooks(): GetBooksResult {
    return { books: this.bibleProvider.getBooks() };
  }

  async getBookIndex(morphhbKey: string): Promise<GetBookIndexResult> {
    await this.bibleProvider.loadBook(morphhbKey);
    const bookIndex = this.bibleProvider.getBookIndex(morphhbKey);
    return { bookIndex };
  }
}
