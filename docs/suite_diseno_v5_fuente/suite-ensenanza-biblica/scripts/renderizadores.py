#!/usr/bin/env python3
"""renderizadores.py — Contrato tipado -> HTML de diapositivas.

Cada función recibe la diapositiva (dict del plan) y un contexto
{"bloque_rotulo": str} y devuelve el HTML <section class="diapo">…</section>
en el dialecto CSS validado de la Clase 4 (kicker, sub, lista, escritura,
ref, caja, esq-*) más los componentes exegéticos base
(ea-*, quiasmo, paralelo, flujo, termino) y los componentes gráficos v4
(tarjetas, pasos, riel de secuencia). Versión vigente: archivo VERSION.

Regla de la Escritura: las palabras de la Escritura usan las clases esc*
(color var(--escritura)); lemas aislados usan .lexico; notas gramaticales,
referencias y rótulos usan colores de interfaz.

Si la diapositiva trae "html", se usa tal cual (vía de escape / legado).
"""
import html as _html

I = "          "  # sangría interior de las secciones (10 espacios, como Clase 4)

def esc(t): return _html.escape(str(t), quote=False)

def _sec(d, ctx, cuerpo, extra_clases=""):
    if d.get("variante"):
        extra_clases = f'{extra_clases} v-{d["variante"]}'
    clases = "diapo" + ((" " + extra_clases.strip()) if extra_clases.strip() else "")
    bloque = d.get("bloque_rotulo", ctx.get("bloque_rotulo", ""))
    k = f'{I}<div class="kicker">{d["kicker"]}</div>\n' if d.get("kicker") else ""
    sq = ""
    if d.get("secuencia"):
        sec = d["secuencia"]; act = sec.get("actual", 1)
        tramos = []
        for j, etq in enumerate(sec["etapas"], 1):
            cls = "act" if j == act else ("hecha" if j < act else "")
            tramos.append(f'<span class="sq {cls}"><span class="sq-n">'
                          f'{j:02d}</span>{etq}</span>')
        sq = (f'{I}<div class="secuencia" aria-label="Parte {act} de '
              f'{len(sec["etapas"])}">' + "".join(tramos) + "</div>\n")
    return (f'<section class="{clases}" data-bloque="{esc(bloque)}">\n'
            f'{k}{sq}{cuerpo}\n        </section>')

# ---------------------------------------------------------------- básicos
def r_portada(d, ctx):
    c = [f'{I}<h1 class="portada-titulo">{d["titulo"]}</h1>']
    if d.get("destacado"):
        c.append(f'{I}<p class="sub portada-destacado">{d["destacado"]}</p>')
    if d.get("meta"):
        c.append(f'{I}<p class="sub portada-meta">{d["meta"]}</p>')
    return _sec(d, ctx, "\n".join(c), "centro portada")

def r_lista(d, ctx):
    li = "\n".join(f'{I}  <li>{x}</li>' for x in d["items"])
    c = (f'{I}<h2>{d["titulo"]}</h2>\n'
         f'{I}<ul class="lista">\n{li}\n{I}</ul>')
    if d.get("cierre"):
        c += f'\n{I}<p class="sub cierre-lista">{d["cierre"]}</p>'
    return _sec(d, ctx, c)

def r_escritura(d, ctx):
    larga = " larga" if len(d["texto"]) > 220 else ""
    ver = f' · {d["version"]}' if d.get("version") else ""
    c = (f'{I}<p class="escritura{larga}">«{d["texto"]}»\n'
         f'{I}<span class="ref">{d["ref"]}{ver}</span></p>')
    centro = d.get("centro") or d.get("variante") == "plena"
    return _sec(d, ctx, c, "centro" if centro else "")

def r_sintesis(d, ctx):
    c = (f'{I}<div class="caja caja-sintesis">\n'
         f'{I}  <p class="sintesis-texto">{d["texto"]}</p>\n{I}</div>')
    if d.get("nota"):
        c += f'\n{I}<p class="sub" style="margin-top:22px">{d["nota"]}</p>'
    return _sec(d, ctx, c, "centro")

def r_confrontacion(d, ctx):
    c = (f'{I}<div class="caja caja-error">\n'
         f'{I}  <div class="titulo-error">El error que confrontamos</div>\n'
         f'{I}  <p class="sub" style="margin:0">«{d["error"]}»</p>\n{I}</div>')
    if d.get("respuestas"):
        li = "\n".join(f'{I}  <li>{x}</li>' for x in d["respuestas"])
        c += f'\n{I}<ul class="lista lista-compacta">\n{li}\n{I}</ul>'
    elif d.get("respuesta"):
        c += f'\n{I}<p class="sub">{d["respuesta"]}</p>'
    return _sec(d, ctx, c)

def r_transicion(d, ctx):
    c = f'{I}<h2 class="transicion-titulo">{d["texto"]}</h2>'
    if d.get("texto_escritura"):
        c += (f'\n{I}<p class="escritura" style="font-size:32px;max-width:1000px">'
              f'«{d["texto_escritura"]}»\n'
              f'{I}<span class="ref">{d.get("ref","")}</span></p>')
    return _sec(d, ctx, c, "centro")

