import { useCallback, useEffect, useRef, useState } from 'react';
import { validatePlan, type TeachingPlan, type ValidationResult } from '@dosfilos/domain';
import { useFirebase } from '@/context/firebase-context';
import {
  listEstudios,
  listBrands,
  encolarPlanSesion,
  subscribeJob,
  crearClaseDesdePlan,
  type EstudioRow,
  type BrandRow,
} from './teachingSuiteService';

export type GeneroSoportado = 'exegesis' | 'doctrina' | 'consejeria';
export type ModalidadSoportada = 'clase' | 'sesion';
export type GenerarPaso = 'config' | 'revision';

/**
 * Estado + acciones del flujo «generar clase desde un estudio» (F3, Slice B).
 *
 * La generación es ASÍNCRONA: encola un job y escucha su doc por onSnapshot
 * (sin timeout de cliente). Cuando el job queda 'listo', la validación dura
 * corre AQUÍ con `validatePlan` de @dosfilos/domain (oráculo único) y se pasa a
 * la pantalla de revisión. Reintentar encola un nuevo job. Aprobar solo procede
 * si la validación pasó.
 */
export function useGenerarPlan() {
  const { user } = useFirebase();

  const [estudios, setEstudios] = useState<EstudioRow[]>([]);
  const [brands, setBrands] = useState<BrandRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [paso, setPaso] = useState<GenerarPaso>('config');
  const [estudioId, setEstudioId] = useState('');
  const [genero, setGenero] = useState<GeneroSoportado>('exegesis');
  const [modalidad, setModalidad] = useState<ModalidadSoportada>('sesion');
  const [marcaId, setMarcaId] = useState('');

  const [generando, setGenerando] = useState(false);
  const [creando, setCreando] = useState(false);
  const [plan, setPlan] = useState<TeachingPlan | null>(null);
  const [validacion, setValidacion] = useState<ValidationResult | null>(null);
  const [claseId, setClaseId] = useState<string | null>(null);

  const unsubRef = useRef<(() => void) | null>(null);
  const limpiarSub = useCallback(() => {
    unsubRef.current?.();
    unsubRef.current = null;
  }, []);

  useEffect(() => {
    let activo = true;
    void (async () => {
      if (!user?.uid) {
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
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

  // Cancelar la suscripción al desmontar.
  useEffect(() => () => limpiarSub(), [limpiarSub]);

  const proponer = useCallback(async () => {
    if (!estudioId || !marcaId) {
      setError('Elige un estudio y una marca');
      return;
    }
    limpiarSub();
    setGenerando(true);
    setError(null);
    setPaso('revision');
    setPlan(null);
    setValidacion(null);
    try {
      const jobId = await encolarPlanSesion({
        estudioId,
        genero,
        marcaId,
        modalidad: genero === 'consejeria' ? modalidad : undefined,
      });
      unsubRef.current = subscribeJob(
        jobId,
        (job) => {
          if (job.estado === 'listo' && job.plan) {
            setPlan(job.plan);
            setValidacion(validatePlan(job.plan));
            setGenerando(false);
            limpiarSub();
          } else if (job.estado === 'error') {
            setError(job.error ?? 'No se pudo generar el plan');
            setGenerando(false);
            setPaso('config');
            limpiarSub();
          }
        },
        (e) => {
          setError(e.message);
          setGenerando(false);
          setPaso('config');
          limpiarSub();
        },
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo iniciar la generación');
      setGenerando(false);
      setPaso('config');
    }
  }, [estudioId, marcaId, genero, modalidad, limpiarSub]);

  const reintentar = useCallback(() => {
    void proponer();
  }, [proponer]);

  const aprobar = useCallback(async () => {
    if (!plan || !validacion?.ok) return;
    setCreando(true);
    setError(null);
    try {
      const { claseId: nuevo } = await crearClaseDesdePlan(plan, marcaId);
      setClaseId(nuevo);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo crear la clase');
    } finally {
      setCreando(false);
    }
  }, [plan, validacion, marcaId]);

  const volverAConfig = useCallback(() => {
    limpiarSub();
    setGenerando(false);
    setPaso('config');
    setPlan(null);
    setValidacion(null);
  }, [limpiarSub]);

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
    modalidad,
    setModalidad,
    marcaId,
    setMarcaId,
    generando,
    creando,
    plan,
    validacion,
    claseId,
    proponer,
    reintentar,
    aprobar,
    volverAConfig,
  };
}
