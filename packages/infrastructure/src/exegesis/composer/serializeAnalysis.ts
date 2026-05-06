import {
    formatPassageReference,
    type CanonicalVerseAnalysis,
} from '@dosfilos/domain';

/**
 * Serializes a `CanonicalVerseAnalysis` into a compact "briefing"
 * format the composer's prompt feeds to Gemini.
 *
 * The briefing is denser than the original JSON — flat sections with
 * inline labels — so the model parses it as a knowledge artifact
 * rather than as data structure to walk. This frees the model to
 * focus on PROSE COMPOSITION instead of JSON traversal, which
 * empirically produces more fluent academic writing.
 *
 * Stable per-verse layout:
 *
 *   == Verse {ref} ==
 *   Greek: ...
 *   Initial translation: ...
 *   Final translation: ...
 *   Argumentative role: ...
 *
 *   Syntax:
 *   - {fragment} ({morphology}, fn={syntacticFunction}): {significance}
 *   ...
 *
 *   Lexis:
 *   - {term} ({lemma}, "{gloss}"): general=[...]; verse-loading: {...}
 *   ...
 *
 *   Discourse particles:
 *   - {particle} ({function}): {note}
 *
 *   Textual criticism:
 *   {note}
 *   - variant: {lemma} → adopted "{adoptedReading}". rationale: ...
 *
 *   Historical context:
 *   - {aspect}: {relevance}
 *
 *   OT links:
 *   - [{type}] {sourcePassage}: {bearing}
 *
 *   Commentator positions:
 *   - [{role}] {sourceKey} (p. {page}): {position}
 *   ...
 *
 *   Translation cruxes:
 *   - "{phrase}": {description}
 *     options: ["{a}" ({chr-a}), "{b}" ({chr-b})]
 *     positions: [{key} (p.{p}) → {idx}; ...]
 *     commitment: "{chosen}". rationale: {rationale}
 *   ...
 *
 *   Verse thesis: {thesis}
 *
 *   Footnote extensions:
 *   - anchor: "{anchor}"
 *     text: {text}
 *     sources: [{key} p.{p}, ...]
 *
 *   Confidence flags:
 *   - [{level}] {claim} → hedges: [...]
 *   ...
 *
 *   Theological hooks: {locus1}, {locus2}, ...
 */
