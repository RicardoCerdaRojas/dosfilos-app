import type { Confession, ConfessionSection } from '../entities/Confession';

/**
 * Reads + mutates the CORE Library catalog of confessions / creeds /
 * catechisms. Section subcollection lives at
 * `/confessions/{confessionId}/sections/{sectionId}`.
 *
 * Writes happen via Cloud Functions only (super_admin gated). The
 * client reads to render the admin viewer and, in later phases, to
 * resolve citation templates + doctrine-level tags during fidelity
 * passes.
 */
export interface IConfessionRepository {
    listConfessions(): Promise<Confession[]>;
    getConfession(confessionId: string): Promise<Confession | null>;
    listSections(confessionId: string): Promise<ConfessionSection[]>;
}
