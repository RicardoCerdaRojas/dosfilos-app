import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Save, Trash2, Library } from 'lucide-react';
import { useTutor, useCreateTutor, useUpdateTutor, useDeleteTutor, useCoreLibraryStores } from '@/hooks/admin/useTutors';
import type { LocalizedString } from '@dosfilos/domain';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

/**
 * Bilingual tutor editor. Each authored field is stored as `{ es, en }` in
 * Firestore (Phase 1 of the i18n overhaul). The form keeps the variants in
 * separate flat fields and assembles the localized object on save — simpler
 * than nesting into react-hook-form's structured paths and lets zod validate
 * each language independently.
 */
const tutorSchema = z.object({
    role: z.string().min(1, 'El rol UUID es requerido'),
    icon: z.string().optional(),
    isActive: z.boolean(),
    corpusIds: z.array(z.string()).optional(),

    name_es: z.string().min(1, 'El nombre (ES) es requerido'),
    name_en: z.string().optional(),
    expertiseArea_es: z.string().min(1, 'El área de especialidad (ES) es requerida'),
    expertiseArea_en: z.string().optional(),
    description_es: z.string().min(1, 'La descripción (ES) es requerida'),
    description_en: z.string().optional(),
    systemInstruction_es: z.string().min(1, 'Las instrucciones del sistema (ES) son requeridas'),
    systemInstruction_en: z.string().optional(),
    routingDescription_es: z.string().optional(),
    routingDescription_en: z.string().optional(),
});

type TutorFormData = z.infer<typeof tutorSchema>;

/**
 * Coerces a Firestore field that may be either a legacy plain string (pre-Phase-5
 * docs) or a `{ es, en }` object into the two flat fields the form expects.
 */
function splitLocalized(value: LocalizedString | string | undefined): { es: string; en: string } {
    if (!value) return { es: '', en: '' };
    if (typeof value === 'string') return { es: value, en: '' };
    return { es: value.es ?? '', en: value.en ?? '' };
}

function joinLocalized(es: string, en?: string): LocalizedString {
    const trimmedEn = (en ?? '').trim();
    return trimmedEn ? { es, en: trimmedEn } : { es };
}

