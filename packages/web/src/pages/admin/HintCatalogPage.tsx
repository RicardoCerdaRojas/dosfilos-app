import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Edit, Trash2, ShieldAlert, AlertCircle, Info, Lightbulb } from 'lucide-react';
import { useAdminHints } from '@/hooks/admin/useAdminHints';
import { HintConditionKey, DetectivePhase, HINT_ALL_PHASES } from '@dosfilos/domain';
import type { HintDefinition, HintSeverity } from '@dosfilos/domain';

const severities: { value: HintSeverity; label: string; icon: React.ReactNode }[] = [
  { value: 'info', label: 'Info', icon: <Info className="h-4 w-4 text-amber-500" /> },
  { value: 'warning', label: 'Warning', icon: <AlertCircle className="h-4 w-4 text-orange-500" /> },
  { value: 'tip', label: 'Tip', icon: <Lightbulb className="h-4 w-4 text-blue-500" /> },
];

const conditionsList = Object.values(HintConditionKey);

export default function HintCatalogPage() {
  const { hints, isLoading, createHint, updateHint, deleteHint, toggleHint } = useAdminHints();
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingHint, setEditingHint] = useState<Partial<HintDefinition> | null>(null);

  const openEditor = (hint?: HintDefinition) => {
    if (hint) {
      setEditingHint({ ...hint });
    } else {
      setEditingHint({
        phase: DetectivePhase.OBSERVE,
        severity: 'info',
        title: '',
        body: '',
        conditions: [],
        excludeConditions: [],
        enabled: true,
        order: 10,
      });
    }
    setEditorOpen(true);
  };

  const handleSave = async () => {
    if (!editingHint) return;
    try {
      const payload = {
        phase: editingHint.phase as number | 'ALL',
        severity: editingHint.severity as HintSeverity,
        title: editingHint.title,
        body: editingHint.body || '',
        conditions: editingHint.conditions || [],
        excludeConditions: editingHint.excludeConditions || [],
        enabled: editingHint.enabled ?? true,
        order: editingHint.order || 0,
      };

      if (editingHint.id) {
        // Only update id if this is a local fallback we are overriding, but wait, if it's local, 
        // the ID starts with local_ and FirebaseHintRepository update will just create a doc with that ID.
        // Actually, if we want to override a local hint, we can just use its ID, and it will be merged 
        // properly by base ID. Wait, the repo converts it? Let's just pass it.
        await updateHint(editingHint.id, payload);
      } else {
        await createHint(payload);
      }
      setEditorOpen(false);
    } catch (e) {
      console.error(e);
      alert('Error saving hint');
    }
  };

  const handleDelete = async (hint: HintDefinition) => {
    if (hint.id.startsWith('local_')) {
      alert('Las pistas locales no pueden ser eliminadas directamente, solo deshabilitadas o sobrescritas.');
      return;
    }
    if (confirm('¿Eliminar esta pista?')) {
      await deleteHint(hint.id);
    }
  };

  const toggleCondition = (key: HintConditionKey, type: 'conditions' | 'excludeConditions') => {
    setEditingHint((prev) => {
      if (!prev) return prev;
      const arr = prev[type] || [];
      const newArr = arr.includes(key) ? arr.filter((k) => k !== key) : [...arr, key];
      return { ...prev, [type]: newArr };
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Catálogo de Pistas Contextuales</h1>
          <p className="text-muted-foreground mt-2">
            Gestiona las pistas dinámicas del Detective de Verbos Hebreos.
          </p>
        </div>
        <Button onClick={() => openEditor()}>
          <Plus className="mr-2 h-4 w-4" />
          Nueva Pista
        </Button>
      </div>

      <div className="grid gap-4">
        {isLoading && <p>Cargando pistas...</p>}
        {!isLoading && hints.map((hint) => (
          <Card key={hint.id} className={!hint.enabled ? 'opacity-60' : ''}>
            <CardHeader className="py-4 flex flex-row items-start justify-between">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{hint.phase === HINT_ALL_PHASES ? 'Todas las Fases' : `Fase ${hint.phase}`}</Badge>
                  <Badge variant={hint.severity === 'warning' ? 'destructive' : 'secondary'} className="capitalize flex items-center gap-1">
                    {severities.find(s => s.value === hint.severity)?.icon}
                    {hint.severity}
                  </Badge>
                  {hint.id.startsWith('local_') && <Badge variant="secondary" className="bg-slate-200 dark:bg-slate-800"><ShieldAlert className="w-3 h-3 mr-1" /> Preset Local</Badge>}
                </div>
                <CardTitle className="text-lg mt-2">{hint.title || 'Sin Título'}</CardTitle>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 mr-4">
                  <span className="text-sm font-medium">Activa</span>
                  <Switch
                    checked={hint.enabled}
                    onCheckedChange={(c) => toggleHint(hint.id, c)}
                  />
                </div>
                <Button variant="ghost" size="icon" onClick={() => openEditor(hint)}>
                  <Edit className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600" onClick={() => handleDelete(hint)} disabled={hint.id.startsWith('local_')}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="py-2 text-sm text-muted-foreground">
              <p className="mb-3 line-clamp-2">{hint.body}</p>
              <div className="flex gap-4 border-t pt-2 mt-2">
                <div className="flex-1">
                  <strong>Condiciones AND:</strong> {hint.conditions.length > 0 ? hint.conditions.join(', ') : 'Ninguna (Siempre)'}
                </div>
                <div className="flex-1">
                  <strong>Excluir si (NOT):</strong> {hint.excludeConditions.length > 0 ? hint.excludeConditions.join(', ') : 'Ninguna'}
                </div>
                <div>
                  <strong>Orden:</strong> {hint.order}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingHint?.id ? 'Editar Pista' : 'Nueva Pista'}</DialogTitle>
            <DialogDescription>
              Configura el texto y las condiciones en las que aparecerá esta pista durante el análisis.
            </DialogDescription>
          </DialogHeader>

          {editingHint && (
            <div className="grid gap-6 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Fase</label>
                  <Select
                    value={String(editingHint.phase)}
                    onValueChange={(val) => setEditingHint({ ...editingHint, phase: val === 'ALL' ? 'ALL' : Number(val) })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar Fase" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">Todas las Fases (ALL)</SelectItem>
                      <SelectItem value="1">1 - Observación (OBSERVE)</SelectItem>
                      <SelectItem value="2">2 - Categorización (TRIAGE)</SelectItem>
                      <SelectItem value="3">3 - Colores (COLORS)</SelectItem>
                      <SelectItem value="4">4 - Dagesh (DAGESH)</SelectItem>
                      <SelectItem value="5">5 - Binyan (BINYAN)</SelectItem>
                      <SelectItem value="10">10 - Preformativo (PREFORMATIVE)</SelectItem>
                      <SelectItem value="11">11 - Raíz Débil (WEAK_ROOT)</SelectItem>
                      <SelectItem value="12">12 - Binyan Débil (WEAK_BINYAN)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Severidad</label>
                  <Select
                    value={editingHint.severity}
                    onValueChange={(val) => setEditingHint({ ...editingHint, severity: val as HintSeverity })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar Severidad" />
                    </SelectTrigger>
                    <SelectContent>
                      {severities.map((s) => (
                        <SelectItem key={s.value} value={s.value}>
                          <div className="flex items-center gap-2">
                            {s.icon} {s.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-4">
                <div className="space-y-2 col-span-3">
                  <label className="text-sm font-medium">Título (Opcional)</label>
                  <Input
                    placeholder="Ej. Atención, Pista..."
                    value={editingHint.title || ''}
                    onChange={(e) => setEditingHint({ ...editingHint, title: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Orden</label>
                  <Input
                    type="number"
                    value={editingHint.order || 0}
                    onChange={(e) => setEditingHint({ ...editingHint, order: Number(e.target.value) })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Cuerpo del Mensaje (Soporta **negrita** y _cursiva_)</label>
                <Textarea
                  className="min-h-[100px]"
                  placeholder="Escribe el contenido de la pista..."
                  value={editingHint.body || ''}
                  onChange={(e) => setEditingHint({ ...editingHint, body: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-6 mt-4">
                <div className="space-y-4 border p-4 rounded-lg bg-slate-50 dark:bg-slate-900/50">
                  <h4 className="font-semibold text-sm">Condiciones Requeridas (AND)</h4>
                  <div className="h-[200px] overflow-y-auto space-y-2 pr-2">
                    {conditionsList.map(cond => (
                      <div key={`inc-${cond}`} className="flex items-center space-x-2">
                        <Checkbox
                          id={`inc-${cond}`}
                          checked={(editingHint.conditions || []).includes(cond as HintConditionKey)}
                          onCheckedChange={() => toggleCondition(cond as HintConditionKey, 'conditions')}
                        />
                        <label htmlFor={`inc-${cond}`} className="text-xs font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                          {cond}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-4 border p-4 rounded-lg bg-red-50 dark:bg-red-950/20">
                  <h4 className="font-semibold text-sm text-red-700 dark:text-red-400">Condiciones de Exclusión (NOT)</h4>
                  <div className="h-[200px] overflow-y-auto space-y-2 pr-2">
                    {conditionsList.map(cond => (
                      <div key={`exc-${cond}`} className="flex items-center space-x-2">
                        <Checkbox
                          id={`exc-${cond}`}
                          checked={(editingHint.excludeConditions || []).includes(cond as HintConditionKey)}
                          onCheckedChange={() => toggleCondition(cond as HintConditionKey, 'excludeConditions')}
                        />
                        <label htmlFor={`exc-${cond}`} className="text-xs font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                          {cond}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditorOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave}>Guardar Pista</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
