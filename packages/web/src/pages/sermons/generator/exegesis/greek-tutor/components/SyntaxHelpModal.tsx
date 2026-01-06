import React from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ClauseType } from '@dosfilos/domain';
import { BookOpen, Map, Palette } from 'lucide-react';

interface SyntaxHelpModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

/**
 * SyntaxHelpModal - Contextual help for Syntax Analysis
 * 
 * Provides 3 tabs of help content:
 * 1. Purpose: What is syntax analysis and why use it
 * 2. How to Read: Step-by-step guide
 * 3. Color Guide: Legend of clause types
 */
export function SyntaxHelpModal({ open, onOpenChange }: SyntaxHelpModalProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <BookOpen className="w-5 h-5 text-blue-600" />
                        Guía de Estructura Sintáctica
                    </DialogTitle>
                    <DialogDescription>
                        Aprende a interpretar el análisis sintáctico de pasajes griegos
                    </DialogDescription>
                </DialogHeader>

                <Tabs defaultValue="purpose" className="mt-4">
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="purpose">¿Para Qué?</TabsTrigger>
                        <TabsTrigger value="how">Cómo Leerlo</TabsTrigger>
                        <TabsTrigger value="colors">Colores</TabsTrigger>
                    </TabsList>

                    {/* Tab 1: Purpose */}
                    <TabsContent value="purpose" className="space-y-4 mt-4">
                        <div className="space-y-3">
                            <h3 className="font-semibold text-lg flex items-center gap-2">
                                <Map className="w-4 h-4 text-blue-600" />
                                ¿Para Qué Sirve Esta Herramienta?
                            </h3>
                            
                            <p className="text-sm text-gray-700 leading-relaxed">
                                El análisis sintáctico te ayuda a entender <strong>la estructura</strong> del argumento 
                                antes de estudiar palabras individuales. Es como ver el plano de un edificio antes de 
                                inspeccionar cada ladrillo.
                            </p>

                            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                                <h4 className="font-medium text-sm text-red-900 mb-2">❌ Sin Sintaxis (Enfoque en palabras)</h4>
                                <div className="text-xs text-red-800 space-y-1 font-mono">
                                    <div>παρακαλῶ = "exhorto"</div>
                                    <div>ὑμᾶς = "a vosotros"</div>
                                    <div>παραστῆσαι = "presentar"</div>
                                    <div className="text-red-600 mt-2">❓ ¿Cómo se relacionan estas palabras?</div>
                                </div>
                            </div>

                            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                                <h4 className="font-medium text-sm text-green-900 mb-2">✅ Con Sintaxis (Enfoque en estructura)</h4>
                                <div className="text-xs text-green-800 space-y-1">
                                    <div className="flex items-start gap-2">
                                        <span className="font-bold">1.</span>
                                        <span>Pablo <strong>EXHORTA</strong> (cláusula principal)</span>
                                    </div>
                                    <div className="flex items-start gap-2 ml-4">
                                        <span className="font-bold">└─ 2.</span>
                                        <span>A <strong>PRESENTAR</strong> cuerpos (objeto de la exhortación)</span>
                                    </div>
                                    <div className="flex items-start gap-2 ml-8">
                                        <span className="font-bold">└─ 3.</span>
                                        <span><strong>PARA</strong> ser transformados (propósito)</span>
                                    </div>
                                    <div className="text-green-600 font-medium mt-2">✅ Ahora ves el FLUJO del argumento</div>
                                </div>
                            </div>

                            <p className="text-sm text-gray-700 leading-relaxed">
                                Esta metodología es usada por comentaristas serios y profesores de griego 
                                (Wallace, Stagg, etc.) porque <strong>el orden de las cláusulas revela la lógica del autor</strong>.
                            </p>
                        </div>
                    </TabsContent>

                    {/* Tab 2: How to Read */}
                    <TabsContent value="how" className="space-y-4 mt-4">
                        <div className="space-y-4">
                            <h3 className="font-semibold text-lg">📖 Cómo Leer el Análisis (3 Pasos)</h3>

                            <div className="space-y-3">
                                <div className="border-l-4 border-blue-500 pl-4 py-2">
                                    <h4 className="font-semibold text-blue-900 flex items-center gap-2">
                                        <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-sm font-bold">1</span>
                                        Lee la Caja Azul Primero
                                    </h4>
                                    <p className="text-sm text-gray-700 mt-1">
                                        La <strong>"Descripción General"</strong> (caja azul arriba) te da el panorama completo del argumento. 
                                        Lee esto antes de mirar cláusulas individuales.
                                    </p>
                                    <div className="mt-2 text-xs text-gray-600 italic">
                                        💡 Pregunta: "¿Cuál es la idea principal de este pasaje?"
                                    </div>
                                </div>

                                <div className="border-l-4 border-green-500 pl-4 py-2">
                                    <h4 className="font-semibold text-green-900 flex items-center gap-2">
                                        <span className="flex items-center justify-center w-6 h-6 rounded-full bg-green-100 text-green-700 text-sm font-bold">2</span>
                                        Identifica las Cláusulas Principales (Azules)
                                    </h4>
                                    <p className="text-sm text-gray-700 mt-1">
                                        Las cláusulas con fondo <strong>azul</strong> son las <strong>principales</strong> - 
                                        la espina dorsal del texto. Identifica su verbo principal y sujeto.
                                    </p>
                                    <div className="mt-2 text-xs text-gray-600 italic">
                                        💡 Tip: Usa "Colapsar Todo" para ver solo las principales primero
                                    </div>
                                </div>

                                <div className="border-l-4 border-purple-500 pl-4 py-2">
                                    <h4 className="font-semibold text-purple-900 flex items-center gap-2">
                                        <span className="flex items-center justify-center w-6 h-6 rounded-full bg-purple-100 text-purple-700 text-sm font-bold">3</span>
                                        Expande las Subordinadas
                                    </h4>
                                    <p className="text-sm text-gray-700 mt-1">
                                        Las cláusulas <strong>indentadas</strong> son subordinadas - dependen de la principal. 
                                        El color te dice su función (propósito, causa, etc.).
                                    </p>
                                    <div className="mt-2 text-xs text-gray-600 italic">
                                        💡 Pregunta: "¿Cómo esta cláusula modifica la principal?"
                                    </div>
                                </div>
                            </div>

                            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                                <p className="text-sm font-medium text-amber-900">
                                    ⚡ Consejo Rápido
                                </p>
                                <p className="text-xs text-amber-800 mt-1">
                                    No te abrumes. Empieza con las principales (azules) y expande de a poco. 
                                    El objetivo es ver <strong>cómo fluye el argumento</strong>, no memorizar cada detalle.
                                </p>
                            </div>
                        </div>
                    </TabsContent>

                    {/* Tab 3: Color Guide */}
                    <TabsContent value="colors" className="space-y-4 mt-4">
                        <div className="space-y-3">
                            <h3 className="font-semibold text-lg flex items-center gap-2">
                                <Palette className="w-4 h-4 text-blue-600" />
                                Guía de Colores (Tipos de Cláusulas)
                            </h3>

                            <p className="text-sm text-gray-700">
                                Cada color representa un tipo de cláusula con una función específica:
                            </p>

                            <div className="space-y-2">
                                <ClauseTypeRow
                                    color="bg-blue-100"
                                    label="Principal"
                                    connector="(ninguno)"
                                    function="Idea principal, independiente. La espina dorsal del pasaje."
                                />
                                <ClauseTypeRow
                                    color="bg-green-100"
                                    label="Propósito (ἵνα)"
                                    connector="ἵνα, ὥστε"
                                    function="Expresa el propósito o finalidad de la acción principal."
                                />
                                <ClauseTypeRow
                                    color="bg-orange-100"
                                    label="Causal (ὅτι, γάρ)"
                                    connector="ὅτι, διότι, γάρ"
                                    function="Explica la razón o causa de la acción."
                                />
                                <ClauseTypeRow
                                    color="bg-purple-100"
                                    label="Temporal (ὅτε)"
                                    connector="ὅτε, ὡς, ἕως"
                                    function="Indica cuándo ocurre la acción."
                                />
                                <ClauseTypeRow
                                    color="bg-yellow-100"
                                    label="Resultado (ὥστε)"
                                    connector="ὥστε, ὡς"
                                    function="Muestra el resultado o consecuencia."
                                />
                                <ClauseTypeRow
                                    color="bg-red-100"
                                    label="Condicional (εἰ)"
                                    connector="εἰ, ἐάν"
                                    function="Presenta una condición ('si...')."
                                />
                                <ClauseTypeRow
                                    color="bg-teal-100"
                                    label="Participial"
                                    connector="(participio)"
                                    function="Construida alrededor de un participio. Modifica o describe."
                                />
                                <ClauseTypeRow
                                    color="bg-indigo-100"
                                    label="Infinitival"
                                    connector="(infinitivo)"
                                    function="Construida alrededor de un infinitivo. Suele ser objeto directo."
                                />
                                <ClauseTypeRow
                                    color="bg-pink-100"
                                    label="Relativa (ὅς)"
                                    connector="ὅς, ἥ, ὅ"
                                    function="Introduce una cláusula relativa ('que', 'quien')."
                                />
                            </div>

                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-4">
                                <p className="text-sm font-medium text-blue-900">
                                    💡 ¿Cómo usar esto?
                                </p>
                                <p className="text-xs text-blue-800 mt-1">
                                    El <strong>color</strong> te dice inmediatamente <strong>qué función</strong> tiene esa cláusula 
                                    en el argumento. Busca patrones: ¿Muchas verdes? → Texto orientado a propósitos/metas.
                                </p>
                            </div>
                        </div>
                    </TabsContent>
                </Tabs>
            </DialogContent>
        </Dialog>
    );
}

/**
 * Helper component for displaying clause type rows in color guide
 */
function ClauseTypeRow({ 
    color, 
    label, 
    connector, 
    function: func 
}: { 
    color: string; 
    label: string; 
    connector: string; 
    function: string;
}) {
    return (
        <div className="flex items-start gap-3 p-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
            <div className={`w-4 h-4 rounded-full ${color} border border-gray-300 flex-shrink-0 mt-0.5`} />
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm">{label}</span>
                    <span className="text-xs text-gray-500 font-mono">{connector}</span>
                </div>
                <p className="text-xs text-gray-600 mt-0.5">{func}</p>
            </div>
        </div>
    );
}
