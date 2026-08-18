/**
 * Phase 2.5 PR B (ADR-028) — Guided Sermon Service.
 *
 * Wires the use cases with concrete adapters and exposes a clean API for
 * the web hook (`useGuidedSermon`). Mirrors the singleton pattern used by
 * `pastoralSeedService` — keeps the web free of construction details +
 * lets tests swap dependencies via the class constructor.
 *
 * IMPORTANT: All four use cases run CLIENT-SIDE. The functions package
 * deliberately stays decoupled from `@dosfilos/domain` and
 * `@dosfilos/application` (see ADR-028 + the duplicate-type comments in
 * existing callables). The only server hop is the thin LLM proxy
 * (`runSocraticTurnLlm` callable), wrapped by the `ILlmClient` adapter
 * passed in here.
 */

import type {
    GuidedSermonSession,
    IAIChatRepository,
    ICoverageEngagementJudge,
    IGenreEngagementJudge,
    ILlmClient,
    IPastoralSeedRepository,
    IStepPolicyRegistry,
    PassageProfile,
    PastoralSeed,
    SocraticTurnResult,
    AIChatMessage,
} from '@dosfilos/domain';
import { defaultStepPolicyRegistry } from '@dosfilos/domain';
import { FirestoreAIChatRepository, FirestorePastoralSeedRepository } from '@dosfilos/infrastructure';
import {
    ActivateGuidedSermonUseCase,
    type ActivateGuidedSermonInput,
} from '../use-cases/guided-sermon/ActivateGuidedSermonUseCase';
import {
    PauseGuidedSermonUseCase,
    type PauseGuidedSermonInput,
} from '../use-cases/guided-sermon/PauseGuidedSermonUseCase';
import {
    ResumeGuidedSermonUseCase,
    type ResumeGuidedSermonInput,
} from '../use-cases/guided-sermon/ResumeGuidedSermonUseCase';
import {
    RunSocraticTurnUseCase,
    type RunSocraticTurnInput,
} from '../use-cases/guided-sermon/RunSocraticTurnUseCase';
import {
    SubmitGuidedInsightUseCase,
    type SubmitGuidedInsightInput,
    type SubmitGuidedInsightResult,
} from '../use-cases/guided-sermon/SubmitGuidedInsightUseCase';
import {
    SubmitGuidedWordStudiesUseCase,
    type SubmitGuidedWordStudiesInput,
    type SubmitGuidedWordStudiesResult,
} from '../use-cases/guided-sermon/SubmitGuidedWordStudiesUseCase';
import {
    PronounceGuidedGenreUseCase,
    type PronounceGuidedGenreInput,
    type PronounceGuidedGenreResult,
} from '../use-cases/guided-sermon/PronounceGuidedGenreUseCase';
import { CallableLlmClient } from './CallableLlmClient';
import { CallableCoverageEngagementJudge } from './CallableCoverageEngagementJudge';
import { CallableGenreEngagementJudge } from './CallableGenreEngagementJudge';

export interface GuidedSermonServiceDeps {
    chatRepo: IAIChatRepository;
    seedRepo: IPastoralSeedRepository;
    llmClient: ILlmClient;
    registry: IStepPolicyRegistry;
    /** ADR-035 CA1 (D) — juez de engagement opcional. Ausente ⇒ confront de
     * lectura errónea no corre. */
    coverageJudge?: ICoverageEngagementJudge;
    /** Redacción v2 Fase 1 (§4.4) — juez de engagement de género opcional.
     * Ausente ⇒ el confront del override de género no corre. */
    genreJudge?: IGenreEngagementJudge;
}

export interface ActivateGuidedSermonResult {
    seed: PastoralSeed;
    guidedSermonSession: GuidedSermonSession;
    welcomeMessage: AIChatMessage;
}

