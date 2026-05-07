import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Users, Edit, BookOpen, Scroll, HeartHandshake, Mic2, Library } from 'lucide-react';
import { useTutors } from '@/hooks/admin/useTutors';
import { Skeleton } from '@/components/ui/skeleton';
import { resolveLocalized } from '@dosfilos/domain';
import type { SupportedLanguage } from '@dosfilos/domain';
import { useTranslation } from 'react-i18next';

// Helper to render lucide icon by string name (mock agents have string icons like 'book-a', 'scroll', etc.)
const renderIcon = (iconName: string = 'users', className: string = 'h-5 w-5') => {
    switch(iconName) {
        case 'book-a': return <BookOpen className={className} />;
        case 'scroll': return <Scroll className={className} />;
        case 'heart-handshake': return <HeartHandshake className={className} />;
        case 'mic': return <Mic2 className={className} />;
        case 'library': return <Library className={className} />;
        default: return <Users className={className} />;
    }
}

export default function TutorManagement() {
    const navigate = useNavigate();
    const { data: tutors, isLoading } = useTutors();
    const { i18n } = useTranslation();
    const lang: SupportedLanguage = i18n.language?.split('-')[0] === 'en' ? 'en' : 'es';

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Gestión de Tutores</h1>
                    <p className="text-muted-foreground mt-2">
                        Administra el cuerpo facultativo de agentes generativos, define sus especialidades y roles.
                    </p>
                </div>
                <Button onClick={() => navigate('/dashboard/admin/tutors/new')}>
                    <Plus className="mr-2 h-4 w-4" />
                    Nuevo Tutor
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {isLoading && (
                    <>
                        {[1,2,3].map(i => (
                            <Card key={i}>
                                <CardHeader>
                                    <Skeleton className="h-6 w-2/3 mb-2" />
                                    <Skeleton className="h-4 w-1/3" />
                                </CardHeader>
                            </Card>
                        ))}
                    </>
                )}
                
                {!isLoading && tutors?.map(tutor => (
                    <Card key={tutor.id} className={`transition-all hover:shadow-md ${!tutor.isActive ? 'opacity-60' : ''}`}>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-primary/10 rounded-lg text-primary">
                                    {renderIcon(tutor.icon)}
                                </div>
                                <div>
                                    <CardTitle className="text-lg">{resolveLocalized(tutor.name, lang)}</CardTitle>
                                    <CardDescription>{resolveLocalized(tutor.expertiseArea, lang)}</CardDescription>
                                </div>
                            </div>
                            <Badge variant={tutor.isActive ? 'default' : 'secondary'}>
                                {tutor.isActive ? 'Activo' : 'Inactivo'}
                            </Badge>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-muted-foreground line-clamp-2 min-h-[40px] mb-4">
                                {resolveLocalized(tutor.description, lang)}
                            </p>
                            <div className="flex items-center justify-between text-xs text-muted-foreground border-t pt-4">
                                <span>Rol UUID: {tutor.role}</span>
                                <Button size="sm" variant="ghost" onClick={() => navigate(`/dashboard/admin/tutors/${tutor.id}`)}>
                                    <Edit className="h-4 w-4 mr-2" />
                                    Editar
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {!isLoading && (!tutors || tutors.length === 0) && (
                <div className="text-center py-12 border rounded-lg bg-card">
                    <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium">No hay tutores registrados</h3>
                    <p className="text-muted-foreground mb-4">Crea el primer agente para la facultad del seminario.</p>
                    <Button onClick={() => navigate('/dashboard/admin/tutors/new')}>Crear Tutor</Button>
                </div>
            )}
        </div>
    );
}
