import { describe, it, expect } from 'vitest';
import {
    scriptFidelity,
    pageIntegrity,
    pageDrift,
    structure,
    novelty,
    verdict,
} from '../lib/metrics.mjs';

// Real text, not lorem ipsum — the whole point is that these metrics
// discriminate on the actual shape of a Greek NT and a pointed BHS.
const JOHN_1_1_POLYTONIC = 'Ἐν ἀρχῇ ἦν ὁ λόγος, καὶ ὁ λόγος ἦν πρὸς τὸν θεόν, καὶ θεὸς ἦν ὁ λόγος.';
const JOHN_1_1_STRIPPED = 'Εν αρχη ην ο λογος, και ο λογος ην προς τον θεον, και θεος ην ο λογος.';
const GEN_1_1_POINTED = 'בְּרֵאשִׁית בָּרָא אֱלֹהִים אֵת הַשָּׁמַיִם וְאֵת הָאָרֶץ';
const GEN_1_1_UNPOINTED = 'בראשית ברא אלהים את השמים ואת הארץ';
const GEN_1_1_CANTILLATED = 'בְּרֵאשִׁ֖ית בָּרָ֣א אֱלֹהִ֑ים אֵ֥ת הַשָּׁמַ֖יִם וְאֵ֥ת הָאָֽרֶץ';

describe('scriptFidelity — griego politónico', () => {
    it('distingue griego con diacríticos de griego pelado', () => {
        const rich = scriptFidelity(JOHN_1_1_POLYTONIC);
        const poor = scriptFidelity(JOHN_1_1_STRIPPED);

        // Ambos reconocen las MISMAS letras. Ese es justo el punto: un
        // word-error-rate no vería diferencia entre estos dos.
        expect(rich.greekLetters).toBe(poor.greekLetters);

        expect(rich.greekDiacriticRatio).toBeGreaterThan(0.3);
        expect(poor.greekDiacriticRatio).toBe(0);
    });

    it('da el mismo ratio esté precompuesto o descompuesto', () => {
        const nfc = scriptFidelity(JOHN_1_1_POLYTONIC.normalize('NFC'));
        const nfd = scriptFidelity(JOHN_1_1_POLYTONIC.normalize('NFD'));
        expect(nfd.greekDiacriticRatio).toBeCloseTo(nfc.greekDiacriticRatio, 10);
    });

    it('no cuenta los acentos del español como diacríticos griegos', () => {
        const spanish = scriptFidelity('La exégesis teológica de la versión canónica más común.');
        expect(spanish.greekDiacritics).toBe(0);
        expect(spanish.greekDiacriticRatio).toBe(0);
    });
});

describe('scriptFidelity — hebreo', () => {
    it('distingue texto puntuado de consonantal', () => {
        const pointed = scriptFidelity(GEN_1_1_POINTED);
        const bare = scriptFidelity(GEN_1_1_UNPOINTED);

        expect(pointed.hebrewConsonants).toBe(bare.hebrewConsonants);
        expect(pointed.niqqudRatio).toBeGreaterThan(0.5);
        expect(bare.niqqud).toBe(0);
        expect(bare.niqqudRatio).toBe(0);
    });

    it('detecta los acentos de cantilación por separado de las vocales', () => {
        const plain = scriptFidelity(GEN_1_1_POINTED);
        const withTeamim = scriptFidelity(GEN_1_1_CANTILLATED);

        expect(plain.cantillation).toBe(0);
        expect(withTeamim.cantillation).toBeGreaterThan(0);
        // La puntuación vocálica sobrevive en ambos.
        expect(withTeamim.niqqudRatio).toBeGreaterThan(0.5);
    });
});

describe('scriptFidelity — señales de texto corrupto', () => {
    it('cuenta caracteres de reemplazo', () => {
        expect(scriptFidelity('λό�γος').replacementChars).toBe(1);
    });

    it('detecta marcas diacríticas huérfanas', () => {
        // Marca combinante tras un espacio: se soltó de su letra.
        const mangled = 'λογος ̓́ αρχη';
        expect(scriptFidelity(mangled).orphanCombining).toBeGreaterThan(0);
        expect(scriptFidelity(JOHN_1_1_POLYTONIC).orphanCombining).toBe(0);
    });
});

