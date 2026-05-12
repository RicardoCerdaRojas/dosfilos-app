import { BookOpen, Plus, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Decorative product mockup of the Library panel. Shown in the landing page
 * carousel + the "Biblioteca" pillar section.
 *
 * NOTE: The slate / amber / emerald / indigo colour literals here are the
 * landing page's intentional monochromatic design language, not theme tokens.
 * Mockup copy is product-demonstration text (not real translatable user copy)
 * and intentionally remains as-is for visual fidelity.
 */
export function LibraryMock() {
    const books = [
        { title: 'Institución de la Religión Cristiana', author: 'Juan Calvino', pages: '1,462 págs', color: 'bg-amber-50 border-amber-200' },
        { title: 'Comentario Bíblico', author: 'Matthew Henry', pages: '6 tomos', color: 'bg-slate-100 border-slate-200' },
        { title: 'Teología Sistemática', author: 'Wayne Grudem', pages: '1,264 págs', color: 'bg-indigo-50 border-indigo-200' },
        { title: 'Gramática del Hebreo Bíblico', author: 'Gesenius-Kautzsch', pages: '622 págs', color: 'bg-slate-100 border-slate-200' },
        { title: 'Treasury of David', author: 'Charles Spurgeon', pages: '7 tomos', color: 'bg-emerald-50 border-emerald-200' },
        { title: 'La Ciudad de Dios', author: 'Agustín de Hipona', pages: '1,097 págs', color: 'bg-slate-100 border-slate-200' },
    ];
    return (
        <div className="rounded-xl border border-slate-200 bg-white shadow-[0_20px_50px_-20px_rgba(15,23,42,0.15)] overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 bg-slate-50/70">
                <div className="text-[13px] font-semibold text-slate-900 tracking-tight">Mi biblioteca</div>
                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-2 text-[12px] text-slate-500 border border-slate-200 rounded-md px-2.5 py-1 bg-white">
                        <Search className="h-3.5 w-3.5" />
                        Buscar en mi biblioteca…
                    </div>
                    <button className="flex items-center gap-1.5 text-[12px] font-medium bg-slate-900 text-white rounded-md px-2.5 py-1">
                        <Plus className="h-3.5 w-3.5" />
                        Subir
                    </button>
                </div>
            </div>
            <div className="p-5 grid grid-cols-2 md:grid-cols-3 gap-3">
                {books.map(b => (
                    <div key={b.title} className="group rounded-lg border border-slate-200 p-3 hover:border-slate-300 hover:shadow-sm transition-all bg-white">
                        <div className={cn('aspect-[4/3] rounded-md border mb-3 flex items-end p-2', b.color)}>
                            <BookOpen className="h-3.5 w-3.5 text-slate-500" />
                        </div>
                        <div className="text-[12.5px] font-medium text-slate-900 leading-tight truncate">{b.title}</div>
                        <div className="text-[11px] text-slate-500 mt-0.5 truncate">{b.author}</div>
                        <div className="text-[10.5px] text-slate-400 mt-1.5 font-mono">{b.pages}</div>
                    </div>
                ))}
            </div>
        </div>
    );
}
