import { useState } from 'react';
import { ChevronDown, ChevronUp, HelpCircle } from 'lucide-react';

interface Props {
    label?: string;
    /** Body content rendered when expanded. Markdown-light: passes JSX. */
    children: React.ReactNode;
    /** Optional 1-2 concrete examples rendered side-by-side under the body. */
    examples?: { title: string; body: React.ReactNode }[];
    /** Defaults closed; opens automatically when the user clicks the trigger. */
    defaultOpen?: boolean;
}

/**
 * Collapsible "what is this and how do I fill it?" panel reused across
 * every six-step component. Pastor sin formación seminarista necesita
 * guía contextual para cada paso; el experimentado lo colapsa una vez
 * y avanza.
 *
 * Wraps short prose + an optional grid of 1-2 examples so the pastor
 * sees a concrete shape of what their own entry should look like.
 */
export function StepHelp({ label, children, examples, defaultOpen = false }: Props) {
    const [open, setOpen] = useState(defaultOpen);
    const trigger = label ?? '¿Cómo lleno este paso? Ver guía rápida';
    return (
        <div>
            <button
                type="button"
                onClick={() => setOpen((o) => !o)}
                className="flex items-center gap-1.5 text-xs text-primary hover:underline"
            >
                <HelpCircle className="h-3.5 w-3.5" />
                {trigger}
                {open ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </button>
            {open && (
                <div className="border-l-2 border-primary/40 pl-4 py-2 mt-2 text-sm space-y-3 bg-muted/20 rounded-r-md">
                    <div className="space-y-2">{children}</div>
                    {examples && examples.length > 0 && (
                        <div className={`grid gap-3 ${examples.length > 1 ? 'md:grid-cols-2' : 'grid-cols-1'}`}>
                            {examples.map((ex) => (
                                <div key={ex.title} className="bg-card p-2 rounded border text-xs">
                                    <p className="font-medium mb-1">{ex.title}</p>
                                    <div className="text-muted-foreground space-y-1">{ex.body}</div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
