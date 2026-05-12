import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Reveal } from '../shared/Reveal';

const FAQ_ITEMS = [
    {
        q: '¿Preach escribe el sermón por mí?',
        a: 'No. Preach está diseñado para acompañar tu proceso de estudio, no para reemplazarlo. Puede ayudarte a organizar observaciones, consultar fuentes, estructurar bosquejos y preparar notas, pero el discernimiento, la evaluación teológica y la predicación siguen siendo responsabilidad del ministro.',
    },
    {
        q: '¿Puedo confiar en las respuestas?',
        a: 'Preach reduce la opacidad común de las herramientas de IA respondiendo con referencias trazables cada vez que consulta tu biblioteca o los recursos disponibles: autor, título y página. Aun así, toda respuesta debe ser revisada por el usuario, especialmente en temas doctrinales, exegéticos o pastoralmente sensibles.',
    },
    {
        q: '¿Qué significa que el sistema tiene citas con estándar académico?',
        a: 'Cada respuesta del tutor cita sus fuentes indicando autor, título y página exacta. La referencia es rastreable al documento original que tú subiste o que vive en la biblioteca especializada. La bibliografía completa aparece al pie de cada consulta.',
    },
    {
        q: '¿Pueden usar mi contenido para entrenar modelos de IA?',
        a: 'No. Tu biblioteca personal es privada, aislada por usuario y nunca se usa para entrenar modelos. El modelo que consulta tu contenido lo hace solo en el momento de responder tu pregunta; no persiste esa información fuera de tu cuenta.',
    },
    {
        q: '¿Qué puedo subir a mi biblioteca personal?',
        a: 'Material del que poseas los derechos legales: libros que hayas comprado (incluyendo ediciones digitales), material de dominio público, o texto con licencia que permita uso personal. Al subir declaras que tienes el derecho de usar ese material para tu estudio personal.',
    },
    {
        q: '¿Qué incluye la biblioteca especializada?',
        a: 'Obras de dominio público y material con licencia explícita: comentarios clásicos (Calvino, Henry, Spurgeon, Agustín), léxicos académicos (Gesenius, Thayer, Strong), gramáticas y tratados patrísticos. Todo este material es citable públicamente.',
    },
    {
        q: '¿Cómo funciona el enrutamiento de tutores?',
        a: 'Cuando haces una pregunta, un enrutador analiza el contenido y elige automáticamente al especialista adecuado. Si detecta una pregunta interdisciplinaria, puede consultar a varios tutores y sintetizar la respuesta manteniendo la atribución.',
    },
    {
        q: '¿Qué pasa cuando termina el trial de 30 días?',
        a: 'Si no cancelas antes del día 30, se cobra automáticamente el primer mes del plan que elegiste. Puedes cancelar en cualquier momento desde tu cuenta sin letra chica. Si cancelas durante el trial, no se cobra nada.',
    },
];

interface FAQItemProps {
    q: string;
    a: string;
}

function FAQItem({ q, a }: FAQItemProps) {
    const [open, setOpen] = useState(false);
    return (
        <div>
            <button
                type="button"
                onClick={() => setOpen(!open)}
                className="w-full flex items-start justify-between gap-6 py-6 text-left group"
            >
                <span className="font-reading text-[19px] md:text-[21px] text-slate-900 tracking-tight leading-snug">
                    {q}
                </span>
                <ChevronDown
                    className={cn(
                        'h-5 w-5 shrink-0 text-slate-400 mt-1 transition-transform',
                        open && 'rotate-180'
                    )}
                />
            </button>
            <div
                className={cn(
                    'overflow-hidden transition-all',
                    open ? 'max-h-96 pb-6' : 'max-h-0'
                )}
            >
                <p className="text-[15.5px] text-slate-600 leading-[1.65] max-w-3xl">{a}</p>
            </div>
        </div>
    );
}

/** FAQ accordion section, anchored at #faq. */
export function FAQ() {
    return (
        <section id="faq" className="bg-white py-28 md:py-36 px-6 lg:px-10 border-t border-slate-200">
            <div className="max-w-[960px] mx-auto">
                <Reveal>
                    <div className="max-w-2xl mb-12">
                        <div className="text-[11px] uppercase tracking-[0.2em] text-indigo-600 font-medium mb-4">
                            Preguntas frecuentes
                        </div>
                        <h2 className="font-reading text-[36px] md:text-[52px] leading-[1.05] tracking-[-0.02em] text-slate-900">
                            Lo que probablemente te estás preguntando.
                        </h2>
                    </div>
                </Reveal>

                <div className="divide-y divide-slate-200 border-t border-b border-slate-200">
                    {FAQ_ITEMS.map((it, idx) => (
                        <FAQItem key={idx} q={it.q} a={it.a} />
                    ))}
                </div>
            </div>
        </section>
    );
}
