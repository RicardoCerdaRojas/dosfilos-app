#!/usr/bin/env python3
"""
PASO CERO (manual, antes de este script): analizar las formas del logotipo
y anclar la tipografía del sistema a su clasificación — ver
references/identidad.md, «Regla de oro del trabajo de marca».
crear_marca.py — Crea/valida un perfil de marca para la suite.

Hace tres cosas:
 1. LOGO: remueve el color de fondo dominante (chroma), recorta al contenido
    y guarda PNG transparente.
 2. TOKENS: recibe los tokens propuestos (JSON) o deriva una propuesta
    desde los colores dominantes del logo.
 3. VALIDA (rechaza el perfil si falla):
    - contraste WCAG ≥4.5:1 — escritura/oscuro, escritura_tinta/#f7fafb,
      claro1/oscuro, acento/oscuro (≥3:1 para estructura);
    - distinción perceptual (ΔE Lab) escritura↔acento, escritura↔alerta,
      acento↔alerta ≥ 18 (la semántica de la Regla de la Escritura
      colapsa si el color de Escritura se confunde con el acento).

Uso:
  python3 crear_marca.py --logo logo.png --tokens tokens.json \
      --nombre "Institución" --serie "Serie: …" --out marcas/<clave>
  (con --solo-validar solo audita un marca.json existente)
"""
import json, os, argparse, math
from PIL import Image

# ---------- color ----------
def hex_rgb(h): h = h.lstrip('#'); return tuple(int(h[i:i+2],16) for i in (0,2,4))

def luminancia(rgb):
    def c(v):
        v /= 255
        return v/12.92 if v <= 0.03928 else ((v+0.055)/1.055)**2.4
    r,g,b = (c(x) for x in rgb)
    return 0.2126*r + 0.7152*g + 0.0722*b

def contraste(h1, h2):
    l1, l2 = luminancia(hex_rgb(h1)), luminancia(hex_rgb(h2))
    l1, l2 = max(l1,l2), min(l1,l2)
    return (l1+0.05)/(l2+0.05)

def rgb_lab(rgb):
    def piv(v):
        v /= 255
        return ((v+0.055)/1.055)**2.4 if v > 0.04045 else v/12.92
    r,g,b = (piv(x) for x in rgb)
    x = (r*0.4124 + g*0.3576 + b*0.1805) / 0.95047
    y = (r*0.2126 + g*0.7152 + b*0.0722)
    z = (r*0.0193 + g*0.1192 + b*0.9505) / 1.08883
    f = lambda t: t**(1/3) if t > 0.008856 else 7.787*t + 16/116
    fx,fy,fz = f(x),f(y),f(z)
    return (116*fy-16, 500*(fx-fy), 200*(fy-fz))

def delta_e(h1, h2):
    a, b = rgb_lab(hex_rgb(h1)), rgb_lab(hex_rgb(h2))
    return math.dist(a, b)

# ---------- logo ----------
def logo_transparente(ruta, salida, tol=40):
    im = Image.open(ruta).convert('RGBA')
    px = im.load()
    # color de fondo = moda de los bordes
    from collections import Counter
    borde = []
    w,h = im.size
    for x in range(w): borde += [px[x,0][:3], px[x,h-1][:3]]
    for y in range(h): borde += [px[0,y][:3], px[w-1,y][:3]]
    fondo = Counter(borde).most_common(1)[0][0]
    datos = im.get_flattened_data() if hasattr(im, 'get_flattened_data') else list(im.getdata())
    nuevos = []
    for r,g,b,a in datos:
        if abs(r-fondo[0])+abs(g-fondo[1])+abs(b-fondo[2]) <= tol:
            nuevos.append((r,g,b,0))
        else:
            nuevos.append((r,g,b,a))
    im.putdata(nuevos)
    caja = im.getbbox()
    im = im.crop(caja)
    # margen del 4%
    m = max(2, int(max(im.size)*0.04))
    lienzo = Image.new('RGBA', (im.size[0]+2*m, im.size[1]+2*m), (0,0,0,0))
    lienzo.paste(im, (m,m), im)
    # limitar tamaño para base64 razonable
    if lienzo.size[0] > 520:                      # 2x del tamaño de cabecera
        e = 520/lienzo.size[0]
        lienzo = lienzo.resize((520, int(lienzo.size[1]*e)), Image.LANCZOS)
    try:                                           # logos planos: PNG-8 con alfa
        q = lienzo.quantize(colors=64)
        q.save(salida, optimize=True)
        if os.path.getsize(salida) > 60_000: raise ValueError
    except Exception:
        lienzo.save(salida, optimize=True)
    return fondo, lienzo.size

