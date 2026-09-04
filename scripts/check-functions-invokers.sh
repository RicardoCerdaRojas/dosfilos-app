#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# ¿Cada callable desplegada acepta que la llamen?
#
# POR QUÉ EXISTE: `cancelExtraction` se desplegó sin el binding
# `roles/run.invoker` para `allUsers`. El navegador reportaba un error de CORS
# —el síntoma— y la causa era otra: Cloud Run rechazaba la petición ANTES de
# ejecutar el código, y una respuesta rechazada ahí no lleva cabeceras CORS.
# Todas las demás callables sí lo tenían. El botón «Cancelar» no funcionaba
# para nadie y el mensaje del navegador apuntaba al lugar equivocado.
#
# EL INVARIANTE ES CALCULABLE, así que se calcula:
#
#   Toda función exportada como `onCall` u `onRequest` la invoca un navegador,
#   así que su servicio de Cloud Run tiene que tener `allUsers` con
#   `roles/run.invoker`. La autorización de verdad la hacen App Check y el
#   token del usuario DENTRO del código; el binding sólo decide si el código
#   llega a correr.
#
#   Y al revés: un disparador o una función programada NO la llama un
#   navegador. `allUsers` ahí es superficie abierta sin motivo.
#
# NO CORRE EN CI: consultar los bindings exige credenciales de GCP. Esto se
# corre después de desplegar, junto al humo. Es la mitad viva del chequeo que
# `check-functions-secrets.sh` hace en estático.
#
# Uso:
#   ./scripts/check-functions-invokers.sh            # compara lo desplegado
#   ./scripts/check-functions-invokers.sh --list     # sólo dice qué espera
#
# Exit codes:
#   0 = cada callable acepta invocación
#   1 = hay una callable sin binding (o un disparador abierto de más)
#   2 = falta gcloud, faltan credenciales o el uso es incorrecto
# ─────────────────────────────────────────────────────────────────────────────

set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PROJECT="${FIREBASE_PROJECT:-dosfilosapp}"
REGION="${FUNCTIONS_REGION:-us-central1}"

MODE=""
case "${1:-}" in
    --list) MODE=list ;;
    "")     ;;
    *)      echo "uso: $0 [--list]" >&2; exit 2 ;;
esac

bold() { printf '\033[1m%s\033[0m' "$1"; }
red() { printf '\033[31m%s\033[0m' "$1"; }
green() { printf '\033[32m%s\033[0m' "$1"; }
yellow() { printf '\033[33m%s\033[0m' "$1"; }

# ── Qué exporta el índice, y de qué tipo es cada cosa ────────────────────────
SCAN=$(cat <<'PY'
import os, re

SRC = 'packages/functions/src'
INDEX = os.path.join(SRC, 'index.ts')


def archivo_de(p):
    for cand in (p + '.ts', os.path.join(p, 'index.ts')):
        if os.path.isfile(cand):
            return cand
    return None


def sin_comentarios(texto):
    texto = re.sub(r'/\*.*?\*/', '', texto, flags=re.S)
    return re.sub(r'^\s*//.*$', '', texto, flags=re.M)


# `export { a, b } from './x'` — una entrada puede exportar varios nombres.
entradas = []
for m in re.finditer(r"export\s*\{([^}]*)\}\s*from\s*'(\.[^']+)'",
                     open(INDEX, encoding='utf-8').read()):
    destino = archivo_de(os.path.normpath(os.path.join(SRC, m.group(2))))
    if not destino:
        continue
    for nombre in re.findall(r'[A-Za-z0-9_]+', m.group(1)):
        entradas.append((nombre, destino))

for nombre, archivo in sorted(set(entradas)):
    texto = sin_comentarios(open(archivo, encoding='utf-8').read())
    decl = re.search(
        r'export\s+const\s+' + re.escape(nombre) + r'\s*(?::[^=]+)?=\s*([A-Za-z0-9_.<]+)',
        texto,
    )
    if not decl:
        continue
    disparador = decl.group(1)
    if disparador.startswith('onCall') or disparador.startswith('onRequest'):
        tipo = 'publica'
    else:
        tipo = 'privada'
    print(f'{nombre} {tipo}')
PY
)

