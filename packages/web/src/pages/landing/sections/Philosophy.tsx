import { Reveal } from '../shared/Reveal';

/** Philosophy / mission statement section — anchored at #filosofia. */
export function Philosophy() {
    return (
        <section id="filosofia" className="bg-white py-32 md:py-40 px-6 lg:px-10">
            <div className="max-w-[960px] mx-auto">
                <Reveal>
                    <div className="text-[11px] uppercase tracking-[0.2em] text-indigo-600 font-medium mb-8">
                        Origen
                    </div>

                    <h2 className="font-reading text-[36px] md:text-[52px] lg:text-[64px] leading-[1.05] tracking-[-0.02em] text-slate-900 mb-12 max-w-3xl">
                        Creado desde la intersección entre teología, predicación y tecnología.
                    </h2>

                    <div className="max-w-2xl text-[17px] md:text-[19px] text-slate-600 leading-[1.65] space-y-6">
                        <p>
                            Preach nace del trabajo de un pastor, teólogo y desarrollador de software
                            que conoce tanto las exigencias del ministerio como los desafíos técnicos
                            de construir herramientas confiables.
                        </p>
                        <p>
                            La plataforma fue diseñada para apoyar el estudio bíblico serio, la
                            predicación expositiva y la formación teológica —no para reemplazar la
                            responsabilidad espiritual del predicador. La tecnología sirve a la
                            preparación; no la suplanta.
                        </p>
                        <p className="text-[14px] text-slate-500 italic">
                            Desarrollado por un pastor con formación en The Master's Seminary.
                        </p>
                    </div>

                    <div className="mt-16 border-t border-slate-200 pt-10 max-w-2xl">
                        <blockquote className="font-reading text-[22px] md:text-[28px] leading-[1.35] tracking-tight text-slate-900 italic">
                            "A fin de perfeccionar a los santos para la obra del ministerio,
                            para la edificación del cuerpo de Cristo."
                        </blockquote>
                        <cite className="not-italic block mt-4 text-[12px] uppercase tracking-[0.2em] text-slate-500 font-medium">
                            Efesios 4:12
                        </cite>
                    </div>
                </Reveal>
            </div>
        </section>
    );
}
