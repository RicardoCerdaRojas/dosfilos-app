import { Reveal } from '../shared/Reveal';

const STEPS = [
    {
        n: '01',
        title: 'Sube tus recursos',
        text: 'Importa tus libros y comentarios. El sistema extrae el contenido con páginas reales preservadas y lo indexa para consulta semántica.',
    },
    {
        n: '02',
        title: 'Consulta a los tutores',
        text: 'Pregunta en lenguaje natural. El sistema enruta al especialista adecuado y usa tu biblioteca como respaldo. Las respuestas citan fuentes precisas.',
    },
    {
        n: '03',
        title: 'Produce y exporta',
        text: 'Produce sermones, notas y material ministerial con respaldo exegético. Exporta en los formatos que necesites para el uso pastoral.',
    },
];

/** Three-step adoption explanation, anchored at #como-funciona. */
export function HowItWorks() {
    return (
        <section id="como-funciona" className="bg-white py-32 md:py-40 px-6 lg:px-10">
            <div className="max-w-[1280px] mx-auto">
                <Reveal>
                    <div className="max-w-2xl mb-16">
                        <div className="text-[11px] uppercase tracking-[0.2em] text-indigo-600 font-medium mb-4">
                            Cómo funciona
                        </div>
                        <h2 className="font-reading text-[36px] md:text-[52px] leading-[1.05] tracking-[-0.02em] text-slate-900">
                            Empieza en minutos, úsalo durante años.
                        </h2>
                    </div>
                </Reveal>

                <div className="grid md:grid-cols-3 gap-px bg-slate-200 border border-slate-200 rounded-xl overflow-hidden">
                    {STEPS.map(({ n, title, text }, idx) => (
                        <Reveal key={n} delay={idx * 100}>
                            <div className="bg-white p-8 md:p-10 h-full">
                                <div className="font-reading text-[52px] md:text-[64px] leading-none text-slate-300 tabular-nums font-light mb-6">
                                    {n}
                                </div>
                                <h3 className="text-[18px] font-semibold text-slate-900 mb-3 tracking-tight">{title}</h3>
                                <p className="text-[14.5px] text-slate-600 leading-[1.65]">{text}</p>
                            </div>
                        </Reveal>
                    ))}
                </div>
            </div>
        </section>
    );
}
