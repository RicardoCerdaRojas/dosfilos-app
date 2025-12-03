import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, FileText, Calendar, Tag, MoreVertical, Pencil, Trash2, Eye } from 'lucide-react';
import { SermonEntity } from '@dosfilos/domain';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { useSermons, useDeleteSermon } from '@/hooks/use-sermons';
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

export function SermonsPage() {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sermonToDelete, setSermonToDelete] = useState<string | null>(null);

  const { sermons, loading, refetch } = useSermons({
    status: statusFilter === 'all' ? undefined : (statusFilter as any),
    orderBy: 'updatedAt',
    order: 'desc',
  });

  const { deleteSermon, loading: deleting } = useDeleteSermon();

  const filteredSermons = sermons.filter((sermon) =>
    sermon.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDelete = async () => {
    if (!sermonToDelete) return;
    await deleteSermon(sermonToDelete);
    setSermonToDelete(null);
    refetch();
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any; label: string }> = {
      draft: { variant: 'secondary', label: 'Borrador' },
      published: { variant: 'default', label: 'Publicado' },
      archived: { variant: 'outline', label: 'Archivado' },
    };
    const config = variants[status] || variants.draft;
    return (
      <Badge variant={config.variant as any} className="capitalize">
        {config.label}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center space-y-4">
          <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-muted-foreground">Cargando sermones...</p>
        </div>
      </div>
    );
  }

  if (sermons.length === 0 && statusFilter === 'all' && !searchQuery) {
    return (
      <div className="flex flex-col items-center justify-center h-96 space-y-4">
        <FileText className="h-16 w-16 text-muted-foreground" />
        <h2 className="text-2xl font-semibold">No tienes sermones aún</h2>
        <p className="text-muted-foreground text-center max-w-md">
          Comienza creando tu primer sermón y gestiona todo tu contenido pastoral en un solo lugar.
        </p>
        <Button onClick={() => navigate('/sermons/new')} size="lg">
          <Plus className="mr-2 h-5 w-5" />
          Crear Primer Sermón
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Sermones</h1>
          <p className="text-muted-foreground">Gestiona tus sermones y contenido pastoral</p>
        </div>
        <Button onClick={() => navigate('/sermons/new')}>
          <Plus className="mr-2 h-4 w-4" />
          Nuevo Sermón
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <div className="flex-1">
          <Input
            placeholder="Buscar sermones..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="draft">Borradores</SelectItem>
            <SelectItem value="published">Publicados</SelectItem>
            <SelectItem value="archived">Archivados</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Sermons List */}
      {filteredSermons.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">
            No se encontraron sermones con los filtros seleccionados.
          </p>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredSermons.map((sermon) => (
            <Card key={sermon.id} className="p-6 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-3">
                    <h3
                      className="text-xl font-semibold cursor-pointer hover:text-primary"
                      onClick={() => navigate(`/sermons/${sermon.id}`)}
                    >
                      {sermon.title}
                    </h3>
                    {getStatusBadge(sermon.status)}
                  </div>

                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {new Date(sermon.updatedAt).toLocaleDateString('es-ES', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </div>
                    {sermon.category && (
                      <div className="flex items-center gap-1">
                        <Tag className="h-4 w-4" />
                        {sermon.category}
                      </div>
                    )}
                    {sermon.bibleReferences.length > 0 && (
                      <span>{sermon.bibleReferences.length} referencias bíblicas</span>
                    )}
                  </div>

                  {sermon.tags.length > 0 && (
                    <div className="flex gap-2 flex-wrap">
                      {sermon.tags.map((tag) => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => navigate(`/sermons/${sermon.id}`)}>
                      <Eye className="mr-2 h-4 w-4" />
                      Ver detalles
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate(`/sermons/${sermon.id}/edit`)}>
                      <Pencil className="mr-2 h-4 w-4" />
                      Editar
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={() => setSermonToDelete(sermon.id)}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Eliminar
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!sermonToDelete} onOpenChange={() => setSermonToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. El sermón será eliminado permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting}>
              {deleting ? 'Eliminando...' : 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
