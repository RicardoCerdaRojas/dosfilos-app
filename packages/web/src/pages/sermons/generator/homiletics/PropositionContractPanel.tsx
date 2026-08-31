import { useMemo, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, BookOpen, CheckCircle2, Plus, Trash2, Save } from 'lucide-react';
import {
    parseSustantivada,
    confrontProposition,
    pointPassageRef,
    sermonStructureFor,
    GENRE_SERMON_STRUCTURE_GENRES,
    type HomileticalAnalysis,
    type LiteraryGenre,
} from '@dosfilos/domain';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';

interface Props {
    homiletics: HomileticalAnalysis;
    /** Pasaje del sermón: completa el libro y capítulo del que se deduce. */
    sermonPassage?: string;
    /** Del `pastoralSeed`. Sin género, la vara corre sin piso de género. */
    genre?: string;
    /**
     * `srcIndex` es la posición ORIGINAL del punto, o `null` si es nuevo. Sin
     * esa identidad, borrar un punto del medio pegaría las descripciones y
     * referencias al punto equivocado — corrupción silenciosa, justo la clase
     * de fallo que no se nota hasta el púlpito.
     */
    onApply: (patch: {
        proposition: string;
        points: {
            title: string;
            application: string;
            passageRef: string;
            srcIndex: number | null;
        }[];
    }) => void;
}

/**
 * Proposición y bosquejo EN UNA SOLA SUPERFICIE.
 *
 * POR QUÉ EXISTE: el canvas los parte en tarjetas independientes que se refinan
 * por separado, y son UN SOLO CONTRATO. Los puntos heredan el sustantivo plural
 * y el llamado a la acción de la proposición ("tres verdades que debes obedecer"
 * ⇒ títulos que empiezan con "Debes"). Editándolos en cajas que no se hablan, el
 * pastor está corrigiendo las dos mitades de una misma frase sin ver la otra —
 * y nada le avisa cuando quedan desalineadas.
 *
 * NO REEMPLAZA AL CANVAS: éste es para alinear el contrato; el canvas sigue
 * sirviendo para refinar por chat las descripciones y referencias de cada punto.
 *
 * CONFRONTA, NO BLOQUEA (ADR-027). Los hallazgos se muestran y el pastor decide.
 * La sustantivada es el default, no una prohibición: una proposición libre
 * simplemente rinde menos elementos, y eso se informa sin impedir nada.
 */
