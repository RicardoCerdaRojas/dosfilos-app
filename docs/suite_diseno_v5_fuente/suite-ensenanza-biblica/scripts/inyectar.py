#!/usr/bin/env python3
"""inyectar.py — plan.json + plantillas + marca -> artefactos HTML.
Uso: python3 inyectar.py --plan plan_clase4.json --plantillas plantillas \
                         --marcas marcas --out salida
"""
import re, json, base64, os, argparse
from renderizadores import renderizar

def js_str(s):  # cadena JS con comillas dobles, escapado seguro
    return json.dumps(s, ensure_ascii=False)

def notas_resumen_js(items):
    filas = [f' {{b:{js_str(x["rotulo"])}, t:{js_str(x["texto"])}}}' for x in items]
    return "[\n" + ",\n".join(filas) + "\n]"

def bloques_js(items):
    filas = [f"  {{nombre:'{x['nombre']}', ini:{x['diapo_ini']-1}, "
             f"fin:{x['diapo_fin']-1}, min:{x['min']}}}" for x in items]
    return "[\n" + ",\n".join(filas) + "\n]"

SANGRIA = "        "

def rotulo_de(d):
    return d.get("rotulo", f"D{d['n']} · {d.get('tipo','?')}")

def bloque_de(n, bloques):
    for b in bloques:
        if b["diapo_ini"] <= n <= b["diapo_fin"]:
            return b["nombre"]
    return ""

def bloque_diapositivas(diapos, primera_con_rotulo=True):
    """Formato del original: rótulo + sección, unidos por línea en blanco.
    La presentación rotula también la primera; las réplicas de la consola
    comienzan con la sección pegada al contenedor (sin rótulo inicial)."""
    items = []
    for k, d in enumerate(diapos):
        rot = f"<!-- ===== {rotulo_de(d)} ===== -->\n{SANGRIA}"
        if k == 0 and not primera_con_rotulo:
            rot = ""
        items.append(rot + d["_html"])
    return ("\n\n" + SANGRIA).join(items)

def aplicar_tokens(html, marca):
    """Sustituye tokens SOLO en el primer bloque :root{} — los overrides de
    body.alto-contraste son runtime fijo y no se tocan."""
    i0 = html.find(":root{")
    i1 = html.find("}", i0)
    root = html[i0:i1]
    for k, v in marca["tokens"].items():
        var = "--" + k.replace("_", "-")
        root = re.sub("(" + re.escape(var) + r"\s*:\s*)#[0-9A-Fa-f]{3,8}",
                      lambda m: m.group(1) + v, root)
    if marca.get("fuente"):
        root = re.sub(r"(--fuente\s*:)[^;]+;?",
                      lambda m: m.group(1) + marca["fuente"] + ";", root)
    if marca.get("fuente_titulos"):
        root = root.rstrip() + f"\n    --fuente-titulos: {marca['fuente_titulos']};"
    if marca.get("fuente_escritura"):
        root = root.rstrip() + f"\n    --fuente-escritura: {marca['fuente_escritura']};"
    root = root.rstrip() + "\n  "
    return html[:i0] + root + html[i1:]

