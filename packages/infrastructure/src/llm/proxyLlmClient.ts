import type { ILlmClient, LlmGenerateOptions } from '@dosfilos/domain';
import { runLlmPrompt } from './callableLlm';

/**
 * Adapter del puerto `ILlmClient` sobre el proxy `runLlmPrompt`.
 *
 * Es el puente entre los casos de uso de Pastoral Fidelity —que dependen del
 * PUERTO, no de un SDK— y el único camino por el que el navegador puede hablar
 * con un modelo desde 2026-08: un callable del servidor. El SDK de Gemini no
 * está en el bundle y no debe volver (ver `check-gemini-sdk-boundary.sh`).
 *
 * La `feature` va fija por instancia y debe existir en la allowlist del
 * servidor. No es texto libre: es el corte con el que el panel de costos separa
 * un gasto de otro, así que un caso de uso caro necesita su propia etiqueta o
 * su consumo queda enterrado en el de otro.
 */
export function createProxyLlmClient(feature: string): ILlmClient {
    return {
        generate(options: LlmGenerateOptions): Promise<string> {
            return runLlmPrompt({
                feature,
                prompt: options.prompt,
                ...(options.system ? { system: options.system } : {}),
                ...(options.temperature !== undefined ? { temperature: options.temperature } : {}),
                ...(options.responseMimeType ? { responseMimeType: options.responseMimeType } : {}),
                ...(options.maxOutputTokens !== undefined ? { maxOutputTokens: options.maxOutputTokens } : {}),
            });
        },
    };
}
