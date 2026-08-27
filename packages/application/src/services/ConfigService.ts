import {
    WorkflowConfiguration,
    IConfigRepository,
    DEFAULT_WORKFLOW_CONFIG,
    resolveUserModel
} from '@dosfilos/domain';

export class ConfigService {
    constructor(private repository: IConfigRepository) { }

    /**
     * SANEA EL MODELO GUARDADO EN LA PUERTA DE ENTRADA.
     *
     * Un pastor que eligió un modelo hoy retirado tiene guardado un id que el
     * servidor rechaza, y desde entonces TODA generación le falla con "Modelo
     * no autorizado" — un error que no le dice que la causa está en una
     * pantalla de ajustes que abrió una vez hace meses.
     *
     * Se corrige acá y no en cada consumidor porque éste es el único lugar por
     * donde la configuración entra: arreglarlo en la pantalla de ajustes sólo
     * ayudaría a quien vuelva a abrirla, que es justamente quien no sabe que
     * tiene que hacerlo. No se le pide nada al pastor; se le devuelve al modelo
     * recomendado y su aplicación vuelve a funcionar.
     */
    async getUserConfig(userId: string): Promise<WorkflowConfiguration> {
        const config = await this.repository.findByUserId(userId);
        if (config) {
            return {
                ...config,
                advanced: {
                    // El bloque se reconstruye entero porque una configuración
                    // vieja puede no tener `advanced` en absoluto — y ahí el
                    // spread dejaría la temperatura sin valor.
                    globalTemperature:
                        config.advanced?.globalTemperature
                        ?? DEFAULT_WORKFLOW_CONFIG.advanced?.globalTemperature
                        ?? 0.7,
                    ...config.advanced,
                    aiModel: resolveUserModel(config.advanced?.aiModel),
                },
            };
        }

        // Return default config if none exists
        return {
            id: crypto.randomUUID(),
            userId,
            ...DEFAULT_WORKFLOW_CONFIG,
            updatedAt: new Date()
        };
    }

    async saveConfig(config: WorkflowConfiguration): Promise<void> {
        config.updatedAt = new Date();
        await this.repository.save(config);
    }
}