cd "$ROOT" || exit 2
FUNCIONES=$(python3 -c "$SCAN")

if [ "$MODE" = "list" ]; then
    printf '%s\n' "$FUNCIONES"
    exit 0
fi

command -v gcloud >/dev/null 2>&1 || {
    echo "$(red "✗") Falta gcloud. Este chequeo consulta los bindings desplegados."
    exit 2
}

echo "$(bold "Invocación de functions") — ¿lo desplegado acepta que lo llamen? ($PROJECT / $REGION)"
echo

POLITICAS=$(gcloud run services list \
    --region "$REGION" --project "$PROJECT" \
    --format="value(metadata.name)" 2>/dev/null) || {
    echo "$(red "✗") No se pudieron listar los servicios. ¿Sesión de gcloud activa?"
    exit 2
}

FALTAN=""
ABIERTAS_DE_MAS=""
SIN_DESPLEGAR=""

while read -r nombre tipo; do
    [ -z "${nombre:-}" ] && continue
    servicio=$(printf '%s' "$nombre" | tr '[:upper:]' '[:lower:]')
    if ! printf '%s\n' "$POLITICAS" | grep -qx "$servicio"; then
        SIN_DESPLEGAR="${SIN_DESPLEGAR}${nombre}\n"
        continue
    fi
    abierta=$(gcloud run services get-iam-policy "$servicio" \
        --region "$REGION" --project "$PROJECT" --format=json 2>/dev/null \
        | python3 -c "import json,sys
try:
    politica = json.load(sys.stdin)
except Exception:
    print('desconocido'); raise SystemExit
enlaces = politica.get('bindings', [])
publica = any(b.get('role') == 'roles/run.invoker' and 'allUsers' in b.get('members', [])
              for b in enlaces)
print('si' if publica else 'no')")

    if [ "$tipo" = "publica" ] && [ "$abierta" = "no" ]; then
        FALTAN="${FALTAN}${nombre}\n"
    elif [ "$tipo" = "privada" ] && [ "$abierta" = "si" ]; then
        ABIERTAS_DE_MAS="${ABIERTAS_DE_MAS}${nombre}\n"
    fi
done <<< "$FUNCIONES"

SALIDA=0

if [ -n "$FALTAN" ]; then
    echo "  $(red "✗") Callable(s) desplegadas que RECHAZAN la invocación antes de correr:"
    printf "$FALTAN" | while read -r fn; do
        [ -z "${fn:-}" ] && continue
        echo "        $(bold "$fn")"
    done
    echo
    echo "     El navegador va a reportar esto como error de CORS. No lo es."
    echo "     Arreglo, por función:"
    echo "       gcloud run services add-iam-policy-binding <servicio> \\"
    echo "         --region=$REGION --project=$PROJECT \\"
    echo "         --member=allUsers --role=roles/run.invoker"
    echo
    SALIDA=1
fi

if [ -n "$ABIERTAS_DE_MAS" ]; then
    echo "  $(yellow "!") Disparador(es)/programada(s) con \`allUsers\` — superficie abierta sin motivo:"
    printf "$ABIERTAS_DE_MAS" | while read -r fn; do
        [ -z "${fn:-}" ] && continue
        echo "        $fn"
    done
    echo
fi

if [ -n "$SIN_DESPLEGAR" ]; then
    COUNT=$(printf "$SIN_DESPLEGAR" | grep -c . || true)
    echo "  $(yellow "!") $COUNT función(es) exportada(s) todavía sin desplegar (normal antes del primer deploy)."
    echo
fi

if [ "$SALIDA" = "0" ] && [ -z "$ABIERTAS_DE_MAS" ]; then
    TOTAL=$(printf '%s\n' "$FUNCIONES" | grep -c . || true)
    echo "  $(green "✓") $TOTAL función(es) revisada(s); los bindings coinciden con el tipo de disparador."
fi

exit "$SALIDA"
