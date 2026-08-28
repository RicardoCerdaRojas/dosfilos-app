/**
 * Reading model of a sermon section — the renderable text plus, for every
 * character, where it came from in the raw markdown.
 *
 * WHY THE SOURCE MAP EXISTS. The pulpit reader strips markdown before
 * painting it (bold markers, internal anchors, `<br/>`), so a span the pastor
 * long-presses lives in *rendered* coordinates. Annotations, however, are
 * anchored in the RAW markdown body of the section (M-05: `(sectionSlug,
 * offset)`), because that is the only string both the tablet and the web can
 * derive identically from `sermon.content` — each platform renders it its own
 * way. Without the map the two coordinate systems silently disagree and the
 * highlight made on Saturday lands on the wrong words on Sunday.
 *
 * Consequence: normalization and highlighting are built HERE, together. A
 * renderer that strips markdown on its own — and then anchors against the
 * stripped text — is the drift this module exists to prevent.
 */

import { splitSentences } from './sentenceSegmentation';

/** Text plus `map[i]` = index in the original string of rendered char `i`. */
export interface SourceMappedText {
    text: string;
    map: number[];
}

/** One long-pressable unit: a sentence, with its range in the raw body. */
export interface ReadingUnit {
    text: string;
    /** Half-open range `[sourceStart, sourceEnd)` in the raw section body. */
    sourceStart: number;
    sourceEnd: number;
}

export interface ReadingBlock {
    kind: 'subheading' | 'paragraph';
    text: string;
    /** Sentences of a paragraph; a subheading is a single unit. */
    units: ReadingUnit[];
}

/**
 * A markdown construct to erase or unwrap. `emit` returns the text that
 * survives and where inside the match it came from, or `null` to drop the
 * match entirely. `offsetInMatch: -1` marks synthetic text (no source of its
 * own) — it inherits the offset of the match start.
 */
interface RewriteRule {
    re: RegExp;
    emit: (match: RegExpExecArray) => { text: string; offsetInMatch: number } | null;
}

/**
 * Same set the pulpit reader used to apply as a chain of `.replace()` calls —
 * now offset-preserving. Order matters: links are unwrapped before emphasis
 * so `[**x**](#a)` collapses cleanly.
 */