export function PropositionContractPanel({ homiletics, genre, sermonPassage, onApply }: Props) {
    const { t } = useTranslation('generator');

    const originalProposition = homiletics.homileticalProposition ?? '';
    const [proposition, setProposition] = useState(originalProposition);
    // La aplicación vive EN el punto (una por punto). Los sermones anteriores
    // la tienen en la lista suelta `contemporaryApplication`; se siembra por
    // posición para no perder ese trabajo, que es lo único que se puede hacer
    // con un dato que nunca supo a qué punto pertenecía.
    const legacyApps = useMemo(
        () => (Array.isArray(homiletics.contemporaryApplication) ? homiletics.contemporaryApplication : []),
        [homiletics.contemporaryApplication],
    );
    const originalPoints = useMemo(
        () =>
            (homiletics.outline?.mainPoints ?? []).map((p, i) => ({
                title: p.title ?? '',
                application: p.application ?? legacyApps[i] ?? '',
                // Vacío si él no lo escribió: el campo NO se rellena solo. Lo
                // deducido se muestra como marcador, y así se distingue de un
                // vistazo lo que él mantiene de lo que la aplicación supone.
                passageRef: p.passageRef ?? '',
                srcIndex: i as number | null,
            })),
        [homiletics.outline, legacyApps],
    );
    const [points, setPoints] = useState(originalPoints);

    // Si el contenido cambia por fuera (regenerar, refinar por chat), el panel
    // se re-sincroniza en vez de quedar mostrando una edición huérfana.
    useEffect(() => setProposition(originalProposition), [originalProposition]);
    useEffect(() => setPoints(originalPoints), [originalPoints]);

    const titles = points.map((p) => p.title);
    const same = (a: typeof points, b: typeof points) =>
        a.length === b.length
        && a.every(
            (x, i) =>
                x.title === b[i]!.title
                && x.application === b[i]!.application
                && x.passageRef === b[i]!.passageRef,
        );
    const dirty = proposition !== originalProposition || !same(points, originalPoints);

    const { report, verboEnSegundaPersona, anunciados } = useMemo(() => {
        const parsed = parseSustantivada(proposition, titles);
        const estructura =
            genre && (GENRE_SERMON_STRUCTURE_GENRES as readonly string[]).includes(genre)
                ? sermonStructureFor(genre as LiteraryGenre)
                : null;
        return {
            report: confrontProposition({ draft: parsed.draft, estructura }),
            verboEnSegundaPersona: parsed.verboEnSegundaPersona,
            anunciados: parsed.draft.cantidadDePuntos,
        };
    }, [proposition, titles, genre]);

    // Cuántos puntos faltan respecto de lo que la proposición ANUNCIA. Es el
    // caso que el pastor resuelve escribiendo él mismo el punto que falta.
    const faltantes = anunciados !== undefined ? anunciados - titles.length : 0;

    const violaciones = report.hallazgos.filter((h) => h.esViolacion);
    const guias = report.hallazgos.filter((h) => !h.esViolacion);
    const alineado = violaciones.length === 0 && !verboEnSegundaPersona;

    const addPoint = () =>
        setPoints((prev) => [...prev, { title: '', application: '', passageRef: '', srcIndex: null }]);
    const removePoint = (i: number) => setPoints((prev) => prev.filter((_, k) => k !== i));
    const setTitle = (i: number, v: string) =>
        setPoints((prev) => prev.map((x, k) => (k === i ? { ...x, title: v } : x)));
    const setApplication = (i: number, v: string) =>
        setPoints((prev) => prev.map((x, k) => (k === i ? { ...x, application: v } : x)));
    const setPassageRef = (i: number, v: string) =>
        setPoints((prev) => prev.map((x, k) => (k === i ? { ...x, passageRef: v } : x)));

    /**
     * Lo que la aplicación DEDUCIRÍA para este punto si él no escribe nada.
     *
     * Se muestra como marcador de posición, no como valor: un campo que aparece
     * lleno sin que el pastor lo escribiera vuelve a ser un dato que nadie
     * mantiene — que es exactamente cómo la referencia acabó apuntando a un
     * bosquejo que él ya había reemplazado.
     */
    /**
     * `srcIndex` y NO la posición: leer `mainPoints[i]` daba el punto original
     * equivocado apenas el pastor borraba uno del medio —la lista local se
     * corre, la original no— que es exactamente la corrupción silenciosa contra
     * la que existe `srcIndex`. Se veía sólo en el marcador del pasaje, así que
     * nadie lo notaba.
     */
    const deducido = (srcIndex: number | null, title: string) =>
        pointPassageRef({
            title,
            sermonPassage,
            scriptureReferences:
                srcIndex !== null
                    ? homiletics.outline?.mainPoints?.[srcIndex]?.scriptureReferences
                    : undefined,
        });

    return (
        <div className="rounded-lg border border-border bg-card p-4 space-y-4">
            <div className="flex items-start justify-between gap-3">
                <div>
                    <h3 className="font-semibold text-foreground">{t('homiletics.contract.title')}</h3>
                    <p className="text-xs text-muted-foreground">{t('homiletics.contract.subtitle')}</p>
                </div>
                {alineado ? (
                    <span className="flex items-center gap-1.5 text-xs text-success shrink-0">
                        <CheckCircle2 className="h-4 w-4" />
                        {t('homiletics.contract.aligned')}
                    </span>
                ) : (
                    <span className="flex items-center gap-1.5 text-xs text-warning shrink-0">
                        <AlertTriangle className="h-4 w-4" />
                        {t('homiletics.contract.needsReview')}
                    </span>
                )}
            </div>

            <div className="space-y-1.5">
                <label htmlFor="prop-text" className="text-xs font-medium text-foreground">
                    {t('homiletics.contract.propositionLabel')}
                </label>
                <Textarea
                    id="prop-text"
                    value={proposition}
                    onChange={(e) => setProposition(e.target.value)}
                    rows={3}
                    className="text-sm"
                />
            </div>

            <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-foreground">
                        {t('homiletics.contract.pointsLabel', { count: titles.length })}
                    </span>
                    {anunciados !== undefined && (
                        <span className="text-xs text-muted-foreground">
                            {t('homiletics.contract.announced', { count: anunciados })}
                        </span>
                    )}
                </div>
                {points.map((p, i) => (
                    <div key={i} className="rounded-md border border-border/60 p-2 space-y-2">
                        <div className="flex items-center gap-2">
                            <span className="shrink-0 text-xs font-medium text-muted-foreground">{i + 1}</span>
                            <Input
                                value={p.title}
                                onChange={(e) => setTitle(i, e.target.value)}
                                placeholder={t('homiletics.contract.pointPlaceholder')}
                                className="text-sm"
                            />
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 shrink-0"
                                aria-label={t('homiletics.contract.removePoint')}
                                onClick={() => removePoint(i)}
                            >
                                <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                        </div>
                        {/* EL PASAJE QUE ESTE PUNTO EXPONE, por fin visible.
                            Se decidía en el dato y no se veía en ninguna
                            pantalla: quedaba como llegó del generador aunque el
                            pastor reescribiera el punto entero. El marcador
                            muestra lo que se deduciría de su título; escribir
                            acá gana sobre esa deducción. */}
                        <div className="flex items-center gap-2">
                            <BookOpen className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                            <Input
                                value={p.passageRef}
                                onChange={(e) => setPassageRef(i, e.target.value)}
                                placeholder={
                                    deducido(p.srcIndex, p.title)
                                    ?? t('homiletics.contract.passageRefPlaceholder')
                                }
                                aria-label={t('homiletics.contract.passageRefLabel', { n: i + 1 })}
                                className="h-8 text-xs"
                            />
                        </div>
                        {/* La aplicación DEBAJO de su punto: así se ve a cuál
                            pertenece, que es justo lo que la lista suelta no
                            podía decir. Se deriva del punto; no lo gobierna. */}
                        <Textarea
                            value={p.application}
                            onChange={(e) => setApplication(i, e.target.value)}
                            rows={2}
                            placeholder={t('homiletics.contract.applicationPlaceholder')}
                            className="text-sm bg-muted/30"
                        />
                    </div>
                ))}
                <Button variant="outline" size="sm" onClick={addPoint} className="w-full">
                    <Plus className="mr-1.5 h-3.5 w-3.5" />
                    {/* ACCIÓN PRIMARIA cuando la proposición anuncia más puntos
                        de los que hay: el pastor escribe él mismo el que falta,
                        que es como lo resuelve. Regenerar el bosquejo entero es
                        el camino secundario y vive en el canvas. */}
                    {faltantes > 0
                        ? t('homiletics.contract.addMissingPoint', { count: faltantes })
                        : t('homiletics.contract.addPoint')}
                </Button>
            </div>

            {(violaciones.length > 0 || verboEnSegundaPersona || guias.length > 0) && (
                <ul className="space-y-1.5 rounded-md bg-muted/50 p-3 text-xs">
                    {verboEnSegundaPersona && (
                        <li className="text-foreground">{t('homiletics.contract.secondPersonVerb')}</li>
                    )}
                    {violaciones.map((h, i) => (
                        <li key={`v${i}`} className="text-foreground">
                            {h.mensaje}
                        </li>
                    ))}
                    {guias.map((h, i) => (
                        <li key={`g${i}`} className="text-muted-foreground">
                            {h.mensaje}
                        </li>
                    ))}
                </ul>
            )}

            <div className="flex items-center justify-between gap-3">
                <p className="text-xs text-muted-foreground">{t('homiletics.contract.disclaimer')}</p>
                <Button
                    size="sm"
                    disabled={!dirty}
                    onClick={() => onApply({ proposition, points })}
                    className="shrink-0"
                >
                    <Save className="mr-1.5 h-3.5 w-3.5" />
                    {t('homiletics.contract.apply')}
                </Button>
            </div>
        </div>
    );
}
