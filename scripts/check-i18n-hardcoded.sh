#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# Trinquete de i18n: texto de cara al usuario HARDCODEADO en `packages/web`.
#
# POR QUÉ EXISTE: el chequeo de i18n que ya había sólo prohibía
# `t('clave', { defaultValue: '...' })` — o sea, vigilaba a quien YA estaba
# usando `t()` y hacía trampa. A quien no llamaba `t()` en absoluto no lo miraba
# nadie. El resultado: 141 archivos con texto español incrustado en el JSX,
# invisible para todo chequeo, y paneles enteros del wizard fuera del sistema de
# traducción sin que nada lo dijera.
#
# LA REGLA (fundador, 2026-08-23): en CADA tarea —crear O refactorizar— el texto
# de cara al usuario va por i18n. Exista o no traducción previa en ese archivo.
# "El archivo ya estaba hardcodeado" dejó de ser excusa: quien lo toca, lo
# migra.
#
# No se puede exigir cero de golpe (599 ocurrencias preexistentes), así que esto
# es un TRINQUETE, igual que `check-web-types.sh`:
#
#   - Lo preexistente NO bloquea. Está congelado en el baseline.
#   - Una ocurrencia NUEVA sí bloquea.
#   - Bajar el conteo de un archivo y regrabar el baseline es el camino: el
#     trinquete nunca deja que vuelva a subir.
#
# El baseline va POR ARCHIVO y no como total: un total suelto se mantiene plano
# migrando un archivo y hardcodeando en otro, que es justo lo que hay que
# atrapar.
#
# QUÉ DETECTA: nodos de texto JSX (`>Texto<`) y atributos de cara al usuario
# (placeholder, title, aria-label, alt, label) cuyo contenido parece español —
# por acentos/signos (á, ñ, ¿) o por palabras funcionales ("el", "para", "que").
# Es una heurística: prefiere el falso negativo al falso positivo, porque un
# trinquete que grita de más se termina ignorando.
#
# Uso:
#   ./scripts/check-i18n-hardcoded.sh            # chequea contra el baseline
#   ./scripts/check-i18n-hardcoded.sh --update   # regraba (al bajar el conteo)
#   ./scripts/check-i18n-hardcoded.sh --list <archivo>   # muestra qué encontró
#
# Exit codes:
#   0 = sin texto hardcodeado nuevo
#   1 = hay texto nuevo, o archivos nuevos con hardcode
# ─────────────────────────────────────────────────────────────────────────────

set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BASELINE="$ROOT/scripts/i18n-hardcoded-baseline.txt"

MODE_UPDATE=0
MODE_LIST=""
case "${1:-}" in
    --update) MODE_UPDATE=1 ;;
    --list)   MODE_LIST="${2:-}" ;;
    "")       ;;
    *)        echo "uso: $0 [--update | --list <archivo>]" >&2; exit 2 ;;
esac

bold() { printf '\033[1m%s\033[0m' "$1"; }
red() { printf '\033[31m%s\033[0m' "$1"; }
green() { printf '\033[32m%s\033[0m' "$1"; }
yellow() { printf '\033[33m%s\033[0m' "$1"; }

SCAN=$(cat <<'PY'
import os, re, sys

ROOT = 'packages/web/src'
LIST = sys.argv[1] if len(sys.argv) > 1 else ''

SPANISH = re.compile(r'[áéíóúñÁÉÍÓÚÑ¿¡]')
WORDS = re.compile(
    r'\b(el|la|los|las|un|una|de|del|para|con|que|tu|tus|sin|por|en|al|se|es|son'
    r'|no|más|este|esta|todos|cada|desde|hasta|sobre)\b', re.I)
JSX_TEXT = re.compile(r'>\s*([A-ZÁÉÍÓÚÑ¿¡][^<>{}\n]{3,})\s*<')
ATTR = re.compile(r'\b(placeholder|title|aria-label|alt|label)="([^"]{4,})"')


def suena_espanol(s):
    return bool(SPANISH.search(s) or (' ' in s and WORDS.search(s)))


def escanear(path):
    hits = []
    with open(path, encoding='utf-8') as fh:
        for n, line in enumerate(fh, 1):
            # Los comentarios documentan el porqué del código y a menudo citan
            # el texto que se está reemplazando: contarlos convertiría explicar
            # una decisión en una violación.
            if line.lstrip().startswith(('//', '*', '/*')):
                continue
            for m in JSX_TEXT.finditer(line):
                s = m.group(1).strip()
                if suena_espanol(s):
                    hits.append((n, s))
            for m in ATTR.finditer(line):
                s = m.group(2).strip()
                if suena_espanol(s):
                    hits.append((n, f'{m.group(1)}="{s}"'))
    return hits


if LIST:
    for n, s in escanear(LIST):
        print(f'{LIST}:{n}: {s}')
    sys.exit(0)

for dirpath, _, filenames in os.walk(ROOT):
    for fn in sorted(filenames):
        if not fn.endswith('.tsx'):
            continue
        p = os.path.join(dirpath, fn)
        hits = escanear(p)
        if hits:
            print(f'{len(hits)} {p}')
PY
)

cd "$ROOT" || exit 2

if [ -n "$MODE_LIST" ]; then
    python3 -c "$SCAN" "$MODE_LIST"
    exit 0
fi

CURRENT=$(python3 -c "$SCAN" | sort -k2)

if [ "$MODE_UPDATE" -eq 1 ]; then
    printf '%s\n' "$CURRENT" > "$BASELINE"
    TOTAL=$(awk '{s+=$1} END {print s+0}' "$BASELINE")
    echo "$(green "✓") Baseline regrabado: $(wc -l < "$BASELINE" | tr -d ' ') archivo(s), $TOTAL ocurrencia(s)."
    exit 0
fi

echo "$(bold "i18n") — texto de cara al usuario hardcodeado en packages/web"
echo

if [ ! -f "$BASELINE" ]; then
    echo "$(red "✗") No existe el baseline. Genéralo con: $0 --update"
    exit 1
fi

FAIL=0
while read -r count file; do
    [ -z "${file:-}" ] && continue
    base=$(awk -v f="$file" '$2 == f {print $1}' "$BASELINE")
    base=${base:-0}
    if [ "$count" -gt "$base" ]; then
        if [ "$base" -eq 0 ]; then
            echo "  $(red "✗") $file — $count ocurrencia(s) en un archivo NUEVO (sin baseline)"
        else
            echo "  $(red "✗") $file — $count ocurrencia(s), baseline $base"
        fi
        python3 -c "$SCAN" "$file" | head -5 | sed 's/^/        /'
        FAIL=$((FAIL + 1))
    fi
done <<< "$CURRENT"

TOTAL=$(printf '%s\n' "$CURRENT" | awk '{s+=$1} END {print s+0}')
BASE_TOTAL=$(awk '{s+=$1} END {print s+0}' "$BASELINE")

if [ "$FAIL" -gt 0 ]; then
    echo
    echo "  $(red "✗") $FAIL archivo(s) con texto hardcodeado NUEVO."
    echo "     Usa \`t('clave')\` y agrega la clave en packages/web/src/i18n/locales/{es,en}/."
    exit 1
fi

if [ "$TOTAL" -lt "$BASE_TOTAL" ]; then
    echo "  $(green "✓") $TOTAL ocurrencia(s) — bajó desde $BASE_TOTAL. $(yellow "Regraba el baseline:") $0 --update"
else
    echo "  $(green "✓") $TOTAL ocurrencia(s) preexistente(s) — baseline $BASE_TOTAL, ninguna nueva."
fi
