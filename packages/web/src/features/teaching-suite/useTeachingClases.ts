import { useCallback, useEffect, useState } from 'react';
import { useFirebase } from '@/context/firebase-context';
import type { Artefacto } from '@dosfilos/domain';
import {
  listClases,
  seedDemo,
  getPlan,
  openArtifact,
  type TeachingClaseRow,
} from './teachingSuiteService';

/** Estado + acciones de la lista de clases de la Suite de Enseñanza (F1). */
export function useTeachingClases() {
  const { user } = useFirebase();
  const [clases, setClases] = useState<TeachingClaseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!user?.uid) {
      setClases([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setClases(await listClases(user.uid));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar las clases');
    } finally {
      setLoading(false);
    }
  }, [user?.uid]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const sembrarDemo = async () => {
    setSeeding(true);
    setError(null);
    try {
      await seedDemo();
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo sembrar la clase demo');
    } finally {
      setSeeding(false);
    }
  };

  const verArtefacto = async (planId: string, artefacto: Artefacto) => {
    setError(null);
    try {
      const plan = await getPlan(planId);
      if (!plan) {
        setError('No se encontró el plan de la clase.');
        return;
      }
      openArtifact(plan, artefacto);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo abrir el artefacto');
    }
  };

  return { clases, loading, seeding, error, refresh, sembrarDemo, verArtefacto };
}