def bloque_fuentes(html, marca, mdir):
    """Incrusta @font-face de la marca y la marca de agua del icono."""
    css = ""
    for f in marca.get("fuentes", []):
        b64 = base64.b64encode(open(os.path.join(mdir, f["archivo"]), "rb").read()).decode()
        css += (f"@font-face{{font-family:'{f['familia']}';font-weight:{f['peso']};"
                f"font-style:{f['estilo']};font-display:swap;"
                f"src:url(data:font/woff2;base64,{b64}) format('woff2');}}\n  ")
    if marca.get("icono"):
        b64 = base64.b64encode(open(os.path.join(mdir, marca["icono"]), "rb").read()).decode()
        css += f":root{{--icono-marca:url(data:image/png;base64,{b64});}}\n  "
    html = html.replace("/* @@FUENTES@@ */", css, 1)
    if marca.get("css_extra"):
        extra = open(os.path.join(mdir, marca["css_extra"])).read()
        html = html.replace("</style>",
            "\n  /* @@MARCA-EXTRA@@ */\n" + extra + "\n</style>", 1)
    return html

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--plan", required=True)
    ap.add_argument("--plantillas", default="plantillas")
    ap.add_argument("--marcas", default="marcas")
    ap.add_argument("--out", default="salida")
    a = ap.parse_args()

    plan = json.load(open(a.plan, encoding="utf-8"))
    mdir = os.path.join(a.marcas, plan["marca"])
    marca = json.load(open(os.path.join(mdir, "marca.json"), encoding="utf-8"))
    logo_b64 = base64.b64encode(
        open(os.path.join(mdir, marca["logo"]), "rb").read()).decode()
    os.makedirs(a.out, exist_ok=True)
    edicion_css = ""
    if plan.get("edicion"):
        ed = os.path.join(os.path.dirname(a.plantillas) or ".",
                          a.plantillas, "ediciones", plan["edicion"], "edicion.css")
        ed = os.path.normpath(ed)
        assert os.path.exists(ed), f"edición no registrada: {plan['edicion']} ({ed})"
        edicion_css = open(ed, encoding="utf-8").read()
    T = plan.get("textos", {})
    for d in plan["diapositivas"]:
        ctx = {"bloque_rotulo": bloque_de(d["n"], plan.get("bloques", []))}
        d["_html"] = renderizar(d, ctx)
    diapos_html = bloque_diapositivas(plan["diapositivas"], primera_con_rotulo=True)
    diapos_replica = bloque_diapositivas(plan["diapositivas"], primera_con_rotulo=False)
    comunes = {
        "@@ID@@": plan["id"],
        "@@LOGO_B64@@": logo_b64,
        # La marca SOLO aporta identidad; serie y títulos vienen del plan.
        "@@PIE_SERIE@@": T.get("pie_serie", T.get("_pie_serie_original",
            ("Serie: " + plan["serie"]) if plan.get("serie") else marca["nombre"])),
        "@@FOOTER@@": T.get("footer_notas",
            (f"<strong>Serie:</strong> {plan['serie']} · {marca['nombre']}")
            if plan.get("serie") else marca["nombre"]),
        "@@TOTAL_DIAPOS@@": str(len(plan["diapositivas"])),
    }

    def rellenar(plantilla, extras):
        s = open(os.path.join(a.plantillas, plantilla), encoding="utf-8").read()
        s = aplicar_tokens(s, marca)
        s = bloque_fuentes(s, marca, mdir)
        if edicion_css:
            s = s.replace("</style>",
                f"\n  /*/* edicion-activa: {plan['edicion']} */\n" + edicion_css
                + "\n</style>", 1)
        for k, v in {**comunes, **extras}.items():
            s = s.replace(k, v)
        sobran = re.findall(r"@@[A-Z_]+@@", s)
        assert not sobran, f"{plantilla}: marcadores sin rellenar {set(sobran)}"
        return s

    generados = []
    if "presentacion" in plan["artefactos"]:
        s = rellenar("plantilla_presentacion.html", {
            "@@TITULO_PRESENTACION@@": T.get("titulo_presentacion", plan["titulo"]),
            "@@INFO_PRESENTACION@@": T.get("info_presentacion", plan["titulo"]),
            "@@DIAPOSITIVAS@@": diapos_html,
            "@@NOTAS_RESUMEN_JS@@": notas_resumen_js(plan["notas_resumen"]),
        })
        ruta = os.path.join(a.out, f"{plan['id']}_presentacion.html")
        open(ruta, "w").write(s); generados.append(ruta)

    if "notas" in plan["artefactos"]:
        s = rellenar("plantilla_notas.html", {
            "@@TITULO_NOTAS@@": T.get("titulo_notas", plan["titulo"] + " — Notas docentes"),
            "@@META_NOTAS@@": T.get("meta_notas", "<strong>Notas docentes</strong>"),
            "@@CUERPO_NOTAS@@": plan["cuerpo_notas_html"],
            "@@DIAPOSITIVAS_MINI@@": diapos_replica,
            "@@DIAPOSITIVAS_GRANDE@@": diapos_replica,
            "@@BLOQUES_JS@@": bloques_js(plan["bloques"]),
        })
        ruta = os.path.join(a.out, f"{plan['id']}_notas_docentes.html")
        open(ruta, "w").write(s); generados.append(ruta)

    if "guia_sesion" in plan["artefactos"]:
        s = rellenar("plantilla_guia_sesion.html", {
            "@@TITULO_GUIA@@": T.get("titulo_guia", plan["titulo"] + " — Guía de sesión"),
            "@@META_GUIA@@": T.get("meta_guia", "<strong>Guía del consejero</strong>"),
            "@@CUERPO_GUIA@@": plan["cuerpo_guia_html"],
            "@@FOOTER@@": T.get("footer_guia", comunes["@@FOOTER@@"]),
        })
        ruta = os.path.join(a.out, f"{plan['id']}_guia_sesion.html")
        open(ruta, "w").write(s); generados.append(ruta)

    if "hoja" in plan["artefactos"]:
        s = rellenar("plantilla_hoja.html", {
            "@@TITULO_HOJA@@": T.get("titulo_hoja", plan["titulo"] + " — Hoja de trabajo"),
            "@@META_HOJA@@": T.get("meta_hoja", "<strong>Hoja de trabajo del alumno</strong>"),
            "@@CUERPO_HOJA@@": plan["cuerpo_hoja_html"],
            "@@FOOTER@@": T.get("footer_hoja", comunes["@@FOOTER@@"]),
        })
        ruta = os.path.join(a.out, f"{plan['id']}_hoja_de_trabajo.html")
        open(ruta, "w").write(s); generados.append(ruta)

    for g in generados:
        print("generado:", g, os.path.getsize(g)//1024, "KB")
    N = len(plan.get("diapositivas", []))
    if N:
        print(f"estructura: {N} diapositivas → presentación {N} · consola {2*N} réplicas"
              f" · anclas esperadas 2..{N}")

if __name__ == "__main__":
    main()
