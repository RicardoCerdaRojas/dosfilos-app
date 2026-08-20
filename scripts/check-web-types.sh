#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# Type-check ratchet for `packages/web`.
#
# POR QUÉ EXISTE: `packages/web/tsconfig.json` es un archivo-solución con
# `"files": []`, así que un `tsc --noEmit` a secas no mira NI UN archivo, y
# `vite build` tampoco typechequea. Durante meses el paquete más grande del
# repo estuvo fuera de todo chequeo: el crash de `ExegesisPaperPage` (PR #436)
# venía siendo reportado por el compilador desde #296, en la línea exacta y con
# el tipo exacto, y nadie podía leerlo porque nadie lo corría.
#
# El chequeo real es `tsc --noEmit -p tsconfig.app.json` DESDE `packages/web`.
# Hoy arroja ~574 errores preexistentes, así que no se puede exigir cero sin
# frenar el trabajo. Este script pone un TRINQUETE en su lugar:
#
#   - Los errores preexistentes NO bloquean. Están congelados en el baseline.
#   - Un error NUEVO sí bloquea. Es exactamente la clase de regresión que
#     costó el crash de prod.
#
# El baseline se guarda POR ARCHIVO, no como un total. Un total suelto se puede
# mantener plano arreglando un error acá y rompiendo otro allá — que es
# justamente el caso que hay que atrapar. Las líneas y columnas NO entran al
# baseline: se mueven con cualquier edición y volverían el trinquete inservible.
#
# Uso:
#   ./scripts/check-web-types.sh            # chequea contra el baseline
#   ./scripts/check-web-types.sh --update   # regraba el baseline (al bajar errores)
#
# Exit codes:
#   0 = sin errores nuevos (aunque queden preexistentes)
#   1 = hay errores nuevos, o archivos nuevos con errores
# ─────────────────────────────────────────────────────────────────────────────

set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WEB="$ROOT/packages/web"
BASELINE="$ROOT/scripts/web-type-errors-baseline.txt"

MODE_UPDATE=0
for arg in "$@"; do
    case "$arg" in
        --update) MODE_UPDATE=1 ;;
    esac
done

red()    { printf '\033[31m%s\033[0m' "$*"; }
yellow() { printf '\033[33m%s\033[0m' "$*"; }
green()  { printf '\033[32m%s\033[0m' "$*"; }
bold()   { printf '\033[1m%s\033[0m' "$*"; }

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

echo "$(bold "Web type-check") — tsc --noEmit -p tsconfig.app.json"
echo

# tsc sale con 2 cuando hay errores de tipo; eso es el caso esperado acá, así
# que el exit code propio no dice nada y se descarta a propósito.
( cd "$WEB" && npx tsc --noEmit -p tsconfig.app.json ) > "$TMP/raw.txt" 2>&1 || true

# Un fallo de INFRAESTRUCTURA (tsconfig ilegible, tsc ausente) no debe leerse
# como "cero errores" y dejar pasar el trinquete en verde.
if ! grep -qE 'error TS' "$TMP/raw.txt" && [ -s "$TMP/raw.txt" ]; then
    echo "$(red "✗") tsc produjo salida que no son errores de tipo:"
    sed 's/^/    /' "$TMP/raw.txt"
    exit 1
fi

# Una línea de error empieza en la columna 0 (las continuaciones van indentadas)
# y trae `file(line,col): error TSxxxx`. Se conserva solo el archivo.
extract_files() {
    grep -E '^[^[:space:]].*error TS' "$1" | awk '
        {
            i = index($0, "): error TS")
            if (i > 0) {
                s = substr($0, 1, i)
                sub(/\([0-9]+,[0-9]+\)$/, "", s)
                print s
            } else {
                print "«sin-archivo»"
            }
        }
    '
}

extract_files "$TMP/raw.txt" | sort | uniq -c \
    | awk '{ c = $1; $1 = ""; sub(/^ /, ""); printf "%s\t%s\n", c, $0 }' \
    | sort -k2 > "$TMP/current.txt"

TOTAL="$(awk -F'\t' '{ s += $1 } END { print s + 0 }' "$TMP/current.txt")"

if [ "$MODE_UPDATE" -eq 1 ]; then
    {
        echo "# Baseline de errores de tipo de packages/web — NO editar a mano."
        echo "# Regenerar con: ./scripts/check-web-types.sh --update"
        echo "# Formato: <cantidad>\t<archivo relativo a packages/web>"
        echo "# Total: $TOTAL"
        cat "$TMP/current.txt"
    } > "$BASELINE"
    echo "$(green "✓") Baseline regrabado — $TOTAL error(es) en $(wc -l < "$TMP/current.txt" | tr -d ' ') archivo(s)."
    exit 0
fi

if [ ! -f "$BASELINE" ]; then
    echo "$(red "✗") No existe $BASELINE. Genéralo con: ./scripts/check-web-types.sh --update"
    exit 1
fi

grep -v '^#' "$BASELINE" | grep -v '^[[:space:]]*$' > "$TMP/baseline.txt" || true

BASE_TOTAL="$(awk -F'\t' '{ s += $1 } END { print s + 0 }' "$TMP/baseline.txt")"

awk -F'\t' '
    NR == FNR { base[$2] = $1; next }
    {
        was = ($2 in base) ? base[$2] : 0
        if ($1 > was) printf "WORSE\t%s\t%d\t%d\n", $2, was, $1
        else if ($1 < was) printf "BETTER\t%s\t%d\t%d\n", $2, was, $1
        seen[$2] = 1
    }
    END {
        for (f in base) if (!(f in seen)) printf "BETTER\t%s\t%d\t0\n", f, base[f]
    }
' "$TMP/baseline.txt" "$TMP/current.txt" > "$TMP/diff.txt"

WORSE="$(grep -c '^WORSE' "$TMP/diff.txt" || true)"
BETTER="$(grep -c '^BETTER' "$TMP/diff.txt" || true)"

if [ "$WORSE" -gt 0 ]; then
    echo "$(red "✗") Errores de tipo NUEVOS en $WORSE archivo(s):"
    echo
    while IFS=$'\t' read -r _ file was now; do
        echo "  $(red "✗") $file — $was → $now"
        grep -E "^$(printf '%s' "$file" | sed 's/[.[\*^$\/]/\\&/g')\(" "$TMP/raw.txt" | sed 's/^/      /'
    done < <(grep '^WORSE' "$TMP/diff.txt")
    echo
    echo "  El baseline congela la deuda vieja; no admite deuda nueva."
    echo "  Arregla los errores de arriba. Si el archivo se movió/renombró y los"
    echo "  errores son los mismos de siempre, regrábalo con --update y dilo en el commit."
    echo
    echo "  Total: $BASE_TOTAL (baseline) → $TOTAL (ahora)"
    exit 1
fi

if [ "$BETTER" -gt 0 ]; then
    echo "$(green "✓") Sin errores nuevos. Bajaron en $BETTER archivo(s):"
    while IFS=$'\t' read -r _ file was now; do
        echo "  $(green "↓") $file — $was → $now"
    done < <(grep '^BETTER' "$TMP/diff.txt")
    echo
    echo "  $(yellow "Regla Boy Scout:") ajusta el trinquete con"
    echo "  $(bold "./scripts/check-web-types.sh --update") y commitea el baseline."
    echo "  Sin eso, el margen ganado queda disponible para la próxima regresión."
fi

echo
echo "$(green "✓") Total: $TOTAL error(es) preexistente(s) — baseline $BASE_TOTAL, ninguno nuevo."
exit 0