describe('pageIntegrity', () => {
    const doc = [
        '<!-- page: 1 -->', 'Contenido suficientemente largo de la primera página.',
        '<!-- page: 2 -->', 'Contenido suficientemente largo de la segunda página.',
        '<!-- page: 3 -->', 'Contenido suficientemente largo de la tercera página.',
    ].join('\n');

    it('acepta un documento completo y ordenado', () => {
        const r = pageIntegrity(doc, 3);
        expect(r.uniquePages).toBe(3);
        expect(r.duplicated).toBe(false);
        expect(r.ascending).toBe(true);
        expect(r.missingPages).toEqual([]);
        expect(r.emptyPages).toEqual([]);
    });

    it('reporta páginas que el extractor nunca emitió', () => {
        const r = pageIntegrity(doc, 5);
        expect(r.missingPages).toEqual([4, 5]);
    });

    it('detecta marcadores duplicados y desordenados', () => {
        const bad = '<!-- page: 1 -->\ntexto suficientemente largo acá\n<!-- page: 1 -->\notro texto largo acá';
        const r = pageIntegrity(bad, 2);
        expect(r.duplicated).toBe(true);
        expect(r.ascending).toBe(false);
    });

    it('marca páginas prácticamente vacías', () => {
        const sparse = '<!-- page: 1 -->\nok texto suficientemente largo\n<!-- page: 2 -->\n \n<!-- page: 3 -->\nmás texto igualmente largo por acá';
        expect(pageIntegrity(sparse, 3).emptyPages).toEqual([2]);
    });
});

describe('pageDrift', () => {
    it('detecta corrimiento de numeración entre dos motores', () => {
        const a = `<!-- page: 1 -->\ntexto normal\n<!-- page: 2 -->\n${JOHN_1_1_POLYTONIC}\n<!-- page: 3 -->\ntexto normal`;
        // El mismo griego, una página más adelante.
        const b = `<!-- page: 1 -->\ntexto normal\n<!-- page: 2 -->\ntexto normal\n<!-- page: 3 -->\n${JOHN_1_1_POLYTONIC}`;

        const drift = pageDrift(a, b);
        expect(drift.agreementRatio).toBeLessThan(1);
        expect(drift.disagreements.length).toBeGreaterThan(0);
    });

    it('no reporta corrimiento cuando ambos coinciden', () => {
        const same = `<!-- page: 1 -->\n${JOHN_1_1_POLYTONIC}\n<!-- page: 2 -->\n${GEN_1_1_POINTED}`;
        const drift = pageDrift(same, same);
        expect(drift.agreementRatio).toBe(1);
        expect(drift.disagreements).toEqual([]);
    });
});

describe('structure', () => {
    it('cuenta encabezados, tablas y saltos de nivel', () => {
        const md = [
            '# Parte I',
            '### Jonás 1:1-3',   // salto de nivel (# → ###)
            '| lema | glosa |',
            '| --- | --- |',
            '| חֶסֶד | lealtad pactual |',
        ].join('\n');
        const s = structure(md);
        expect(s.headings).toBe(2);
        expect(s.tables).toBe(1);
        expect(s.tableRows).toBe(3);
        expect(s.headingLevelJumps).toBe(1);
    });
});

describe('novelty', () => {
    it('es cero cuando todos los motores leyeron lo mismo', () => {
        const t = 'El mismo párrafo exacto repetido por todos los motores de extracción disponibles.';
        expect(novelty(t, [t, t]).novelRatio).toBe(0);
    });

    it('es alto cuando un motor aporta texto que nadie más tiene', () => {
        const shared = 'Un párrafo compartido por los motores restantes del banco de pruebas.';
        const inventive = shared + ' Y además una frase que ningún otro motor produjo jamás en absoluto.';
        expect(novelty(inventive, [shared]).novelRatio).toBeGreaterThan(0.1);
    });
});

