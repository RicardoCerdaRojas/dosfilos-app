import { useEffect } from 'react';
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
import { ArrowLeft, Save, Trash2, Library } from 'lucide-react';
import { useTutor, useCreateTutor, useUpdateTutor, useDeleteTutor, useCoreLibraryStores } from '@/hooks/admin/useTutors';
import { toast } from 'sonner';

const tutorSchema = z.object({
    name: z.string().min(1, 'El nombre es requerido'),
    role: z.string().min(1, 'El rol UUID es requerido'),
    expertiseArea: z.string().min(1, 'El área de especialidad es requerida'),
    description: z.string().min(1, 'La descripción es requerida'),
    systemInstruction: z.string().min(1, 'Las instrucciones del sistema son requeridas'),
    routingDescription: z.string().optional(),
    icon: z.string().optional(),
    isActive: z.boolean(),
    corpusIds: z.array(z.string()).optional(),
});

type TutorFormData = z.infer<typeof tutorSchema>;

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
            corpusIds: []
        }
    });

    useEffect(() => {
        if (tutor && isEditing) {
            reset({
                name: tutor.name,
                role: tutor.role,
                expertiseArea: tutor.expertiseArea,
                description: tutor.description,
                systemInstruction: tutor.systemInstruction,
                routingDescription: tutor.routingDescription || '',
                icon: tutor.icon || 'users',
                isActive: tutor.isActive,
                corpusIds: tutor.corpusIds || []
            });
        }
    }, [tutor, isEditing, reset]);

    const onSubmit = async (data: TutorFormData) => {
        try {
            if (isEditing) {
                await updateTutor({ id, updates: data });
                toast.success('Tutor actualizado correctamente');
            } else {
                await createTutor(data);
                toast.success('Tutor creado correctamente');
                navigate('/dashboard/admin/tutors');
            }
        } catch (error) {
            toast.error('Ocurrió un error al guardar el tutor');
            console.error(error);
        }
    };

    const handleDelete = async () => {
        if (!isEditing || !window.confirm('¿Está seguro de eliminar este tutor?')) return;
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
                            Configura la experticia y las instrucciones maestras (System Prompt) del agente.
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {isEditing && (
                        <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
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
                <Card>
                    <CardHeader>
                        <CardTitle>Información Básica</CardTitle>
                        <CardDescription>Detalles públicos que verán los usuarios en el directorio.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">Nombre / Título</Label>
                                <Input id="name" placeholder="Ej. Dr. Aletheia" {...register('name')} />
                                {errors.name && <p className="text-sm text-red-500">{errors.name.message}</p>}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="role">ID del Rol (Sistema)</Label>
                                <Input id="role" placeholder="Ej. GREEK_EXEGETE" {...register('role')} />
                                {errors.role && <p className="text-sm text-red-500">{errors.role.message}</p>}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="expertiseArea">Área de Especialidad</Label>
                            <Input id="expertiseArea" placeholder="Ej. Exégesis de Griego y Hebreo" {...register('expertiseArea')} />
                            {errors.expertiseArea && <p className="text-sm text-red-500">{errors.expertiseArea.message}</p>}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="description">Descripción</Label>
                            <Textarea id="description" placeholder="Breve descripción de su enfoque y utilidad." {...register('description')} rows={3} />
                            {errors.description && <p className="text-sm text-red-500">{errors.description.message}</p>}
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="icon">Ícono (Lucide className)</Label>
                                <Input id="icon" placeholder="Ej. book-open, mic, users" {...register('icon')} />
                            </div>
                            <div className="flex items-center space-x-2 pt-8">
                                <Switch 
                                    id="isActive" 
                                    checked={watch('isActive')} 
                                    onCheckedChange={(val) => setValue('isActive', val)} 
                                />
                                <Label htmlFor="isActive">Tutor Activo</Label>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Instrucciones Maestras (System Prompt)</CardTitle>
                        <CardDescription>Define la personalidad, restricciones y conocimientos base del agente.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Textarea 
                                id="systemInstruction" 
                                className="font-mono text-sm"
                                placeholder="Eres un erudito en griego koiné..." 
                                {...register('systemInstruction')} 
                                rows={15} 
                            />
                            {errors.systemInstruction && <p className="text-sm text-red-500">{errors.systemInstruction.message}</p>}
                        </div>
                    </CardContent>
                </Card>

                {/* Routing Description */}
                <Card>
                    <CardHeader>
                        <CardTitle>Descripción de Enrutamiento (Orchestrator)</CardTitle>
                        <CardDescription>
                            Instrucciones que el orquestador usará para decidir cuándo derivar al usuario a este tutor.
                            Usa el formato: <code className="text-xs bg-slate-100 dark:bg-zinc-800 px-1 rounded">USAR PARA: ...</code> y{' '}
                            <code className="text-xs bg-slate-100 dark:bg-zinc-800 px-1 rounded">NO USAR PARA: ...</code>.
                            Si se omite, el orquestador usará el Área de Especialidad.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Textarea
                            id="routingDescription"
                            className="font-mono text-sm"
                            placeholder="USAR PARA: consejería pastoral, matrimonio, familia... NO USAR PARA: exégesis académica pura..."
                            {...register('routingDescription')}
                            rows={6}
                        />
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
        </div>
    );
}
