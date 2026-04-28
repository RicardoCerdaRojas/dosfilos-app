Repositorios principales (por volumen + calidad)
1. CCEL — Christian Classics Ethereal Library (tu fuente #1)
🌐 ccel.org

Lo más grande y mejor curado del mundo PD cristiano, gratis
Formatos: PDF (los mejores), ePub, texto plano, HTML
Tienen índices por autor, por época, por tema
Búsqueda dirigida útil: ccel.org/browse → filtras por "Public Domain"
Muchos con traducciones al español listas
2. Archive.org (para ediciones físicas escaneadas)
🌐 archive.org

Scans de libros viejos, calidad variable
Usa archive.org/details/texts → filtra collection:"spanishbooks" o por autor
Tip: busca con sufijo .pdf en el título para mejor calidad de extracción con LlamaParse
3. Monergism (gateway reformado)
🌐 monergism.com

Agrega enlaces a material PD de múltiples fuentes
Excelente organización por tema teológico reformado
Útil para descubrir qué existe
4. Biblioteca Digital Hispánica (para español)
🌐 bdh.bne.es

Biblioteca Nacional de España — ediciones antiguas de sermones, comentarios en español
Material pre-1928 de autores españoles y latinoamericanos
5. Proyecto Gutenberg
🌆 gutenberg.org — calidad de texto limpio, poco Spanish theological pero hay algo

Qué descargar por store
Store Exégesis (léxicos + gramáticas + word studies)
Autor / Obra	Idioma	Dónde	Notas
Gesenius' Hebrew Grammar	EN (hay ediciones ES)	CCEL, Archive	Standard para hebreo. La versión Kautzsch es exhaustiva
Strong's Concordance	EN	CCEL, biblehub.com	Incluye dicc. Hebreo y Griego con números Strong
Thayer's Greek Lexicon	EN	CCEL, STEPBible	Léxico griego del NT clásico
Vincent's Word Studies (4 vols)	EN	CCEL	Estudios palabra-por-palabra del NT griego
A.T. Robertson – Word Pictures	EN	CCEL	Análisis morfológico del NT, muy citable
Keil & Delitzsch – OT Commentary	EN	CCEL	Gold standard exegético AT
Jamieson-Fausset-Brown	EN (traducción ES disponible parcial)	CCEL	Comentario completo breve
Reina-Valera 1909	ES	Archive	Versión bíblica PD
Store Homilética / Comentarios
Idioma	Notas
Matthew Henry – Comentario Bíblico Completo	ES (hay traducción PD completa)	CCEL tiene la versión en inglés; CLIE editó una en español que también tiene porciones PD
John Calvin – Comentarios (casi todos los libros bíblicos)	EN + ES parcial	CCEL tiene todos en inglés; en español hay volúmenes específicos en dominio público
Charles Spurgeon – Morning and Evening	EN + ES (traducciones PD existen)	CCEL
Spurgeon – Treasury of David (Salmos)	EN	CCEL
Spurgeon – Sermones (63 vols, ~3500 sermones)	EN + ES algunos	CCEL, spurgeongems.org
John Gill – Exposition of the Bible	EN	CCEL, muy reformado-bautista
Adam Clarke – Commentary (6 vols)	EN	CCEL
Homilies of John Chrysostom (todo el NT)	EN (del griego)	CCEL → Nicene Fathers series
Store Teología sistemática
Idioma
Charles Hodge – Systematic Theology (3 vols)	EN
Louis Berkhof – Systematic Theology (1938, entra en PD en varios países)	EN + ES (CLIE tiene)
Augustus Strong – Systematic Theology	EN
Francis Turretin – Institutes of Elenctic Theology	EN (traducido del latín)
W.G.T. Shedd – Dogmatic Theology	EN
Herman Bavinck – Reformed Dogmatics (vols anteriores a 1929)	EN parcial
Store Patrística (tesoro subexplorado en español)
Idioma
Ante-Nicene Fathers (10 vols — Ireneo, Tertuliano, Orígenes, Justino Mártir, etc.)	EN
Nicene and Post-Nicene Fathers serie I (14 vols — Agustín, Crisóstomo, Atanasio)	EN
Nicene and Post-Nicene Fathers serie II (14 vols — Eusebio, Basilio, Gregorio)	EN
Agustín – Confesiones, Ciudad de Dios, Enchiridion	ES ampliamente disponible en PD
Tomás de Aquino – Summa Theologica	ES (traducción BAC, parcial PD)
Store Consejería pastoral (este es el más difícil en PD)
Es el género donde tu corpus moderno (Jay Adams, Wayne Mack, Paul Tripp) NO tiene equivalente PD directo. Pero hay material pastoral clásico útil:

Idioma
Richard Baxter – The Reformed Pastor	EN + ES (hay traducción antigua)
John Owen – Mortification of Sin, Indwelling Sin	EN
Thomas Watson – The Godly Man's Picture, A Body of Divinity	EN
Spurgeon – Lectures to My Students	EN + ES parcial
John Bunyan – The Pilgrim's Progress + works	ES abundante
Consideraciones prácticas para LlamaParse
Calidad de extracción
No todos los PDFs son iguales. Buscar en este orden de preferencia:

PDFs con texto seleccionable (OCR ya hecho) — LlamaParse los extrae perfecto
ePub → si necesitas convertir a PDF usa Calibre o Pandoc
PDFs escaneados de baja calidad → LlamaParse puede tener problemas con páginas rotadas o manchadas
Fuente específica de alta calidad
STEPBible tools (stepbible.org) tiene PDFs muy limpios de Gesenius, Thayer y algunos comentarios. Excelente para Phase 2 RAG porque las páginas están bien numeradas.

Idioma cross-lingual
Gemini 2.5 Flash maneja retrieval cross-lingual decente. Aunque indexes en inglés, las queries en español recuperan chunks relevantes. Así que no te desesperes si no encuentras todo en español — un corpus EN sólido + Gemini traduciendo en tiempo de respuesta puede servir.

Pero ojo con un matiz: las citas aparecerán en inglés porque Gemini cita del chunk original. Si quieres respuestas 100% en español, prioriza:

Calvino en español (volúmenes específicos en CCEL)
Agustín y patrística en español (abundante en bdh.bne.es)
Biblia Reina-Valera 1909 (PD, bien digitalizada)
Matthew Henry en español (CLIE tiene porciones PD)
Sugerencia de plan de 2 semanas
Semana 1 (corpus cubre ~60% de casos):

Reina-Valera 1909 (referencia bíblica)
Matthew Henry comentario completo (ES si encuentras, sino EN)
Gesenius Hebrew Grammar
Strong's / Thayer's
Semana 2 (llega al 80%):

Calvin's Commentaries (top 10 libros bíblicos que más consultas reciben)
Spurgeon's Sermons (corpus grande = mucho material para homilética)
Ante-Nicene + Nicene Fathers (patrística core)
Charles Hodge Systematic Theology (teología sistemática)