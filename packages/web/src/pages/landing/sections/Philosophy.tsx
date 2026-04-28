import { Reveal } from '../shared/Reveal';

/** Philosophy / mission statement section — anchored at #filosofia. */
export function Philosophy() {
    return (
        <section id="filosofia" className="bg-white py-32 md:py-40 px-6 lg:px-10">
            <div className="max-w-[960px] mx-auto">
                <Reveal>
                    <div className="text-[11px] uppercase tracking-[0.2em] text-indigo-600 font-medium mb-8">
                        Filosofía
                    </div>

                    <h2 className="font-reading text-[36px] md:text-[52px] lg:text-[64px] leading-[1.05] tracking-[-0.02em] text-slate-900 mb-12 max-w-3xl">
                        El conocimiento al servicio del llamado.
                    </h2>

                    <div className="max-w-2xl text-[17px] md:text-[19px] text-slate-600 leading-[1.65] space-y-6">
                        <p>
                            Antes de ser una plataforma de inteligencia artificial, somos un sistema de gestión
                            del conocimiento teológico: tu biblioteca, tus notas, tu estudio de lenguas y tu material
                            ministerial, todo conectado y accesible cuando lo necesites.
                        </p>
                        <p>
                            La tecnología que usamos es poderosa, pero su rol es servir tu preparación, no suplantarla.
                            Creemos firmemente en la misión suprema del ministro: ser enteramente preparado para toda buena obra
                            —fruto del estudio serio, la comunión con Dios y la meditación fiel de las Escrituras.
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
