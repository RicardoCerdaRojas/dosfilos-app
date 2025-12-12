import { useState, useEffect } from 'react';
import { useFirebase } from '@/context/firebase-context';
import { categoryService } from '@dosfilos/application';
import { LibraryCategory, DEFAULT_CATEGORIES } from '@dosfilos/domain';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2, Plus, Trash2, Book, Languages, MessageSquare, FileText, FileQuestion, Pencil, Check, X } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const colorOptions = [
    { value: 'blue', label: 'Azul', class: 'bg-blue-100 text-blue-700' },
    { value: 'purple', label: 'Púrpura', class: 'bg-purple-100 text-purple-700' },
    { value: 'green', label: 'Verde', class: 'bg-green-100 text-green-700' },
    { value: 'orange', label: 'Naranja', class: 'bg-orange-100 text-orange-700' },
    { value: 'red', label: 'Rojo', class: 'bg-red-100 text-red-700' },
    { value: 'yellow', label: 'Amarillo', class: 'bg-yellow-100 text-yellow-700' },
    { value: 'pink', label: 'Rosa', class: 'bg-pink-100 text-pink-700' },
    { value: 'gray', label: 'Gris', class: 'bg-gray-100 text-gray-700' },
];

const iconMap: Record<string, typeof Book> = {
    'Book': Book,
    'Languages': Languages,
    'MessageSquare': MessageSquare,
    'FileText': FileText,
    'FileQuestion': FileQuestion,
};

