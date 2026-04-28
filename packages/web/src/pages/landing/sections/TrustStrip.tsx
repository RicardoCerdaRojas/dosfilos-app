/** Author marquee — curated authors trusted by the platform's library. */
const AUTHORS = [
    'Juan Calvino',
    'Matthew Henry',
    'Charles Spurgeon',
    'Agustín de Hipona',
    'Juan Crisóstomo',
    'Gesenius',
    'Wayne Grudem',
    'Herman Bavinck',
];

export function TrustStrip() {
    return (
        <section className="border-y border-slate-200 bg-white py-10">
            <div className="max-w-[1400px] mx-auto px-6 lg:px-10">
                <div className="text-center text-[11px] uppercase tracking-[0.18em] text-slate-500 mb-6">
                    Biblioteca curada — dominio público y material licenciado
                </div>
                <div className="flex flex-wrap justify-center items-center gap-x-10 gap-y-3">
                    {AUTHORS.map(a => (
                        <span key={a} className="font-reading text-[15px] md:text-[17px] text-slate-400 italic tracking-tight">
                            {a}
                        </span>
                    ))}
                </div>
            </div>
        </section>
    );
}
