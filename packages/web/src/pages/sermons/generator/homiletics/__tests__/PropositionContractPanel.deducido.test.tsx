import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type { HomileticalAnalysis } from '@dosfilos/domain';
import { PropositionContractPanel } from '../PropositionContractPanel';

/**
 * Regresión del pasaje DEDUCIDO DEL PUNTO EQUIVOCADO.
 *
 * `deducido` leía `mainPoints[i]` por POSICIÓN mientras el resto del panel usa
 * `srcIndex`. Al borrar un punto del medio, la lista local se corre y la
 * original no: el marcador de posición del punto siguiente pasaba a sugerir el
 * pasaje del punto original anterior.
 *
 * Es la corrupción silenciosa contra la que este archivo declara existir, y se
 * veía sólo en un placeholder — por eso nadie lo notó y por eso el test tiene
 * que ir hasta el DOM. Probar `pointPassageRef` sola no lo habría atrapado: esa
 * función siempre estuvo bien; el error estaba en QUÉ punto se le pasaba.
 */

vi.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (k: string) => k,
    }),
}));

/**
 * Títulos SIN "(vv. N)" a propósito: así `pointPassageRef` agota el título y
 * cae en `scriptureReferences[0]`, que es la rama donde vivía el error. Con
 * versículos en el título el bug queda tapado.
 */
const homiletics = {
    homileticalProposition: 'En Jonás 1 vemos tres verdades.',
    contemporaryApplication: [],
    outline: {
        mainPoints: [
            { title: 'I. Uno', description: 'd', scriptureReferences: ['Jonás 1:1'] },
            { title: 'II. Dos', description: 'd', scriptureReferences: ['Jonás 1:2'] },
            { title: 'III. Tres', description: 'd', scriptureReferences: ['Jonás 1:3'] },
        ],
    },
} as unknown as HomileticalAnalysis;

const passageInputs = () =>
    screen.getAllByLabelText('homiletics.contract.passageRefLabel') as HTMLInputElement[];

function renderPanel() {
    return render(
        <PropositionContractPanel
            homiletics={homiletics}
            sermonPassage="Jonás 1:1-3"
            onApply={vi.fn()}
        />,
    );
}

describe('PropositionContractPanel — pasaje deducido', () => {
    it('sin borrar nada, cada punto sugiere SU propio pasaje', () => {
        renderPanel();
        const inputs = passageInputs();
        expect(inputs).toHaveLength(3);
        expect(inputs[0]!.placeholder).toBe('Jonás 1:1');
        expect(inputs[1]!.placeholder).toBe('Jonás 1:2');
        expect(inputs[2]!.placeholder).toBe('Jonás 1:3');
    });

    it('BORRAR EL PUNTO DEL MEDIO no corre los pasajes sugeridos', () => {
        renderPanel();
        // El segundo botón de borrar: el punto del medio.
        fireEvent.click(screen.getAllByLabelText('homiletics.contract.removePoint')[1]!);

        const inputs = passageInputs();
        expect(inputs).toHaveLength(2);
        expect(inputs[0]!.placeholder).toBe('Jonás 1:1');
        // Mapeando por posición esto decía "Jonás 1:2" — el pasaje del punto
        // que el pastor acababa de borrar, pegado al que sobrevivió.
        expect(inputs[1]!.placeholder).toBe('Jonás 1:3');
    });

    it('borrar el PRIMERO tampoco arrastra a los demás', () => {
        renderPanel();
        fireEvent.click(screen.getAllByLabelText('homiletics.contract.removePoint')[0]!);

        const inputs = passageInputs();
        expect(inputs).toHaveLength(2);
        expect(inputs[0]!.placeholder).toBe('Jonás 1:2');
        expect(inputs[1]!.placeholder).toBe('Jonás 1:3');
    });

    it('un punto NUEVO no hereda el pasaje del que ocupa su posición', () => {
        renderPanel();
        fireEvent.click(screen.getByText('homiletics.contract.addPoint'));

        const inputs = passageInputs();
        expect(inputs).toHaveLength(4);
        // `srcIndex: null` — no hay punto original del que deducir, así que cae
        // al marcador genérico en vez de robarle el pasaje a un vecino.
        expect(inputs[3]!.placeholder).toBe('homiletics.contract.passageRefPlaceholder');
    });
});
