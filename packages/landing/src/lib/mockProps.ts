// Builds the prop objects for the presentational mocks from the i18n dictionary.
// Centralised so Hero, Pillars, and the carousel islands all stay in sync.
import { createT, type Lang } from './i18n';

export function buildMockProps(lang: Lang) {
    const t = createT(lang);
    const hebrew = {
        header: t('mocks.hebrew.header'),
        source: t('mocks.hebrew.source'),
        gloss: t('mocks.hebrew.gloss'),
        analysisOf: t('mocks.hebrew.analysisOf'),
        morphology: t<Array<{ label: string; value: string }>>('mocks.hebrew.morphology'),
    };
    const greek = {
        header: t('mocks.greek.header'),
        morphologyLabel: t('mocks.greek.morphologyLabel'),
        gloss: t('mocks.greek.gloss'),
        analysisOf: t('mocks.greek.analysisOf'),
        morphology: t<Array<{ label: string; value: string }>>('mocks.greek.morphology'),
    };
    const library = {
        title: t('mocks.library.title'),
        searchPlaceholder: t('mocks.library.searchPlaceholder'),
        upload: t('mocks.library.upload'),
        books: t<Array<{ title: string; author: string; pages: string }>>('mocks.library.books'),
    };
    const sermon = {
        header: t('mocks.sermon.header'),
        export: t('mocks.sermon.export'),
        titleLabel: t('mocks.sermon.titleLabel'),
        title: t('mocks.sermon.title'),
        propositionLabel: t('mocks.sermon.propositionLabel'),
        proposition: t('mocks.sermon.proposition'),
        outlineLabel: t('mocks.sermon.outlineLabel'),
        outline: t<string[]>('mocks.sermon.outline'),
        sourcesLabel: t('mocks.sermon.sourcesLabel'),
        source1Author: t('mocks.sermon.source1Author'),
        source1Book: t('mocks.sermon.source1Book'),
        source2Author: t('mocks.sermon.source2Author'),
        source2Book: t('mocks.sermon.source2Book'),
    };
    const tutors = {
        title: t('mocks.tutors.title'),
        active: t('mocks.tutors.active'),
        questionLabel: t('mocks.tutors.questionLabel'),
        questionBefore: t('mocks.tutors.questionBefore'),
        questionRef: t('mocks.tutors.questionRef'),
        questionAfter: t('mocks.tutors.questionAfter'),
        available: t('mocks.tutors.available'),
        routed: t('mocks.tutors.routed'),
        areas: t<string[]>('mocks.tutors.areas'),
    };
    const chat = {
        sessions: t<string[]>('mocks.chat.sessions'),
        sessionsTitle: t('mocks.chat.sessionsTitle'),
        userMessage: t('mocks.chat.userMessage'),
        author: t('mocks.chat.author'),
        answerTitle: t('mocks.chat.answerTitle'),
        para1pre: t('mocks.chat.para1pre'),
        para1emphasis: t('mocks.chat.para1emphasis'),
        para2pre: t('mocks.chat.para2pre'),
        para2ref: t('mocks.chat.para2ref'),
        para2mid: t('mocks.chat.para2mid'),
        para2post: t('mocks.chat.para2post'),
        bibliographyTitle: t('mocks.chat.bibliographyTitle'),
        bibBook: t('mocks.chat.bibBook'),
        continuePlaceholder: t('mocks.chat.continuePlaceholder'),
    };
    return { hebrew, greek, library, sermon, tutors, chat };
}
