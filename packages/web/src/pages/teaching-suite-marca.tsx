import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Upload, Eye, Save, ArrowLeft, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { validateBrandTokens } from '@dosfilos/domain';
import { Button } from '@/components/ui/button';
import { FONT_CATALOG } from '@/features/teaching-suite/assets/fontCatalog';
import {
  processLogoFile,
  renderPreviewHtml,
  type BrandDraft,
} from '@/features/teaching-suite/crearMarca';
import { saveBrand, openHtml, getBrandDoc } from '@/features/teaching-suite/teachingSuiteService';

const TOKEN_LABELS: { key: string; label: string }[] = [
  { key: 'oscuro', label: 'Oscuro (fondo)' },
  { key: 'panel', label: 'Panel' },
  { key: 'medio', label: 'Medio' },
  { key: 'acento', label: 'Acento (síntesis)' },
  { key: 'claro1', label: 'Claro 1 (texto)' },
  { key: 'claro2', label: 'Claro 2' },
  { key: 'escritura', label: 'Escritura' },
  { key: 'escritura_tinta', label: 'Escritura · tinta' },
  { key: 'alerta', label: 'Alerta' },
];

const DEFAULT_TOKENS: Record<string, string> = {
  oscuro: '#101317',
  panel: '#1A2027',
  medio: '#76828F',
  acento: '#8FA8C4',
  claro1: '#E8EDF2',
  claro2: '#F4F7FA',
  escritura: '#D8A848',
  escritura_tinta: '#7E6009',
  alerta: '#CC4F45',
};

