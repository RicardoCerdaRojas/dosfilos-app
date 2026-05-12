import { Reveal } from '../shared/Reveal';

/** Philosophy / mission statement section — anchored at #filosofia. */
export function Philosophy() {
    return (
        <section id="filosofia" className="bg-white py-32 md:py-40 px-6 lg:px-10">
            <div className="max-w-[1100px] mx-auto">
                <Reveal>
                    <div className="text-[11px] uppercase tracking-[0.2em] text-indigo-600 font-medium mb-8">
                        Principios
                    </div>

                    <h2 className="font-reading text-[36px] md:text-[52px] lg:text-[64px] leading-[1.05] tracking-[-0.02em] text-slate-900 mb-12 max-w-3xl">
                        Construido sobre los principios que el estudio bíblico serio exige.
                    </h2>

                    <div className="max-w-2xl text-[17px] md:text-[19px] text-slate-600 leading-[1.65] mb-16">
                        <p>
                            Preach no es una IA generalista adaptada al cristianismo. Está
                            diseñada desde el principio para sostener un trabajo bíblico,
                            teológico y pastoral con estándares verificables.
                        </p>
                    </div>
                </Reveal>

                <div className="grid md:grid-cols-2 gap-px bg-slate-200 border border-slate-200 rounded-xl overflow-hidden mb-16">
                    {[
                        {
                            title: 'Metodología histórico-gramatical',
                            text: 'Las respuestas, tutores y prompts están alineados con la exégesis seria: contexto histórico, gramática del texto original, intención autoral y aplicación responsable. No relativismo hermenéutico.',
                        },
                        {
                            title: 'Citas trazables como estándar',
                            text: 'Cada respuesta que consulta tu biblioteca o el corpus especializado devuelve autor, título y página exacta. Nunca afirma algo respaldado por una fuente sin permitirte verificarla.',
                        },
                        {
                            title: 'Transparencia sobre el uso de IA',
                            text: 'Cuando un tutor responde desde el modelo y no desde un documento, lo indica. No presentamos opiniones generadas como si fueran citas académicas. La distinción importa.',
                        },
                        {
                            title: 'Responsabilidad pastoral preservada',
                            text: 'El discernimiento doctrinal, la evaluación exegética y la predicación siguen siendo del ministro. La plataforma asiste el proceso; no sustituye la formación, el estudio personal ni el llamado.',
                        },
                    ].map(({ title, text }, idx) => (
                        <Reveal key={title} delay={idx * 80}>
                            <div className="bg-white p-8 h-full">
                                <h3 className="font-reading text-[22px] text-slate-900 mb-3 tracking-tight">
                                    {title}
                                </h3>
                                <p className="text-[14.5px] text-slate-600 leading-[1.65]">
                                    {text}
                                </p>
                            </div>
                        </Reveal>
                    ))}
                </div>

                <Reveal>
                    <div className="border-t border-slate-200 pt-10 max-w-2xl">
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
