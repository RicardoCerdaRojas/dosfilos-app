import { useEffect, useState } from 'react';
import { AIProject, ProjectColor } from '@dosfilos/domain';
import { useFacultyProjects } from '@/hooks/faculty/useFacultyProjects';
import { Sparkles, Loader2 } from 'lucide-react';

const COLOR_OPTIONS: { value: ProjectColor; label: string; bg: string; ring: string }[] = [
    { value: 'amber',   label: 'Ámbar',    bg: 'bg-amber-500',   ring: 'ring-amber-500' },
    { value: 'emerald', label: 'Esmeralda', bg: 'bg-emerald-500', ring: 'ring-emerald-500' },
    { value: 'sky',     label: 'Azul',      bg: 'bg-sky-500',     ring: 'ring-sky-500' },
    { value: 'rose',    label: 'Rosa',      bg: 'bg-rose-500',    ring: 'ring-rose-500' },
    { value: 'violet',  label: 'Violeta',   bg: 'bg-violet-500',  ring: 'ring-violet-500' },
    { value: 'slate',   label: 'Pizarra',   bg: 'bg-slate-500',   ring: 'ring-slate-500' },
    { value: 'orange',  label: 'Naranja',   bg: 'bg-orange-500',  ring: 'ring-orange-500' },
    { value: 'teal',    label: 'Teal',      bg: 'bg-teal-500',    ring: 'ring-teal-500' },
];

interface ProjectEditDialogProps {
    /** If provided, we are editing an existing project. Otherwise creating. */
    project?: AIProject;
    onClose: () => void;
}

export function ProjectEditDialog({ project, onClose }: ProjectEditDialogProps) {
    const [title, setTitle] = useState(project?.title || '');
    const [color, setColor] = useState<ProjectColor>(project?.color || 'amber');
    const [contextNote, setContextNote] = useState(project?.contextNote || '');

    const { createProject, updateProject, generateContext } = useFacultyProjects();

    const isEditing = !!project;
    const isLoading = createProject.isPending || updateProject.isPending;
    const isGenerating = generateContext.isPending;

    // Sync state when switching between create/edit
    useEffect(() => {
        setTitle(project?.title || '');
        setColor(project?.color || 'amber');
        setContextNote(project?.contextNote || '');
    }, [project]);

    const [error, setError] = useState<string | null>(null);

    const handleSave = async () => {
        if (!title.trim()) return;
        setError(null);
        try {
            if (isEditing) {
                await updateProject.mutateAsync({ projectId: project.id, title, color, contextNote: contextNote || undefined });
            } else {
                await createProject.mutateAsync({ title, color, contextNote: contextNote || undefined });
            }
            onClose();
        } catch (err: any) {
            console.error('Error saving project:', err);
            setError(err?.message || 'Ocurrió un error al guardar el proyecto.');
        }
    };


    const handleGenerateContext = async () => {
        if (!project) return; // Can only generate from sessions if the project exists
        const suggested = await generateContext.mutateAsync(project.id);
        setContextNote(suggested);
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
            <div className="relative w-full max-w-md bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-zinc-700 p-6 mx-4">
                <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-5">
                    {isEditing ? 'Editar proyecto' : 'Nuevo proyecto'}
                </h2>

                {/* Title */}
                <label className="block mb-4">
                    <span className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-1.5 block">Nombre del proyecto</span>
                    <input
                        type="text"
                        value={title}
                        onChange={e => setTitle(e.target.value)}
                        placeholder="Ej: Serie: El Sermón del Monte"
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-800 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 placeholder:text-slate-400"
                        maxLength={60}
                        autoFocus
                    />
                </label>

                {/* Color picker */}
                <div className="mb-4">
                    <span className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-2 block">Color</span>
                    <div className="flex flex-wrap gap-2">
                        {COLOR_OPTIONS.map(opt => (
                            <button
                                key={opt.value}
                                type="button"
                                title={opt.label}
                                onClick={() => setColor(opt.value)}
                                className={`w-7 h-7 rounded-full transition-all ${opt.bg} ${color === opt.value ? `ring-2 ring-offset-2 ${opt.ring}` : 'opacity-60 hover:opacity-100'}`}
                            />
                        ))}
                    </div>
                </div>

                {/* contextNote */}
                <div className="mb-6">
                    <div className="flex items-center justify-between mb-1.5">
                        <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Contexto del proyecto</span>
                        {isEditing && (
                            <button
                                type="button"
                                onClick={handleGenerateContext}
                                disabled={isGenerating}
                                className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-300 disabled:opacity-50 transition-colors"
                            >
                                {isGenerating
                                    ? <><Loader2 className="w-3 h-3 animate-spin" /> Generando...</>
                                    : <><Sparkles className="w-3 h-3" /> Generar desde sesiones</>
                                }
                            </button>
                        )}
                    </div>
                    <textarea
                        value={contextNote}
                        onChange={e => setContextNote(e.target.value)}
                        placeholder="Descripción opcional: audiencia, nivel teológico, objetivo... El orquestador la usará en cada sesión de este proyecto."
                        rows={3}
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-800 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 placeholder:text-slate-400 resize-none"
                        maxLength={400}
                    />
                    <p className="text-xs text-slate-400 mt-1 text-right">{contextNote.length}/400</p>
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-3">
                    {error && (
                        <p className="text-xs text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/20 rounded-lg px-3 py-2 border border-rose-200 dark:border-rose-800">
                            {error}
                        </p>
                    )}
                    <div className="flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-sm rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="button"
                            onClick={handleSave}
                            disabled={!title.trim() || isLoading}
                            className="px-4 py-2 text-sm rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            {isLoading ? 'Guardando...' : isEditing ? 'Guardar cambios' : 'Crear proyecto'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
