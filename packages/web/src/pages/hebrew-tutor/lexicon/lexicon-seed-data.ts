/**
 * lexicon-seed-data.ts
 *
 * Curated lexical entries for Genesis 1–11 covering the major Hebrew
 * literary/exegetical techniques: Merismus, Hendiadys, Paronomasia,
 * Leitwort (chains), Semantic Range, Idiomatic expressions, and
 * Grammatical Notes (exegetically significant syntactic phenomena).
 *
 * Each entry follows the LexicalEntry shape (minus auto-generated fields).
 * The seed function writes them to Firestore, skipping duplicates by
 * checking `hebrewPhrase` + first `verseRef`.
 */


import type { LexicalEntryType } from '@dosfilos/domain';

// ── Seed entry shape (matches Firestore document) ─────────────────────────────

export interface LexiconSeedEntry {
  hebrewPhrase: string;
  matchLemmas: string[];
  verseRefs?: string[];
  chainId?: string;
  type: LexicalEntryType;
  literalMeaning: string;
  idiomaticMeaning: string;
  explanation: string;
  source?: string;
  enabled: boolean;
  order: number;
}

// ── Genesis 1–11 Lexical Seed Data ────────────────────────────────────────────

export const GENESIS_SEED_ENTRIES: readonly LexiconSeedEntry[] = [

  // ═══════════════════════════════════════════════════════════════════════════
  // MERISMUS — Expressing totality through polar opposites
  // ═══════════════════════════════════════════════════════════════════════════

  {
    hebrewPhrase: 'הַשָּׁמַיִם וְאֵת הָאָרֶץ',
    matchLemmas: [],
    verseRefs: ['Gen.1.1'],
    type: 'idiom',
    literalMeaning: 'los cielos y la tierra',
    idiomaticMeaning: 'el universo / toda la creación / la totalidad de lo existente',
    explanation:
      'Merismus: figura retórica que expresa la totalidad mediante dos extremos polares. ' +
      '"Cielos y tierra" no enumera dos elementos sino que abarca TODO lo creado. ' +
      'Es equivalente funcional a "el universo". Este recurso es frecuente en hebreo bíblico ' +
      '(cf. Sal 148:1-13; Is 44:24).',
    source: 'HALOT; Waltke & O\'Connor §4.4; Merismus en Bullinger, Figures of Speech',
    enabled: true,
    order: 10,
  },

  {
    hebrewPhrase: 'טוֹב וָרָע',
    matchLemmas: [],
    verseRefs: ['Gen.2.9', 'Gen.2.17', 'Gen.3.5', 'Gen.3.22'],
    type: 'idiom',
    literalMeaning: 'bien y mal',
    idiomaticMeaning: 'todo / la totalidad del conocimiento / discernimiento completo',
    explanation:
      'Merismus: "bien y mal" no se refiere a dos categorías morales sino a la TOTALIDAD ' +
      'del conocimiento/experiencia. Conocer "bien y mal" = conocer TODO, tener discernimiento ' +
      'autónomo. Este es el significado del árbol: no es un árbol de ética, sino de omnisciencia ' +
      'autónoma, prerrogativa exclusiva de Dios.',
    source: 'HALOT s.v. טוֹב; von Rad, Genesis, p. 87; Wenham, Genesis 1-15, WBC',
    enabled: true,
    order: 20,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // HENDIADYS — Two words expressing a single concept
  // ═══════════════════════════════════════════════════════════════════════════

  {
    hebrewPhrase: 'תֹהוּ וָבֹהוּ',
    matchLemmas: [],
    verseRefs: ['Gen.1.2'],
    type: 'idiom',
    literalMeaning: 'sin forma y vacía',
    idiomaticMeaning: 'caos total / desolación absoluta',
    explanation:
      'Hendiadys: dos sustantivos coordinados que expresan un solo concepto intensificado. ' +
      'No son dos condiciones separadas ("sin forma" + "vacía") sino una sola idea: ' +
      '"caos absoluto / desolación total". La rima interna (tohu...bohu) refuerza la ' +
      'unidad expresiva. Cf. Is 34:11; Jer 4:23 donde reaparece la misma fórmula.',
    source: 'BDB 1062; HALOT s.v. תֹּהוּ; Tsumura, Creation and Destruction, p. 33',
    enabled: true,
    order: 30,
  },

  {
    hebrewPhrase: 'עִצְּבוֹנֵךְ וְהֵרֹנֵךְ',
    matchLemmas: [],
    verseRefs: ['Gen.3.16'],
    type: 'idiom',
    literalMeaning: 'tu dolor y tu embarazo',
    idiomaticMeaning: 'el dolor de tu embarazo / tu embarazo doloroso',
    explanation:
      'Hendiadys: dos sustantivos que expresan un solo concepto: "embarazo doloroso". ' +
      'No son dos maldiciones separadas (dolor + embarazo), sino una: el proceso de ' +
      'gestación y parto será penoso. La waw funciona como subordinante ("el dolor DE tu ' +
      'embarazo"), no como coordinante ("dolor Y embarazo").',
    source: 'GKC §154 nota 1b; Waltke, Genesis, p. 94',
    enabled: true,
    order: 40,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // PARONOMASIA — Wordplay / sound-play between related words
  // ═══════════════════════════════════════════════════════════════════════════

  {
    hebrewPhrase: 'אָדָם / אֲדָמָה',
    matchLemmas: [],
    verseRefs: ['Gen.2.7'],
    type: 'cultural_note',
    literalMeaning: 'hombre / tierra',
    idiomaticMeaning: '"terrícola" del "terruño" / humano de la humus',
    explanation:
      'Paronomasia (juego de palabras): אָדָם (adam, "ser humano") deriva fonéticamente de ' +
      'אֲדָמָה (adamah, "tierra/suelo"). El narrador juega deliberadamente con esta ' +
      'similitud sonora para establecer la identidad ontológica del ser humano: es un ' +
      '"terrícola", un ser-del-suelo. Esta conexión se pierde en traducciones que no ' +
      'preservan el juego fonético. Al traducir, conviene señalar esta relación.',
    source: 'BDB 9; HALOT s.v. אָדָם; Wenham, Genesis 1-15, p. 59',
    enabled: true,
    order: 50,
  },

  {
    hebrewPhrase: 'אִישׁ / אִשָּׁה',
    matchLemmas: [],
    verseRefs: ['Gen.2.23'],
    type: 'cultural_note',
    literalMeaning: 'hombre / mujer',
    idiomaticMeaning: 'varón / varona (preservando el juego etimológico)',
    explanation:
      'Paronomasia: אִישׁ (ish, "varón") y אִשָּׁה (ishah, "mujer/varona"). Adán nombra ' +
      'a la mujer usando una derivación fonética de su propio nombre. En español se pierde ' +
      'este juego de palabras; una equivalencia funcional sería "varón/varona" o "hombre/hembra". ' +
      'Nota: etimológicamente אִשָּׁה probablemente no derive de אִישׁ, pero el narrador ' +
      'usa la similitud fonética como recurso literario deliberado (etimología popular).',
    source: 'BDB 35, 61; HALOT s.v. אִשָּׁה; Joüon §89a',
    enabled: true,
    order: 60,
  },

  // ── Paronomasia Chain: עָרוּם/עֲרוּמִּים (Gen 2:25 → 3:1) ─────────────────

  {
    hebrewPhrase: 'עֲרוּמִּים',
    matchLemmas: [],
    verseRefs: ['Gen.2.25'],
    chainId: 'arum-gen2-3',
    type: 'cultural_note',
    literalMeaning: 'desnudos',
    idiomaticMeaning: 'desnudos / vulnerables / sin artificio',
    explanation:
      'Paronomasia (parte 1/2): עֲרוּמִּים (arummim, "desnudos") en 2:25 se conecta ' +
      'deliberadamente con עָרוּם (arum, "astuto") en 3:1. El narrador crea un puente ' +
      'sonoro entre la inocencia desnuda de la pareja y la astucia de la serpiente. ' +
      'La "desnudez" (vulnerabilidad sin artificio) contrasta con la "astucia" (artificio ' +
      'sin vulnerabilidad). Este vínculo se pierde si se traduce sin notar la paronomasia.',
    source: 'HALOT s.v. עָרוֹם; Alter, The Art of Biblical Narrative, p. 31',
    enabled: true,
    order: 70,
  },

  {
    hebrewPhrase: 'עָרוּם',
    matchLemmas: [],
    verseRefs: ['Gen.3.1'],
    chainId: 'arum-gen2-3',
    type: 'cultural_note',
    literalMeaning: 'astuto / sagaz',
    idiomaticMeaning: 'astuto / artero (contraste deliberado con "desnudo" en 2:25)',
    explanation:
      'Paronomasia (parte 2/2): עָרוּם (arum, "astuto") en 3:1 retoma la sonoridad de ' +
      'עֲרוּמִּים (arummim, "desnudos") en 2:25. La transición narrativa es deliberada: ' +
      'del estado de inocencia vulnerable al encuentro con la astucia manipuladora. ' +
      'Al traducir, mantener la nota de que el hebreo juega con el mismo campo fonético.',
    source: 'BDB 791; HALOT s.v. עָרוּם; Wenham, Genesis 1-15, p. 72',
    enabled: true,
    order: 80,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // SEMANTIC RANGE — Words whose meaning is broader/narrower than expected
  // ═══════════════════════════════════════════════════════════════════════════

  {
    hebrewPhrase: 'רוּחַ אֱלֹהִים',
    matchLemmas: [],
    verseRefs: ['Gen.1.2'],
    type: 'semantic_range',
    literalMeaning: 'espíritu de Dios',
    idiomaticMeaning: 'viento de Dios / aliento poderoso / Espíritu de Dios',
    explanation:
      'Rango semántico: רוּחַ (ruach) tiene un espectro que incluye "viento", "aliento", ' +
      '"espíritu". En Gen 1:2 hay debate legítimo: ¿es el Espíritu divino como agente ' +
      'creador, o un "viento poderoso/divino" que describe la escena primordial? ' +
      'אֱלֹהִים puede funcionar como superlativo ("viento de proporciones divinas"). ' +
      'La ambigüedad es probablemente deliberada. Traducir solo como "Espíritu" pierde ' +
      'la polisemia; anotar las opciones es preferible.',
    source: 'BDB 924; HALOT s.v. רוּחַ; Wenham, Genesis 1-15, p. 17; Tsumura, p. 75',
    enabled: true,
    order: 90,
  },

  {
    hebrewPhrase: 'נֶפֶשׁ חַיָּה',
    matchLemmas: [],
    verseRefs: ['Gen.2.7'],
    type: 'semantic_range',
    literalMeaning: 'alma viviente',
    idiomaticMeaning: 'ser viviente / criatura con aliento de vida',
    explanation:
      'Rango semántico: נֶפֶשׁ (nephesh) NO es "alma" en el sentido platónico (entidad ' +
      'inmaterial separable del cuerpo). Significa "garganta", "aliento", "vida", "ser ' +
      'viviente", "apetito". En Gen 2:7 el humano no RECIBE un alma, sino que SE CONVIERTE ' +
      'en un ser viviente completo. Traducir como "alma" impone una antropología dualista ' +
      'ajena al texto hebreo. Los animales también son נֶפֶשׁ חַיָּה (Gen 1:20,24).',
    source: 'BDB 659; HALOT s.v. נֶפֶשׁ; Wolff, Anthropology of the OT, pp. 10-25',
    enabled: true,
    order: 100,
  },

  {
    hebrewPhrase: 'יָדַע',
    matchLemmas: [],
    verseRefs: ['Gen.4.1'],
    type: 'semantic_range',
    literalMeaning: 'conoció',
    idiomaticMeaning: 'tuvo relaciones íntimas con / se unió a',
    explanation:
      'Rango semántico: יָדַע (yada, "conocer") abarca desde conocimiento intelectual ' +
      'hasta intimidad sexual (eufemismo). En Gen 4:1 "Adán conoció a Eva" = tuvo ' +
      'relaciones sexuales. Este uso eufemístico es frecuente en el AT (Gen 19:8; ' +
      'Jue 19:25; 1 Sam 1:19). La traducción debe reflejar el sentido sexual sin ' +
      'perder la elegancia del eufemismo hebreo.',
    source: 'BDB 393; HALOT s.v. יָדַע; NIDOTTE 2:409',
    enabled: true,
    order: 110,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // IDIOMATIC EXPRESSIONS — Fixed phrases with non-literal meaning
  // ═══════════════════════════════════════════════════════════════════════════

  {
    hebrewPhrase: 'חַיַּת הַשָּׂדֶה',
    matchLemmas: ['2416 a'],
    type: 'idiom',
    literalMeaning: 'criatura viviente del campo',
    idiomaticMeaning: 'animales salvajes',
    explanation:
      'Expresión idiomática fija: חַיַּת הַשָּׂדֶה no significa literalmente "animal del campo" ' +
      '(como opuesto a "animal de la casa") sino "animal salvaje/silvestre". הַשָּׂדֶה designa ' +
      'lo no cultivado, lo salvaje. Contrasta con בְּהֵמָה (behemah, "ganado/animal doméstico").',
    source: 'BDB 312; HALOT s.v. חַי; cf. Gen 2:19-20, 3:1,14',
    enabled: true,
    order: 120,
  },

  {
    hebrewPhrase: 'מוֹת תָּמוּת',
    matchLemmas: [],
    verseRefs: ['Gen.2.17'],
    type: 'idiom',
    literalMeaning: 'muriendo morirás',
    idiomaticMeaning: 'ciertamente morirás / morirás sin remedio',
    explanation:
      'Infinitivo absoluto + verbo finito: esta construcción (cognate accusative / ' +
      'paronomasia verbal) intensifica la acción del verbo. No indica un proceso ' +
      '("irás muriendo") sino certeza y gravedad: "DEFINITIVAMENTE morirás". ' +
      'Es un recurso gramatical hebreo para énfasis que no tiene equivalente directo ' +
      'en español. Se traduce con adverbios enfáticos ("ciertamente", "sin falta").',
    source: 'GKC §113n; Joüon §123e; Waltke & O\'Connor §35.3.1',
    enabled: true,
    order: 130,
  },

  {
    hebrewPhrase: 'לְעָבְדָהּ וּלְשָׁמְרָהּ',
    matchLemmas: [],
    verseRefs: ['Gen.2.15'],
    type: 'cultural_note',
    literalMeaning: 'para labrarla y guardarla',
    idiomaticMeaning: 'para cultivar y custodiar / para servir y preservar',
    explanation:
      'Nota cultural: Los verbos עָבַד (avad, "servir/trabajar") y שָׁמַר (shamar, ' +
      '"guardar/custodiar") reaparecen juntos en el Pentateuco referidos al servicio ' +
      'levítico en el santuario (Núm 3:7-8; 8:26; 18:7). Esto sugiere que el Edén ' +
      'es presentado como un proto-santuario y Adán como un proto-sacerdote. ' +
      'La traducción "trabajar y cuidar" pierde esta conexión litúrgica.',
    source: 'Beale, The Temple and the Church\'s Mission, p. 66-70; Wenham, Genesis 1-15, p. 67',
    enabled: true,
    order: 140,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // LEITWORT CHAIN: קוֹל in Genesis 3:8–10 (pre-existing, included for seed)
  // ═══════════════════════════════════════════════════════════════════════════

  {
    hebrewPhrase: 'קוֹל יְהוָה אֱלֹהִים',
    matchLemmas: [],
    verseRefs: ['Gen.3.8'],
    chainId: 'qol-gen3',
    type: 'semantic_range',
    literalMeaning: 'voz de YHWH Dios',
    idiomaticMeaning: 'el sonido/ruido de YHWH Dios moviéndose',
    explanation:
      'En este contexto, קוֹל no debe traducirse como "voz" (que implica comunicación ' +
      'verbal) sino como "sonido/ruido" (percepción auditiva de presencia). El participio ' +
      'Hitpael מִתְהַלֵּךְ ("caminando/moviéndose") indica un movimiento físico que produce ' +
      'un fenómeno acústico. La comunicación verbal de YHWH no ocurre hasta el v.9 (וַיִּקְרָא). ' +
      'El rango semántico de קוֹל incluye: voz, sonido, estruendo, trueno.',
    source: 'BDB 876 s.v. קוֹל; HALOT 1084; Observación Prof. Farfán',
    enabled: true,
    order: 150,
  },

  {
    hebrewPhrase: 'קֹלְךָ֥',
    matchLemmas: [],
    verseRefs: ['Gen.3.10'],
    chainId: 'qol-gen3',
    type: 'semantic_range',
    literalMeaning: 'tu voz/sonido',
    idiomaticMeaning: 'te escuché (omisión del sustantivo por transposición semántica)',
    explanation:
      'Referencia anafórica a Gen 3:8, donde קוֹל = "sonido/ruido" (no "voz"). ' +
      'Como "tu sonido" es antinatural en español, se aplica transposición semántica: ' +
      'el sustantivo se absorbe en el verbo → "te escuché". Esto mantiene coherencia ' +
      'con la decisión traductológica de v.8 donde se estableció que la presencia de ' +
      'YHWH producía un fenómeno acústico (sonido), no comunicación verbal (voz).',
    source: 'BDB 876 s.v. קוֹל; Observación Prof. Farfán',
    enabled: true,
    order: 160,
  },
  // ═══════════════════════════════════════════════════════════════════════════
  // GRAMMATICAL NOTES — Exegetically significant syntactic phenomena
  // ═══════════════════════════════════════════════════════════════════════════

  // ── Leitwort echo chain: עֵירֹם (naked) in Gen 3:10–11 ───────────────────
  //
  // Adán declara en 3:10: "estoy desnudo" (עֵירֹם אָנֹכִי).
  // YHWH le devuelve exactamente la misma construcción en 3:11:
  // "¿quién te dijo que estás desnudo?" (עֵירֹם אַתָּה).
  // Ambas son cláusulas nominales (predicado adjetival + pronombre sujeto)
  // que expresan estado presente. La coherencia traductológica exige que
  // si 3:10 va en presente, 3:11 también debe ir en presente.
  // El pronombre independiente (אָנֹכִי / אַתָּה) añade énfasis en ambos casos.

  {
    hebrewPhrase: 'עֵירֹם אָנֹכִי',
    matchLemmas: [],
    verseRefs: ['Gen.3.10'],
    chainId: 'eirom-echo-gen3',
    type: 'grammatical_note',
    literalMeaning: 'desnudo yo',
    idiomaticMeaning: 'que yo estoy desnudo / porque estoy desnudo',
    explanation:
      'Cláusula nominal (predicado adjetival + pronombre independiente): עֵירֹם (arom, ' +
      '\"desnudo\") como predicado y אָנֹכִי (anoki, \"yo\") como sujeto enfático. ' +
      'El hebreo no tiene cópula — el traductor suple \"ser/estar\" según el contexto. ' +
      'La escena es una declaración de estado actual: Adán explica POR QUÉ se escondió. ' +
      'Por tanto, la cláusula va en PRESENTE: \"porque yo estoy desnudo\". ' +
      'El uso de אָנֹכִי (forma enfática/larga de \"yo\") en lugar de אֲנִי añade peso ' +
      'retórico a la confesión. Esta cláusula es el eslabón 1/2 de la cadena: ' +
      'YHWH la retomará literalmente en 3:11 con el mismo adjective + pronombre. ' +
      'Nota del profesor.',
    source: 'GKC §141a; Joüon §154; observación del profesor (clase Gén 3:10)',
    enabled: true,
    order: 163,
  },

  {
    hebrewPhrase: 'עֵירֹם אַתָּה',
    matchLemmas: [],
    verseRefs: ['Gen.3.11'],
    chainId: 'eirom-echo-gen3',
    type: 'grammatical_note',
    literalMeaning: 'desnudo tú',
    idiomaticMeaning: 'que tú estás desnudo',
    explanation:
      'Cláusula nominal (predicado adjetival + pronombre independiente): עֵירֹם (arom, ' +
      '\"desnudo\") como predicado y אַתָּה (attah, \"tú\") como sujeto enfático. ' +
      'Esta es la misma construcción de Gen 3:10 (עֵירֹם אָנֹכִי) — YHWH devuelve ' +
      'las propias palabras de Adán en su pregunta. El eco es deliberado y retóricamente ' +
      'significativo: \"tú me dijiste que estabas desnudo; ¿quién te dijo ESTO?\" ' +
      'Por coherencia discursiva con 3:10 (ya traducido en presente), esta cláusula ' +
      'también debe ir en PRESENTE: \"que tú estás desnudo\". ' +
      'El pronombre אַתָּה es igualmente enfático: la pregunta de YHWH señala directamente ' +
      'a Adán como el sujeto que lo sabe. Nota del profesor.',
    source: 'GKC §141a-b; Joüon §154; observación del profesor (clase Gén 3:11)',
    enabled: true,
    order: 166,
  },

  // ── Standalone: emphatic independent pronoun (Gen 3:12) ───────────────────
  //
  // Nota independiente — no forma cadena con 3:10-11.
  // El fenómeno es el mismo (pronombre independiente enfático) pero el
  // contexto exegético es distinto: aquí opera como mecanismo de evasión,
  // no como eco de una cláusula nominal de estado.

  {
    hebrewPhrase: 'הִוא',
    matchLemmas: [],
    verseRefs: ['Gen.3.12'],
    type: 'grammatical_note',
    literalMeaning: 'ella',
    idiomaticMeaning: 'ella misma',
    explanation:
      'Pronombre personal independiente enfático: הִוא (hi, 3ª persona femenina singular) ' +
      'es redundante desde el punto de vista sintáctico, ya que el sujeto gramatical ' +
      'está contenido en el verbo נָתְנָה (natanah, \"ella dio\"). Su presencia explícita ' +
      'es deliberada y añade énfasis: \"ELLA MISMA me dio\". ' +
      'Este recurso sintáctico traslada retóricamente el énfasis y, con él, ' +
      'la responsabilidad: el hablante (Adán) no dice \"yo tomé\" sino que enfatiza ' +
      'que fue \"ELLA\" la que dio. El narrador usa el pronombre independiente como ' +
      'instrumento de evasión narrativa. ' +
      'La traducción debe reflejar este énfasis: \"la mujer que me diste, ella misma me dio\". ' +
      'Nota del profesor.',
    source: 'GKC §135e; Joüon §146b; observación del profesor (clase Gén 3:12)',
    enabled: true,
    order: 170,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // GENESIS 3:14–24 — Cobertura proactiva de los asuntos exegéticos clave
  // ═══════════════════════════════════════════════════════════════════════════

  // ── Gen 3:15 — El Protoevangelio ──────────────────────────────────────────

  {
    hebrewPhrase: 'שׁוּף',
    matchLemmas: [],
    verseRefs: ['Gen.3.15'],
    type: 'semantic_range',
    literalMeaning: 'aplastar / herir / atacar',
    idiomaticMeaning: 'herir mortalmente (en la cabeza) / herir (en el talón)',
    explanation:
      'La raíz שׁוּף (shuph) es una de las más raras del AT: aparece solo 3 veces ' +
      '(Gen 3:15; Job 9:17; Sal 139:11). Su rango semántico incluye "aplastar", ' +
      '"herir", "acechar/atacar". En Gen 3:15 se usa SIMÉTRICAMENTE para dos acciones: ' +
      '1) הוּא יְשׁוּפְךָ רֹאשׁ — él aplastará tu CABEZA (golpe mortal); ' +
      '2) וְאַתָּה תְּשׁוּפֶנּוּ עָקֵב — tú herirás su TALÓN (golpe menor). ' +
      'La asimetría anatómica cabeza/talón implica desenlaces de distinta gravedad — ' +
      'perderla en traducción elimina la clave interpretativa del verso. ' +
      'La LXX traduce τηρεῖν (acechar/vigilar), sugiriendo conflicto continuo. ' +
      'La Vulgata usa "conterere" (aplastar), favoreciendo la victoria mesiánica definitiva. ' +
      'Debate exegético central: ¿promesa de victoria final (protoevangelio) ' +
      'o descripción de un conflicto permanente? El texto hebreo permite ambas lecturas.',
    source: 'BDB 1003; HALOT 1460; Wenham, Genesis 1-15, WBC p. 80; Hamilton, NICOT p. 197',
    enabled: true,
    order: 175,
  },

  {
    hebrewPhrase: 'זַרְעֲךָ / זַרְעָהּ',
    matchLemmas: [],
    verseRefs: ['Gen.3.15'],
    type: 'grammatical_note',
    literalMeaning: 'tu descendencia / su descendencia',
    idiomaticMeaning: 'tu linaje / su linaje',
    explanation:
      'זֶרַע (zera, "simiente/descendencia") es un sustantivo COLECTIVO: puede referirse ' +
      'al linaje completo (toda la humanidad) o a un individuo específico. ' +
      'El debate exegético central gira en torno al pronombre הוּא (él/ello) en el v.15b: ' +
      '¿remite a la descendencia colectiva (conflicto permanente humanos/serpiente) ' +
      'o a un individuo futuro (lectura mesiánica)? ' +
      'La LXX usa αὐτός (él, masculino singular), favoreciendo la lectura individual. ' +
      'La Vulgata tiene "ipsa" (ella), en referencia a María. ' +
      'El texto hebreo gramaticalmente apunta al colectivo זֶרַע (neutro/masculino), ' +
      'pero la ambigüedad es probable e intencionada. ' +
      'Traducir "su descendencia" y anotar el debate es preferible a resolver la tensión.',
    source: 'BDB 282; Collins, JETS 48.2 (2005); Dumbrell, Covenant and Creation, p. 34',
    enabled: true,
    order: 177,
  },

  // ── Gen 3:16 — La inclinación de la mujer ─────────────────────────────────

  {
    hebrewPhrase: 'תְּשׁוּקָתֵךְ',
    matchLemmas: [],
    verseRefs: ['Gen.3.16'],
    type: 'semantic_range',
    literalMeaning: 'tu deseo',
    idiomaticMeaning: 'tu anhelo / tu inclinación profunda hacia',
    explanation:
      'תְּשׁוּקָה (teshuqah) aparece solo 3 veces en el AT. ' +
      'Gen 4:7: el pecado tiene תְּשׁוּקָה hacia Caín — "su inclinación es hacia ti, ' +
      'pero tú debes dominarlo": describe una fuerza que impulsa con potencial de dominación. ' +
      'Cant 7:11: sentido afectivo/amoroso. ' +
      'El paralelo con Gen 4:7 es decisivo: no es "deseo romántico" sino una ' +
      'inclinación profunda que conlleva una dinámica de poder. ' +
      'La frase completa "hacia tu marido será tu inclinación, pero él te dominará" ' +
      'describe una tensión estructural entre atracción y subordinación. ' +
      'Traducciones como "impulso" o "anhelo dominante" capturan mejor el rango semántico ' +
      'que el simple "deseo".',
    source: 'BDB 1003; HALOT 1798; Walton, NIVAC Genesis p. 231; Foh, WTJ 37 (1975) p. 376',
    enabled: true,
    order: 185,
  },

  // ── Gen 3:19 — Cláusula nominal: polvo eres ───────────────────────────────

  {
    hebrewPhrase: 'עָפָר אַתָּה',
    matchLemmas: [],
    verseRefs: ['Gen.3.19'],
    type: 'grammatical_note',
    literalMeaning: 'polvo tú',
    idiomaticMeaning: 'polvo eres / tú eres polvo',
    explanation:
      'Cláusula nominal (predicado sustantival + pronombre sujeto), idéntica al patrón ' +
      'de עֵירֹם אָנֹכִי (Gen 3:10) y עֵירֹם אַתָּה (Gen 3:11): ' +
      'עָפָר (aphar, "polvo/tierra") como predicado; אַתָּה (attah, "tú") como sujeto enfático. ' +
      'El tiempo PRESENTE es el correcto: "polvo eres", no "serás polvo". ' +
      'El pronombre independiente אַתָּה declara la verdad con énfasis directo y personal. ' +
      'La conexión con אָדָם/אֲדָמָה (Gen 2:7) cierra el arco narrativo: ' +
      'el ser humano fue formado עָפָר מִן הָאֲדָמָה (polvo de la tierra) ' +
      'y la maldición lo retorna a su origen material. ' +
      'La versión "polvo eres y en polvo te convertirás" preserva correctamente el presente.',
    source: 'GKC §141a; Joüon §154b; cf. Gen 2:7 (אָדָם/אֲדָמָה paronomasia)',
    enabled: true,
    order: 180,
  },

  // ── Gen 3:20 — El nombre de Eva ───────────────────────────────────────────

  {
    hebrewPhrase: 'חַוָּה',
    matchLemmas: [],
    verseRefs: ['Gen.3.20'],
    type: 'cultural_note',
    literalMeaning: 'Eva',
    idiomaticMeaning: 'Viviente / Dadora de vida',
    explanation:
      'Paronomasia con חַי/חַיָּה (chai, "viviente/vida"): ' +
      'חַוָּה (Chavvah) deriva de la raíz חָיָה (chayah, "vivir"). ' +
      'El narrador justifica el nombre de inmediato: ' +
      '"porque ella es la madre de todo ser viviente" (כִּי הִוא הָיְתָה אֵם כָּל-חָי). ' +
      'El nombre no es decorativo — es un acto teológico y de fe: ' +
      'DESPUÉS de escuchar la sentencia de muerte en Gen 3:19, ' +
      'Adán le pone a su mujer un nombre que celebra la vida. ' +
      'Esta ironía teológica (muerte anunciada → nombre de vida) es exegéticamente significativa ' +
      'y se pierde completamente si no se señala la etimología. ' +
      'En español no hay equivalente fonético; señalar "Eva = Vida en hebreo" en nota es necesario.',
    source: 'BDB 295; HALOT 296; Wenham, Genesis 1-15, p. 84; Alter, Genesis, p. 22',
    enabled: true,
    order: 190,
  },
];
