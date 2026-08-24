#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# ¿Cada función declara los secretos que su código realmente lee?
#
# POR QUÉ EXISTE: los correos de producción estuvieron caídos sin que nadie lo
# notara. La cadena era: ninguna función declaraba `secrets: ['RESEND_API_KEY']`,
# así que la clave dependía de `packages/functions/.env`; Cloud Functions v2 la
# hornea EN EL DEPLOY, y CI despliega sin ese archivo porque está en
# `.gitignore`. Cada despliegue automático dejaba producción sin clave.
#
# EL DISEÑO OBVIO NO LO HABRÍA ATRAPADO. Una función de health-check que
# verifique `process.env.X` en runtime DECLARA los secretos que revisa, así que
# siempre los tiene: reportaría verde mientras otras trece funciones están sin
# clave. Es el mismo error que el aviso de `resendClient`, que gritaba en todas
# partes y por eso no señalaba en ninguna.
#
# EL INVARIANTE ES CALCULABLE, así que se calcula y se bloquea ANTES del deploy:
#
#   Si un módulo lee `process.env.X` y X es un secreto que el proyecto gestiona,
#   toda función cuyo grafo de imports lo alcance debería declarar X.
#
# QUÉ CUENTA COMO SECRETO GESTIONADO: la unión de todos los nombres que
# aparecen en algún `secrets: [...]` del código. Auto-mantenido: agregar un
# secreto nuevo lo mete en el radar sin tocar este script.
#
# POR QUÉ ES UN TRINQUETE Y NO UN CERO: hay lecturas legítimas que NO exigen
# declaración. `config/stripe.ts` hace `new Stripe(KEY || 'dummy_key')` a nivel
# de módulo y lo importan decenas de funciones que no cobran; para ellas la
# ausencia de clave es correcta y degrada sin romper. Exigirles el secreto les
# daría acceso a una credencial que no necesitan. Esos pares quedan congelados
# en el baseline; un par NUEVO sí bloquea.
#
# Uso:
#   ./scripts/check-functions-secrets.sh            # chequea contra el baseline
#   ./scripts/check-functions-secrets.sh --update   # regraba (al bajar)
#   ./scripts/check-functions-secrets.sh --list     # muestra todos los pares
#
# Exit codes:
#   0 = sin pares nuevos
#   1 = hay una función que lee un secreto gestionado sin declararlo
# ─────────────────────────────────────────────────────────────────────────────

set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BASELINE="$ROOT/scripts/functions-secrets-baseline.txt"

MODE=""
case "${1:-}" in
    --update) MODE=update ;;
    --list)   MODE=list ;;
    "")       ;;
    *)        echo "uso: $0 [--update | --list]" >&2; exit 2 ;;
esac

bold() { printf '\033[1m%s\033[0m' "$1"; }
red() { printf '\033[31m%s\033[0m' "$1"; }
green() { printf '\033[32m%s\033[0m' "$1"; }
yellow() { printf '\033[33m%s\033[0m' "$1"; }

