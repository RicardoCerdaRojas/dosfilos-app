import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { writeAuditLog } from '../auditLog';
import { appCheckCallableOptions } from '../../config/appCheckOptions';
import { MODEL_FAST } from '../../llm/modelCatalog';
import { GeminiLlmClient } from '../../llm/GeminiLlmClient';
import type { ILlmClient } from '../../llm/LlmClient';

/**
 * Cloud Function: Tag confession sections with doctrineLevel via LLM.
 *
 * Implements ADR-006 § Tagging doctrineLevel + manifesto's three-level
 * doctrine system (core / distinctive / open-evangelical). Runs Gemini
 * Flash over every section of the targeted confessions, persists the
 * proposed `doctrineLevel` + `levelRationale`, and marks each section
 * `reviewStatus: 'pending-pastoral-review'` so the admin UI can surface
 * what still needs Ricardo's review.
 *
 * Idempotent by default — skips sections that already have a level
 * unless `force: true`. Pass `confessionIds` to filter; omit to run the
 * whole sectioned catalog.
 *
 * Cost note: ~50-200 sections per confession × ~$0.0001 per call on
 * gemini-2.5-flash with JSON output. Whole CORE v1 tagging fits well
 * under $1.
 */
export const tagConfessionDoctrineLevels = onCall(
    { ...appCheckCallableOptions(), secrets: ['GEMINI_API_KEY'], timeoutSeconds: 540 },
    async (request) => {
        if (!request.auth) {
            throw new HttpsError('unauthenticated', 'User must be authenticated');
        }

        const db = admin.firestore();
        const callerUid = request.auth.uid;

        const callerDoc = await db.collection('users').doc(callerUid).get();
        if (!callerDoc.exists || callerDoc.data()?.role !== 'super_admin') {
            throw new HttpsError('permission-denied', 'Only super admins can run the tagging pipeline');
        }

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            throw new HttpsError('failed-precondition', 'GEMINI_API_KEY secret not configured');
        }

        const confessionIds: string[] | undefined = Array.isArray(request.data?.confessionIds)
            ? request.data.confessionIds
            : undefined;
        const force: boolean = request.data?.force === true;

        const targetConfessions = confessionIds
            ? await Promise.all(
                confessionIds.map((id) => db.collection('confessions').doc(id).get()),
            )
            : (await db.collection('confessions').where('sectionType', '==', 'sectioned').get()).docs;

        // Por el port, no por el SDK: esta clasificación es texto→texto de un
        // solo turno, que es exactamente lo que `ILlmClient` cubre. De paso el
        // gasto queda medido — con el SDK directo había que llamar al medidor a
        // mano, y acá no se llamaba: el costo de etiquetar una confesión entera
        // no aparecía en ninguna parte.
        const llm: ILlmClient = new GeminiLlmClient(apiKey, MODEL_FAST, {
            feature: 'admin.tagDoctrineLevels',
        });

        const report: Array<{
            confessionId: string;
            tagged: number;
            skipped: number;
            failed: number;
        }> = [];

        for (const confDoc of targetConfessions) {
            if (!confDoc.exists || confDoc.data()?.sectionType !== 'sectioned') {
                report.push({ confessionId: confDoc.id, tagged: 0, skipped: 0, failed: 0 });
                continue;
            }
            const confData = confDoc.data()!;
            const sectionsSnap = await db.collection('confessions').doc(confDoc.id).collection('sections').get();

            let tagged = 0;
            let skipped = 0;
            let failed = 0;

            for (const sectionDoc of sectionsSnap.docs) {
                const section = sectionDoc.data();
                if (!force && section.doctrineLevel) {
                    skipped += 1;
                    continue;
                }
                try {
                    const result = await classifySection(llm, {
                        confessionTitle: confData.title,
                        sectionReference: section.sectionReference,
                        sectionTitle: section.title,
                        text: section.text,
                    });
                    await sectionDoc.ref.update({
                        doctrineLevel: result.level,
                        levelRationale: result.rationale,
                        reviewStatus: 'pending-pastoral-review',
                        updatedAt: FieldValue.serverTimestamp(),
                    });
                    tagged += 1;
                } catch (err) {
                    console.error(`Tagging failed for ${confDoc.id}/${sectionDoc.id}:`, err);
                    failed += 1;
                }
            }

            report.push({ confessionId: confDoc.id, tagged, skipped, failed });
        }

        writeAuditLog({
            actorUid: callerUid,
            actorEmail: callerDoc.data()?.email,
            action: 'core_library.tag_doctrine_levels',
            details: {
                requestedIds: confessionIds ?? 'all-sectioned',
                force,
                report,
            },
        });

        return { success: true, report };
    },
);

interface ClassifyInput {
    confessionTitle: string;
    sectionReference: string;
    sectionTitle?: string;
    text: string;
}

interface ClassifyResult {
    level: 'core' | 'distinctive' | 'open-evangelical';
    rationale: string;
}

async function classifySection(llm: ILlmClient, input: ClassifyInput): Promise<ClassifyResult> {
    const text = await llm.generate({
        prompt: buildClassificationPrompt(input),
        responseMimeType: 'application/json',
        temperature: 0.2,
    });
    const parsed = JSON.parse(text);

    const level = parsed.level;
    if (level !== 'core' && level !== 'distinctive' && level !== 'open-evangelical') {
        throw new Error(`Invalid level from LLM: ${level}`);
    }
    const rationale = typeof parsed.rationale === 'string' ? parsed.rationale : '';
    return { level, rationale };
}

/**
 * Prompt encoding the three-level rubric from [06-pedagogy-applied.md].
 * Kept inline so future tweaks land in one place — and so the prompt
 * itself sits next to the ADR-006 / ADR-005 documents that justify each
 * level's definition.
 */
function buildClassificationPrompt(input: ClassifyInput): string {
    return `You are classifying a section of a Christian confessional document into one of three doctrine levels. This classification governs how a pastoral fidelity system will treat disagreements with this section.

LEVELS:

1. "core" — Ecumenical Christian doctrines that NO evangelical confession denies. Examples: Trinity (Father/Son/Spirit, one God), deity of Christ, hypostatic union (two natures in one person — Chalcedon), bodily resurrection of Christ, salvation by grace through faith, supreme authority of Scripture. Anchored in the ecumenical creeds (Apostles, Nicene, Chalcedonian, Athanasian).

2. "distinctive" — Positions distinctive of a particular evangelical tradition where fellow evangelicals seriously disagree. Examples: paedo- vs credo-baptism, unconditional vs conditional predestination, continuationism vs cessationism, presbyterian vs congregational polity, real-presence vs memorial view of the Lord's Supper, millennial views, mode of baptism.

3. "open-evangelical" — Legitimate disagreements within the same evangelical framework. Examples: order of service, conscience-level cultural questions, eschatological details not central to the gospel, preferred prayer rhythms.

INPUT:
Confession: ${input.confessionTitle}
Section reference: ${input.sectionReference}
${input.sectionTitle ? `Section title: ${input.sectionTitle}\n` : ''}Text:
"""
${input.text}
"""

TASK:
Classify this section into exactly one level. Provide a brief rationale (1-2 sentences) explaining why, anchored in the criteria above. Return JSON only:

{
  "level": "core" | "distinctive" | "open-evangelical",
  "rationale": "..."
}`;
}
