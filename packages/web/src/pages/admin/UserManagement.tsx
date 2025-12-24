import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdminAuth } from '@/hooks/admin/useAdminAuth';
import { useAllUsers } from '@/hooks/admin/useAllUsers';
import { useDeleteUser } from '@/hooks/admin/useDeleteUser';
import { useResendWelcomeEmail } from '@/hooks/admin/useResendWelcomeEmail';
import { PlanBadge } from '@/components/admin/PlanBadge';
import { EngagementBadge } from '@/components/admin/EngagementBadge';
import { UserDetailsModal } from '@/components/admin/UserDetailsModal';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { 
    ArrowLeft, 
    Search, 
    Filter,
    Loader2,
    Download,
    User as UserIcon,
    Eye,
    CreditCard,
    Trash2,
    Mail
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

export function UserManagement() {
    const { isAdmin, loading: authLoading } = useAdminAuth();
    const navigate = useNavigate();

    // Filters state
    const [searchQuery, setSearchQuery] = useState('');
    const [planFilter, setPlanFilter] = useState<string>('all');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    
    // Modal state
    const [selectedUser, setSelectedUser] = useState<any | null>(null);
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
    
    // Delete state
    const [userToDelete, setUserToDelete] = useState<any | null>(null);
    const { deleteUser, isLoading: isDeleting } = useDeleteUser();
    
    // Resend Email hook
    const { resendEmail, isLoading: isResending } = useResendWelcomeEmail();

    // Build filters object
    const filters = {
        searchQuery: searchQuery || undefined,
        planId: planFilter !== 'all' ? planFilter : undefined,
        status: statusFilter !== 'all' ? (statusFilter as any) : undefined,
    };

    const { users, loading: usersLoading } = useAllUsers(filters);

    const handleExportCSV = () => {
        if (!users.length) return;

        // Create CSV content
        const headers = ['Email', 'Nombre', 'Plan', 'Estado', 'Engagement', 'Último Login', 'Fecha Registro'];
        const rows = users.map(user => [
            user.email,
            user.displayName || '',
            user.subscription?.planId || 'free',
            user.subscription?.status || 'active',
            user.analytics?.engagementScore || 0,
            user.analytics?.lastLoginAt ? new Date(user.analytics.lastLoginAt).toISOString() : '',
            new Date(user.createdAt).toISOString()
        ]);

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.join(','))
        ].join('\n');

        // Download
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `users-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
    };
    
    const handleViewDetails = (user: any) => {
        setSelectedUser(user);
        setIsDetailsModalOpen(true);
    };
    
    const handleChangePlan = (userId: string) => {
        // TODO: Implement plan change functionality
        console.log('Change plan for user:', userId);
        // Could navigate to /dashboard/admin/users/{userId}/change-plan
        // or open a ChangePlanModal
    };

    const handleDeleteClick = (user: any) => {
        setUserToDelete(user);
    };

    const handleConfirmDelete = async () => {
        if (!userToDelete) return;
        
        const success = await deleteUser(userToDelete.id);
        if (success) {
            setUserToDelete(null);
            // Refresh logic (handled by useAllUsers subscription or we could reload)
            // Ideally useAllUsers listens to snapshots, so it updates automatically
        }
    };

    if (authLoading || !isAdmin) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
        );
    }

    return (
        <div className="p-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                    <Button 
                        variant="outline" 
                        onClick={() => navigate('/dashboard/admin/analytics')}
                    >
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Analytics
                    </Button>
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900">Gestión de Usuarios</h1>
                        <p className="text-slate-600 mt-1">
                            {users.length} usuarios totales
                        </p>
                    </div>
                </div>

                <Button onClick={handleExportCSV} disabled={!users.length}>
                    <Download className="h-4 w-4 mr-2" />
                    Exportar CSV
                </Button>
            </div>

            {/* Filters */}
            <Card className="p-4 mb-6">
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                            placeholder="Buscar por nombre o email..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10"
                        />
                    </div>

                    <Select value={planFilter} onValueChange={setPlanFilter}>
                        <SelectTrigger className="w-full md:w-40">
                            <Filter className="h-4 w-4 mr-2" />
                            <SelectValue placeholder="Plan" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todos los planes</SelectItem>
                            <SelectItem value="free">Free</SelectItem>
                            <SelectItem value="pro">Pro</SelectItem>
                            <SelectItem value="team">Team</SelectItem>
                        </SelectContent>
                    </Select>

                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-full md:w-40">
                            <SelectValue placeholder="Estado" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todos los estados</SelectItem>
                            <SelectItem value="active">Activos</SelectItem>
                            <SelectItem value="cancelled">Cancelados</SelectItem>
                            <SelectItem value="past_due">Pago pendiente</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </Card>

            {/* Users Table */}
            {usersLoading ? (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                    <p className="ml-3 text-slate-600">Cargando usuarios...</p>
                </div>
            ) : users.length === 0 ? (
                <Card className="p-12 text-center">
                    <UserIcon className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                    <h2 className="text-xl font-semibold text-slate-900">No se encontraron usuarios</h2>
                    <p className="text-slate-600 mt-2">
                        {searchQuery || planFilter !== 'all' || statusFilter !== 'all'
                            ? 'Intenta ajustar los filtros'
                            : 'Aún no hay usuarios registrados'}
                    </p>
                </Card>
            ) : (
                <Card>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Usuario</TableHead>
                                <TableHead>Plan</TableHead>
                                <TableHead>Estado</TableHead>
                                <TableHead>Engagement</TableHead>
                                <TableHead>Último Login</TableHead>
                                <TableHead>Registrado</TableHead>
                                <TableHead className="text-right">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {users.map((user) => (
                                <TableRow key={user.id} className="hover:bg-slate-50">
                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                                                {user.photoURL ? (
                                                    <img 
                                                        src={user.photoURL} 
                                                        alt={user.displayName || user.email}
                                                        className="h-10 w-10 rounded-full"
                                                    />
                                                ) : (
                                                    <UserIcon className="h-5 w-5 text-blue-600" />
                                                )}
                                            </div>
                                            <div>
                                                <p className="font-medium text-slate-900">
                                                    {user.displayName || 'Sin nombre'}
                                                </p>
                                                <p className="text-sm text-slate-500">{user.email}</p>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <PlanBadge planId={user.subscription?.planId || 'free'} />
                                    </TableCell>
                                    <TableCell>
                                        <span className={`text-sm ${
                                            user.subscription?.status === 'active' 
                                                ? 'text-green-600' 
                                                : user.subscription?.status === 'cancelled'
                                                ? 'text-red-600'
                                                : 'text-orange-600'
                                        }`}>
                                            {user.subscription?.status || 'active'}
                                        </span>
                                    </TableCell>
                                    <TableCell>
                                        <EngagementBadge 
                                            score={user.analytics?.engagementScore || 0}
                                            showScore={true}
                                        />
                                    </TableCell>
                                    <TableCell className="text-sm text-slate-600">
                                        {user.analytics?.lastLoginAt 
                                            ? formatDistanceToNow(new Date(user.analytics.lastLoginAt), {
                                                addSuffix: true,
                                                locale: es
                                            })
                                            : 'Nunca'}
                                    </TableCell>
                                    <TableCell className="text-sm text-slate-600">
                                        {new Date(user.createdAt).toLocaleDateString('es-CL', {
                                            day: 'numeric',
                                            month: 'short',
                                            year: 'numeric'
                                        })}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => handleViewDetails(user)}
                                            >
                                                <Eye className="h-4 w-4 mr-1" />
                                                Ver
                                            </Button>
                                            {user.subscription?.planId !== 'team' && (
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() => handleChangePlan(user.id)}
                                                    title="Cambiar plan"
                                                >
                                                    <CreditCard className="h-4 w-4" />
                                                </Button>
                                            )}
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                className="text-blue-500 hover:text-blue-600 hover:bg-blue-50"
                                                onClick={() => resendEmail(user.id, user.email)}
                                                disabled={isResending}
                                                title="Reenviar correo de bienvenida"
                                            >
                                                {isResending ? (
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                ) : (
                                                    <Mail className="h-4 w-4" />
                                                )}
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                className="text-red-500 hover:text-red-600 hover:bg-red-50"
                                                onClick={() => handleDeleteClick(user)}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </Card>
            )}
            
            {/* User Details Modal */}
            <UserDetailsModal
                user={selectedUser}
                isOpen={isDetailsModalOpen}
                onClose={() => {
                    setIsDetailsModalOpen(false);
                    setSelectedUser(null);
                }}
                onChangePlan={handleChangePlan}
            />

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={!!userToDelete} onOpenChange={(open) => !open && setUserToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Estás absolutamente seguro?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Esta acción no se puede deshacer. Se eliminará permanentemente la cuenta de 
                            <span className="font-semibold text-slate-900"> {userToDelete?.email} </span>
                            y todos sus datos asociados (sermones, suscripciones, etc).
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
                        <AlertDialogAction 
                            onClick={(e) => {
                                e.preventDefault();
                                handleConfirmDelete();
                            }}
                            className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
                            disabled={isDeleting}
                        >
                            {isDeleting ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Eliminando...
                                </>
                            ) : (
                                'Eliminar Usuario'
                            )}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
