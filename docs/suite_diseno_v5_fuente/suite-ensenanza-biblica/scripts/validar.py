#!/usr/bin/env python3
"""validar.py — QA de la suite (contrato v1.1 · diseño v4).

Dos capas:
  1) validar_plan(plan): invariantes del contrato ANTES de generar.
  2) validar_artefactos(plan, dir): chequeos §7.6 sobre los HTML generados.

Uso: python3 validar.py --plan plan.json [--salida <dir>]
Código de salida 0 = todo OK.
"""
import re, json, sys, os, argparse, subprocess, tempfile, unicodedata

ERRORES = []
AVISOS = []
def err(m): ERRORES.append(m); print("  ✗", m)
def ok(m):  print("  ✓", m)
def aviso(m): AVISOS.append(m); print("  ⚠", m)

TIPOS = {"portada","lista","escritura","escritura-anotada","quiasmo",
         "paralelismo","flujo","termino","esquema","confrontacion",
         "sintesis","transicion","tarjetas","pasos","lienzo"}
GENEROS = {"exegesis","doctrina","consejeria"}
ARTEFACTOS = {"presentacion","notas","hoja","guia_sesion"}

# ------------------------------------------------------------ capa 1: plan
def validar_plan(p):
    print("== plan ==")
    # --- cabecera
    if not re.fullmatch(r"[a-z0-9_\-]+", p.get("id","")):
        err(f"id inválido: {p.get('id')!r}")
    if p.get("genero") not in GENEROS: err(f"genero inválido: {p.get('genero')!r}")
    if p.get("genero") == "consejeria" and p.get("modalidad") not in {"clase","sesion"}:
        err("consejería requiere modalidad: clase | sesion")
    if not set(p.get("artefactos",[])) <= ARTEFACTOS or not p.get("artefactos"):
        err(f"artefactos inválidos: {p.get('artefactos')}")
    if ERRORES[:1]: pass

    vc = str(p.get("version_contrato", ""))
    if vc not in {"0-fase1", "1", "1.1", "1.2", "1.3", "1.4"}:
        err(f"version_contrato desconocida: {vc!r} (válidas: 1, 1.1, 1.2, 1.3, 1.4)")
    usa_v4 = any(d.get("tipo") in {"tarjetas", "pasos"} or d.get("secuencia")
                 for d in p.get("diapositivas", []))
    if usa_v4 and vc not in {"1.1", "1.2", "1.3", "1.4"}:
        err("el plan usa tipos v4 (tarjetas/pasos/secuencia) pero declara "
            f"version_contrato {vc!r}; debe ser \"1.1\" o superior")
    import re as _re
    if p.get("edicion"):
        if vc != "1.4":
            err(f"el plan declara edición pero version_contrato es {vc!r}; "
                "debe ser \"1.4\"")
        import os as _os
        ruta_ed = _os.path.join(_os.path.dirname(_os.path.abspath(__file__)),
                                "..", "assets", "ediciones", p["edicion"],
                                "edicion.css")
        ruta_ed = _os.path.normpath(ruta_ed)
        if not _os.path.exists(ruta_ed):
            err(f"edición no registrada: {p['edicion']!r}")
        else:
            ecss = open(ruta_ed, encoding="utf-8").read()
            ecss = _re.sub(r"/\*.*?\*/", "", ecss, flags=_re.S)
            if _re.search(r"#[0-9a-fA-F]{3,8}\b|rgba?\(", ecss):
                err(f"edición {p['edicion']}: color cableado — usar var(--token)")
            for m in _re.finditer(r"font-size\s*:\s*(\d+)px", ecss):
                if int(m.group(1)) < 13:
                    err(f"edición {p['edicion']}: font-size {m.group(1)}px (mín. 13)")
            if _re.search(r"\d(vw|vh)\b|position\s*:\s*fixed|overflow\s*:\s*(auto|scroll)", ecss):
                err(f"edición {p['edicion']}: vw/vh/fixed/scroll prohibidos")
            for sel in _re.findall(r"(?:^|\})\s*([^@{}]+?)\s*\{", ecss):
                for parte in sel.split(","):
                    pt = parte.strip()
                    if pt and not (pt.startswith(".diapo") or pt.startswith("body.alto-contraste")
                                   or pt.startswith("from") or pt.startswith("to")
                                   or pt[0].isdigit()):
                        err(f"edición {p['edicion']}: selector {pt!r} fuera del "
                            "ámbito .diapo")
    usa_lienzo = [d for d in p.get("diapositivas", []) if d.get("tipo") == "lienzo"]
    if usa_lienzo and vc not in {"1.3", "1.4"}:
        err("el plan usa láminas lienzo pero declara version_contrato "
            f"{vc!r}; debe ser \"1.3\" o \"1.4\"")
    for d in usa_lienzo:
        nn = d.get("n")
        if not d.get("html"):
            err(f"D{nn}: lienzo sin html")
        if not d.get("alt"):
            err(f"D{nn}: lienzo sin alt (accesibilidad obligatoria)")
        contenido = (d.get("css", "") or "") + (d.get("html", "") or "")
        contenido = _re.sub(r"/\*.*?\*/", "", contenido, flags=_re.S)
        if "<script" in contenido.lower():
            err(f"D{nn}: lienzo con <script> (prohibido)")
        if _re.search(r"#[0-9a-fA-F]{3,8}\b|rgba?\(", contenido):
            err(f"D{nn}: lienzo con color cableado — usar var(--token)")
        for m in _re.finditer(r"font-size\s*:\s*(\d+)px", contenido):
            if int(m.group(1)) < 18:
                err(f"D{nn}: lienzo con font-size {m.group(1)}px (mínimo 18px)")
        if _re.search(r"\d(vw|vh)\b|position\s*:\s*fixed|overflow\s*:\s*(auto|scroll)",
                      contenido):
            err(f"D{nn}: lienzo con vw/vh, position:fixed u overflow con scroll "
                "(prohibidos: rompen el escenario)")
        css_limpio = _re.sub(r"/\*.*?\*/", "", d.get("css", "") or "", flags=_re.S)
        for sel in _re.findall(r"(?:^|\})\s*([^@{}]+?)\s*\{", css_limpio):
            for parte in sel.split(","):
                pt = parte.strip()
                if pt and not (pt.startswith(".lz") or pt.startswith("from")
                               or pt.startswith("to") or pt[0].isdigit()):
                    err(f"D{nn}: selector {pt!r} fuera del ámbito .lz "
                        "(todo selector del lienzo comienza en .lz)")
    if usa_lienzo:
        aviso(f"QA VISUAL OBLIGATORIO: {len(usa_lienzo)} lámina(s) "
              "lienzo — ejecute scripts/capturar.py, MIRE las capturas "
              "y corrija antes de entregar")

    VARIANTES = {"portada": {"margen"}, "lista": {"numerada", "dos-columnas"},
                 "escritura": {"plena", "banda"}, "sintesis": {"plena"},
                 "tarjetas": {"horizontal"}}
    usa_v5 = any(d.get("variante") for d in p.get("diapositivas", []))
    if usa_v5 and vc not in {"1.2", "1.3", "1.4"}:
        err("el plan usa variantes de composición (v5) pero declara "
            f"version_contrato {vc!r}; debe ser \"1.2\" o \"1.3\"")
    for d in p.get("diapositivas", []):
        v = d.get("variante")
        if v and v not in VARIANTES.get(d.get("tipo"), set()):
            err(f"D{d.get('n')}: variante {v!r} no existe para el tipo "
                f"{d.get('tipo')!r} (válidas: "
                f"{sorted(VARIANTES.get(d.get('tipo'), set())) or 'ninguna'})")

    D = p.get("diapositivas", [])
    N = len(D)
    con_proyeccion = "presentacion" in p.get("artefactos", [])

    # --- diapositivas
    if con_proyeccion:
        nums = [d.get("n") for d in D]
        if nums != list(range(1, N+1)):
            err(f"diapositivas no numeradas 1..{N} sin huecos: {nums}")
        for d in D:
            t = d.get("tipo")
            if not d.get("html") and t not in TIPOS:
                err(f"D{d.get('n')}: tipo desconocido {t!r}")
            if t == "escritura" or t == "escritura-anotada":
                if not d.get("html") and not d.get("ref"):
                    err(f"D{d['n']}: Escritura sin ref (Regla de la Escritura)")
            if t == "lista" and not d.get("html"):
                tope = 6 if d.get("variante") == "dos-columnas" else 4
                if len(d.get("items", [])) > tope:
                    err(f"D{d['n']}: lista con {len(d['items'])} ítems "
                        f"(máx. {tope} para esta composición)")
            if t == "quiasmo" and not d.get("html"):
                niv = [l["nivel"] for l in d["lineas"]]
                if niv != niv[::-1]:
                    err(f"D{d['n']}: quiasmo con niveles no espejados {niv}")
                if sum(1 for l in d["lineas"] if l.get("centro")) != 1:
                    err(f"D{d['n']}: quiasmo debe tener exactamente un centro")
            if t == "flujo" and not d.get("html"):
                ids = {x["id"] for x in d["nodos"]}
                for x in d["nodos"]:
                    c = x.get("conecta")
                    if c is not None and c not in ids:
                        err(f"D{d['n']}: nodo {x['id']} conecta a {c} inexistente")
                raices = [x for x in d["nodos"] if x.get("conecta") is None]
                if not raices: err(f"D{d['n']}: flujo sin nodo raíz")
            if t == "tarjetas" and not d.get("html"):
                nt = len(d.get("tarjetas", []))
                if not 2 <= nt <= 4:
                    err(f"D{d['n']}: tarjetas requiere 2–4 columnas, hay {nt}")
            if t == "pasos" and not d.get("html"):
                np_ = len(d.get("pasos", []))
                if not 2 <= np_ <= 5:
                    err(f"D{d['n']}: pasos requiere 2–5 pasos, hay {np_}")
            if d.get("secuencia"):
                sec = d["secuencia"]
                et = sec.get("etapas", [])
                a = sec.get("actual", 0)
                if len(et) < 2 or not (1 <= a <= len(et)):
                    err(f"D{d['n']}: secuencia inválida "
                        f"(etapas={len(et)}, actual={a})")
            if t == "escritura-anotada" and not d.get("html"):
                for m in d.get("destacados", []):
                    if m["palabra"] not in d["texto"]:
                        err(f"D{d['n']}: palabra destacada {m['palabra']!r} "
                            f"no está en el texto")
        # --- bloques cubren 1..N
        B = p.get("bloques", [])
        cubre = sorted(x for b in B for x in
                       range(b["diapo_ini"], b["diapo_fin"]+1))
        if cubre != list(range(1, N+1)):
            err(f"bloques no cubren 1..{N} sin huecos ni solapes")
        # --- notas_resumen 1:1
        if "notas" in p["artefactos"] or con_proyeccion:
            nr = {x["diapo"] for x in p.get("notas_resumen", [])}
            if nr != set(range(1, N+1)):
                err(f"notas_resumen no cubre todas las diapositivas "
                    f"(faltan {sorted(set(range(1,N+1))-nr)})")
        # --- anclas del cuerpo de notas cubren 2..N (portada = estado inicial)
        if "notas" in p["artefactos"]:
            anc = sorted(set(int(x) for x in
                  re.findall(r'data-slide="(\d+)"', p.get("cuerpo_notas_html",""))))
            falta = set(range(2, N+1)) - set(anc)
            if falta: err(f"anclas data-slide incompletas, faltan {sorted(falta)}")
    # --- hoja: espacios en blanco jamás en títulos
    cuerpo_hoja = p.get("cuerpo_hoja_html","")
    for h in re.findall(r'<h[1-3][^>]*>.*?</h[1-3]>', cuerpo_hoja, re.S):
        if 'class="blanco' in h:
            err("espacio en blanco dentro de un título de la hoja")
    # --- consejería: confidencialidad y artefactos coherentes
    if p.get("genero") == "consejeria" and p.get("modalidad") == "sesion":
        if "presentacion" in p["artefactos"] or "notas" in p["artefactos"]:
            err("modalidad sesión no lleva presentación ni consola")
        if "guia_sesion" not in p["artefactos"]:
            err("modalidad sesión requiere guia_sesion")
    if not ERRORES: ok(f"plan válido: {N} diapositivas, "
                       f"{len(p.get('bloques',[]))} bloques, "
                       f"artefactos {p['artefactos']}")