describe('verdict', () => {
    const okPage = { missingPages: [], duplicated: false, ascending: true, emptyPages: [] };

    it('reprueba griego sin diacríticos aunque las letras estén', () => {
        // Repetido para superar las 100 letras: con menos, el ratio es ruidoso
        // y el veredicto sólo advierte en vez de reprobar.
        const m = { script: scriptFidelity(JOHN_1_1_STRIPPED.repeat(4)), page: okPage };
        const v = verdict(m, { expectGreek: true, expectHebrew: false });
        expect(v.status).toBe('NO APTO');
        expect(v.notes.join(' ')).toMatch(/inservible para exégesis/);
    });

    it('reprueba hebreo sin puntuación vocálica', () => {
        const m = { script: scriptFidelity(GEN_1_1_UNPOINTED), page: okPage };
        const v = verdict(m, { expectGreek: false, expectHebrew: true });
        expect(v.status).toBe('NO APTO');
        expect(v.notes.join(' ')).toMatch(/puntuación vocálica/);
    });

    it('reprueba páginas faltantes: una cita sin página no es verificable', () => {
        const m = {
            script: scriptFidelity(JOHN_1_1_POLYTONIC),
            page: { ...okPage, missingPages: [7, 8] },
        };
        const v = verdict(m, { expectGreek: true, expectHebrew: false });
        expect(v.status).toBe('NO APTO');
    });

    it('detecta fabricación por desacuerdo con el consenso, no por el ratio', () => {
        // Caso real de LlamaParse balanced: 3354 letras griegas donde otros tres
        // motores coincidieron en ~33, con ratio 0,225 — por ENCIMA de cualquier
        // umbral absoluto razonable. El texto era griego moderno inventado.
        const fabricado = 'τί ναί μάτι ζωή φῶς ἤδη πού σέ τά ό ή '.repeat(20);
        const m = {
            script: scriptFidelity(fabricado),
            page: okPage,
            consensus: { greekMedian: 33, hebrewMedian: 529 },
        };
        // Ratio sano: un umbral absoluto lo dejaría pasar. Sólo el desacuerdo
        // con el consenso lo delata.
        expect(m.script.greekDiacriticRatio).toBeGreaterThan(0.15);
        const v = verdict(m, { expectGreek: false, expectHebrew: false });
        expect(v.status).toBe('NO APTO');
        expect(v.notes.join(' ')).toMatch(/FABRICADO/);
    });

    it('no marca como fabricación al motor que coincide con el consenso', () => {
        const m = {
            script: scriptFidelity(JOHN_1_1_POLYTONIC),
            page: okPage,
            consensus: { greekMedian: 50, hebrewMedian: 0 },
        };
        const v = verdict(m, { expectGreek: false, expectHebrew: false });
        expect(v.status).toBe('INSPECCIONAR');
    });

    it('no reprueba por ratio bajo cuando la muestra es pequeña', () => {
        // 32 letras griegas: unas pocas citas, no griego corrido. El ratio ahí
        // se mueve por una sola palabra.
        const m = {
            script: scriptFidelity('Ακουσατε λαοι λογους βησεται τις'),
            page: okPage,
            consensus: { greekMedian: 33, hebrewMedian: 0 },
        };
        const v = verdict(m, { expectGreek: true, expectHebrew: false });
        expect(v.status).toBe('INSPECCIONAR');
        expect(v.notes.join(' ')).toMatch(/MUESTRA PEQUEÑA/);
    });

    it('reporta numeración desplazada como tal, no como páginas perdidas', () => {
        // Gemini emitió 615-625 para un recorte de 11 páginas, porque el libro
        // es un segundo volumen que arranca en la 495.
        const doc = Array.from({ length: 11 }, (_, i) =>
            `<!-- page: ${615 + i} -->\nContenido suficientemente largo de esta página.`).join('\n');
        const page = pageIntegrity(doc, 11);
        expect(page.offsetNumbering).toEqual({ first: 615, last: 625, offset: 614 });

        const v = verdict({ script: scriptFidelity(''), page }, { expectGreek: false, expectHebrew: false });
        expect(v.status).toBe('INSPECCIONAR');
        expect(v.notes.join(' ')).toMatch(/páginas impresas del libro/);
    });

    it('deja pasar a inspección lo que cumple griego y hebreo', () => {
        const m = {
            script: scriptFidelity(`${JOHN_1_1_POLYTONIC}\n${GEN_1_1_POINTED}`),
            page: okPage,
        };
        const v = verdict(m, { expectGreek: true, expectHebrew: true });
        expect(v.status).toBe('INSPECCIONAR');
        expect(v.notes).toEqual([]);
    });
});