def r_esquema(d, ctx):
    c = (f'{I}<h2>{d.get("titulo","")}</h2>\n' if d.get("titulo") else "")
    c += (f'{I}<div class="esquema" role="img" aria-label="{esc(d["alt"])}">\n'
          f'{I}{d["svg"]}\n{I}</div>')
    return _sec(d, ctx, c)

# --------------------------------------------- componentes exegéticos (§5b)
def r_escritura_anotada(d, ctx):
    texto = d["texto"]
    notas = []
    for k, m in enumerate(d["destacados"], 1):
        pal = m["palabra"]
        marca = (f'<span class="esc-realce">{pal}'
                 f'<sup class="ea-num">{k}</sup></span>')
        texto = texto.replace(pal, marca, 1)
        notas.append(f'{I}  <div class="ea-nota"><span class="ea-num">{k}</span>'
                     f'<span class="ea-palabra">{pal}</span>'
                     f'<span class="ea-texto">{m["nota"]}</span></div>')
    c = (f'{I}<p class="escritura ea">«{texto}»\n'
         f'{I}<span class="ref">{d["ref"]}</span></p>\n'
         f'{I}<div class="ea-notas">\n' + "\n".join(notas) + f'\n{I}</div>')
    return _sec(d, ctx, c)

def r_quiasmo(d, ctx):
    filas = []
    for ln in d["lineas"]:
        centro = " q-centro" if ln.get("centro") else ""
        filas.append(
            f'{I}  <div class="q-linea nivel-{ln["nivel"]}{centro}">'
            f'<span class="q-etq">{ln["etq"]}</span>'
            f'<span class="q-texto esc-inline">{ln["texto"]}</span></div>')
    c = (f'{I}<h2>{d.get("titulo","Estructura quiástica")}'
         f' <span class="ref">{d.get("ref","")}</span></h2>\n'
         f'{I}<div class="quiasmo">\n' + "\n".join(filas) + f'\n{I}</div>')
    return _sec(d, ctx, c)

def r_paralelismo(d, ctx):
    rot = {"sinonimo": "Paralelismo sinónimo", "antitetico":
           "Paralelismo antitético", "sintetico": "Paralelismo sintético"}
    filas = []
    for p in d["pares"]:
        filas.append(
            f'{I}  <div class="par-fila">'
            f'<span class="par-a esc-inline">{p["a"]}</span>'
            f'<span class="par-rel">{p.get("relacion","‖")}</span>'
            f'<span class="par-b esc-inline">{p["b"]}</span></div>')
    c = (f'{I}<h2>{d.get("titulo", rot.get(d["clase"], "Paralelismo"))}'
         f' <span class="ref">{d.get("ref","")}</span></h2>\n'
         f'{I}<div class="paralelo p-{d["clase"]}">\n' + "\n".join(filas) +
         f'\n{I}</div>')
    return _sec(d, ctx, c)

def _profundidades(nodos):
    prof, por_id = {}, {x["id"]: x for x in nodos}
    def p(i):
        if i in prof: return prof[i]
        c = por_id[i].get("conecta")
        prof[i] = 0 if c is None else p(c) + 1
        return prof[i]
    for x in nodos: p(x["id"])
    return prof

def r_flujo(d, ctx):
    prof = _profundidades(d["nodos"])
    filas = []
    for nd in d["nodos"]:
        con = (f'<span class="f-conector">{nd["conector"]}</span>'
               if nd.get("conector") else "")
        filas.append(
            f'{I}  <div class="f-nodo prof-{prof[nd["id"]]} rol-{nd["rol"]}">'
            f'{con}<span class="f-rol">{nd["rol"]}</span>'
            f'<span class="f-ref">{nd.get("ref","")}</span>'
            f'<span class="f-texto esc-inline">{nd["texto"]}</span></div>')
    c = (f'{I}<h2>{d.get("titulo","Flujo del argumento")}'
         f' <span class="ref">{d.get("ref","")}</span></h2>\n'
         + (f'{I}<p class="sub f-prop">{d["proposicion"]}</p>\n'
            if d.get("proposicion") else "")
         + f'{I}<div class="flujo">\n' + "\n".join(filas) + f'\n{I}</div>')
    return _sec(d, ctx, c)

def r_termino(d, ctx):
    usos = "".join(f'{I}    <li><span class="ref">{u["ref"]}</span> — '
                   f'{u["matiz"]}</li>\n' for u in d.get("usos", []))
    rango = " · ".join(d.get("rango", []))
    rtl = ' dir="rtl"' if d.get("idioma") == "hebreo" else ""
    c = (f'{I}<div class="termino">\n'
         f'{I}  <div class="t-cab"><span class="t-lema lexico"{rtl}>{d["lema"]}'
         f'</span><span class="t-translit">{d.get("translit","")}</span></div>\n'
         f'{I}  <div class="t-morf">{d.get("morfologia","")}</div>\n'
         f'{I}  <div class="t-glosa">{d.get("glosa","")}</div>\n'
         + (f'{I}  <div class="t-rango">{rango}</div>\n' if rango else "")
         + (f'{I}  <ul class="t-usos">\n{usos}{I}  </ul>\n' if usos else "")
         + f'{I}</div>')
    return _sec(d, ctx, c)