export default function TutorEditor() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const isEditing = id && id !== 'new';

    const { data: tutor, isLoading } = useTutor(isEditing ? id : '');
    const { data: storesObj, isLoading: isLoadingStores } = useCoreLibraryStores();
    const { mutateAsync: createTutor, isPending: isCreating } = useCreateTutor();
    const { mutateAsync: updateTutor, isPending: isUpdating } = useUpdateTutor();
    const { mutateAsync: deleteTutor, isPending: isDeleting } = useDeleteTutor();

    const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<TutorFormData>({
        resolver: zodResolver(tutorSchema),
        defaultValues: {
            isActive: true,
            icon: 'users',
            corpusIds: [],
            name_es: '',
            name_en: '',
            expertiseArea_es: '',
            expertiseArea_en: '',
            description_es: '',
            description_en: '',
            systemInstruction_es: '',
            systemInstruction_en: '',
            routingDescription_es: '',
            routingDescription_en: '',
        },
    });

    useEffect(() => {
        if (tutor && isEditing) {
            const name = splitLocalized(tutor.name);
            const expertise = splitLocalized(tutor.expertiseArea);
            const description = splitLocalized(tutor.description);
            const sysInstr = splitLocalized(tutor.systemInstruction);
            const routing = splitLocalized(tutor.routingDescription);
            reset({
                role: tutor.role,
                icon: tutor.icon || 'users',
                isActive: tutor.isActive,
                corpusIds: tutor.corpusIds || [],
                name_es: name.es,
                name_en: name.en,
                expertiseArea_es: expertise.es,
                expertiseArea_en: expertise.en,
                description_es: description.es,
                description_en: description.en,
                systemInstruction_es: sysInstr.es,
                systemInstruction_en: sysInstr.en,
                routingDescription_es: routing.es,
                routingDescription_en: routing.en,
            });
        }
    }, [tutor, isEditing, reset]);

    const onSubmit = async (data: TutorFormData) => {
        const payload = {
            role: data.role,
            icon: data.icon,
            isActive: data.isActive,
            corpusIds: data.corpusIds,
            name: joinLocalized(data.name_es, data.name_en),
            expertiseArea: joinLocalized(data.expertiseArea_es, data.expertiseArea_en),
            description: joinLocalized(data.description_es, data.description_en),
            systemInstruction: joinLocalized(data.systemInstruction_es, data.systemInstruction_en),
            ...(data.routingDescription_es?.trim() || data.routingDescription_en?.trim()
                ? { routingDescription: joinLocalized(data.routingDescription_es ?? '', data.routingDescription_en) }
                : {}),
        };
        try {
            if (isEditing) {
                await updateTutor({ id, updates: payload });
                toast.success('Tutor actualizado correctamente');
            } else {
                await createTutor(payload as any);
                toast.success('Tutor creado correctamente');
                navigate('/dashboard/admin/tutors');
            }
        } catch (error) {
            toast.error('Ocurrió un error al guardar el tutor');
            console.error(error);
        }
    };

    const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

    const handleDeleteConfirmed = async () => {
        setConfirmDeleteOpen(false);
        if (!isEditing) return;
        try {
            await deleteTutor(id);
            toast.success('Tutor eliminado');
            navigate('/dashboard/admin/tutors');
        } catch (error) {
            toast.error('Error al eliminar el tutor');
        }
    };

    const isSaving = isCreating || isUpdating;

    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                    <Button variant="outline" size="icon" onClick={() => navigate('/dashboard/admin/tutors')}>
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">
                            {isEditing ? 'Editar Tutor' : 'Nuevo Tutor IA'}
                        </h1>
                        <p className="text-muted-foreground mt-2">
                            Configura la experticia y las instrucciones maestras del agente. Cada idioma se edita por separado en su pestaña.
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {isEditing && (
                        <Button variant="destructive" onClick={() => setConfirmDeleteOpen(true)} disabled={isDeleting}>
                            <Trash2 className="h-4 w-4 mr-2" />
                            Eliminar
                        </Button>
                    )}
                    <Button onClick={handleSubmit(onSubmit)} disabled={isSaving || isLoading}>
                        <Save className="h-4 w-4 mr-2" />
                        {isSaving ? 'Guardando...' : 'Guardar'}
                    </Button>
                </div>
            </div>

            <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
                {/* Configuración base — language-agnostic */}
                <Card>
                    <CardHeader>
                        <CardTitle>Configuración</CardTitle>
                        <CardDescription>Identificadores y configuración técnica del tutor.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="role">ID del Rol (Sistema)</Label>
                                <Input id="role" placeholder="Ej. GREEK_EXEGETE" {...register('role')} />
                                {errors.role && <p className="text-sm text-red-500">{errors.role.message}</p>}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="icon">Ícono (Lucide className)</Label>
                                <Input id="icon" placeholder="Ej. book-open, mic, users" {...register('icon')} />
                            </div>
                        </div>
                        <div className="flex items-center space-x-2 pt-2">
                            <Switch
                                id="isActive"
                                checked={watch('isActive')}
                                onCheckedChange={(val) => setValue('isActive', val)}
                            />
                            <Label htmlFor="isActive">Tutor Activo</Label>
                        </div>
                    </CardContent>
                </Card>

                {/* Contenido bilingüe */}
                <Card>
                    <CardHeader>
                        <CardTitle>Contenido del Tutor</CardTitle>
                        <CardDescription>
                            Cada idioma se autorea por separado. El motor de IA elige la variante según
                            el <code className="text-xs bg-slate-100 dark:bg-zinc-800 px-1 rounded">preferredLanguage</code> del usuario.
                            Si dejas el inglés en blanco, el sistema usa el español como fallback.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Tabs defaultValue="es" className="w-full">
                            <TabsList className="grid w-full grid-cols-2 max-w-xs mb-6">
                                <TabsTrigger value="es">🇪🇸 Español</TabsTrigger>
                                <TabsTrigger value="en">🇺🇸 English</TabsTrigger>
                            </TabsList>

                            <TabsContent value="es" className="space-y-4 mt-0">
                                <LocalizedFieldSet
                                    suffix="es"
                                    register={register}
                                    errors={errors}
                                    namePlaceholder="Ej. Dr. Aletheia"
                                    expertisePlaceholder="Ej. Exégesis de Griego y Hebreo"
                                    descriptionPlaceholder="Breve descripción de su enfoque y utilidad."
                                    systemInstructionPlaceholder="Eres un erudito en griego koiné..."
                                    routingPlaceholder="USAR PARA: consejería pastoral, matrimonio... NO USAR PARA: exégesis académica..."
                                    nameLabel="Nombre / Título"
                                    expertiseLabel="Área de Especialidad"
                                    descriptionLabel="Descripción"
                                    systemInstructionLabel="Instrucciones Maestras (System Prompt)"
                                    routingLabel="Descripción de Enrutamiento"
                                />
                            </TabsContent>

                            <TabsContent value="en" className="space-y-4 mt-0">
                                <p className="text-sm text-muted-foreground">
                                    English variants are optional but recommended. Empty fields fall back to the Spanish version.
                                </p>
                                <LocalizedFieldSet
                                    suffix="en"
                                    register={register}
                                    errors={errors}
                                    namePlaceholder="e.g., Dr. Aletheia"
                                    expertisePlaceholder="e.g., Greek and Hebrew Exegesis"
                                    descriptionPlaceholder="Brief description of focus and usefulness."
                                    systemInstructionPlaceholder="You are a scholar of Koine Greek..."
                                    routingPlaceholder="USE FOR: pastoral counseling, marriage... NOT FOR: pure academic exegesis..."
                                    nameLabel="Name / Title"
                                    expertiseLabel="Area of Specialty"
                                    descriptionLabel="Description"
                                    systemInstructionLabel="Master Instructions (System Prompt)"
                                    routingLabel="Routing Description"
                                />
                            </TabsContent>
                        </Tabs>
                    </CardContent>
                </Card>

                {/* RAG */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Library className="h-5 w-5" />
                            Bases de Conocimiento (RAG)
                        </CardTitle>
                        <CardDescription>Selecciona las bibliotecas de "Core Library" a las que este tutor tendrá acceso para extraer información.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {isLoadingStores ? (
                            <p className="text-sm text-muted-foreground">Cargando bases de conocimiento...</p>
                        ) : storesObj && Object.keys(storesObj).length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {Object.entries(storesObj).map(([key, corpusUri]) => {
                                    if (!corpusUri) return null;
                                    const isChecked = watch('corpusIds')?.includes(corpusUri);

                                    return (
                                        <div key={key} className="flex items-center space-x-2 border p-3 rounded-md">
                                            <Checkbox
                                                id={`corpus-${key}`}
                                                checked={isChecked}
                                                onCheckedChange={(checked) => {
                                                    const current = watch('corpusIds') || [];
                                                    if (checked) {
                                                        setValue('corpusIds', [...current, corpusUri]);
                                                    } else {
                                                        setValue('corpusIds', current.filter(id => id !== corpusUri));
                                                    }
                                                }}
                                            />
                                            <Label htmlFor={`corpus-${key}`} className="cursor-pointer font-normal capitalize">
                                                {key}
                                            </Label>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <p className="text-sm text-muted-foreground">No hay bases de conocimiento configuradas en Core Library.</p>
                        )}
                        {errors.corpusIds && <p className="text-sm text-red-500">{errors.corpusIds.message}</p>}
                    </CardContent>
                </Card>

            </form>

            <ConfirmDialog
                open={confirmDeleteOpen}
                onOpenChange={setConfirmDeleteOpen}
                title="¿Eliminar este tutor?"
                body="El tutor se elimina del catálogo y deja de estar disponible para los usuarios. Esta acción no se puede deshacer."
                confirmLabel="Eliminar tutor"
                cancelLabel="Cancelar"
                onConfirm={handleDeleteConfirmed}
            />
        </div>
    );
}

interface LocalizedFieldSetProps {
    suffix: 'es' | 'en';
    register: ReturnType<typeof useForm<TutorFormData>>['register'];
    errors: ReturnType<typeof useForm<TutorFormData>>['formState']['errors'];
    nameLabel: string;
    expertiseLabel: string;
    descriptionLabel: string;
    systemInstructionLabel: string;
    routingLabel: string;
    namePlaceholder: string;
    expertisePlaceholder: string;
    descriptionPlaceholder: string;
    systemInstructionPlaceholder: string;
    routingPlaceholder: string;
}

function LocalizedFieldSet(props: LocalizedFieldSetProps) {
    const {
        suffix, register, errors,
        nameLabel, expertiseLabel, descriptionLabel, systemInstructionLabel, routingLabel,
        namePlaceholder, expertisePlaceholder, descriptionPlaceholder,
        systemInstructionPlaceholder, routingPlaceholder,
    } = props;

    const nameKey = `name_${suffix}` as const;
    const expertiseKey = `expertiseArea_${suffix}` as const;
    const descriptionKey = `description_${suffix}` as const;
    const sysKey = `systemInstruction_${suffix}` as const;
    const routingKey = `routingDescription_${suffix}` as const;

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor={nameKey}>{nameLabel}</Label>
                    <Input id={nameKey} placeholder={namePlaceholder} {...register(nameKey)} />
                    {errors[nameKey] && <p className="text-sm text-red-500">{errors[nameKey]?.message as string}</p>}
                </div>
                <div className="space-y-2">
                    <Label htmlFor={expertiseKey}>{expertiseLabel}</Label>
                    <Input id={expertiseKey} placeholder={expertisePlaceholder} {...register(expertiseKey)} />
                    {errors[expertiseKey] && <p className="text-sm text-red-500">{errors[expertiseKey]?.message as string}</p>}
                </div>
            </div>

            <div className="space-y-2">
                <Label htmlFor={descriptionKey}>{descriptionLabel}</Label>
                <Textarea id={descriptionKey} placeholder={descriptionPlaceholder} {...register(descriptionKey)} rows={3} />
                {errors[descriptionKey] && <p className="text-sm text-red-500">{errors[descriptionKey]?.message as string}</p>}
            </div>

            <div className="space-y-2">
                <Label htmlFor={sysKey}>{systemInstructionLabel}</Label>
                <Textarea
                    id={sysKey}
                    className="font-mono text-sm"
                    placeholder={systemInstructionPlaceholder}
                    {...register(sysKey)}
                    rows={15}
                />
                {errors[sysKey] && <p className="text-sm text-red-500">{errors[sysKey]?.message as string}</p>}
            </div>

            <div className="space-y-2">
                <Label htmlFor={routingKey}>{routingLabel}</Label>
                <Textarea
                    id={routingKey}
                    className="font-mono text-sm"
                    placeholder={routingPlaceholder}
                    {...register(routingKey)}
                    rows={6}
                />
            </div>
        </div>
    );
}
