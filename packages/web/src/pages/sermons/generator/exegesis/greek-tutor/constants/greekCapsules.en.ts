/**
 * Greek educational capsules - English content
 * Translated from Spanish originals
 */

export interface GreekCapsule {
    id: string;
    title: string;
    content: string;
    example?: string;
}

export const CAPSULES_EN: GreekCapsule[] = [
    {
        id: 'article',
        title: 'The Power of the Greek Article',
        content: `In Greek, the definite article (ὁ, ἡ, τό) does much more than in English. It not only identifies specific nouns, but can also:

**Nominalize any word**: Converts adjectives, participles, or entire phrases into nouns.

**Indicate emphasis**: Its presence or absence can radically change theological meaning.

**Mark subject/object**: In complex sentences, it helps identify grammatical roles when word order is flexible.`,
        example: 'In John 1:1, "θεὸς ἦν ὁ λόγος" - the absence of the article before θεὸς but its presence before λόγος is theologically significant, indicating quality versus identity.'
    },
    {
        id: 'aspect',
        title: 'Beyond Time: Verbal Aspect',
        content: `Greek verbal tenses primarily communicate **aspect**, not chronological time:

**Present (Continuous)**: Emphasis on action in progress, continuous, or repeated.

**Aorist (Punctiliar)**: Action viewed as a complete whole, without emphasis on duration.

**Perfect (Completed)**: Present result of an action completed in the past.

**Imperfect (Continuous Past)**: Action that was continuing or repeating in the past.`,
        example: 'In John 3:16, "ἠγάπησεν" (aorist) emphasizes the decisive act of God\'s love, whereas present tense would emphasize continuous love.'
    },
    {
        id: 'middle-voice',
        title: 'The Middle Voice: Lost in Translation',
        content: `Greek has three voices: active, passive, and **middle** (non-existent in English).

**The middle voice indicates:**

The subject performs the action **for themselves** or for their own benefit.

The subject is **particularly involved** in the result of the action.

Emphasis on personal participation or reflexivity of the subject.`,
        example: 'βαπτίζομαι can be passive ("I am baptized" by another) or middle ("I have myself baptized" - personal decision, active participation). In Acts 2:38, the middle voice emphasizes the personal and voluntary response.'
    },
    {
        id: 'cases',
        title: 'The Five Grammatical Cases',
        content: `Greek uses cases to show the function of nouns and adjectives in a sentence:

**Nominative**: Subject of the sentence or predicate nominative.

**Genitive**: Possession, origin, description, or relationship.

**Dative**: Indirect object, instrument, location, or personal interest.

**Accusative**: Direct object, extension, or direction.

**Vocative**: Direct address or invocation.`,
        example: 'In "ὁ λόγος τοῦ θεοῦ" (the word of God), θεοῦ is in the genitive showing possession/origin. The same noun in different cases communicates different relationships.'
    },
    {
        id: 'genitive-absolute',
        title: 'The Genitive Absolute',
        content: `A unique Greek grammatical construction that uses a genitive participle with its own subject (also in genitive) to express a circumstance or condition.

**Characteristics:**

It is "absolute" because it is grammatically independent of the main clause.

It expresses time, cause, condition, or circumstance.

The subject of the participle is different from the subject of the main clause.`,
        example: 'In Matthew 17:5, "ἔτι αὐτοῦ λαλοῦντος" (while he was still speaking) - αὐτοῦ and λαλοῦντος are both in the genitive, forming an independent temporal clause.'
    }
];
