import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import {
    DEFAULT_MODEL,
    LLM_MODELS,
    MODEL_EMBEDDING,
    isKnownModel,
    resolveUserModel,
    selectableModels,
} from '../modelCatalog';
import { LLM_PRICING } from '../llmCost';

describe('catálogo de modelos — la baranda que faltaba', () => {
    it('TODO modelo ofrecible tiene precio en la tabla', () => {
        // ÉSTA ES LA PRUEBA QUE IMPORTA. `runLlmPrompt` rechaza cualquier modelo
        // sin precio conocido, así que ofrecer uno sin precio es publicar en
        // ajustes una opción que rompe toda generación con "Modelo no
        // autorizado". Pasó de verdad: el selector ofrecía `gemini-1.5-pro` y
        // `gemini-2.0-flash-exp`, ninguno en la tabla.
        for (const model of selectableModels()) {
            expect(LLM_PRICING[model.id], `${model.id} se ofrece pero no tiene precio`).toBeDefined();
        }
    });

    it('el modelo por defecto también tiene precio', () => {
        expect(LLM_PRICING[DEFAULT_MODEL]).toBeDefined();
    });

    it('los ids no se repiten', () => {
        const ids = LLM_MODELS.map((m) => m.id);
        expect(new Set(ids).size).toBe(ids.length);
    });
});

describe('paridad con el catálogo del dominio', () => {
    it('las dos copias declaran los mismos modelos', () => {
        // `packages/functions` no puede importar `@dosfilos/domain`, así que la
        // lista está duplicada a propósito. Se compara el TEXTO de la fuente
        // porque no hay forma de importar la otra copia sin romper el build.
        const canonico = readFileSync(
            join(__dirname, '../../../../domain/src/llm/modelCatalog.ts'),
            'utf8',
        );
        for (const model of LLM_MODELS) {
            expect(canonico, `${model.id} falta en el catálogo del dominio`).toContain(`'${model.id}'`);
        }
        // Y al revés: un modelo agregado allá y no acá también rompe.
        const idsCanonicos = [...canonico.matchAll(/^export const MODEL_[A-Z_]+ = '([^']+)';$/gm)].map(
            (m) => m[1],
        );
        expect(idsCanonicos.sort()).toEqual(LLM_MODELS.map((m) => m.id).sort());
    });
});

describe('resolveUserModel — sanea lo que quedó guardado', () => {
    it('un modelo retirado cae al recomendado, no rompe', () => {
        // El pastor que eligió esto hace meses tiene la app rota y no sabe por
        // qué. No se le pide que arregle nada: se le devuelve al recomendado.
        expect(resolveUserModel('gemini-1.5-pro')).toBe(DEFAULT_MODEL);
        expect(resolveUserModel('gemini-2.0-flash-exp')).toBe(DEFAULT_MODEL);
    });

    it('sin nada guardado usa el recomendado', () => {
        expect(resolveUserModel(undefined)).toBe(DEFAULT_MODEL);
        expect(resolveUserModel('')).toBe(DEFAULT_MODEL);
    });

    it('un modelo real pero NO ofrecible tampoco pasa', () => {
        // Nadie debería estar generando sermones con el modelo de embeddings.
        expect(isKnownModel(MODEL_EMBEDDING)).toBe(true);
        expect(resolveUserModel(MODEL_EMBEDDING)).toBe(DEFAULT_MODEL);
    });

    it('un modelo ofrecible se respeta', () => {
        for (const model of selectableModels()) {
            expect(resolveUserModel(model.id)).toBe(model.id);
        }
    });
});
