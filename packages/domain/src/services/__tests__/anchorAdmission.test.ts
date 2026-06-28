import { describe, it, expect } from 'vitest';
import {
    decideAnchorAdmission,
    anchorAdmissionConfronts,
    isAnchorCitable,
    aggregateAnchorVerification,
    type AnchorAdmissionInput,
} from '../anchorAdmission';
import type {
    AnchorVerification,
    CorrectiveAnchor,
    MisreadingReviewStatus,
} from '../../entities/VerifiedMisreading';

function input(
    v: Partial<AnchorVerification> | undefined,
    reviewStatus: MisreadingReviewStatus,
): AnchorAdmissionInput {
    return {
        verification: v === undefined ? undefined : { versesExist: true, refutes: 'yes', ...v },
        reviewStatus,
    };
}

describe('decideAnchorAdmission — fail-closed por construcción (ADR-036)', () => {
    it('sin verificación → reject (no asumir)', () => {
        expect(decideAnchorAdmission(input(undefined, 'reviewed'))).toBe('reject');
    });

    it('verso inexistente → reject AUNQUE refutes:yes + reviewed (ancla inventada)', () => {
        expect(decideAnchorAdmission(input({ versesExist: false, refutes: 'yes' }, 'reviewed'))).toBe(
            'reject',
        );
    });

    it('refutes:no → reject (no refuta de verdad)', () => {
        expect(decideAnchorAdmission(input({ refutes: 'no' }, 'reviewed'))).toBe('reject');
    });

    it('refutes:unclear → review-queue, NUNCA confront (R1, no se descarta)', () => {
        expect(decideAnchorAdmission(input({ refutes: 'unclear' }, 'reviewed'))).toBe('review-queue');
        expect(decideAnchorAdmission(input({ refutes: 'unclear' }, 'pending-pastoral-review'))).toBe(
            'review-queue',
        );
    });

    it('refutes:yes verificado pero SIN aval → review-queue (falta floor-reviewer)', () => {
        expect(decideAnchorAdmission(input({ refutes: 'yes' }, 'pending-pastoral-review'))).toBe(
            'review-queue',
        );
    });

    it('ÚNICA vía a confront: versesExist && refutes:yes && reviewed', () => {
        expect(decideAnchorAdmission(input({ versesExist: true, refutes: 'yes' }, 'reviewed'))).toBe(
            'confront',
        );
    });
});

describe('GUARDRAIL — ninguna combinación distinta de (existe+yes+reviewed) confronta', () => {
    // Producto cartesiano de TODOS los estados. Solo UNA celda debe confrontar.
    // Si alguien afloja la guarda (p.ej. acepta unclear o sin-revisar), este test
    // rompe CI — es el equivalente a la fila ortogonal / cross-chapter de 035.
    const existsOpts = [true, false];
    const refutesOpts = ['yes', 'unclear', 'no'] as const;
    const reviewOpts: MisreadingReviewStatus[] = ['reviewed', 'pending-pastoral-review'];

    let confrontCount = 0;
    for (const versesExist of existsOpts) {
        for (const refutes of refutesOpts) {
            for (const reviewStatus of reviewOpts) {
                const admission = decideAnchorAdmission(input({ versesExist, refutes }, reviewStatus));
                const confronts = anchorAdmissionConfronts(admission);
                const isTheOnlySafeCell = versesExist && refutes === 'yes' && reviewStatus === 'reviewed';
                it(`exists=${versesExist} refutes=${refutes} review=${reviewStatus} → confronts=${isTheOnlySafeCell}`, () => {
                    expect(confronts).toBe(isTheOnlySafeCell);
                });
                if (confronts) confrontCount += 1;
            }
        }
    }
    // sin verificación tampoco confronta
    it('exactamente UNA combinación confronta en todo el espacio', () => {
        expect(confrontCount).toBe(1);
        expect(anchorAdmissionConfronts(decideAnchorAdmission(input(undefined, 'reviewed')))).toBe(false);
    });
});

describe('aggregateAnchorVerification — entrada confronta con su mejor ancla', () => {
    it('≥1 ancla existe+yes → entrada yes', () => {
        expect(
            aggregateAnchorVerification([
                { versesExist: true, refutes: 'no' },
                { versesExist: true, refutes: 'yes' },
            ]),
        ).toEqual({ versesExist: true, refutes: 'yes' });
    });

    it('FAIL-CLOSED: ancla con yes pero verso INEXISTENTE no aporta yes', () => {
        expect(aggregateAnchorVerification([{ versesExist: false, refutes: 'yes' }])).toEqual({
            versesExist: false,
            refutes: 'no',
        });
    });

    it('sin yes válido, con unclear → unclear', () => {
        expect(
            aggregateAnchorVerification([
                { versesExist: true, refutes: 'no' },
                { versesExist: true, refutes: 'unclear' },
            ]),
        ).toEqual({ versesExist: true, refutes: 'unclear' });
    });

    it('todas no → no; versesExist refleja si alguna existe', () => {
        expect(aggregateAnchorVerification([{ versesExist: true, refutes: 'no' }])).toEqual({
            versesExist: true,
            refutes: 'no',
        });
        expect(aggregateAnchorVerification([])).toEqual({ versesExist: false, refutes: 'no' });
    });
});

describe('isAnchorCitable — R3, fail-closed de procedencia', () => {
    const base: CorrectiveAnchor = { reference: 'Juan 10:28-29' };

    it('sin sourceId → NO citable (sin-fuente-trazable)', () => {
        expect(isAnchorCitable(base)).toBe(false);
    });

    it('con sourceId pero provenanceVerified ausente/false → NO citable', () => {
        expect(isAnchorCitable({ ...base, sourceId: 'chunk-1' })).toBe(false);
        expect(isAnchorCitable({ ...base, sourceId: 'chunk-1', provenanceVerified: false })).toBe(false);
    });

    it('sourceId + provenanceVerified:true → citable', () => {
        expect(isAnchorCitable({ ...base, sourceId: 'chunk-1', provenanceVerified: true })).toBe(true);
    });
});