export function TeachingSuiteMarcaPage(): JSX.Element {
  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>();
  const fileRef = useRef<HTMLInputElement>(null);

  const [nombre, setNombre] = useState('');
  const [tokens, setTokens] = useState<Record<string, string>>(DEFAULT_TOKENS);
  const [titulosKey, setTitulosKey] = useState(FONT_CATALOG[0]?.key ?? '');
  const [escrituraKey, setEscrituraKey] = useState(FONT_CATALOG[0]?.key ?? '');
  const [logoB64, setLogoB64] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  // Modo editar: carga la marca existente.
  useEffect(() => {
    if (!id) return;
    void (async () => {
      try {
        const m = await getBrandDoc(id);
        if (!m) {
          setError('No se encontró la marca.');
          return;
        }
        setNombre(m.nombre ?? '');
        if (m.tokens) setTokens(m.tokens);
        if (m.fuenteTitulosKey) setTitulosKey(m.fuenteTitulosKey);
        if (m.fuenteEscrituraKey) setEscrituraKey(m.fuenteEscrituraKey);
        if (m.logoB64) setLogoB64(m.logoB64);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'No se pudo cargar la marca');
      }
    })();
  }, [id]);

  const validation = useMemo(() => validateBrandTokens(tokens), [tokens]);
  const draft = (): BrandDraft => ({
    nombre,
    tokens,
    fuenteTitulosKey: titulosKey,
    fuenteEscrituraKey: escrituraKey,
    logoB64,
  });
  const canPreview = !!logoB64 && validation.ok;
  const canSave = canPreview && nombre.trim().length > 0;

  const onLogo = async (file?: File) => {
    if (!file) return;
    setError(null);
    setBusy(true);
    try {
      const { logoB64: lb, palette } = await processLogoFile(file);
      setLogoB64(lb);
      setTokens(palette);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo procesar el logo');
    } finally {
      setBusy(false);
    }
  };

  const onSave = async () => {
    setBusy(true);
    setError(null);
    try {
      await saveBrand({ ...(id ? { marcaId: id } : {}), ...draft() });
      setSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar la marca');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
      <header className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard/teaching-suite')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Volver
        </Button>
        <h1 className="text-xl font-semibold flex-1">{id ? 'Editar marca' : 'Crear marca'}</h1>
      </header>

      {error && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}
      {saved && (
        <div className="rounded-md border border-primary/40 bg-primary/10 px-3 py-2 text-sm flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-primary" /> Marca guardada. Estará disponible para tus
          clases.
        </div>
      )}

      {/* Logo */}
      <section className="space-y-2">
        <label className="text-sm font-medium">Logo de la institución (PNG)</label>
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => fileRef.current?.click()} disabled={busy}>
            <Upload className="w-4 h-4 mr-2" />
            {busy ? 'Procesando…' : 'Subir logo'}
          </Button>
          {logoB64 && (
            <img
              src={`data:image/png;base64,${logoB64}`}
              alt="Logo procesado"
              className="h-12 rounded border bg-muted p-1"
            />
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg"
            className="hidden"
            onChange={(e) => void onLogo(e.target.files?.[0])}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          Se remueve el fondo y se recorta automáticamente. Los colores de abajo se proponen desde el
          logo; ajústalos.
        </p>
      </section>

      {/* Nombre */}
      <section className="space-y-1">
        <label className="text-sm font-medium">Nombre</label>
        <input
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder="Seminario / Iglesia…"
          className="w-full rounded-md border bg-background px-3 py-2 text-sm"
        />
      </section>

      {/* Tokens */}
      <section className="space-y-2">
        <label className="text-sm font-medium">Paleta (9 colores)</label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {TOKEN_LABELS.map(({ key, label }) => (
            <div key={key} className="flex items-center gap-2">
              <input
                type="color"
                value={tokens[key] ?? '#000000'}
                onChange={(e) => setTokens((t) => ({ ...t, [key]: e.target.value }))}
                className="h-8 w-9 rounded border bg-background p-0.5"
                aria-label={label}
              />
              <div className="min-w-0">
                <div className="text-xs font-medium truncate">{label}</div>
                <input
                  value={tokens[key] ?? ''}
                  onChange={(e) => setTokens((t) => ({ ...t, [key]: e.target.value }))}
                  className="w-20 text-xs font-mono bg-transparent border-b border-transparent focus:border-border outline-none"
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Fuentes */}
      <section className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-sm font-medium">Tipografía de títulos</label>
          <select
            value={titulosKey}
            onChange={(e) => setTitulosKey(e.target.value)}
            className="w-full rounded-md border bg-background px-2 py-2 text-sm"
          >
            {FONT_CATALOG.map((f) => (
              <option key={f.key} value={f.key}>
                {f.label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium">Tipografía de la Escritura</label>
          <select
            value={escrituraKey}
            onChange={(e) => setEscrituraKey(e.target.value)}
            className="w-full rounded-md border bg-background px-2 py-2 text-sm"
          >
            {FONT_CATALOG.map((f) => (
              <option key={f.key} value={f.key}>
                {f.label}
              </option>
            ))}
          </select>
        </div>
      </section>

      {/* Validación */}
      <section className="space-y-1">
        {validation.ok ? (
          <p className="text-sm flex items-center gap-2 text-primary">
            <CheckCircle2 className="w-4 h-4" /> Contraste y distinción correctos.
          </p>
        ) : (
          <ul className="space-y-1">
            {validation.errores.map((e, i) => (
              <li key={i} className="text-sm flex items-center gap-2 text-destructive">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                {e}
              </li>
            ))}
          </ul>
        )}
        {validation.avisos.map((a, i) => (
          <li key={i} className="text-xs text-muted-foreground list-none">
            {a}
          </li>
        ))}
      </section>

      {/* Acciones */}
      <div className="flex items-center gap-2 pt-2 border-t">
        <Button
          variant="secondary"
          onClick={() => openHtml(renderPreviewHtml(draft()))}
          disabled={!canPreview}
        >
          <Eye className="w-4 h-4 mr-2" />
          Vista previa
        </Button>
        <Button onClick={() => void onSave()} disabled={!canSave || busy}>
          <Save className="w-4 h-4 mr-2" />
          Guardar marca
        </Button>
        {!logoB64 && (
          <span className="text-xs text-muted-foreground">Sube un logo para continuar.</span>
        )}
      </div>
    </div>
  );
}
