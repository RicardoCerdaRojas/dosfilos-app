#!/usr/bin/env python3
"""capturar.py — QA visual de la suite (diseño v5).

Renderiza una presentación generada en navegador headless, captura cada
lámina como PNG y DETECTA DESBORDES (contenido que excede el escenario,
oculto por overflow:hidden). Es la herramienta del paso de QA visual
obligatorio del flujo: las capturas se MIRAN antes de entregar — en
especial toda lámina `lienzo` y cualquier sesión que toque diseño.

Uso:
  python3 scripts/capturar.py --artefacto salida/clase_presentacion.html \
      --out capturas/ [--laminas 1,5,9]

Requiere playwright con chromium. Si no está disponible, lo informa y
sale con código 2: el QA visual queda pendiente, no se omite en silencio.
Código de salida 1 si se detectan desbordes.
"""
import argparse, os, sys

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--artefacto", required=True,
                    help="HTML de presentación generado por inyectar.py")
    ap.add_argument("--out", required=True, help="directorio de capturas")
    ap.add_argument("--laminas", default="",
                    help="números separados por coma (por defecto: todas)")
    a = ap.parse_args()
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        print("⚠ playwright no disponible: QA visual PENDIENTE (instale "
              "playwright + chromium o capture manualmente)."); sys.exit(2)

    os.makedirs(a.out, exist_ok=True)
    ruta = os.path.abspath(a.artefacto)
    base = os.path.splitext(os.path.basename(ruta))[0]
    pedir = {int(x) for x in a.laminas.split(",") if x.strip()} if a.laminas else None
    desbordes = []

    with sync_playwright() as p:
        b = p.chromium.launch()
        pg = b.new_page(viewport={"width": 1500, "height": 820})
        pg.goto("file://" + ruta)
        pg.wait_for_timeout(900)
        total = pg.evaluate("document.querySelectorAll('.diapo').length")
        pg.keyboard.press("p"); pg.wait_for_timeout(350)
        pg.evaluate("()=>{for(const id of ['barraSup','barraHerr','pista'])"
                    "{const e=document.getElementById(id); if(e)e.classList.add('oculta');}}")
        for i in range(total):
            pg.wait_for_timeout(360)
            n = i + 1
            # Mide elementos reales (los pseudo-elementos decorativos con
            # sangrado intencional —marcas de agua— no cuentan como desborde).
            medida = pg.evaluate(
                "()=>{const d=document.querySelector('.diapo.activa');"
                "if(!d)return null; const r=d.getBoundingClientRect();"
                "let mb=r.bottom, mr=r.right;"
                "for(const el of d.querySelectorAll('*')){"
                "const c=el.getBoundingClientRect();"
                "if(!c.width&&!c.height)continue;"
                "mb=Math.max(mb,c.bottom); mr=Math.max(mr,c.right);}"
                "return {ob:Math.round(mb-r.bottom), od:Math.round(mr-r.right)};}")
            if medida and (medida["ob"] > 5 or medida["od"] > 5):
                desbordes.append((n, medida))
                print(f"  ✗ D{n}: DESBORDE — contenido excede el escenario "
                      f"{medida['ob']}px abajo / {medida['od']}px a la derecha")
            if pedir is None or n in pedir:
                pg.locator("#escenario").screenshot(
                    path=os.path.join(a.out, f"{base}_{n:02d}.png"))
            pg.keyboard.press("ArrowRight")
        b.close()

    print(f"\n{total} láminas · capturas en {a.out}")
    if desbordes:
        print(f"{len(desbordes)} DESBORDE(S): corregir el plan o el diseño, "
              "jamás el HTML generado."); sys.exit(1)
    print("Sin desbordes. RECORDATORIO: el QA visual exige MIRAR las "
          "capturas, no solo generarlas.")

if __name__ == "__main__":
    main()
