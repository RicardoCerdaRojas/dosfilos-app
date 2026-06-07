import {
    collection,
    doc,
    setDoc,
    updateDoc,
    getDoc,
    getDocs,
    deleteDoc,
    query,
    where,
    orderBy,
    limit,
    QueryConstraint,
    serverTimestamp,
    Timestamp,
} from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { ISermonRepository, FindOptions } from '@dosfilos/domain';
import { SermonEntity } from '@dosfilos/domain';
import type { FidelityReport, FidelityVerdict, GateOverride } from '@dosfilos/domain';
import type { ContraScanReport, DissentingChunk } from '@dosfilos/domain';
import { db } from '../config/firebase';

export class FirebaseSermonRepository implements ISermonRepository {
    private collectionName = 'sermons';

    async create(sermon: SermonEntity): Promise<SermonEntity> {
        const sermonRef = doc(db, this.collectionName, sermon.id);
        const firestoreData = this.sermonToFirestore(sermon);


        try {
            await setDoc(sermonRef, firestoreData);

            return sermon;
        } catch (error: any) {
            console.error('❌ Firestore setDoc error:', error);
            console.error('❌ Error code:', error.code);
            console.error('❌ Error message:', error.message);
            throw error;
        }
    }

    async update(sermon: SermonEntity): Promise<SermonEntity> {
        const sermonRef = doc(db, this.collectionName, sermon.id);
        await setDoc(sermonRef, this.sermonToFirestore(sermon), { merge: true });
        return sermon;
    }

    async delete(id: string): Promise<void> {
        const sermonRef = doc(db, this.collectionName, id);
        await deleteDoc(sermonRef);
    }

    async findById(id: string): Promise<SermonEntity | null> {


        try {
            const sermonRef = doc(db, this.collectionName, id);
            const snapshot = await getDoc(sermonRef);

            if (!snapshot.exists()) {

                return null;
            }


            return this.firestoreToSermon(snapshot.id, snapshot.data());
        } catch (error: any) {
            // Only log unexpected errors, not permission-denied (common when doc was deleted)
            if (error.code !== 'permission-denied') {
                console.error('❌ FirebaseSermonRepository.findById error:', error);
                console.error('❌ Error code:', error.code);
                console.error('❌ Error message:', error.message);
            }
            throw error;
        }
    }

    async findByShareToken(token: string): Promise<SermonEntity | null> {
        const q = query(
            collection(db, this.collectionName),
            where('shareToken', '==', token),
            where('isShared', '==', true),
            limit(1)
        );
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
            return null;
        }