const RULES: RewriteRule[] = [
    { re: /<br\s*\/?>/gi, emit: () => ({ text: '\n', offsetInMatch: -1 }) },
    { re: /^---\s*$/gm, emit: () => null },
    { re: /\{#[^}]+\}/g, emit: () => null },
    { re: /\[([^\]]+)\]\(#[^)]*\)/g, emit: (m) => ({ text: m[1], offsetInMatch: 1 }) },
    { re: /\*\*(.+?)\*\*/g, emit: (m) => ({ text: m[1], offsetInMatch: 2 }) },
    { re: /\*(.+?)\*/g, emit: (m) => ({ text: m[1], offsetInMatch: 1 }) },
];

function identity(text: string): SourceMappedText {
    const map = new Array<number>(text.length);
    for (let i = 0; i < text.length; i += 1) map[i] = i;
    return { text, map };
}

function applyRule(src: SourceMappedText, rule: RewriteRule): SourceMappedText {
    const re = new RegExp(rule.re.source, rule.re.flags);
    const out: string[] = [];
    const map: number[] = [];
    let last = 0;
    let match: RegExpExecArray | null;

    const copy = (from: number, to: number) => {
        for (let i = from; i < to; i += 1) {
            out.push(src.text[i]);
            map.push(src.map[i]);
        }
    };

    re.lastIndex = 0;
    while ((match = re.exec(src.text)) !== null) {
        if (match[0].length === 0) {
            re.lastIndex += 1;
            continue;
        }
        copy(last, match.index);
        const emitted = rule.emit(match);
        if (emitted) {
            const base = emitted.offsetInMatch >= 0 ? match.index + emitted.offsetInMatch : -1;
            for (let k = 0; k < emitted.text.length; k += 1) {
                out.push(emitted.text[k]);
                map.push(base >= 0 ? src.map[base + k] : src.map[match.index]);
            }
        }
        last = match.index + match[0].length;
    }
    copy(last, src.text.length);
    return { text: out.join(''), map };
}

/** Strip markdown for display while remembering every character's origin. */
export function normalizeSectionBody(body: string): SourceMappedText {
    return RULES.reduce(applyRule, identity(body ?? ''));
}

function sliceMapped(src: SourceMappedText, start: number, end: number): SourceMappedText {
    return { text: src.text.slice(start, end), map: src.map.slice(start, end) };
}

/** Join lines with a single synthetic space, keeping the map aligned. */
function joinLines(src: SourceMappedText, lines: { start: number; end: number }[]): SourceMappedText {
    const out: string[] = [];
    const map: number[] = [];
    lines.forEach((line, index) => {
        if (index > 0) {
            out.push(' ');
            // The space stands in for the newline that used to be here.
            map.push(src.map[line.start] ?? src.map[src.map.length - 1] ?? 0);
        }
        for (let i = line.start; i < line.end; i += 1) {
            out.push(src.text[i]);
            map.push(src.map[i]);
        }
    });
    return { text: out.join(''), map };
}

function toUnits(src: SourceMappedText): ReadingUnit[] {
    return splitSentences(src.text).map((span) => ({
        text: span.text,
        sourceStart: src.map[span.start],
        // `end` is exclusive: the last mapped char plus one.
        sourceEnd: (src.map[span.end - 1] ?? src.map[span.start]) + 1,
    }));
}

const SUBHEADING_RE = /^#{3,}\s+(.+?)\s*$/;

/**
 * Turn the raw markdown body of one section into renderable blocks whose
 * units carry raw-body offsets.
 *
 * `##` headers are the section cut itself (see `extractSectionsWithBody`), so
 * only `###` and deeper appear here, as subheadings.
 */
export function buildReadingBlocks(body: string): ReadingBlock[] {
    const normalized = normalizeSectionBody(body);
    if (!normalized.text.trim()) return [];

    const blocks: ReadingBlock[] = [];

    // Chunks are separated by blank lines, as in the markdown source.
    const chunkBounds: { start: number; end: number }[] = [];
    const separator = /\n{2,}/g;
    let cursor = 0;
    let sep: RegExpExecArray | null;
    while ((sep = separator.exec(normalized.text)) !== null) {
        chunkBounds.push({ start: cursor, end: sep.index });
        cursor = sep.index + sep[0].length;
    }
    chunkBounds.push({ start: cursor, end: normalized.text.length });

    for (const chunk of chunkBounds) {
        if (chunk.end <= chunk.start) continue;

        // A chunk may mix subheadings and prose lines; flush prose on each
        // subheading so the two never merge into one paragraph.
        let paragraph: { start: number; end: number }[] = [];
        const flush = () => {
            if (!paragraph.length) return;
            const joined = joinLines(normalized, paragraph);
            const trimmed = trimMapped(joined);
            if (trimmed.text) {
                blocks.push({ kind: 'paragraph', text: trimmed.text, units: toUnits(trimmed) });
            }
            paragraph = [];
        };

        let lineStart = chunk.start;
        for (let i = chunk.start; i <= chunk.end; i += 1) {
            if (i !== chunk.end && normalized.text[i] !== '\n') continue;

            // Trim in NORMALIZED coordinates so the joined paragraph never
            // carries a line's leading indentation into the map.
            let ls = lineStart;
            let le = i;
            while (ls < le && /\s/.test(normalized.text[ls])) ls += 1;
            while (le > ls && /\s/.test(normalized.text[le - 1])) le -= 1;

            const line = sliceMapped(normalized, ls, le);
            const heading = line.text.match(SUBHEADING_RE);
            if (heading) {
                flush();
                const offset = line.text.indexOf(heading[1]);
                const headingText = sliceMapped(line, offset, offset + heading[1].length);
                blocks.push({
                    kind: 'subheading',
                    text: headingText.text,
                    units: headingText.text
                        ? [
                              {
                                  text: headingText.text,
                                  sourceStart: headingText.map[0],
                                  sourceEnd: headingText.map[headingText.map.length - 1] + 1,
                              },
                          ]
                        : [],
                });
            } else if (line.text) {
                paragraph.push({ start: ls, end: le });
            }
            lineStart = i + 1;
        }
        flush();
    }

    return blocks;
}

function trimMapped(src: SourceMappedText): SourceMappedText {
    let start = 0;
    let end = src.text.length;
    while (start < end && /\s/.test(src.text[start])) start += 1;
    while (end > start && /\s/.test(src.text[end - 1])) end -= 1;
    return sliceMapped(src, start, end);
}
