#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# Trinquete de `react-hooks/rules-of-hooks` para `packages/web`.
#
# POR QUÉ EXISTE: la regla estaba en `'off'` dentro de `.eslintrc.cjs`. El
# plugin estaba instalado, la configuración lo extendía, y alguien apagó
# justamente la regla que atrapa el error que rompe la pantalla en tiempo de
# ejecución. En agosto de 2026 costó un crash en `StepDraft`: un `useMemo`
# quedó DEBAJO de un `if (loading) return …`, y el paso reventaba con "Rendered
# fewer hooks than expected" al pulsar regenerar — la única acción que enciende
# ese `loading` con el borrador ya en pantalla.
#
# Un guardián apagado es peor que ninguno: da la sensación de que el linter
# cubre esto.
#
# No se puede exigir cero sin frenar el trabajo (hay deuda vieja, casi toda en
# un archivo), así que va como TRINQUETE POR ARCHIVO, igual que el de tipos:
# lo viejo no bloquea, lo nuevo sí.
#
# Uso:
#   ./scripts/check-react-hooks.sh            # chequea contra el baseline
#   ./scripts/check-react-hooks.sh --update   # regraba el baseline (al bajar)
#
# Exit codes:
#   0 = sin violaciones nuevas
#   1 = hay violaciones nuevas, o archivos nuevos con violaciones
# ─────────────────────────────────────────────────────────────────────────────

set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WEB="$ROOT/packages/web"
BASELINE="$ROOT/scripts/react-hooks-baseline.txt"

MODE_UPDATE=0
for arg in "$@"; do
    case "$arg" in
        --update) MODE_UPDATE=1 ;;
    esac
done

red()   { printf '\033[31m%s\033[0m' "$*"; }
green() { printf '\033[32m%s\033[0m' "$*"; }
bold()  { printf '\033[1m%s\033[0m' "$*"; }

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

echo "$(bold "react-hooks/rules-of-hooks") — packages/web"
echo

# La regla se fuerza acá y no se lee de `.eslintrc.cjs`: este script es quien
# la exige, y así no depende de que nadie la vuelva a apagar.
( cd "$WEB" && npx eslint . --rule '{"react-hooks/rules-of-hooks":"error"}' -f json ) \
    > "$TMP/raw.json" 2>"$TMP/err.txt" || true

if [ ! -s "$TMP/raw.json" ]; then
    echo "$(red "✗") eslint no produjo salida JSON:"
    sed 's/^/    /' "$TMP/err.txt"
    exit 1
fi

python3 - "$TMP/raw.json" "$WEB" > "$TMP/current.txt" <<'PY'
import json, sys, collections, os
datos = json.load(open(sys.argv[1]))
raiz = sys.argv[2].rstrip('/') + '/'
cuenta = collections.Counter()
for archivo in datos:
    for m in archivo.get('messages', []):
        if m.get('ruleId') == 'react-hooks/rules-of-hooks':
            cuenta[os.path.relpath(archivo['filePath'], raiz)] += 1
for nombre in sorted(cuenta):
    print(f"{cuenta[nombre]}\t{nombre}")
PY

TOTAL="$(awk -F'\t' '{ s += $1 } END { print s + 0 }' "$TMP/current.txt")"

if [ "$MODE_UPDATE" -eq 1 ]; then
    {
        echo "# Baseline de react-hooks/rules-of-hooks — NO editar a mano."
        echo "# Regenerar con: ./scripts/check-react-hooks.sh --update"
        echo "# Formato: <cantidad>\t<archivo relativo a packages/web>"
        echo "# Total: $TOTAL"
        cat "$TMP/current.txt"
    } > "$BASELINE"
    echo "$(green "✓") Baseline regrabado — $TOTAL violación(es)."
    exit 0
fi

if [ ! -f "$BASELINE" ]; then
    echo "$(red "✗") No existe $BASELINE. Genéralo con: ./scripts/check-react-hooks.sh --update"
    exit 1
fi

grep -v '^#' "$BASELINE" | grep -v '^[[:space:]]*$' > "$TMP/baseline.txt" || true
BASE_TOTAL="$(awk -F'\t' '{ s += $1 } END { print s + 0 }' "$TMP/baseline.txt")"

awk -F'\t' '
    NR == FNR { base[$2] = $1; next }
    {
        was = ($2 in base) ? base[$2] : 0
        if ($1 > was) printf "WORSE\t%s\t%d\t%d\n", $2, was, $1
        seen[$2] = 1
    }
' "$TMP/baseline.txt" "$TMP/current.txt" > "$TMP/diff.txt"

WORSE="$(grep -c '^WORSE' "$TMP/diff.txt" || true)"

if [ "$WORSE" -gt 0 ]; then
    echo "$(red "✗") Hooks llamados condicionalmente — NUEVOS en $WORSE archivo(s):"
    echo
    while IFS=$'\t' read -r _ file was now; do
        echo "  $(red "✗") $file — $was → $now"
    done < <(grep '^WORSE' "$TMP/diff.txt")
    echo
    echo "  Un hook debajo de un retorno temprano rompe la pantalla en runtime,"
    echo "  no en compilación. Súbelo por encima de TODOS los returns."
    exit 1
fi

if [ "$TOTAL" -lt "$BASE_TOTAL" ]; then
    echo "$(green "✓") $TOTAL violación(es) — bajó desde $BASE_TOTAL."
    echo "  Regraba el baseline: ./scripts/check-react-hooks.sh --update"
    exit 0
fi

echo "  $(green "✓") $TOTAL violación(es) preexistente(s) — baseline $BASE_TOTAL, ninguna nueva."
