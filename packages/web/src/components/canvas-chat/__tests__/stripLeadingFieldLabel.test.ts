import { describe, it, expect } from 'vitest';
import { stripLeadingFieldLabel } from '../stripLeadingFieldLabel';

describe('stripLeadingFieldLabel — el marcador huérfano no llega al púlpito', () => {
    it('caso real: etiqueta y título dentro de UNA negrita', () => {
        // Lo que el pastor vio en su sermón de Jonás: "El Mensajero Real**".
        expect(stripLeadingFieldLabel('**Ilustración: El Mensajero Real**\n\nImaginemos…', 'Ilustración'))
            .toBe('El Mensajero Real\n\nImaginemos…');
    });

    it('etiqueta y título en negritas SEPARADAS: el título conserva la suya', () => {
        expect(stripLeadingFieldLabel('**Ilustración:** **El Río Contaminado**\n\nTexto', 'Ilustración'))
            .toBe('**El Río Contaminado**\n\nTexto');
    });

    it('sin etiqueta no toca nada', () => {
        expect(stripLeadingFieldLabel('**El Mensajero Real**\n\nTexto', 'Ilustración'))
            .toBe('**El Mensajero Real**\n\nTexto');
    });

    it('etiqueta sin negritas', () => {
        expect(stripLeadingFieldLabel('Ilustración: El Mensajero Real', 'Ilustración'))
            .toBe('El Mensajero Real');
    });

    it('aplica igual a la cita de autoridad', () => {
        expect(stripLeadingFieldLabel('**Cita de Autoridad: Calvino sobre Jonás**\n\n> texto', 'Cita de Autoridad'))
            .toBe('Calvino sobre Jonás\n\n> texto');
    });

    it('valores vacíos o sin etiqueta pasan intactos', () => {
        expect(stripLeadingFieldLabel('', 'Ilustración')).toBe('');
        expect(stripLeadingFieldLabel('algo', '')).toBe('algo');
    });
});
