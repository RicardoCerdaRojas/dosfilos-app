import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { HomileticalAnalysis } from '@dosfilos/domain';
import { DraftSkeletonPreview } from '../DraftSkeletonPreview';

vi.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (k: string, o?: { returnObjects?: boolean }) => (o?.returnObjects ? [k] : k),
    }),
}));

const conPuntos = (): HomileticalAnalysis =>
    ({
        outline: {
            mainPoints: [
                {
                    title: 'I. Dios habla y revela su voluntad (vv. 1-2)',
                    description: 'd',
                    scriptureReferences: [],
                    pastorDirective: { emphasis: 'Dios habla con propósito' },
                },
                {
                    title: 'II. El hombre desobedece (v. 3)',
                    description: 'd',
                    scriptureReferences: [],
                    application: 'Reconoce dónde estás huyendo.',
                },
                { title: 'III. Punto sin nada del pastor', description: 'd', scriptureReferences: [] },
            ],
        },
    }) as unknown as HomileticalAnalysis;

describe('DraftSkeletonPreview', () => {
    it('muestra los títulos REALES del pastor, no un esqueleto genérico', () => {
        render(<DraftSkeletonPreview homiletics={conPuntos()} />);
        expect(screen.getByText(/Dios habla y revela su voluntad/)).toBeTruthy();
        expect(screen.getByText(/El hombre desobedece/)).toBeTruthy();
    });

    it('marca en QUÉ punto quedó cada cosa que el pastor escribió', () => {
        // La mitad del valor del panel es confirmarle que su trabajo llegó: en
        // este producto ya hubo campos que se llenaban, se veían, y ningún
        // prompt leía.
        render(<DraftSkeletonPreview homiletics={conPuntos()} />);
        expect(screen.getAllByText('drafting.skeleton.yourDirective')).toHaveLength(1);
        expect(screen.getAllByText('drafting.skeleton.yourApplication')).toHaveLength(1);
    });

    it('sin bosquejo no explota: cae al bloque de puntos pendientes', () => {
        render(<DraftSkeletonPreview homiletics={null} />);
        expect(screen.getByText('drafting.skeleton.pointsPending')).toBeTruthy();
    });

    it('siempre enmarca el sermón: introducción, conclusión y llamado', () => {
        render(<DraftSkeletonPreview homiletics={conPuntos()} />);
        expect(screen.getByText('drafting.skeleton.introduction')).toBeTruthy();
        expect(screen.getByText('drafting.skeleton.conclusion')).toBeTruthy();
        expect(screen.getByText('drafting.skeleton.callToAction')).toBeTruthy();
    });
});