# --------------------------------------------- componentes gráficos (v4)
def r_tarjetas(d, ctx):
    """Comparativa en 2–4 columnas. Cada tarjeta: titulo, filas[],
    realce? (síntesis interpretativa — color de interfaz, NUNCA Escritura),
    nota? (línea atenuada al pie)."""
    cols = len(d["tarjetas"])
    tjs = []
    for t in d["tarjetas"]:
        filas = []
        for f in t.get("filas", []):
            if isinstance(f, dict):
                etq = f'<span class="etq">{f["etq"]}</span>' if f.get("etq") else ""
                filas.append(f'{I}    <div class="tj-fila">{etq}{f["texto"]}</div>')
            else:
                filas.append(f'{I}    <div class="tj-fila">{f}</div>')
        r = (f'{I}    <div class="tj-realce">{t["realce"]}</div>\n'
             if t.get("realce") else "")
        nt = (f'{I}    <div class="tj-nota">{t["nota"]}</div>\n'
              if t.get("nota") else "")
        tjs.append(f'{I}  <div class="tarjeta">\n'
                   f'{I}    <div class="tj-titulo">{t["titulo"]}</div>\n'
                   + "\n".join(filas) + ("\n" if filas else "")
                   + r + nt + f'{I}  </div>')
    c = f'{I}<h2>{d["titulo"]}</h2>\n' if d.get("titulo") else ""
    if d.get("intro"):
        c += f'{I}<p class="tarjetas-intro">{d["intro"]}</p>\n'
    c += (f'{I}<div class="tarjetas n{cols}">\n' + "\n".join(tjs) + f'\n{I}</div>')
    return _sec(d, ctx, c)

def r_pasos(d, ctx):
    """Progresión horizontal con conectores. Cada paso: titulo, sub?,
    realce? (true => paso destacado). cierre? = párrafo de lectura."""
    ps = []
    for k, p in enumerate(d["pasos"]):
        if k:
            ps.append(f'{I}  <div class="paso-con" aria-hidden="true"></div>')
        cls = " p-realce" if p.get("realce") else ""
        sub = (f'{I}    <div class="p-sub">{p["sub"]}</div>\n'
               if p.get("sub") else "")
        ps.append(f'{I}  <div class="paso{cls}">\n'
                  f'{I}    <div class="p-titulo">{p["titulo"]}</div>\n'
                  + sub + f'{I}  </div>')
    c = f'{I}<h2>{d["titulo"]}</h2>\n' if d.get("titulo") else ""
    if d.get("intro"):
        c += f'{I}<p class="sub" style="margin-bottom:10px">{d["intro"]}</p>\n'
    c += (f'{I}<div class="pasos">\n' + "\n".join(ps) + f'\n{I}</div>')
    if d.get("cierre"):
        c += f'\n{I}<p class="sub cierre-pasos">{d["cierre"]}</p>'
    return _sec(d, ctx, c)


def r_lienzo(d, ctx):
    """Lámina de diseño libre (HTML+CSS acotado a la lámina). Constitución:
    selectores del css comienzan en `.lz` (el renderizador los encapsula
    como #lzN); colores SOLO via var(--token); font-size >= 18px; sin
    scripts, scroll, vw/vh ni position:fixed. validar.py lo exige y el
    flujo obliga QA visual con scripts/capturar.py antes de entregar."""
    n = d["n"]
    css = d.get("css", "").replace(".lz", f"#lz{n}")
    estilo = f'{I}<style>{css}</style>\n' if css else ""
    c = f'{I}<h2>{d["titulo"]}</h2>\n' if d.get("titulo") else ""
    c += (estilo + f'{I}<div id="lz{n}" class="lz" aria-label="{esc(d["alt"])}">\n'
          f'{d["html"]}\n{I}</div>')
    return _sec(d, ctx, c)

RENDER = {"portada": r_portada, "lista": r_lista, "escritura": r_escritura,
          "escritura-anotada": r_escritura_anotada, "quiasmo": r_quiasmo,
          "paralelismo": r_paralelismo, "flujo": r_flujo, "termino": r_termino,
          "esquema": r_esquema, "confrontacion": r_confrontacion,
          "sintesis": r_sintesis, "transicion": r_transicion,
          "tarjetas": r_tarjetas, "pasos": r_pasos, "lienzo": r_lienzo}

def renderizar(d, ctx):
    # Vía de escape / legado (Clase 4): html crudo reemplaza al renderizador.
    # EXCEPCIÓN: en `lienzo`, html es DATO del componente (el renderizador
    # lo envuelve, encapsula su css y aplica la constitución).
    if d.get("html") and d.get("tipo") != "lienzo":
        return d["html"]
    return RENDER[d["tipo"]](d, ctx)
