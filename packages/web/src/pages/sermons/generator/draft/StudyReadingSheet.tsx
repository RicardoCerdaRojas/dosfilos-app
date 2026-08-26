import { BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { ExegeticalStudy } from '@dosfilos/domain';
import { useTranslation } from '@/i18n';

interface Props {
    study: ExegeticalStudy;
}

/**
 * El estudio exegético completo, en SOLO LECTURA, al lado del taller.
 *
 * El pastor decidía las secciones del sermón con su estudio a dos pantallas de
 * distancia: para releer su contexto histórico tenía que salir del taller,
 * perder la sección activa y volver. Esta hoja lo trae a un gesto — se LEE, no
 * se edita: el estudio se trabaja en su propio paso, y editarlo desde acá
 * crearía el segundo camino de escritura que siempre termina divergiendo.
 *
 * Es una HOJA lateral y no una cuarta columna: el taller ya reparte tres
 * (mapa, decisiones, prosa) y en un notebook de 14" no hay dónde meter otra
 * de forma permanente. La consulta del estudio es puntual, no continua.
 */
export function StudyReadingSheet({ study }: Props) {
    const { t } = useTranslation('generator');

    const seccion = (titulo: string, cuerpo?: string) =>
        cuerpo?.trim() ? (
            <section className="space-y-1.5">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{titulo}</h4>
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{cuerpo}</p>
            </section>
        ) : null;

    return (
        <Sheet>
            <SheetTrigger asChild>
                <Button variant="outline" size="sm">
                    <BookOpen className="mr-2 h-4 w-4" />
                    {t('drafting.study.viewButton')}
                </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-full sm:max-w-lg p-0 flex flex-col">
                <SheetHeader className="px-6 pt-6 pb-2">
                    <SheetTitle>{t('drafting.study.title', { passage: study.passage })}</SheetTitle>
                    <SheetDescription>{t('drafting.study.readOnlyNote')}</SheetDescription>
                </SheetHeader>
                <ScrollArea className="flex-1 min-h-0">
                    <div className="px-6 pb-6 space-y-5">
                        {study.exegeticalProposition?.trim() && (
                            <section className="space-y-1.5">
                                <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                    {t('drafting.study.exegeticalProposition')}
                                </h4>
                                <p className="text-sm font-medium italic leading-relaxed">
                                    "{study.exegeticalProposition}"
                                </p>
                            </section>
                        )}

                        {seccion(t('drafting.study.historical'), study.context?.historical)}
                        {seccion(t('drafting.study.literary'), study.context?.literary)}
                        {seccion(t('drafting.study.audience'), study.context?.audience)}

                        {(study.keyWords ?? []).length > 0 && (
                            <section className="space-y-1.5">
                                <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                    {t('drafting.study.keyWords')}
                                </h4>
                                <ul className="space-y-2">
                                    {study.keyWords.map((kw, i) => (
                                        <li key={i} className="text-sm leading-relaxed">
                                            <span className="italic font-medium">{kw.original}</span>
                                            {kw.transliteration && (
                                                <span className="text-muted-foreground"> ({kw.transliteration})</span>
                                            )}
                                            {kw.significance && <> — {kw.significance}</>}
                                        </li>
                                    ))}
                                </ul>
                            </section>
                        )}

                        {(study.pastoralInsights ?? []).length > 0 && (
                            <section className="space-y-1.5">
                                <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                    {t('drafting.study.insights')}
                                </h4>
                                <ul className="list-disc pl-5 space-y-1 text-sm leading-relaxed">
                                    {study.pastoralInsights.map((ins, i) => (
                                        <li key={i}>{ins}</li>
                                    ))}
                                </ul>
                            </section>
                        )}

                        {(study.canonicalParallels ?? []).length > 0 && (
                            <section className="space-y-1.5">
                                <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                    {t('drafting.study.parallels')}
                                </h4>
                                <ul className="space-y-1 text-sm leading-relaxed">
                                    {(study.canonicalParallels ?? []).map((par, i) => (
                                        <li key={i}>
                                            <span className="font-medium">{par.reference}</span>
                                            {par.relevanceNote && (
                                                <span className="text-muted-foreground"> — {par.relevanceNote}</span>
                                            )}
                                        </li>
                                    ))}
                                </ul>
                            </section>
                        )}
                    </div>
                </ScrollArea>
            </SheetContent>
        </Sheet>
    );
}
