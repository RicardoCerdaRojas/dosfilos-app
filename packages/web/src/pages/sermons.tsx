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
    const safeConfig = config!;
    return (
      <Badge variant={safeConfig.variant as any} className="capitalize">
        {safeConfig.label}
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
        <Button onClick={() => navigate('/dashboard/sermons/new')} size="lg">
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
        <Button onClick={() => navigate('/dashboard/sermons/new')}>
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
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredSermons.map((sermon) => (
            <Card key={sermon.id} className="group flex flex-col hover:shadow-lg transition-all duration-300 border-muted hover:border-primary/50 overflow-hidden">
              <div className="p-6 flex-1 space-y-4">
                {/* Header */}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wider font-medium">
                    <Calendar className="h-3.5 w-3.5" />
                    {new Date(sermon.updatedAt).toLocaleDateString('es-ES', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </div>
                  {getStatusBadge(sermon.status)}
                </div>

                {/* Title & Category */}
                <div className="space-y-2">
                  <h3
                    className="text-xl font-bold font-serif leading-tight cursor-pointer group-hover:text-primary transition-colors line-clamp-2"
                    onClick={() => navigate(`/dashboard/sermons/${sermon.id}`)}
                  >
                    {sermon.title}
                  </h3>
                  {sermon.category && (
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Tag className="h-3.5 w-3.5" />
                      <span>{sermon.category}</span>
                    </div>
                  )}
                </div>

                {/* Tags */}
                {sermon.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-2">
                    {sermon.tags.slice(0, 3).map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-xs font-normal bg-secondary/50">
                        {tag}
                      </Badge>
                    ))}
                    {sermon.tags.length > 3 && (
                      <span className="text-xs text-muted-foreground self-center">
                        +{sermon.tags.length - 3}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Footer Actions */}
              <div className="p-4 border-t bg-muted/20 flex items-center justify-between gap-2">
                <div className="text-xs text-muted-foreground">
                  {sermon.bibleReferences.length > 0 && (
                    <span className="flex items-center gap-1">
                      <FileText className="h-3.5 w-3.5" />
                      {sermon.bibleReferences.length} referencias
                    </span>
                  )}
                </div>
                
                <div className="flex items-center gap-1">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-8 w-8 p-0 hover:text-primary"
                    onClick={() => navigate(`/dashboard/sermons/${sermon.id}`)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-8 w-8 p-0 hover:text-primary"
                    onClick={() => navigate(`/dashboard/sermons/${sermon.id}/edit`)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
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
