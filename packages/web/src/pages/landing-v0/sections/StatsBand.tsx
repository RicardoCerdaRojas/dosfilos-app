import { Reveal } from '../shared/Reveal';

const STATS = [
    { value: 'Ilimitadas', label: 'Consultas a tutores', sub: 'en el plan Team' },
    { value: '5', label: 'Especialistas entrenados', sub: 'para cada área del ministerio' },
    { value: '0', label: 'Entrenamientos con tu contenido', sub: 'garantía de privacidad' },
    { value: 'Página', label: 'Precisión de cita', sub: 'autor, título y página exacta' },
];

/** Dark stats band — visual breather between sections + key product metrics. */
export function StatsBand() {
    return (
        <section className="bg-slate-950 text-white py-20 md:py-24 px-6 lg:px-10 border-y border-white/5">
            <div className="max-w-[1280px] mx-auto">
                <div className="grid md:grid-cols-4 gap-px bg-white/5">
                    {STATS.map(({ value, label, sub }, idx) => (
                        <Reveal key={label} delay={idx * 80}>
                            <div className="bg-slate-950 p-8">
                                <div className="font-reading text-[28px] md:text-[36px] leading-none text-white mb-3 tracking-tight">
                                    {value}
                                </div>
                                <div className="text-[13px] text-slate-200 mb-1 font-medium">{label}</div>
                                <div className="text-[11.5px] text-slate-500">{sub}</div>
                            </div>
                        </Reveal>
                    ))}
                </div>
            </div>
        </section>
    );
}
