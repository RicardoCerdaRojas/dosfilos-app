# Registro de marcas

| Clave | Institución | Escritura | Acento | Notas |
|---|---|---|---|---|
| `iglesia-1ra-concepcion` | La Iglesia · 1ra de Concepción | oro de la fuente #D8A848 | aqua vivo #3FC4B8 | Identidad v2 «Agua viva» (jun-2026, aprobada por el docente): petróleo #07141A, el aqua es su teal madurado y significa el agua viva (Jn 4) — la acción de la iglesia; el oro es la fuente, la Palabra. Tipografía anclada al logotipo: Marcellus (heredera abierta de las capitales inscripcionales de «LA IGLESIA»; peso único 400, jamás pedir bold) + Lora itálica 600 para la Escritura (trazo firme: proyector y Zoom). Firma: chip delineado en aqua en la portada |
| `sebex` | SEBEX · Seminario Bíblico de Expositores — Chile | oro de imprenta #D8A848 | azul ceniza #8FA8C4 | Identidad v2 «Páginas de madrugada» (jun-2026, aprobada por el docente): grafito azulado frío donde el oro de la Escritura es la ÚNICA calidez de la pantalla — la semántica del sistema hecha decisión cromática. Newsreader híbrida: títulos ligeros 600/500, Escritura firme itálica 600 (proyector modesto + Zoom). Firma: hairline vertical junto al título de portada |
| *(pendiente)* | tercera institución | — | — | crear con `scripts/crear_marca.py` al recibir el logo |

Crear/validar perfiles: `python3 scripts/crear_marca.py --logo <png> --tokens <json>
--nombre "…" --serie "…" --out assets/marcas/<clave>` (rechaza contrastes <4.5:1
y distinciones ΔE<18 entre escritura/acento/alerta). Auditar uno existente:
`--solo-validar assets/marcas/<clave>`.