export function LibrarySettings() {
    const { user } = useFirebase();
    const [customCategories, setCustomCategories] = useState<LibraryCategory[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editLabel, setEditLabel] = useState('');
    const [editColor, setEditColor] = useState('blue');
    
    // New category form
    const [newLabel, setNewLabel] = useState('');
    const [newColor, setNewColor] = useState('blue');
    const [showNewForm, setShowNewForm] = useState(false);

    useEffect(() => {
        if (user) loadCategories();
    }, [user]);

    const loadCategories = async () => {
        if (!user) return;
        try {
            const categories = await categoryService.getCustomCategories(user.uid);
            setCustomCategories(categories);
        } catch (error) {
            console.error('Error loading categories:', error);
            toast.error('Error al cargar categorías');
        } finally {
            setLoading(false);
        }
    };

    const handleAddCategory = async () => {
        if (!user || !newLabel.trim()) return;
        setSaving(true);
        try {
            const created = await categoryService.addCategory(user.uid, {
                label: newLabel.trim(),
                color: newColor
            });
            setCustomCategories([...customCategories, created]);
            setNewLabel('');
            setNewColor('blue');
            setShowNewForm(false);
            toast.success('Categoría creada');
        } catch (error) {
            console.error('Error creating category:', error);
            toast.error('Error al crear categoría');
        } finally {
            setSaving(false);
        }
    };

    const handleStartEdit = (category: LibraryCategory) => {
        setEditingId(category.id);
        setEditLabel(category.label);
        setEditColor(category.color || 'blue');
    };

    const handleSaveEdit = async () => {
        if (!user || !editingId || !editLabel.trim()) return;
        setSaving(true);
        try {
            await categoryService.updateCategory(user.uid, editingId, {
                label: editLabel.trim(),
                color: editColor
            });
            setCustomCategories(customCategories.map(c => 
                c.id === editingId ? { ...c, label: editLabel.trim(), color: editColor } : c
            ));
            setEditingId(null);
            toast.success('Categoría actualizada');
        } catch (error) {
            console.error('Error updating category:', error);
            toast.error('Error al actualizar categoría');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (categoryId: string) => {
        if (!user) return;
        try {
            await categoryService.deleteCategory(user.uid, categoryId);
            setCustomCategories(customCategories.filter(c => c.id !== categoryId));
            toast.success('Categoría eliminada');
        } catch (error) {
            console.error('Error deleting category:', error);
            toast.error('Error al eliminar categoría');
        }
    };

    const getColorClass = (color?: string) => {
        return colorOptions.find(c => c.value === color)?.class || 'bg-gray-100 text-gray-700';
    };

    if (loading) {
        return (
            <Card>
                <CardContent className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin" />
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Categorías de Biblioteca</CardTitle>
                <CardDescription>
                    Personaliza las categorías para organizar tus recursos teológicos
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* Default Categories */}
                <div>
                    <Label className="text-sm text-muted-foreground mb-3 block">
                        Categorías predeterminadas (no se pueden modificar)
                    </Label>
                    <div className="flex flex-wrap gap-2">
                        {DEFAULT_CATEGORIES.map(cat => {
                            const Icon = iconMap[cat.icon || 'FileQuestion'] || FileQuestion;
                            return (
                                <Badge 
                                    key={cat.id} 
                                    variant="secondary"
                                    className={cn('gap-1.5 py-1.5', getColorClass(cat.color))}
                                >
                                    <Icon className="h-3.5 w-3.5" />
                                    {cat.label}
                                </Badge>
                            );
                        })}
                    </div>
                </div>

                {/* Custom Categories */}
                <div>
                    <Label className="text-sm text-muted-foreground mb-3 block">
                        Tus categorías personalizadas
                    </Label>
                    {customCategories.length === 0 && !showNewForm ? (
                        <p className="text-sm text-muted-foreground italic">
                            No has creado categorías personalizadas aún
                        </p>
                    ) : (
                        <div className="space-y-2">
                            {customCategories.map(cat => (
                                <div 
                                    key={cat.id} 
                                    className="flex items-center gap-2 p-2 border rounded-lg"
                                >
                                    {editingId === cat.id ? (
                                        <>
                                            <Input
                                                value={editLabel}
                                                onChange={(e) => setEditLabel(e.target.value)}
                                                className="flex-1 h-8"
                                                placeholder="Nombre de la categoría"
                                            />
                                            <Select value={editColor} onValueChange={setEditColor}>
                                                <SelectTrigger className="w-28 h-8">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {colorOptions.map(opt => (
                                                        <SelectItem key={opt.value} value={opt.value}>
                                                            <span className={cn('px-2 py-0.5 rounded text-xs', opt.class)}>
                                                                {opt.label}
                                                            </span>
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <Button 
                                                size="sm" 
                                                variant="ghost" 
                                                className="h-8 w-8 p-0"
                                                onClick={handleSaveEdit}
                                                disabled={saving}
                                            >
                                                <Check className="h-4 w-4 text-green-600" />
                                            </Button>
                                            <Button 
                                                size="sm" 
                                                variant="ghost" 
                                                className="h-8 w-8 p-0"
                                                onClick={() => setEditingId(null)}
                                            >
                                                <X className="h-4 w-4" />
                                            </Button>
                                        </>
                                    ) : (
                                        <>
                                            <Badge className={cn('gap-1', getColorClass(cat.color))}>
                                                {cat.label}
                                            </Badge>
                                            <div className="flex-1" />
                                            <Button 
                                                size="sm" 
                                                variant="ghost" 
                                                className="h-8 w-8 p-0"
                                                onClick={() => handleStartEdit(cat)}
                                            >
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                            <Button 
                                                size="sm" 
                                                variant="ghost" 
                                                className="h-8 w-8 p-0 text-destructive"
                                                onClick={() => handleDelete(cat.id)}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Add New Category */}
                {showNewForm ? (
                    <div className="flex items-center gap-2 p-3 border-2 border-dashed rounded-lg bg-muted/30">
                        <Input
                            value={newLabel}
                            onChange={(e) => setNewLabel(e.target.value)}
                            className="flex-1 h-9"
                            placeholder="Nombre de la nueva categoría"
                            autoFocus
                        />
                        <Select value={newColor} onValueChange={setNewColor}>
                            <SelectTrigger className="w-28 h-9">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {colorOptions.map(opt => (
                                    <SelectItem key={opt.value} value={opt.value}>
                                        <span className={cn('px-2 py-0.5 rounded text-xs', opt.class)}>
                                            {opt.label}
                                        </span>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Button onClick={handleAddCategory} disabled={saving || !newLabel.trim()} size="sm">
                            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Crear'}
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => setShowNewForm(false)}>
                            Cancelar
                        </Button>
                    </div>
                ) : (
                    <Button 
                        variant="outline" 
                        className="w-full gap-2"
                        onClick={() => setShowNewForm(true)}
                    >
                        <Plus className="h-4 w-4" />
                        Agregar Categoría
                    </Button>
                )}
            </CardContent>
        </Card>
    );
}