export class GuidedSermonService {
    private readonly activateUC: ActivateGuidedSermonUseCase;
    private readonly runTurnUC: RunSocraticTurnUseCase;
    private readonly submitInsightUC: SubmitGuidedInsightUseCase;
    private readonly submitWordStudiesUC: SubmitGuidedWordStudiesUseCase;
    private readonly pronounceGenreUC: PronounceGuidedGenreUseCase;
    private readonly pauseUC: PauseGuidedSermonUseCase;
    private readonly resumeUC: ResumeGuidedSermonUseCase;
    private readonly seedRepo: IPastoralSeedRepository;

    constructor(deps: GuidedSermonServiceDeps) {
        this.seedRepo = deps.seedRepo;
        this.activateUC = new ActivateGuidedSermonUseCase(deps.chatRepo, deps.seedRepo);
        this.runTurnUC = new RunSocraticTurnUseCase(
            deps.chatRepo,
            deps.seedRepo,
            deps.llmClient,
            deps.registry,
            deps.coverageJudge,
            deps.genreJudge,
        );
        this.submitInsightUC = new SubmitGuidedInsightUseCase(deps.chatRepo, deps.seedRepo);
        this.submitWordStudiesUC = new SubmitGuidedWordStudiesUseCase(deps.chatRepo, deps.seedRepo);
        this.pronounceGenreUC = new PronounceGuidedGenreUseCase(deps.seedRepo);
        this.pauseUC = new PauseGuidedSermonUseCase(deps.chatRepo);
        this.resumeUC = new ResumeGuidedSermonUseCase(deps.chatRepo);
    }

    activate(input: ActivateGuidedSermonInput): Promise<ActivateGuidedSermonResult> {
        return this.activateUC.execute(input);
    }

    runTurn(input: RunSocraticTurnInput): Promise<SocraticTurnResult> {
        return this.runTurnUC.execute(input);
    }

    /** Paso 8 estructurado: persiste el Insight desde el formulario (sin LLM/parse). */
    submitInsight(input: SubmitGuidedInsightInput): Promise<SubmitGuidedInsightResult> {
        return this.submitInsightUC.execute(input);
    }

    /** Paso 4 estructurado: persiste los Estudios de Palabras desde el formulario. */
    submitWordStudies(input: SubmitGuidedWordStudiesInput): Promise<SubmitGuidedWordStudiesResult> {
        return this.submitWordStudiesUC.execute(input);
    }

    /**
     * Redacción v2 0b-B (§4.4) — registra el ACTO del pastor sobre el género en
     * el paso 2 guiado. Escritura al seed, no turno del chat: la implicancia
     * interpretativa la sigue escribiendo él en su propio mensaje.
     */
    pronounceGenre(input: PronounceGuidedGenreInput): Promise<PronounceGuidedGenreResult> {
        return this.pronounceGenreUC.execute(input);
    }

    /**
     * ADR-035 A — cristaliza el perfil del pasaje en el seed (additivo, inerte).
     * Lo escribe la activación bajo el flag de sombra `passage_profile`; queda
     * disponible para que el enforce (`passage_profile_enforce`) lo lea. No
     * confronta ni nudgea — solo persiste el dato.
     */
    crystallizePassageProfile(seedId: string, profile: PassageProfile): Promise<void> {
        return this.seedRepo.update(seedId, { passageProfile: profile });
    }

    pause(input: PauseGuidedSermonInput): Promise<void> {
        return this.pauseUC.execute(input);
    }

    resume(input: ResumeGuidedSermonInput): Promise<void> {
        return this.resumeUC.execute(input);
    }
}

/** Default singleton — Firestore client SDK adapters + CallableLlmClient proxy. */
export const guidedSermonService = new GuidedSermonService({
    chatRepo: new FirestoreAIChatRepository(),
    seedRepo: new FirestorePastoralSeedRepository(),
    llmClient: new CallableLlmClient(),
    registry: defaultStepPolicyRegistry,
    coverageJudge: new CallableCoverageEngagementJudge(),
    genreJudge: new CallableGenreEngagementJudge(),
});
