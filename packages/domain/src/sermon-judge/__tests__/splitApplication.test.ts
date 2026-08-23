import { describe, it, expect } from 'vitest';
import { splitApplication } from '../splitApplication';

describe('splitApplication — el conteo lo pone el pastor', () => {
    it('dos bloques separados por línea en blanco → dos implicaciones', () => {
        expect(splitApplication('Vive consciente de su dirección.\n\nLee tu Biblia y ora.')).toEqual([
            'Vive consciente de su dirección.',
            'Lee tu Biblia y ora.',
        ]);
    });

    it('un solo bloque → una implicación', () => {
        expect(splitApplication('Reconoce dónde estás huyendo de una orden clara.')).toHaveLength(1);
    });

    it('un salto SIMPLE no parte: es ajuste de línea, no estructura', () => {
        // Partir ahí trocearía una aplicación en pedazos sin sentido.
        expect(splitApplication('Reconoce dónde estás\nhuyendo de una orden clara.')).toEqual([
            'Reconoce dónde estás huyendo de una orden clara.',
        ]);
    });

    it('quita la viñeta con que el pastor abrió el bloque', () => {
        // La lista la arma el renderizador; el texto no la trae.
        expect(splitApplication('- Primera cosa\n\n- Segunda cosa')).toEqual(['Primera cosa', 'Segunda cosa']);
        expect(splitApplication('1. Primera\n\n2. Segunda')).toEqual(['Primera', 'Segunda']);
    });

    it('vacío, espacios o undefined → ninguna implicación', () => {
        expect(splitApplication(undefined)).toEqual([]);
        expect(splitApplication('   ')).toEqual([]);
        expect(splitApplication('\n\n\n')).toEqual([]);
    });

    it('tres bloques con líneas en blanco de más siguen siendo tres', () => {
        expect(splitApplication('Una.\n\n\n\nDos.\n  \nTres.')).toHaveLength(3);
    });
});

describe('splitApplication — viñetas con un solo Enter (caso real del fundador)', () => {
    it('parte la lista con viñetas aunque NO haya línea en blanco', () => {
        // Dato real del sermón de Jonás, punto I. Antes salía fundido en una
        // sola frase corrida porque sólo se partía por línea en blanco.
        expect(
            splitApplication(
                '* Dios habla, asi que vive consciente de su dirección.\n* Dios habla, lee tu biblia, ora, escucha a tu pastor.',
            ),
        ).toEqual([
            'Dios habla, asi que vive consciente de su dirección.',
            'Dios habla, lee tu biblia, ora, escucha a tu pastor.',
        ]);
    });

    it('funciona con guiones y con numeración', () => {
        expect(splitApplication('- uno\n- dos')).toEqual(['uno', 'dos']);
        expect(splitApplication('1. uno\n2) dos')).toEqual(['uno', 'dos']);
    });

    it('una línea SIN viñeta continúa el ítem anterior, no abre uno nuevo', () => {
        // Un ítem largo que se partió al escribir sigue siendo un ítem.
        expect(splitApplication('* Recapacita de tus reacciones\n  hostiles a Dios.\n* Pide ser como Cristo.')).toEqual([
            'Recapacita de tus reacciones hostiles a Dios.',
            'Pide ser como Cristo.',
        ]);
    });

    it('UNA sola viñeta no activa el modo lista: sigue siendo una aplicación', () => {
        expect(splitApplication('* Una sola cosa que hacer.')).toEqual(['Una sola cosa que hacer.']);
    });

    it('viñetas CON línea en blanco también parten bien', () => {
        expect(splitApplication('* uno\n\n* dos')).toEqual(['uno', 'dos']);
    });
});