SCAN=$(cat <<'PY'
import os, re, sys

SRC = 'packages/functions/src'
INDEX = os.path.join(SRC, 'index.ts')

# ── 1. Qué secretos gestiona el proyecto ────────────────────────────────────
# La unión de todo lo que aparece en algún `secrets: [...]`. Auto-mantenido.
GESTIONADOS = set()
SECRETS_BLOCK = re.compile(r'secrets:\s*\[([^\]]*)\]', re.S)
for dirpath, _, files in os.walk(SRC):
    for fn in files:
        if not fn.endswith('.ts'):
            continue
        texto = open(os.path.join(dirpath, fn), encoding='utf-8').read()
        for m in SECRETS_BLOCK.finditer(texto):
            # Se ignoran las menciones dentro de comentarios: documentar por qué
            # NO se declara un secreto no puede contar como declararlo.
            GESTIONADOS.update(re.findall(r"'([A-Z0-9_]+)'", m.group(1)))

# ── 2. Los puntos de entrada: `export { nombre } from './ruta'` ─────────────
def archivo_de(p):
    """Ruta sin extensión → archivo real. Los `export ... from './x'` no la traen."""
    for cand in (p + '.ts', os.path.join(p, 'index.ts')):
        if os.path.isfile(cand):
            return cand
    return None


ENTRADAS = {}
for m in re.finditer(r"export\s*\{\s*([A-Za-z0-9_]+)[^}]*\}\s*from\s*'(\.[^']+)'",
                     open(INDEX, encoding='utf-8').read()):
    destino = archivo_de(os.path.normpath(os.path.join(SRC, m.group(2))))
    if destino:
        ENTRADAS[m.group(1)] = destino


def resolver(base, rel):
    """Ruta relativa → archivo real. `None` si es un paquete externo."""
    if not rel.startswith('.'):
        return None
    p = os.path.normpath(os.path.join(os.path.dirname(base), rel))
    for cand in (p + '.ts', os.path.join(p, 'index.ts')):
        if os.path.isfile(cand):
            return cand
    return None


IMPORTA = re.compile(r"(?:import|export)[^'\"]*from\s*'([^']+)'")
LEE_ENV = re.compile(r'process\.env\.([A-Z0-9_]+)')


def sin_comentarios(texto):
    texto = re.sub(r'/\*.*?\*/', '', texto, flags=re.S)
    return re.sub(r'^\s*//.*$', '', texto, flags=re.M)


cache_lee = {}


def lee_env(path):
    if path not in cache_lee:
        cache_lee[path] = set(LEE_ENV.findall(sin_comentarios(open(path, encoding='utf-8').read())))
    return cache_lee[path]


def grafo(entrada):
    """Todos los módulos alcanzables desde un punto de entrada."""
    vistos, pend = set(), [entrada]
    while pend:
        actual = pend.pop()
        if actual in vistos or not os.path.isfile(actual):
            continue
        vistos.add(actual)
        for rel in IMPORTA.findall(open(actual, encoding='utf-8').read()):
            destino = resolver(actual, rel)
            if destino:
                pend.append(destino)
    return vistos


DECLARA = re.compile(r'export\s+const\s+{}\b(.*?)(?=\nexport\s|\Z)', re.S)


def opciones(texto):
    """El primer objeto `{...}` balanceado: donde viven las opciones."""
    limpio = sin_comentarios(texto)
    i = limpio.find('{')
    if i == -1:
        return ''
    prof = 0
    for j in range(i, len(limpio)):
        if limpio[j] == '{':
            prof += 1
        elif limpio[j] == '}':
            prof -= 1
            if prof == 0:
                return limpio[i:j + 1]
    return limpio[i:]

pares = []
for nombre, archivo in sorted(ENTRADAS.items()):
    if not os.path.isfile(archivo):
        continue
    texto = open(archivo, encoding='utf-8').read()
    m = DECLARA.pattern.replace('{}', re.escape(nombre))
    decl = re.search(m, texto, re.S)
    # Se miran los primeros ~1200 caracteres de la declaración: ahí van las
    # opciones. Más allá empieza el cuerpo, donde un `secrets` en un comentario
    # no declara nada.
    # El objeto de OPCIONES es el primer `{...}` balanceado tras el disparador.
    # Una ventana de N caracteres no sirve: `extractPdfWithGemini` documenta sus
    # dos cuentas de LlamaParse con seis líneas de comentario DENTRO del array,
    # y el corte dejaba `secrets:` afuera — lo que la hacía parecer una función
    # que lee un secreto sin declararlo. Un falso positivo en el primer chequeo
    # es la forma más rápida de que nadie vuelva a mirarlo.
    cabecera = opciones(decl.group(1)) if decl else ''
    declarados = set()
    for sm in SECRETS_BLOCK.finditer(cabecera):
        declarados.update(re.findall(r"'([A-Z0-9_]+)'", sm.group(1)))

    leidos = set()
    for mod in grafo(archivo):
        leidos |= (lee_env(mod) & GESTIONADOS)

    for falta in sorted(leidos - declarados):
        pares.append(f'{nombre} {falta}')

for p in sorted(set(pares)):
    print(p)
PY
)

cd "$ROOT" || exit 2
ACTUAL=$(python3 -c "$SCAN")

if [ "$MODE" = "list" ]; then
    printf '%s\n' "$ACTUAL"
    exit 0
fi

if [ "$MODE" = "update" ]; then
    printf '%s\n' "$ACTUAL" > "$BASELINE"
    echo "$(green "✓") Baseline regrabado: $(grep -c . "$BASELINE") par(es) función↔secreto."
    exit 0
fi

echo "$(bold "Secretos de functions") — ¿cada función declara lo que su código lee?"
echo

if [ ! -f "$BASELINE" ]; then
    echo "$(red "✗") No existe el baseline. Genéralo con: $0 --update"
    exit 1
fi

NUEVOS=$(comm -13 <(sort "$BASELINE") <(printf '%s\n' "$ACTUAL" | sort) | grep -v '^$' || true)
IDOS=$(comm -23 <(sort "$BASELINE") <(printf '%s\n' "$ACTUAL" | sort) | grep -v '^$' || true)

if [ -n "$NUEVOS" ]; then
    echo "  $(red "✗") Función(es) que LEEN un secreto gestionado sin declararlo:"
    printf '%s\n' "$NUEVOS" | while read -r fn sec; do
        [ -z "${sec:-}" ] && continue
        echo "        $fn → falta $(bold "$sec")"
    done
    echo
    echo "     Agrega el secreto a las opciones de esa función:"
    echo "       { ...appCheckCallableOptions(), secrets: ['NOMBRE'] }"
    echo "     Si la lectura es incidental y degrada sin romper (como stripe.ts),"
    echo "     regraba el baseline y dilo en el commit."
    exit 1
fi

TOTAL=$(printf '%s\n' "$ACTUAL" | grep -c . || true)
BASE=$(grep -c . "$BASELINE" || true)
if [ -n "$IDOS" ]; then
    echo "  $(green "✓") $TOTAL par(es) — bajó desde $BASE. $(yellow "Regraba el baseline:") $0 --update"
else
    echo "  $(green "✓") $TOTAL par(es) preexistente(s) — baseline $BASE, ninguno nuevo."
fi
