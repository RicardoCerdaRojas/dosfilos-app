import { NotebookPen, Plus, Sparkles, Construction } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/i18n';

/**
 * Exégesis — landing del módulo de redacción exegética asistida.
 *
 * v1 (en construcción): wizard paso-a-paso para producir trabajos
 * exegéticos del NT/AT con corpus por proyecto y guía de estilo
 * a nivel de usuario. La verificación programática de citas
 * (`CitationVerifier`) llega en v1.5 — es el diferenciador real
 * frente a NotebookLM.
 *
 * Esta primera ruta solo monta el shell de navegación: hero,
 * CTA deshabilitada (todavía no hay setup wizard) y nota
 * "coming soon". Se llena en commits sucesivos.
 */
export function ExegesisPage() {
    const { t } = useTranslation('exegesis');

    return (
        <div className="flex flex-col h-full bg-slate-50/50 dark:bg-zinc-950/50 font-sans overflow-y-auto">
            {/* Hero */}
            <div
                className="relative pt-14 pb-16 px-6 sm:px-12 lg:px-20 text-white overflow-hidden shrink-0"
                style={{ background: 'linear-gradient(to bottom, #0f172a, #1e293b, #0f172a)' }}
            >
                <div
                    className="absolute inset-0 opacity-[0.04]"
                    style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(16,185,129,0.3) 2px, rgba(16,185,129,0.3) 3px)' }}
                />
                <div className="absolute -top-32 -right-32 w-80 h-80 bg-emerald-600 rounded-full mix-blend-multiply filter blur-3xl opacity-10" />
                <div className="absolute -bottom-32 -left-16 w-72 h-72 bg-slate-600 rounded-full mix-blend-multiply filter blur-3xl opacity-20" />

                <div className="relative z-10 max-w-3xl mx-auto text-center">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-400/25 text-emerald-300 text-sm font-medium mb-5 backdrop-blur-sm">
                        <NotebookPen className="w-4 h-4" />
                        <span>{t('directory.badge')}</span>
                    </div>

                    <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-white mb-3 leading-tight font-serif drop-shadow-md">
                        {t('directory.heroTitle')}
                    </h1>
                    <p className="text-slate-300/80 mb-8 text-base leading-relaxed max-w-2xl mx-auto">
                        {t('directory.heroSubtitle')}
                    </p>

                    <div className="flex flex-col items-center gap-3">
                        <Button
                            disabled
                            className="bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-medium px-5 py-2.5 rounded-xl shadow-sm disabled:opacity-50"
                        >
                            <Plus className="h-4 w-4 mr-1.5" />
                            {t('directory.newPaperCta')}
                        </Button>
                        <p className="text-xs text-slate-400 max-w-md">
                            {t('directory.newPaperHint')}
                        </p>
                    </div>
                </div>
            </div>

            {/* Body */}
            <main className="flex-1 max-w-5xl mx-auto w-full px-6 py-10 space-y-8">
                <section>
                    <div className="flex items-center gap-2 mb-1">
                        <div className="w-1 h-5 rounded-full bg-emerald-500" />
                        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 font-serif">
                            {t('directory.papersTitle')}
                        </h2>
                    </div>
                    <p className="text-sm text-slate-500 dark:text-slate-400 pl-3 mb-6">
                        {t('directory.papersSubtitle')}
                    </p>

                    {/* Empty state — v1 no carga papers todavía */}
                    <div className="rounded-2xl border border-dashed border-slate-300 dark:border-zinc-700 bg-white/40 dark:bg-zinc-900/40 px-8 py-12 text-center">
                        <div className="mx-auto w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-300 flex items-center justify-center mb-4">
                            <NotebookPen className="h-6 w-6" />
                        </div>
                        <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100 mb-2">
                            {t('directory.empty.title')}
                        </h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto mb-5">
                            {t('directory.empty.body')}
                        </p>
                        <Button
                            disabled
                            variant="outline"
                            className="border-emerald-300 text-emerald-700 dark:border-emerald-700 dark:text-emerald-300 disabled:opacity-50"
                        >
                            <Sparkles className="h-4 w-4 mr-1.5" />
                            {t('directory.empty.cta')}
                        </Button>
                    </div>
                </section>

                {/* Coming-soon banner — comunicación honesta sobre el alcance de v1 */}
                <section className="rounded-2xl border border-amber-200 dark:border-amber-900/40 bg-amber-50/60 dark:bg-amber-950/20 p-5">
                    <div className="flex items-start gap-3">
                        <div className="shrink-0 w-9 h-9 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 flex items-center justify-center">
                            <Construction className="h-4.5 w-4.5" />
                        </div>
                        <div>
                            <h4 className="text-sm font-semibold text-amber-900 dark:text-amber-200 mb-1">
                                {t('directory.comingSoon.title')}
                            </h4>
                            <p className="text-sm text-amber-800/90 dark:text-amber-200/80 leading-relaxed">
                                {t('directory.comingSoon.body')}
                            </p>
                        </div>
                    </div>
                </section>
            </main>
        </div>
    );
}
