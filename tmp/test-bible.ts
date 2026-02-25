import { BibleVersionFactory } from './packages/infrastructure/src/bible/factories/BibleVersionFactory';

const repo = BibleVersionFactory.getForLocale('es');
const verses = repo.getVerses('Proverbios 3:13');
console.log('Proverbios 3:13:', verses);

const searchResults = repo.search('sabiduría', 2);
console.log('Search:', searchResults.map(r => r.text));