export function serializeAnalysis(
    analysis: CanonicalVerseAnalysis,
    language: 'es' | 'en',
): string {
    const ref = formatPassageReference(analysis.reference, language);
    const lines: string[] = [];
    lines.push(`== Verse ${ref} ==`);
    lines.push(`Greek: ${analysis.greekText}`);
    lines.push(`Initial translation: ${analysis.initialTranslation}`);
    lines.push(`Final translation: ${analysis.finalTranslation}`);
    lines.push(`Argumentative role: ${analysis.argumentativeRole}`);

    // ── Syntax ─────────────────────────────────────────────────────
    if (analysis.syntacticAnalysis.mainVerb || analysis.syntacticAnalysis.keyConstructions.length > 0) {
        lines.push('');
        lines.push('Syntax:');
        if (analysis.syntacticAnalysis.mainVerb) {
            const mv = analysis.syntacticAnalysis.mainVerb;
            lines.push(`- [main verb] ${mv.text} (${mv.morphology}, fn=${mv.syntacticFunction}): ${mv.interpretiveSignificance}`);
        } else if (analysis.syntacticAnalysis.mainVerbNote) {
            lines.push(`- [main verb] (none in this verse) — ${analysis.syntacticAnalysis.mainVerbNote}`);
        }
        for (const kc of analysis.syntacticAnalysis.keyConstructions) {
            lines.push(`- ${kc.text} (${kc.morphology}, fn=${kc.syntacticFunction}): ${kc.interpretiveSignificance}`);
        }
    }
    if (analysis.syntacticAnalysis.discourseParticles.length > 0) {
        lines.push('');
        lines.push('Discourse particles:');
        for (const p of analysis.syntacticAnalysis.discourseParticles) {
            lines.push(`- ${p.particle} (${p.function}): ${p.note}`);
        }
    }

    // ── Lexis ───────────────────────────────────────────────────────
    if (analysis.lexicalAnalyses.length > 0) {
        lines.push('');
        lines.push('Lexis:');
        for (const la of analysis.lexicalAnalyses) {
            const generalRange = la.generalSemanticRange.glosses.join(' / ');
            const generalSrcs = la.generalSemanticRange.sources
                .map(s => `${s.sourceKey} p.${s.page}`)
                .join('; ');
            const loadingSrcs = la.loadingSources
                .map(s => `${s.sourceKey} p.${s.page}`)
                .join('; ');
            lines.push(`- ${la.term} (${la.lemma}, "${la.gloss}"):`);
            lines.push(`  general range = [${generalRange}]${generalSrcs ? ` (sources: ${generalSrcs})` : ''}`);
            lines.push(`  verse loading: ${la.verseSpecificLoading}${loadingSrcs ? ` (sources: ${loadingSrcs})` : ''}`);
        }
    }

    // ── Textual criticism ──────────────────────────────────────────
    lines.push('');
    lines.push('Textual criticism:');
    lines.push(`  ${analysis.textualCriticism.note}`);
    for (const v of analysis.textualCriticism.variants) {
        lines.push(`- variant: ${v.lemma} → adopted "${v.adoptedReading}"`);
        for (const r of v.readings) {
            lines.push(`    reading "${r.text}" (witnesses: ${r.witnesses.join(', ')})`);
        }
        lines.push(`    rationale: ${v.rationale}${v.apparatusReference ? ` [${v.apparatusReference}]` : ''}`);
    }

    // ── Historical context ─────────────────────────────────────────
    if (analysis.historicalContext.length > 0) {
        lines.push('');
        lines.push('Historical context:');
        for (const h of analysis.historicalContext) {
            const srcs = h.sources.map(s => `${s.sourceKey} p.${s.page}`).join('; ');
            lines.push(`- ${h.aspect}: ${h.relevance}${srcs ? ` (sources: ${srcs})` : ''}`);
        }
    }

    // ── OT links ────────────────────────────────────────────────────
    if (analysis.oldTestamentLinks.length > 0) {
        lines.push('');
        lines.push('OT links:');
        for (const l of analysis.oldTestamentLinks) {
            const formula = l.citationFormula ? ` (formula: ${l.citationFormula})` : '';
            const srcs = l.sources.map(s => `${s.sourceKey} p.${s.page}`).join('; ');
            lines.push(`- [${l.type}] ${l.sourcePassage}${formula}: ${l.interpretiveBearing}${srcs ? ` (sources: ${srcs})` : ''}`);
        }
    }

    // ── Commentator positions ──────────────────────────────────────
    if (analysis.commentatorEngagement.length > 0) {
        lines.push('');
        lines.push('Commentator positions:');
        for (const c of analysis.commentatorEngagement) {
            const verbatim = c.verbatimQuote ? ` [verbatim: "${c.verbatimQuote}"]` : '';
            lines.push(`- [${c.role}] ${c.sourceKey} (p. ${c.page}): ${c.position}${verbatim}`);
        }
    }

    // ── Translation cruxes ─────────────────────────────────────────
    if (analysis.translationCruxes.length > 0) {
        lines.push('');
        lines.push('Translation cruxes:');
        for (const cx of analysis.translationCruxes) {
            lines.push(`- "${cx.phrase}": ${cx.description}`);
            const opts = cx.options
                .map((o, i) => `${i}=${JSON.stringify(o.translation)} (${o.characterization})`)
                .join('; ');
            lines.push(`    options: ${opts}`);
            const positions = cx.commentatorPositions
                .map(p => `${p.sourceKey} p.${p.page} → opt ${p.supports}: ${p.summary}`)
                .join(' | ');
            if (positions) lines.push(`    positions: ${positions}`);
            lines.push(`    commitment: "${cx.commitment.chosen}". Rationale: ${cx.commitment.rationale}`);
        }
    }

    // ── Verse thesis ───────────────────────────────────────────────
    lines.push('');
    lines.push(`Verse thesis: ${analysis.verseThesis}`);

    // ── Footnote extensions ────────────────────────────────────────
    if (analysis.footnoteExtensions.length > 0) {
        lines.push('');
        lines.push('Footnote extensions:');
        for (const fn of analysis.footnoteExtensions) {
            const srcs = fn.sources.map(s => `${s.sourceKey} p.${s.page}`).join('; ');
            lines.push(`- anchor: "${fn.anchorPhrase}"`);
            lines.push(`  text: ${fn.text}${srcs ? ` (sources: ${srcs})` : ''}`);
        }
    }

    // ── Confidence flags ───────────────────────────────────────────
    if (analysis.confidenceFlags.length > 0) {
        lines.push('');
        lines.push('Confidence flags:');
        for (const f of analysis.confidenceFlags) {
            const hedges = f.preferredHedges.join(', ');
            lines.push(`- [${f.level}] ${f.claim}${hedges ? ` → preferred hedges: ${hedges}` : ''}`);
        }
    }

    // ── Theological hooks ──────────────────────────────────────────
    if (analysis.theologicalHooks.length > 0) {
        const loci = analysis.theologicalHooks
            .map(h => h.locus === 'otro' ? (h.customLocus ?? 'otro') : h.locus)
            .join(', ');
        lines.push('');
        lines.push(`Theological hooks: ${loci}`);
    }

    return lines.join('\n');
}
