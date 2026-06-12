import { useCallback, useEffect, useState } from 'react';
import { validatePlan, type TeachingPlan, type ValidationResult } from '@dosfilos/domain';
import { useFirebase } from '@/context/firebase-context';
import {
  listEstudios,
  listBrands,
  proponerPlan,
  crearClaseDesdePlan,
  type EstudioRow,
  type BrandRow,
} from './teachingSuiteService';

export type GeneroSoportado = 'exegesis' | 'doctrina';
export type GenerarPaso = 'config' | 'revision';

/**
 * Estado + acciones del flujo «generar clase desde un estudio» (F3, Slice A).
 *
 * El asistente propone un `plan`; la validación dura corre AQUÍ con el
 * `validatePlan` de @dosfilos/domain (oráculo único). Si el plan es inválido, la
 * pantalla de revisión muestra los errores y se puede reintentar manualmente
 * (el bucle automático con `erroresPrevios` es Slice B). Aprobar solo procede si
 * la validación pasó.
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
  const [marcaId, setMarcaId] = useState('');

  const [proponiendo, setProponiendo] = useState(false);
  const [creando, setCreando] = useState(false);
  const [plan, setPlan] = useState<TeachingPlan | null>(null);
  const [validacion, setValidacion] = useState<ValidationResult | null>(null);
  const [claseId, setClaseId] = useState<string | null>(null);

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

  const proponer = useCallback(
    async (erroresPrevios?: string[]) => {
      if (!estudioId || !marcaId) {
        setError('Elige un estudio y una marca');
        return;
      }
      setProponiendo(true);
      setError(null);
      try {
        const candidato = await proponerPlan({ estudioId, genero, marcaId, erroresPrevios });
        setPlan(candidato);
        setValidacion(validatePlan(candidato));
        setPaso('revision');
      } catch (e) {
        setError(e instanceof Error ? e.message : 'No se pudo proponer el plan');
      } finally {
        setProponiendo(false);
      }
    },
    [estudioId, marcaId, genero],
  );

  const reintentar = useCallback(() => {
    void proponer(validacion?.errores);
  }, [proponer, validacion]);

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
    setPaso('config');
    setPlan(null);
    setValidacion(null);
  }, []);

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
    proponiendo,
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
