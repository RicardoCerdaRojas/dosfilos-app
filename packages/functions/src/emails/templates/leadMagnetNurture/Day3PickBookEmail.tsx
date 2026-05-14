import { EmailLayout } from '../../components/EmailLayout';
import { CtaButton, H2, P } from '../../components/EmailPrimitives';
import { TRIAL_URL } from './constants';

type Locale = 'es' | 'en';

interface Day3PickBookEmailProps {
    name: string;
    locale: Locale;
}

const COPY = {
    es: {
        subject: 'Cómo elegir el próximo libro a predicar',
        preview: '3 preguntas que separan al predicador serio del aficionado.',
        greeting: (n: string) => `Hola ${n},`,
        intro: <>Cada pastor expositivo enfrenta la misma decisión cada 6–18 meses: <em>¿qué predico ahora?</em></>,
        trap: <>La trampa más común: elegir el libro que <strong>tú</strong> quieres estudiar (Apocalipsis, Hebreos, Daniel), no el que <strong>la congregación</strong> necesita escuchar.</>,
        questionsTitle: '3 preguntas que ayudan',
        questions: [
            <><strong>¿Qué falta en la dieta espiritual de la congregación?</strong> Si llevan 2 años en epístolas, considera narrativa.</>,
            <><strong>¿Qué momento están viviendo?</strong> Una congregación que acaba de pasar por crisis necesita Salmos o 1 Pedro antes que Romanos.</>,
            <><strong>¿Qué libro me sostiene a mí?</strong> El predicador necesita pastorearse a sí mismo primero.</>,
        ],
        recommendation: <>Mi recomendación operativa: alterna libros largos (Romanos, Génesis, Lucas) con libros cortos (Jonás, Filipenses, Judas).</>,
        toolMention: <>Cuando ya tengas el libro elegido, en <strong>Preach</strong> puedes crear una <strong>Serie Expositiva</strong>: el sistema divide el libro en perícopas sintácticas y cada sermón nace anclado al pasaje correcto.</>,
        cta: 'Planificar mi próxima serie',
        nextDayTease: 'En 2 días te cuento cómo uso Preach para preparar un sermón completo en 90 minutos — sin sacrificar profundidad.',
    },
    en: {
        subject: 'How to pick your next book to preach',
        preview: '3 questions that separate serious preachers from amateurs.',
        greeting: (n: string) => `Hi ${n},`,
        intro: <>Every expository pastor faces the same decision every 6–18 months: <em>what do I preach next?</em></>,
        trap: <>The most common trap: picking the book <strong>you</strong> want to study (Revelation, Hebrews, Daniel), not the one <strong>your congregation</strong> needs to hear.</>,
        questionsTitle: '3 questions that help',
        questions: [
            <><strong>What\'s missing from the congregation\'s spiritual diet?</strong> If they\'ve had 2 years of epistles, consider narrative.</>,
            <><strong>What season are they in?</strong> A congregation just past a crisis needs Psalms or 1 Peter before Romans.</>,
            <><strong>What book is sustaining me?</strong> The preacher must pastor himself first.</>,
        ],
        recommendation: <>My operational recommendation: alternate long books (Romans, Genesis, Luke) with short ones (Jonah, Philippians, Jude).</>,
        toolMention: <>Once you\'ve chosen the book, in <strong>Preach</strong> you can create an <strong>Expository Series</strong>: the system splits the book into syntactic pericopes and every sermon is born anchored to its passage.</>,
        cta: 'Plan my next series',
        nextDayTease: 'In 2 days I\'ll show you how I use Preach to prep a complete sermon in 90 minutes — without sacrificing depth.',
    },
} as const;

export function Day3PickBookEmail({ name, locale }: Day3PickBookEmailProps) {
    const c = COPY[locale];
    return (
        <EmailLayout title={c.subject} preview={c.preview}>
            <P>{c.greeting(name)}</P>
            <P>{c.intro}</P>
            <P>{c.trap}</P>
            <H2>{c.questionsTitle}</H2>
            <ul style={{ paddingLeft: '22px', margin: '12px 0' }}>
                {c.questions.map((q, i) => (
                    <li key={i} style={{ margin: '8px 0', fontSize: '16px', lineHeight: 1.7 }}>{q}</li>
                ))}
            </ul>
            <P>{c.recommendation}</P>
            <P>{c.toolMention}</P>
            <CtaButton href={TRIAL_URL}>{c.cta}</CtaButton>
            <P muted>{c.nextDayTease}</P>
        </EmailLayout>
    );
}

export const getDay3PickBookSubject = (locale: Locale = 'es') => COPY[locale].subject;
