/**
 * Transliteración académica del griego koiné, POR CÓDIGO.
 *
 * Es un mapeo determinista de caracteres: pedírsela a un modelo sería pedir
 * un dato calculable a quien puede equivocarlo — la misma regla que dejó la
 * morfología en manos de MorphGNT.
 *
 * Convenciones (SBL): η→ē, ω→ō, θ→th, φ→ph, χ→ch, ψ→ps, ξ→x, υ→y (u en los
 * diptongos αυ/ευ/ου/ηυ/υι), γ nasal→n ante γ/κ/ξ/χ, espíritu áspero→h al
 * inicio (ῥ→rh), iota suscrita→i pospuesta.
 */

const BASE: Record<string, string> = {
    α: 'a', β: 'b', γ: 'g', δ: 'd', ε: 'e', ζ: 'z', η: 'ē', θ: 'th',
    ι: 'i', κ: 'k', λ: 'l', μ: 'm', ν: 'n', ξ: 'x', ο: 'o', π: 'p',
    ρ: 'r', σ: 's', ς: 's', τ: 't', υ: 'y', φ: 'ph', χ: 'ch', ψ: 'ps', ω: 'ō',
};

const VOCALES = new Set(['α', 'ε', 'η', 'ι', 'ο', 'υ', 'ω']);
/** Segunda vocal de un diptongo con la anterior. */
const CIERRA_DIPTONGO = new Set(['ι', 'υ']);
const NASALIZA_GAMMA = new Set(['γ', 'κ', 'ξ', 'χ']);

const ESPIRITU_ASPERO = '̔'; // ῾
const IOTA_SUSCRITA = 'ͅ';   // ͅ

interface Letra {
    base: string;
    aspero: boolean;
    suscrita: boolean;
    mayuscula: boolean;
}

/** Descompone un carácter griego en base + diacríticos que nos importan. */
function descomponer(ch: string): Letra | null {
    const nfd = ch.normalize('NFD');
    const base = nfd[0]?.toLowerCase() ?? '';
    if (!(base in BASE)) return null;
    return {
        base,
        aspero: nfd.includes(ESPIRITU_ASPERO),
        suscrita: nfd.includes(IOTA_SUSCRITA),
        mayuscula: nfd[0] !== nfd[0]?.toLowerCase(),
    };
}

export function transliterateGreek(palabra: string): string {
    const letras: (Letra | { puntuacion: string })[] = [];
    for (const ch of palabra) {
        const letra = descomponer(ch);
        if (letra) letras.push(letra);
        else if (!/\s/.test(ch)) letras.push({ puntuacion: ch });
    }

    let out = '';
    for (let i = 0; i < letras.length; i++) {
        const l = letras[i];
        if (!l) continue;
        if ('puntuacion' in l) {
            out += l.puntuacion;
            continue;
        }
        const sig = letras[i + 1];
        const sigLetra = sig && !('puntuacion' in sig) ? sig : null;

        // El espíritu áspero se pronuncia ANTES de la vocal (o del diptongo):
        // ὁ→ho, οὗ→hou. En NFD viene sobre la segunda vocal del diptongo, así
        // que también se mira la siguiente.
        const abreDiptongo =
            VOCALES.has(l.base) && sigLetra && CIERRA_DIPTONGO.has(sigLetra.base) && !sigLetra.suscrita;
        const aspero = l.aspero || (abreDiptongo && sigLetra!.aspero);
        const prev = i > 0 ? letras[i - 1] : undefined;
        if (VOCALES.has(l.base) && aspero && (!prev || 'puntuacion' in prev)) {
            out += l.mayuscula ? 'H' : 'h';
        }

        let trans: string;
        if (l.base === 'γ' && sigLetra && NASALIZA_GAMMA.has(sigLetra.base)) {
            trans = 'n'; // ἄγγελος → angelos
        } else if (l.base === 'ρ' && l.aspero) {
            trans = 'rh'; // ῥῆμα → rhēma
        } else if (l.base === 'υ' && prev && !('puntuacion' in prev) && VOCALES.has(prev.base) && prev.base !== 'υ') {
            trans = 'u'; // αὐτός → autos (pero ὑπέρ → hyper)
        } else {
            trans = BASE[l.base] ?? '';
        }

        if (l.mayuscula && trans[0]) trans = trans[0].toUpperCase() + trans.slice(1);
        out += trans;
        if (l.suscrita) out += 'i'; // τῇ → tēi
    }
    return out;
}
