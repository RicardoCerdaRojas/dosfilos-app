import { cn } from '@/lib/utils';
import { useTranslation } from '@/i18n';

/**
 * Decorative tutor-routing mockup. See `LibraryMock` for notes on the landing
 * page colour palette as documented exception.
 */
export function TutorsMock() {
    const { t } = useTranslation('landing');
    const tutorMeta = [
        { name: 'Dr. Alétheia', active: true },
        { name: 'Dr. Berith', active: false },
        { name: 'Dr. Crisóstomo', active: false },
        { name: 'Pastor Noutético', active: false },
        { name: 'Dr. Calvino', active: false },
    ];
    const areas = t('mocks.tutors.areas', { returnObjects: true }) as string[];
    const tutors = tutorMeta.map((tutor, i) => ({ ...tutor, area: areas[i] }));
    return (
        <div className="rounded-xl border border-slate-200 bg-white shadow-[0_20px_50px_-20px_rgba(15,23,42,0.15)] overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 bg-slate-50/70">
                <div className="text-[13px] font-semibold text-slate-900 tracking-tight">{t('mocks.tutors.title')}</div>
                <div className="flex items-center gap-1.5 text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    {t('mocks.tutors.active')}
                </div>
            </div>
            <div className="p-5 space-y-2">
                <div className="text-[11px] uppercase tracking-wider text-slate-500 mb-3">{t('mocks.tutors.questionLabel')}</div>
                <div className="rounded-lg bg-slate-50 border border-slate-200 px-3.5 py-2.5 text-[13px] text-slate-700 mb-5">
                    {t('mocks.tutors.questionBefore')} <span className="text-emerald-600 underline decoration-dotted decoration-emerald-400/50">{t('mocks.tutors.questionRef')}</span> {t('mocks.tutors.questionAfter')}
                </div>

                <div className="text-[11px] uppercase tracking-wider text-slate-500 mb-3">{t('mocks.tutors.available')}</div>
                {tutors.map(tutor => (
                    <div
                        key={tutor.name}
                        className={cn(
                            'flex items-center justify-between rounded-lg border px-4 py-3 transition-colors',
                            tutor.active
                                ? 'border-indigo-300 bg-indigo-50/60 ring-1 ring-indigo-200/50'
                                : 'border-slate-200 bg-white'
                        )}
                    >
                        <div className="flex items-center gap-3">
                            <div className={cn(
                                'h-8 w-8 rounded-full flex items-center justify-center text-[11px] font-semibold tracking-tight',
                                tutor.active ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'
                            )}>
                                {tutor.name.split(' ').map(w => w[0]).slice(0, 2).join('')}
                            </div>
                            <div>
                                <div className={cn('text-[13px] font-medium', tutor.active ? 'text-slate-900' : 'text-slate-700')}>{tutor.name}</div>
                                <div className="text-[11px] text-slate-500">{tutor.area}</div>
                            </div>
                        </div>
                        {tutor.active && (
                            <div className="text-[11px] font-medium text-indigo-700 bg-white border border-indigo-200 rounded-full px-2 py-0.5">
                                {t('mocks.tutors.routed')}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
