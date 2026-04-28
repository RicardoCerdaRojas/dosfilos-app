import { cn } from '@/lib/utils';

/**
 * Decorative tutor-routing mockup. See `LibraryMock` for notes on the landing
 * page colour palette as documented exception.
 */
export function TutorsMock() {
    const tutors = [
        { name: 'Dr. Alétheia', area: 'Exégesis', active: true },
        { name: 'Dr. Berith', area: 'Hebreo · AT' },
        { name: 'Dr. Crisóstomo', area: 'Griego · NT' },
        { name: 'Pastor Noutético', area: 'Consejería' },
        { name: 'Dr. Calvino', area: 'Teología sistemática' },
    ];
    return (
        <div className="rounded-xl border border-slate-200 bg-white shadow-[0_20px_50px_-20px_rgba(15,23,42,0.15)] overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 bg-slate-50/70">
                <div className="text-[13px] font-semibold text-slate-900 tracking-tight">Enrutamiento automático</div>
                <div className="flex items-center gap-1.5 text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    Activo
                </div>
            </div>
            <div className="p-5 space-y-2">
                <div className="text-[11px] uppercase tracking-wider text-slate-500 mb-3">Tu pregunta</div>
                <div className="rounded-lg bg-slate-50 border border-slate-200 px-3.5 py-2.5 text-[13px] text-slate-700 mb-5">
                    ¿Cómo se interpreta exegéticamente <span className="text-emerald-600 underline decoration-dotted decoration-emerald-400/50">Juan 1:1</span> a la luz del griego original?
                </div>

                <div className="text-[11px] uppercase tracking-wider text-slate-500 mb-3">Tutores disponibles</div>
                {tutors.map(t => (
                    <div
                        key={t.name}
                        className={cn(
                            'flex items-center justify-between rounded-lg border px-4 py-3 transition-colors',
                            t.active
                                ? 'border-indigo-300 bg-indigo-50/60 ring-1 ring-indigo-200/50'
                                : 'border-slate-200 bg-white'
                        )}
                    >
                        <div className="flex items-center gap-3">
                            <div className={cn(
                                'h-8 w-8 rounded-full flex items-center justify-center text-[11px] font-semibold tracking-tight',
                                t.active ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'
                            )}>
                                {t.name.split(' ').map(w => w[0]).slice(0, 2).join('')}
                            </div>
                            <div>
                                <div className={cn('text-[13px] font-medium', t.active ? 'text-slate-900' : 'text-slate-700')}>{t.name}</div>
                                <div className="text-[11px] text-slate-500">{t.area}</div>
                            </div>
                        </div>
                        {t.active && (
                            <div className="text-[11px] font-medium text-indigo-700 bg-white border border-indigo-200 rounded-full px-2 py-0.5">
                                Enrutado
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