# ---------- validación ----------
def validar_tokens(t):
    fallos, avisos = [], []
    def req(pares, minimo, etiqueta):
        for a,b in pares:
            r = contraste(t[a], b if b.startswith('#') else t[b])
            destino = b if b.startswith('#') else f"{b}({t[b]})"
            msg = f"{a}({t[a]}) sobre {destino}: {r:.2f}:1"
            (fallos if r < minimo else avisos if r < minimo+0.5 else []).append(
                f"{etiqueta} {msg}") if r < minimo+0.5 else print(f"  ✓ {msg}")
    req([("escritura","oscuro")], 4.5, "CONTRASTE")
    req([("escritura_tinta","#f7fafb")], 4.5, "CONTRASTE")
    req([("claro1","oscuro")], 4.5, "CONTRASTE")
    req([("acento","oscuro")], 3.0, "CONTRASTE(estructura)")
    for a,b in [("escritura","acento"), ("escritura","alerta"), ("acento","alerta")]:
        de = delta_e(t[a], t[b])
        if de < 18: fallos.append(f"DISTINCIÓN {a}↔{b}: ΔE={de:.0f} (<18) — "
                                  "la semántica colapsa")
        else: print(f"  ✓ distinción {a}↔{b}: ΔE={de:.0f}")
    return fallos, avisos

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--logo"); ap.add_argument("--tokens")
    ap.add_argument("--nombre"); ap.add_argument("--serie", default="")
    ap.add_argument("--footer", default=""); ap.add_argument("--out")
    ap.add_argument("--solo-validar")
    a = ap.parse_args()

    if a.solo_validar:
        m = json.load(open(os.path.join(a.solo_validar, "marca.json")))
        print(f"== validando {m['nombre']} ==")
        fallos, _ = validar_tokens(m["tokens"])
        if fallos:
            print("RECHAZADO:"); [print("  ✗", f) for f in fallos]; raise SystemExit(1)
        print("PERFIL VÁLIDO"); return

    os.makedirs(a.out, exist_ok=True)
    fondo, dim = logo_transparente(a.logo, os.path.join(a.out, "logo.png"))
    print(f"logo: fondo removido #{fondo[0]:02X}{fondo[1]:02X}{fondo[2]:02X}, "
          f"recortado a {dim[0]}x{dim[1]}")
    tokens = json.load(open(a.tokens))
    print(f"== validando tokens de {a.nombre} ==")
    fallos, avisos = validar_tokens(tokens)
    for w in avisos: print("  ⚠", w)
    if fallos:
        print("PERFIL RECHAZADO:"); [print("  ✗", f) for f in fallos]
        raise SystemExit(1)
    marca = {"nombre": a.nombre, "tokens": tokens,
             "fuente": "'Inter','Segoe UI',system-ui,-apple-system,"
                       "Helvetica,Arial,sans-serif",
             "pie_serie": a.serie or f"Serie: {a.nombre}",
             "footer_largo": a.footer or a.nombre, "logo": "logo.png"}
    json.dump(marca, open(os.path.join(a.out, "marca.json"), "w"),
              ensure_ascii=False, indent=2)
    print(f"PERFIL VÁLIDO → {a.out}/marca.json")

if __name__ == "__main__":
    main()
