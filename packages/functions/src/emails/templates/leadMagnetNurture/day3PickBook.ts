import { Locale, renderNurtureShell, TRIAL_URL, UNSUBSCRIBE_URL, unsubscribeLabel } from './shell';

/**
 * Day 3: practical framework for picking the next book to preach.
 * Pastoral framework (3 questions) + an example. Soft mention of
 * Preach's series planner. Goal: prove the email writer thinks
 * about ministry, not just about converting trials.
 */

interface Day3Copy {
    subject: string;
    greeting: (name: string) => string;
    bodyHtml: string;
    cta: string;
    closing: string;
}

const COPY: Record<Locale, Day3Copy> = {
    es: {
        subject: 'Cómo elegir el próximo libro a predicar',
        greeting: (n) => `Hola ${n},`,
        bodyHtml: `
            <p>Cada pastor expositivo enfrenta la misma decisión cada 6–18 meses: <em>¿qué predico ahora?</em></p>
            <p>La trampa más común: elegir el libro que <strong>tú</strong> quieres estudiar (Apocalipsis, Hebreos, Daniel), no el que <strong>la congregación</strong> necesita escuchar.</p>
            <h3>3 preguntas que ayudan</h3>
            <ul>
                <li><strong>¿Qué falta en la dieta espiritual de la congregación?</strong> Si llevan 2 años en epístolas, considera narrativa. Si llevan 2 años en NT, considera AT.</li>
                <li><strong>¿Qué momento están viviendo?</strong> Una congregación que acaba de pasar por crisis (división, pandemia, conflicto local) necesita Salmos o 1 Pedro antes que Romanos.</li>
                <li><strong>¿Qué libro me sostiene a mí?</strong> El predicador necesita pastorearse a sí mismo primero. Predica de lo que Dios te está enseñando, no de lo que crees que "deberías" predicar.</li>
            </ul>
            <p>Mi recomendación operativa: alterna libros largos (Romanos, Génesis, Lucas) con libros cortos (Jonás, Filipenses, Judas). Los libros cortos dan respiración a la congregación y al predicador.</p>
            <p>Cuando ya tengas el libro elegido, en <strong>Preach</strong> puedes crear una <strong>Serie Expositiva</strong>: el sistema divide el libro en perícopas sintácticas, te sugiere cuántos sermones cubre, y cada sermón nace anclado al pasaje correcto.</p>
        `,
        cta: 'Planificar mi próxima serie',
        closing: 'En 2 días te cuento cómo uso Preach para preparar un sermón completo en 90 minutos — sin sacrificar profundidad.',
    },
    en: {
        subject: 'How to pick your next book to preach',
        greeting: (n) => `Hi ${n},`,
        bodyHtml: `
            <p>Every expository pastor faces the same decision every 6–18 months: <em>what do I preach next?</em></p>
            <p>The most common trap: picking the book <strong>you</strong> want to study (Revelation, Hebrews, Daniel), not the one <strong>your congregation</strong> needs to hear.</p>
            <h3>3 questions that help</h3>
            <ul>
                <li><strong>What\'s missing from the congregation\'s spiritual diet?</strong> If they\'ve had 2 years of epistles, consider narrative. If 2 years of NT, consider OT.</li>
                <li><strong>What season are they in?</strong> A congregation that just came through crisis (division, pandemic, local conflict) needs Psalms or 1 Peter before Romans.</li>
                <li><strong>What book is sustaining me?</strong> The preacher must pastor himself first. Preach what God is teaching you, not what you think you "should" preach.</li>
            </ul>
            <p>My operational recommendation: alternate long books (Romans, Genesis, Luke) with short ones (Jonah, Philippians, Jude). Short books give breathing room to both congregation and preacher.</p>
            <p>Once you\'ve chosen the book, in <strong>Preach</strong> you can create an <strong>Expository Series</strong>: the system splits the book into syntactic pericopes, suggests how many sermons it covers, and every sermon is born anchored to its passage.</p>
        `,
        cta: 'Plan my next series',
        closing: 'In 2 days I\'ll show you how I use Preach to prep a complete sermon in 90 minutes — without sacrificing depth.',
    },
};

export const getDay3PickBookSubject = (locale: Locale = 'es'): string => COPY[locale].subject;

export const getDay3PickBookTemplate = (name: string, locale: Locale = 'es'): string => {
    const c = COPY[locale];
    return renderNurtureShell({
        title: c.subject,
        greeting: c.greeting(name),
        bodyHtml: c.bodyHtml,
        ctaLabel: c.cta,
        ctaHref: TRIAL_URL,
        closing: c.closing,
        unsubscribeLabel: unsubscribeLabel(locale),
        unsubscribeHref: UNSUBSCRIBE_URL,
    });
};