        const doc = snapshot.docs[0]!;
        return this.firestoreToSermon(doc.id, doc.data());
    }

    async findByUserId(userId: string, options?: FindOptions): Promise<SermonEntity[]> {
        const constraints: QueryConstraint[] = [where('userId', '==', userId)];

        if (options?.status) {
            constraints.push(where('status', '==', options.status));
        }

        if (options?.category) {
            constraints.push(where('category', '==', options.category));
        }

        if (options?.tags && options.tags.length > 0) {
            constraints.push(where('tags', 'array-contains-any', options.tags));
        }

        const orderByField = options?.orderBy ?? 'createdAt';
        const orderDirection = options?.order ?? 'desc';
        constraints.push(orderBy(orderByField, orderDirection));

        if (options?.limit) {
            constraints.push(limit(options.limit));
        }

        const q = query(collection(db, this.collectionName), ...constraints);
        const snapshot = await getDocs(q);

        return snapshot.docs.map((doc) => this.firestoreToSermon(doc.id, doc.data()));
    }

    /**
     * Trimmed list read — delegates to the `getSermonsListSummary` callable,
     * which mirrors this query server-side and strips the heavy fields
     * (`content`, wizard draft/outline, citationManifest, fidelityReport,
     * studyDepthSnapshot). Builds SermonEntity instances from the light payload
     * so the dashboard's property reads keep working; the full sermon loads via
     * `findById` when one is opened.
     */
    async findSummariesByUserId(userId: string, options?: FindOptions): Promise<SermonEntity[]> {
        const callable = httpsCallable<FindOptions, { sermons: any[] }>(
            getFunctions(),
            'getSermonsListSummary',
        );
        const res = await callable({
            status: options?.status,
            category: options?.category,
            tags: options?.tags,
            orderBy: options?.orderBy,
            order: options?.order,
            limit: options?.limit,
        });
        const ms = (v: any): Date | undefined => (typeof v === 'number' ? new Date(v) : undefined);
        return (res.data.sermons ?? []).map((s: any) =>
            SermonEntity.createSummary({
                id: s.id,
                userId: s.userId,
                title: s.title ?? '',
                content: '', // omitted in the summary; full content loads on open
                bibleReferences: Array.isArray(s.bibleReferences) ? s.bibleReferences : [],
                tags: Array.isArray(s.tags) ? s.tags : [],
                category: s.category,
                status: s.status,
                createdAt: ms(s.createdAt) ?? new Date(),
                updatedAt: ms(s.updatedAt) ?? new Date(),
                publishedAt: ms(s.publishedAt),
                shareToken: s.shareToken,
                isShared: s.isShared,
                authorName: s.authorName,
                seriesId: s.seriesId,
                scheduledDate: ms(s.scheduledDate),
                preachingHistory: [],
                wizardProgress: s.wizardProgress
                    ? {
                          currentStep: s.wizardProgress.currentStep ?? 0,
                          passage: s.wizardProgress.passage ?? '',
                          lastSaved: ms(s.wizardProgress.lastSaved) ?? new Date(),
                      }
                    : undefined,
                sourceSermonId: s.sourceSermonId,
                sourceFacultySessionId: s.sourceFacultySessionId ?? undefined,
                projectId: s.projectId ?? undefined,
                sourcePaperId: s.sourcePaperId ?? undefined,
                versionOf: s.versionOf ?? undefined,
                versionLabel: s.versionLabel ?? undefined,
            }),
        );
    }

    async findAll(options?: FindOptions): Promise<SermonEntity[]> {
        const constraints: QueryConstraint[] = [];

        if (options?.status) {
            constraints.push(where('status', '==', options.status));
        }

        const orderByField = options?.orderBy ?? 'createdAt';
        const orderDirection = options?.order ?? 'desc';
        constraints.push(orderBy(orderByField, orderDirection));

        if (options?.limit) {
            constraints.push(limit(options.limit));
        }

        const q = query(collection(db, this.collectionName), ...constraints);
        const snapshot = await getDocs(q);

        return snapshot.docs.map((doc) => this.firestoreToSermon(doc.id, doc.data()));
    }

    async findByDraftId(draftId: string, userId: string): Promise<SermonEntity[]> {
        const q = query(
            collection(db, this.collectionName),
            where('userId', '==', userId),
            where('sourceSermonId', '==', draftId),
            where('status', '==', 'published'),
            orderBy('publishedAt', 'desc')
        );
        const snapshot = await getDocs(q);

        return snapshot.docs.map((doc) => this.firestoreToSermon(doc.id, doc.data()));
    }

    async findBySourcePaperId(userId: string, paperId: string): Promise<SermonEntity[]> {
        // Composite index requirement: (userId asc, sourcePaperId asc,
        // createdAt desc). Firestore prompts to auto-create on first
        // query if missing. See `firestore.indexes.json` in the
        // infrastructure package for the declarative definition.
        const q = query(
            collection(db, this.collectionName),
            where('userId', '==', userId),
            where('sourcePaperId', '==', paperId),
            orderBy('createdAt', 'desc')
        );
        const snapshot = await getDocs(q);
        return snapshot.docs.map((doc) => this.firestoreToSermon(doc.id, doc.data()));
    }

    private sermonToFirestore(sermon: SermonEntity): any {
        return {
            userId: sermon.userId,
            title: sermon.title,
            content: sermon.content,
            bibleReferences: sermon.bibleReferences,
            tags: sermon.tags,
            category: sermon.category ?? null,
            status: sermon.status,
            createdAt: Timestamp.fromDate(sermon.createdAt),
            updatedAt: serverTimestamp(),
            publishedAt: sermon.publishedAt ? Timestamp.fromDate(sermon.publishedAt) : null,
            shareToken: sermon.shareToken ?? null,
            isShared: sermon.isShared,
            authorName: sermon.authorName,
            seriesId: sermon.seriesId ?? null,
            scheduledDate: sermon.scheduledDate ? Timestamp.fromDate(sermon.scheduledDate) : null,
            preachingHistory: sermon.preachingHistory.map(log => ({
                ...log,
                date: Timestamp.fromDate(log.date)
            })),
            wizardProgress: sermon.wizardProgress ? {
                ...sermon.wizardProgress,
                lastSaved: Timestamp.fromDate(sermon.wizardProgress.lastSaved),
                // Convert nested Date inside derivedContext so
                // Firestore stores it as a Timestamp and the
                // deserializer can restore it consistently with all
                // other Date fields. The discriminated union shape is
                // shallow-copied — only `generatedAt` needs Timestamp
                // coercion regardless of kind.
                ...(sermon.wizardProgress.derivedContext ? {
                    derivedContext: {
                        ...sermon.wizardProgress.derivedContext,
                        generatedAt: Timestamp.fromDate(sermon.wizardProgress.derivedContext.generatedAt),
                    },
                } : {}),
            } : null,
            sourceSermonId: sermon.sourceSermonId ?? null,
            sourceFacultySessionId: sermon.sourceFacultySessionId ?? null,
            projectId: sermon.projectId ?? null,
            sourcePaperId: sermon.sourcePaperId ?? null,
            bibliography: sermon.bibliography ?? null,
            citationManifest: sermon.citationManifest ?? null,
            studyDepthSnapshot: sermon.studyDepthSnapshot ?? null,
            fidelityReport: sermon.fidelityReport ? this.fidelityReportToFirestore(sermon.fidelityReport) : null,
            contraScanReport: sermon.contraScanReport ? this.contraScanReportToFirestore(sermon.contraScanReport) : null,
            versionOf: sermon.versionOf ?? null,
            versionLabel: sermon.versionLabel ?? null,
        };
    }

    async updateFidelityReport(sermonId: string, report: FidelityReport): Promise<void> {
        const sermonRef = doc(db, this.collectionName, sermonId);
        await updateDoc(sermonRef, {
            fidelityReport: this.fidelityReportToFirestore(report),
            updatedAt: serverTimestamp(),
        });
    }

    async updateContraScanReport(sermonId: string, report: ContraScanReport): Promise<void> {
        const sermonRef = doc(db, this.collectionName, sermonId);
        await updateDoc(sermonRef, {
            contraScanReport: this.contraScanReportToFirestore(report),
            updatedAt: serverTimestamp(),
        });
    }

    private contraScanReportToFirestore(report: ContraScanReport): any {
        return {
            centralIdea: report.centralIdea,
            scannedAt: Timestamp.fromDate(report.scannedAt),
            status: report.status,
            dissentingChunks: report.dissentingChunks.map((c) => ({
                chunkId: c.chunkId,
                resourceId: c.resourceId,
                resourceTitle: c.resourceTitle,
                resourceAuthor: c.resourceAuthor,
                excerpt: c.excerpt,
                tension: c.tension,
                score: c.score,
                fromPersonalLibrary: c.fromPersonalLibrary,
                ...(c.page !== undefined ? { page: c.page } : {}),
            })),
            ...(report.consideration
                ? {
                    consideration: {
                        chunkId: report.consideration.chunkId,
                        note: report.consideration.note,
                        consideredAt: Timestamp.fromDate(report.consideration.consideredAt),
                    },
                }
                : {}),
            ...(report.override
                ? {
                    override: {
                        reason: report.override.reason,
                        overriddenAt: Timestamp.fromDate(report.override.overriddenAt),
                        overriddenBy: report.override.overriddenBy,
                    },
                }
                : {}),
        };
    }

    private contraScanReportFromFirestore(raw: any): ContraScanReport | undefined {
        if (!raw || typeof raw !== 'object') return undefined;
        const dissentingChunks: DissentingChunk[] = Array.isArray(raw.dissentingChunks)
            ? raw.dissentingChunks.map((c: any) => ({
                chunkId: String(c.chunkId ?? ''),
                resourceId: String(c.resourceId ?? ''),
                resourceTitle: String(c.resourceTitle ?? ''),
                resourceAuthor: String(c.resourceAuthor ?? ''),
                excerpt: String(c.excerpt ?? ''),
                tension: String(c.tension ?? ''),
                score: Number(c.score ?? 0),
                fromPersonalLibrary: Boolean(c.fromPersonalLibrary),
                ...(c.page !== undefined ? { page: Number(c.page) } : {}),
            }))
            : [];
        return {
            centralIdea: String(raw.centralIdea ?? ''),
            scannedAt: raw.scannedAt?.toDate?.() ?? raw.scannedAt ?? new Date(),
            status: raw.status,
            dissentingChunks,
            ...(raw.consideration
                ? {
                    consideration: {
                        chunkId: String(raw.consideration.chunkId ?? ''),
                        note: String(raw.consideration.note ?? ''),
                        consideredAt:
                            raw.consideration.consideredAt?.toDate?.()
                            ?? raw.consideration.consideredAt
                            ?? new Date(),
                    },
                }
                : {}),
            ...(raw.override
                ? {
                    override: {
                        reason: String(raw.override.reason ?? ''),
                        overriddenAt:
                            raw.override.overriddenAt?.toDate?.() ?? raw.override.overriddenAt ?? new Date(),
                        overriddenBy: String(raw.override.overriddenBy ?? ''),
                    },
                }
                : {}),
        };
    }

    private fidelityReportToFirestore(report: FidelityReport): any {
        return {
            version: report.version,
            reportId: report.reportId,
            sermonId: report.sermonId,
            generatedAt: Timestamp.fromDate(report.generatedAt),
            modelTier: report.modelTier,
            verdicts: report.verdicts.map((v) => ({
                marker: v.marker,
                claim: v.claim,
                citedSource: v.citedSource,
                verdict: v.verdict,
                reasoning: v.reasoning,
                confidence: v.confidence,
                modelUsed: v.modelUsed,
                evaluatedAt: Timestamp.fromDate(v.evaluatedAt),
                ...(v.stale !== undefined ? { stale: v.stale } : {}),
            })),
            summary: report.summary,
            gateStatus: report.gateStatus,
            ...(report.gateOverride
                ? {
                    gateOverride: {
                        reason: report.gateOverride.reason,
                        overriddenAt: Timestamp.fromDate(report.gateOverride.overriddenAt),
                        overriddenBy: report.gateOverride.overriddenBy,
                        bypassedKind: report.gateOverride.bypassedKind,
                    },
                }
                : {}),
            ...(report.pluralityReport ? { pluralityReport: report.pluralityReport } : {}),
            ...(report.authorityReport ? { authorityReport: report.authorityReport } : {}),
            ...(report.attributionReport ? { attributionReport: report.attributionReport } : {}),
        };
    }

    private fidelityReportFromFirestore(raw: any): FidelityReport | undefined {
        if (!raw || typeof raw !== 'object') return undefined;
        const verdicts: FidelityVerdict[] = Array.isArray(raw.verdicts)
            ? raw.verdicts.map((v: any) => ({
                marker: Number(v.marker),
                claim: String(v.claim ?? ''),
                citedSource: v.citedSource,
                verdict: v.verdict,
                reasoning: String(v.reasoning ?? ''),
                confidence: Number(v.confidence ?? 0),
                modelUsed: v.modelUsed,
                evaluatedAt: v.evaluatedAt?.toDate?.() ?? v.evaluatedAt ?? new Date(),
                ...(v.stale !== undefined ? { stale: Boolean(v.stale) } : {}),
            }))
            : [];
        const gateOverride: GateOverride | undefined = raw.gateOverride
            ? {
                reason: String(raw.gateOverride.reason ?? ''),
                overriddenAt: raw.gateOverride.overriddenAt?.toDate?.() ?? raw.gateOverride.overriddenAt ?? new Date(),
                overriddenBy: String(raw.gateOverride.overriddenBy ?? ''),
                bypassedKind: raw.gateOverride.bypassedKind,
            }
            : undefined;
        return {
            version: raw.version,
            reportId: String(raw.reportId ?? ''),
            sermonId: String(raw.sermonId ?? ''),
            generatedAt: raw.generatedAt?.toDate?.() ?? raw.generatedAt ?? new Date(),
            modelTier: raw.modelTier,
            verdicts,
            summary: raw.summary,
            gateStatus: raw.gateStatus,
            ...(gateOverride ? { gateOverride } : {}),
            ...(raw.pluralityReport ? { pluralityReport: raw.pluralityReport } : {}),
            ...(raw.authorityReport ? { authorityReport: raw.authorityReport } : {}),
            ...(raw.attributionReport ? { attributionReport: raw.attributionReport } : {}),
        };
    }

    private firestoreToSermon(id: string, data: any): SermonEntity {
        const d = data as any;
        return SermonEntity.create({
            id,
            userId: data.userId,
            title: data.title,
            content: data.content,
            bibleReferences: data.bibleReferences ?? [],
            tags: data.tags ?? [],
            category: data.category,
            status: data.status,
            // Preserve the persisted dates instead of stamping `now`
            // on every read — the dashboard sorts by these and shows
            // them inline. Fallback to `now` when the doc is missing
            // them entirely (legacy docs from before the field was
            // populated).
            createdAt: d.createdAt?.toDate?.() ?? d.createdAt ?? new Date(),
            updatedAt: d.updatedAt?.toDate?.() ?? d.updatedAt ?? new Date(),
            publishedAt: d.publishedAt?.toDate(),
            shareToken: d.shareToken,
            isShared: d.isShared,
            authorName: d.authorName,
            seriesId: d.seriesId,
            scheduledDate: d.scheduledDate?.toDate(),
            preachingHistory: (d.preachingHistory ?? []).map((log: any) => ({
                ...log,
                date: log.date?.toDate() || new Date()
            })),
            wizardProgress: d.wizardProgress ? {
                ...d.wizardProgress,
                lastSaved: d.wizardProgress.lastSaved?.toDate() || new Date(),
                ...(d.wizardProgress.derivedContext ? {
                    derivedContext: {
                        ...d.wizardProgress.derivedContext,
                        generatedAt: d.wizardProgress.derivedContext.generatedAt?.toDate?.()
                            ?? d.wizardProgress.derivedContext.generatedAt
                            ?? new Date(),
                    },
                } : d.wizardProgress.paperContext ? {
                    // Legacy back-compat (#213 used `paperContext`
                    // directly). Migrate transparently on read so
                    // pre-this-PR sermons keep working without a
                    // backfill job. Writers always use derivedContext.
                    derivedContext: {
                        kind: 'paper' as const,
                        ...d.wizardProgress.paperContext,
                        generatedAt: d.wizardProgress.paperContext.generatedAt?.toDate?.()
                            ?? d.wizardProgress.paperContext.generatedAt
                            ?? new Date(),
                    },
                } : {}),
            } : undefined,
            sourceSermonId: d.sourceSermonId,
            sourceFacultySessionId: d.sourceFacultySessionId ?? undefined,
            projectId: d.projectId ?? undefined,
            sourcePaperId: d.sourcePaperId ?? undefined,
            bibliography: Array.isArray(d.bibliography) ? d.bibliography : undefined,
            citationManifest: d.citationManifest && Array.isArray(d.citationManifest.entries)
                ? d.citationManifest
                : undefined,
            studyDepthSnapshot: d.studyDepthSnapshot && typeof d.studyDepthSnapshot === 'object'
                ? {
                    ...d.studyDepthSnapshot,
                    capturedAt:
                        d.studyDepthSnapshot.capturedAt?.toDate?.()
                        ?? d.studyDepthSnapshot.capturedAt
                        ?? new Date(),
                }
                : undefined,
            fidelityReport: this.fidelityReportFromFirestore(d.fidelityReport),
            contraScanReport: this.contraScanReportFromFirestore(d.contraScanReport),
            versionOf: d.versionOf ?? undefined,
            versionLabel: d.versionLabel ?? undefined,
        });
    }
}
