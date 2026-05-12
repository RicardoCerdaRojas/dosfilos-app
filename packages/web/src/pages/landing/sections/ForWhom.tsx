import { Reveal } from '../shared/Reveal';

const PERSONAS = [
    {
        title: 'Pastores y predicadores',
        text: 'Para preparar sermones expositivos semana a semana con respaldo bíblico, orden de estudio y fuentes trazables.',
    },
    {
        title: 'Seminaristas',
        text: 'Para trabajos exegéticos, investigación académica, idiomas bíblicos y organización de fuentes.',
    },
    {
        title: 'Profesores de teología',
        text: 'Para preparar clases, apuntes, guías y material didáctico con estructura y profundidad.',
    },
    {
        title: 'Consejeros pastorales',
        text: 'Para pensar casos desde la Escritura, la teología práctica y la aplicación pastoral responsable.',
    },
];

/** Persona-targeting section — who the platform is built for. */
export function ForWhom() {
    return (
        <section className="bg-white py-28 md:py-32 px-6 lg:px-10 border-t border-slate-200">
            <div className="max-w-[1280px] mx-auto">
                <Reveal>
                    <div className="max-w-2xl mb-16">
                        <div className="text-[11px] uppercase tracking-[0.2em] text-indigo-600 font-medium mb-4">
                            Para quién es
                        </div>
                        <h2 className="font-reading text-[36px] md:text-[52px] leading-[1.05] tracking-[-0.02em] text-slate-900">
                            Hecho para quienes sirven con la Palabra.
                        </h2>
                    </div>
                </Reveal>

                <div className="grid md:grid-cols-2 gap-px bg-slate-200 border border-slate-200 rounded-xl overflow-hidden">
                    {PERSONAS.map(({ title, text }, idx) => (
                        <Reveal key={title} delay={idx * 80}>
                            <div className="bg-white p-8 h-full">
                                <h3 className="font-reading text-[22px] text-slate-900 mb-3 tracking-tight">{title}</h3>
                                <p className="text-[14.5px] text-slate-600 leading-[1.65]">{text}</p>
                            </div>
                        </Reveal>
                    ))}
                </div>
            </div>
        </section>
    );
}
