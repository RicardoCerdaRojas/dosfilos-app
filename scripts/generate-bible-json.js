const fs = require('fs');
const path = require('path');

const inputDir = 'packages/web/src/assets/bible-rvr1960-temp/procesados';
const outputFile = 'packages/web/src/assets/bible/rvr1960.json';

// Mapping from filename (without .js) to ID
const filenameToId = {
    'genesis': 'gn', 'exodo': 'ex', 'levitico': 'lv', 'numeros': 'nm', 'deuteronomio': 'dt',
    'josue': 'js', 'jueces': 'jud', 'rut': 'rt', '1_samuel': '1sm', '2_samuel': '2sm',
    '1_reyes': '1kgs', '2_reyes': '2kgs', '1_cronicas': '1ch', '2_cronicas': '2ch',
    'esdras': 'ezr', 'nehemias': 'ne', 'ester': 'et', 'job': 'job', 'salmos': 'ps',
    'proverbios': 'prv', 'eclesiastes': 'ec', 'cantares': 'so', 'isaias': 'is',
    'jeremias': 'jr', 'lamentaciones': 'lm', 'ezequiel': 'ez', 'daniel': 'dn',
    'oseas': 'ho', 'joel': 'jl', 'amos': 'am', 'abdias': 'ob', 'jonas': 'jn',
    'miqueas': 'mi', 'nahum': 'na', 'habacuc': 'hk', 'sofonias': 'zp', 'hageo': 'hg',
    'zacarias': 'zc', 'malaquias': 'ml', 'mateo': 'mt', 'marcos': 'mk', 'lucas': 'lk',
    'juan': 'jo', 'hechos': 'act', 'romanos': 'rm', '1_corintios': '1co',
    '2_corintios': '2co', 'galatas': 'gl', 'efesios': 'eph', 'filipenses': 'ph',
    'colosenses': 'col', '1_tesalonicenses': '1ts', '2_tesalonicenses': '2ts',
    '1_timoteo': '1ti', '2_timoteo': '2ti', 'tito': 'tit', 'filemon': 'phm',
    'hebreos': 'hb', 'santiago': 'jm', '1_pedro': '1pe', '2_pedro': '2pe',
    '1_juan': '1jo', '2_juan': '2jo', '3_juan': '3jo', 'judas': 'jd', 'apocalipsis': 're'
};

const files = fs.readdirSync(inputDir);
const bibleData = [];

files.forEach(file => {
    if (!file.endsWith('.js')) return;
    const name = file.replace('.js', '');
    const id = filenameToId[name];

    if (!id) {
        console.warn(`No ID found for ${file}`);
        return;
    }

    const content = fs.readFileSync(path.join(inputDir, file), 'utf-8');
    // Extract array content. Remove "export default " or "module.exports = " and trailing ";"
    let jsonStr = content.replace('export default ', '').replace('module.exports = ', '').trim();
    if (jsonStr.endsWith(';')) jsonStr = jsonStr.slice(0, -1);

    try {
        // Using new Function to evaluate the array literal safely-ish
        const chapters = new Function(`return ${jsonStr}`)();
        bibleData.push({
            id: id,
            chapters: chapters
        });
    } catch (e) {
        console.error(`Error parsing ${file}:`, e);
    }
});

fs.writeFileSync(outputFile, JSON.stringify(bibleData, null, 2));
console.log('Done!');