# ----------------------------------------------------- capa 2: artefactos
def _scripts(s): return re.findall(r'<script[^>]*>(.*?)</script>', s, re.S)

def _emojis(s):
    s = re.sub(r'data:image/png;base64,[A-Za-z0-9+/=]+', '', s)
    return {c for c in s if unicodedata.category(c) == 'So'
            and not (0x2190 <= ord(c) <= 0x21FF)
            and not (0x25A0 <= ord(c) <= 0x25FF)}

def validar_artefactos(p, carpeta):
    print("== artefactos ==")
    canal_ok = f"laiglesia_{p['id']}"
    N = len(p.get("diapositivas", []))
    rutas = {a: os.path.join(carpeta, f"{p['id']}_{n}.html") for a, n in
             [("presentacion","presentacion"), ("notas","notas_docentes"),
              ("hoja","hoja_de_trabajo"), ("guia_sesion","guia_sesion")]}
    for art in p["artefactos"]:
        r = rutas[art]
        if not os.path.exists(r): err(f"{art}: no existe {r}"); continue
        g = open(r).read()
        # JS válido
        for j, js in enumerate(_scripts(g)):
            with tempfile.NamedTemporaryFile('w', suffix='.js', delete=False) as f:
                f.write(js); tmp = f.name
            rr = subprocess.run(['node','--check',tmp], capture_output=True, text=True)
            if rr.returncode: err(f"{art}: JS inválido → {rr.stderr.strip()[:120]}")
            os.unlink(tmp)
        # canal
        canales = set(re.findall(r"BroadcastChannel\('([^']+)'\)", g))
        if canales and canales != {canal_ok}:
            err(f"{art}: canal {canales}, esperado {canal_ok}")
        # canvas visible / emojis
        if re.search(r'canvas[^}]*display\s*:\s*none', g, re.I):
            err(f"{art}: canvas de marcado oculto")
        em = _emojis(g)
        if em: err(f"{art}: emojis en interfaz {em}")
        # Regla de la Escritura (auditoría estática)
        for ch in re.findall(r'<[^>]*class="[^"]*cita-humana[^"]*"[^>]*'
                             r'style="[^"]*--escritura[^"]*"', g):
            err(f"{art}: cita-humana usando color de Escritura")
        # conteos estructurales
        if art == "presentacion":
            n = len(re.findall(r'<section class="diapo', g))
            if n != N: err(f"presentación: {n} diapositivas, plan declara {N}")
        if art == "notas":
            n = len(re.findall(r'<section class="diapo', g))
            if n != 2*N: err(f"consola: {n} secciones, esperadas {2*N}")
            anc = sorted(set(int(x) for x in re.findall(r'data-slide="(\d+)"', g)))
            if anc and (set(range(2, N+1)) - set(anc)):
                err("consola: anclas data-slide incompletas")
        if not ERRORES: pass
    if not ERRORES: ok("artefactos OK: " +
                       ", ".join(p["artefactos"]))

if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--plan", required=True)
    ap.add_argument("--salida")
    a = ap.parse_args()
    plan = json.load(open(a.plan, encoding="utf-8"))
    validar_plan(plan)
    if a.salida: validar_artefactos(plan, a.salida)
    for a in AVISOS:
        print("\n⚠ " + a)
    print("\n" + ("TODO OK" if not ERRORES else f"{len(ERRORES)} ERRORES"))
    sys.exit(1 if ERRORES else 0)
