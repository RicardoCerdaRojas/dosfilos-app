import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { validatePlan, type TeachingPlan, type ValidationResult } from '@dosfilos/domain';
import { useFirebase } from '@/context/firebase-context';
import {
  listEstudios,
  listBrands,
  proponerOutlineCurso,
  encolarPlanSesion,
  subscribeJob,
  crearClaseDesdePlan,
  type EstudioRow,
  type BrandRow,
  type SesionOutline,
} from './teachingSuiteService';

export type GeneroSoportado = 'exegesis' | 'doctrina';
export type CursoPaso = 'config' | 'outline' | 'generando' | 'resumen';

export interface SesionEstado {
  titulo: string;
  alcance: string;
  min: number;
  estado: 'generando' | 'listo' | 'error';
  plan?: TeachingPlan;
  validacion?: ValidationResult;
  error?: string;
  claseId?: string;
}

/**
 * Flujo «generar curso» (F3, Eje 2): estudio → outline de N sesiones (editable)
 * → genera cada sesión como job (reusa Slice B) → resumen con validación por
 * sesión → crear las clases válidas bajo una `serie`/`cursoId`.
 */
export function useGenerarCurso() {
  const { user } = useFirebase();

  const [estudios, setEstudios] = useState<EstudioRow[]>([]);
  const [brands, setBrands] = useState<BrandRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [paso, setPaso] = useState<CursoPaso>('config');
  const [estudioId, setEstudioId] = useState('');
  const [genero, setGenero] = useState<GeneroSoportado>('exegesis');
  const [marcaId, setMarcaId] = useState('');
  const [sesionesSugeridas, setSesionesSugeridas] = useState('');
  const [serieNombre, setSerieNombre] = useState('');

  const [proponiendo, setProponiendo] = useState(false);
  const [outline, setOutline] = useState<SesionOutline[]>([]);
  const [sesiones, setSesiones] = useState<SesionEstado[]>([]);
  const [creando, setCreando] = useState(false);

  const cursoIdRef = useRef<string>('');
  const unsubsRef = useRef<Array<() => void>>([]);
  const limpiarSubs = useCallback(() => {
    unsubsRef.current.forEach((u) => u());
    unsubsRef.current = [];
  }, []);

  // Actualiza una sesión por índice (inmutable). Estable (solo usa setSesiones).
  const actualizarSesion = useCallback((i: number, patch: Partial<SesionEstado>) => {
    setSesiones((prev) => prev.map((s, j) => (j === i ? { ...s, ...patch } : s)));
  }, []);

  useEffect(() => {
    let activo = true;
    void (async () => {
      if (!user?.uid) {
        setLoading(false);
        return;
      }
      try {
        const [es, bs] = await Promise.all([listEstudios(), listBrands(user.uid)]);
        if (!activo) return;
        setEstudios(es);
        setBrands(bs);
      } catch (e) {
        if (activo) setError(e instanceof Error ? e.message : 'No se pudieron cargar los datos');
      } finally {
        if (activo) setLoading(false);
      }
    })();
    return () => {
      activo = false;
    };
  }, [user?.uid]);

  useEffect(() => () => limpiarSubs(), [limpiarSubs]);

  const proponerOutline = useCallback(async () => {
    if (!estudioId || !marcaId) {
      setError('Elige un estudio y una marca');
      return;
    }
    setProponiendo(true);
    setError(null);
    try {
      const n = Number(sesionesSugeridas);
      const sesiones = await proponerOutlineCurso({
        estudioId,
        genero,
        sesionesSugeridas: Number.isFinite(n) && n > 0 ? n : undefined,
      });
      setOutline(sesiones);
      if (!serieNombre) {
        setSerieNombre(estudios.find((e) => e.id === estudioId)?.titulo ?? 'Curso');
      }
      setPaso('outline');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo proponer el curso');
    } finally {
      setProponiendo(false);
    }
  }, [estudioId, marcaId, genero, sesionesSugeridas, serieNombre, estudios]);

  const generarCurso = useCallback(async () => {
    if (outline.length === 0) return;
    limpiarSubs();
    setError(null);
    cursoIdRef.current = crypto.randomUUID();
    setSesiones(outline.map((s) => ({ ...s, estado: 'generando' as const })));
    setPaso('generando');
    try {
      await Promise.all(
        outline.map(async (s, i) => {
          const jobId = await encolarPlanSesion({
            estudioId,
            genero,
            marcaId,
            alcance: s.alcance,
            serie: serieNombre,
            cursoId: cursoIdRef.current,
          });
          const unsub = subscribeJob(
            jobId,
            (job) => {
              if (job.estado === 'listo' && job.plan) {
                actualizarSesion(i, {
                  estado: 'listo',
                  plan: job.plan,
                  validacion: validatePlan(job.plan),
                });
              } else if (job.estado === 'error') {
                actualizarSesion(i, { estado: 'error', error: job.error ?? 'Error' });
              }
            },
            () => actualizarSesion(i, { estado: 'error', error: 'Error al seguir la sesión' }),
          );
          unsubsRef.current.push(unsub);
        }),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudieron encolar las sesiones');
    }
  }, [outline, estudioId, genero, marcaId, serieNombre, limpiarSubs, actualizarSesion]);

  // Cuando ninguna sesión queda 'generando', pasar a resumen.
  useEffect(() => {
    if (paso === 'generando' && sesiones.length > 0 && sesiones.every((s) => s.estado !== 'generando')) {
      limpiarSubs();
      setPaso('resumen');
    }
  }, [paso, sesiones, limpiarSubs]);

  const crearClases = useCallback(async () => {
    const validas = sesiones.filter((s) => s.estado === 'listo' && s.validacion?.ok && s.plan && !s.claseId);
    if (validas.length === 0) return;
    setCreando(true);
    setError(null);
    try {
      for (let i = 0; i < sesiones.length; i++) {
        const s = sesiones[i];
        if (s.estado !== 'listo' || !s.validacion?.ok || !s.plan || s.claseId) continue;
        const { claseId } = await crearClaseDesdePlan(s.plan, marcaId, {
          serie: serieNombre,
          cursoId: cursoIdRef.current,
        });
        actualizarSesion(i, { claseId });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudieron crear las clases');
    } finally {
      setCreando(false);
    }
  }, [sesiones, marcaId, serieNombre, actualizarSesion]);

  const volverAConfig = useCallback(() => {
    limpiarSubs();
    setPaso('config');
    setOutline([]);
    setSesiones([]);
  }, [limpiarSubs]);

  const creadas = useMemo(() => sesiones.filter((s) => s.claseId).length, [sesiones]);
  const validas = useMemo(
    () => sesiones.filter((s) => s.estado === 'listo' && s.validacion?.ok).length,
    [sesiones],
  );

  return {
    estudios,
    brands,
    loading,
    error,
    paso,
    estudioId,
    setEstudioId,
    genero,
    setGenero,
    marcaId,
    setMarcaId,
    sesionesSugeridas,
    setSesionesSugeridas,
    serieNombre,
    setSerieNombre,
    proponiendo,
    outline,
    setOutline,
    sesiones,
    creando,
    creadas,
    validas,
    proponerOutline,
    generarCurso,
    crearClases,
    volverAConfig,
  };
}
