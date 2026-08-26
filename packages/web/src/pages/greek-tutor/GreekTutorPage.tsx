import React, { useState } from 'react';
import { BookOpenIcon, GraduationCapIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { GreekTutorProvider } from '../sermons/generator/exegesis/greek-tutor/GreekTutorProvider';
import { GreekTutorSessionView } from '../sermons/generator/exegesis/greek-tutor/GreekTutorSessionView';
import { GreekAnalyzerPage } from '../greek-analyzer/GreekAnalyzerPage';

type GreekMode = 'study' | 'analyzer';

/**
 * La puerta del módulo de griego, con DOS MODOS — el patrón que el hebreo ya
 * estableció (Analizador | Descubrimiento): una sola entrada en el menú, y
 * adentro se elige cómo estudiar.
 *
 * - **Analizador**: todo el material a la vista, versículo a versículo —
 *   texto, transliteración y morfología por palabra. Referencia de estudio.
 * - **Estudio guiado**: el tutor paso a paso que ya existía. Pedagogía.
 *
 * Son productos distintos y viven en módulos distintos; acá sólo se elige.
 * Abre en el analizador: es la vista de consulta, y quien viene a la sesión
 * guiada la elige una vez y el modo se conserva mientras la página viva.
 */
export const GreekTutorPage: React.FC = () => {
    const { t } = useTranslation('greekTutor');
    const [mode, setMode] = useState<GreekMode>('analyzer');

    const MODOS: { id: GreekMode; icon: typeof BookOpenIcon; labelKey: string; descKey: string }[] = [
        { id: 'analyzer', icon: BookOpenIcon, labelKey: 'modes.analyzer', descKey: 'modes.analyzerDesc' },
        { id: 'study', icon: GraduationCapIcon, labelKey: 'modes.study', descKey: 'modes.studyDesc' },
    ];

    return (
        <div className="flex flex-col h-full bg-background">
            <div className="shrink-0 border-b border-border px-4 py-2 flex items-center gap-1">
                {MODOS.map(({ id, icon: Icon, labelKey, descKey }) => (
                    <button
                        key={id}
                        type="button"
                        onClick={() => setMode(id)}
                        className={cn(
                            'flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm transition-colors',
                            mode === id
                                ? 'bg-background text-foreground border-border/60 shadow-sm'
                                : 'border-transparent text-muted-foreground hover:bg-muted/60',
                        )}
                    >
                        <Icon className="h-4 w-4" />
                        <span className="font-medium">{t(labelKey)}</span>
                        <span className="hidden md:inline text-xs text-muted-foreground">{t(descKey)}</span>
                    </button>
                ))}
            </div>

            <div className="flex-1 min-h-0">
                {mode === 'analyzer' ? (
                    <GreekAnalyzerPage />
                ) : (
                    <GreekTutorProvider>
                        <GreekTutorSessionView />
                    </GreekTutorProvider>
                )}
            </div>
        </div>
    );
};
