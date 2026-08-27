import { describe, it, expect } from 'vitest';
import { MIN_VOICE_CORPUS, selectVoiceSamples, voiceExcerpt, type VoiceCandidate } from '../selectVoiceSamples';

const prosa = (marca: string) =>
    `Título del sermón\n\nApertura y saludo que se parece a cualquier otra apertura. `
    + `Encuadre del pasaje. `.repeat(20)
    + `${marca} Y aquí el predicador dice lo suyo, con su ritmo y su léxico. `.repeat(20);

const sermon = (over: Partial<VoiceCandidate> = {}): VoiceCandidate => ({
    id: 'a',
    title: 'Cuando la prueba trabaja a favor',
    content: prosa('[cuerpo]'),
    assembledFrom: 'workshop',
    publishedAt: new Date('2026-08-01'),
    bibleReferences: ['Santiago 1:2-8'],
    ...over,
});

describe('sólo enseña la prosa que el pastor armó', () => {
    it('descarta los sermones que salieron enteros del modelo', () => {
        // EL BUCLE QUE ESTO EVITA: aprender de un sermón generado sería aprender
        // NUESTRA voz y devolvérsela como si fuera la suya — y sonaría más
        // convincente en cada vuelta.
        const salida = selectVoiceSamples([
            sermon({ id: '1', assembledFrom: 'generated' }),
            sermon({ id: '2', assembledFrom: 'generated' }),
        ]);

        expect(salida).toEqual([]);
    });

    it('descarta los anteriores al dato de procedencia', () => {
        // Sin saber quién escribió esa prosa, una huella construida encima
        // suena a él sin serlo. La ausencia de dato no es evidencia.
        const salida = selectVoiceSamples([
            sermon({ id: '1', assembledFrom: undefined }),
            sermon({ id: '2', assembledFrom: undefined }),
        ]);

        expect(salida).toEqual([]);
    });

    it('acepta los armados en el taller', () => {
        const salida = selectVoiceSamples([
            sermon({ id: '1', bibleReferences: ['Jonás 1'] }),
            sermon({ id: '2', bibleReferences: ['Romanos 8'] }),
        ]);

        expect(salida.map((s) => s.sermonId)).toEqual(['1', '2']);
    });
});

describe('cuánto material hace falta', () => {
    it(`con menos de ${MIN_VOICE_CORPUS} no se enseña nada`, () => {
        // Con uno solo lo destilado no es una voz: es ESE sermón. El resultado
        // se parecería a un remake en vez de al pastor.
        expect(selectVoiceSamples([sermon({ id: '1' })])).toEqual([]);
    });

    it('sin sermones tampoco pasa nada — silencio, no aviso', () => {
        expect(selectVoiceSamples([])).toEqual([]);
    });
});

describe('no enseñar a repetirse', () => {
    it('excluye los sermones del MISMO pasaje que se está escribiendo', () => {
        // Un ejemplo sobre el texto de hoy invita a copiar su contenido
        // —ilustraciones, giros, conclusiones— en vez de su forma.
        const salida = selectVoiceSamples(
            [
                sermon({ id: 'mismo', bibleReferences: ['Santiago 1:2-8'] }),
                sermon({ id: 'otro', bibleReferences: ['Jonás 1:1-3'] }),
                sermon({ id: 'otro2', bibleReferences: ['Romanos 8:1'] }),
            ],
            { currentPassage: 'Santiago 1:2-8' },
        );

        expect(salida.map((s) => s.sermonId)).not.toContain('mismo');
    });

    it('si TODOS son del mismo pasaje, prefiere no enseñar nada', () => {
        const salida = selectVoiceSamples(
            [
                sermon({ id: '1', bibleReferences: ['Santiago 1:2-8'] }),
                sermon({ id: '2', bibleReferences: ['Santiago 1'] }),
            ],
            { currentPassage: 'Santiago 1' },
        );

        expect(salida).toEqual([]);
    });
});

describe('qué fragmento se enseña', () => {
    it('los más recientes primero — su voz de ahora', () => {
        const salida = selectVoiceSamples([
            sermon({ id: 'viejo', publishedAt: new Date('2023-01-01'), bibleReferences: ['Jonás 1'] }),
            sermon({ id: 'nuevo', publishedAt: new Date('2026-08-20'), bibleReferences: ['Rom 8'] }),
            sermon({ id: 'medio', publishedAt: new Date('2025-05-05'), bibleReferences: ['Sal 23'] }),
        ]);

        expect(salida.map((s) => s.sermonId)).toEqual(['nuevo', 'medio']);
    });

    it('no manda el sermón entero, sólo un fragmento acotado', () => {
        const salida = selectVoiceSamples([
            sermon({ id: '1', bibleReferences: ['Jonás 1'] }),
            sermon({ id: '2', bibleReferences: ['Rom 8'] }),
        ], { maxExcerptChars: 300 });

        for (const s of salida) expect(s.excerpt.length).toBeLessThanOrEqual(300);
    });

    it('el fragmento sale del CUERPO, no del saludo', () => {
        // Las primeras líneas son encuadre: lo más parecido entre un sermón y
        // otro, y lo que menos distingue a un predicador.
        const texto = voiceExcerpt(prosa('[cuerpo]'), 400);

        expect(texto).toContain('[cuerpo]');
        expect(texto).not.toContain('Título del sermón');
    });

    it('no corta a mitad de palabra ni deja la frase colgando', () => {
        const texto = voiceExcerpt(prosa('[cuerpo]'), 400);

        expect(texto.trim().endsWith('.')).toBe(true);
    });

    it('un sermón sin cuerpo no produce fragmento', () => {
        expect(voiceExcerpt('   ', 400)).toBe('');
    });
});
