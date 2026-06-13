import { useCallback, useEffect, useState } from 'react';
import type { Artefacto } from '@dosfilos/domain';
import { useFirebase } from '@/context/firebase-context';
import {
  listClases,
  listBrands,
  listCanvasComponents,
  seedDemo,
  getPlan,
  renderClaseArtifact,
  previewBrand,
  deleteBrand,
  deleteCanvasComponent,
  openHtml,
  type TeachingClaseRow,
  type BrandRow,
  type CanvasComponentRow,
} from './teachingSuiteService';

/** Estado + acciones de la Suite de Enseñanza (clases + marcas). */
export function useTeachingClases() {
  const { user } = useFirebase();
  const [clases, setClases] = useState<TeachingClaseRow[]>([]);
  const [brands, setBrands] = useState<BrandRow[]>([]);
  const [componentes, setComponentes] = useState<CanvasComponentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!user?.uid) {
      setClases([]);
      setBrands([]);
      setComponentes([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [cs, bs, comps] = await Promise.all([
        listClases(user.uid),
        listBrands(user.uid),
        listCanvasComponents(user.uid),
      ]);
      setClases(cs);
      setBrands(bs);
      setComponentes(comps);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar');
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

  const verArtefacto = async (clase: TeachingClaseRow, artefacto: Artefacto) => {
    setError(null);
    try {
      const plan = await getPlan(clase.planId);
      if (!plan) {
        setError('No se encontró el plan de la clase.');
        return;
      }
      openHtml(await renderClaseArtifact(plan, clase.marcaId, artefacto));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo abrir el artefacto');
    }
  };

  const verMarca = async (marcaId: string) => {
    setError(null);
    try {
      openHtml(await previewBrand(marcaId));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo abrir la vista previa de la marca');
    }
  };

  const eliminarMarca = async (marcaId: string) => {
    setError(null);
    try {
      await deleteBrand(marcaId);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo eliminar la marca');
    }
  };

  const eliminarLamina = async (componentId: string) => {
    setError(null);
    try {
      await deleteCanvasComponent(componentId);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo eliminar la lámina');
    }
  };

  return {
    clases,
    brands,
    componentes,
    loading,
    seeding,
    error,
    refresh,
    sembrarDemo,
    verArtefacto,
    verMarca,
    eliminarMarca,
    eliminarLamina,
  };
}
