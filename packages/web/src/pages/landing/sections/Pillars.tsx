import { LibraryMock } from '../mocks/LibraryMock';
import { HebrewMock } from '../mocks/HebrewMock';
import { TutorsMock } from '../mocks/TutorsMock';
import { SermonMock } from '../mocks/SermonMock';
import { PillarSection } from './PillarSection';

/**
 * Four-pillar narrative — the 4 main product capabilities of DosFilos:
 *  01 · Library (your theological corpus, organised + searchable)
 *  02 · Original languages (Hebrew + Greek)
 *  03 · Tutors (specialised AI experts per domain)
 *  04 · Production (sermons, plans, notes)
 *
 * Each pillar is an alternating split-screen section (Linear/Vercel pattern).
 * Pillars 02 and 04 use the dark variant for rhythmic contrast.
 */

export function PillarBiblioteca() {
    return (
        <PillarSection
            id="pilar-1"
            number="01"
            eyebrow="Pilar 01 · Biblioteca"
            title="Tu corpus teológico, organizado y consultable."
            description="Sube tus libros, comentarios, léxicos y artículos. El sistema los procesa con páginas reales preservadas y los indexa para búsqueda semántica. Cada consulta devuelve citas con autor, título y página exacta."
            bullets={[
                'Extracción estructurada de PDFs con páginas reales',
                'Búsqueda semántica tipo RAG con bibliografía automática',
                'Biblioteca especializada de dominio público + tu material privado',
                'Tu contenido nunca entrena modelos de IA',
            ]}
            mockup={<LibraryMock />}
        />
    );
}

export function PillarLenguas() {
    return (
        <PillarSection
            id="pilar-2"
            number="02"
            eyebrow="Pilar 02 · Lenguas originales"
            title="Hebreo bíblico y griego koiné para el trabajo exegético."
            description="Consulta el texto bíblico con apoyo morfológico, sintáctico y léxico. El sistema te ayuda a observar mejor el texto sin reemplazar tu estudio ni convertir los idiomas bíblicos en conclusiones automáticas."
            bullets={[
                'Tutor de Hebreo con BHS + análisis morfológico',
                'Tutor de Griego con NA28 + análisis sintáctico',
                'Referencias bíblicas interactivas (RVR 1960 inline)',
                'Tipografía académica: Ezra SIL, SBL Hebrew, SBL Greek',
            ]}
            mockup={<HebrewMock />}
            reversed
            dark
        />
    );
}

export function PillarTutores() {
    return (
        <PillarSection
            id="pilar-3"
            number="03"
            eyebrow="Pilar 03 · Tutores"
            title="Consulta al especialista adecuado para cada pregunta."
            description="El sistema identifica el tipo de pregunta y la dirige al tutor más adecuado. Puedes recibir respuestas en modo académico, pastoral, conciso o explicado para laicos."
            bullets={[
                'Tutor de Exégesis · Interpretación histórico-gramatical',
                'Tutor de Hebreo Bíblico · Análisis morfológico y sintáctico del AT',
                'Tutor de Griego del NT · Koiné con análisis sintáctico y léxico',
                'Tutor de Teología Sistemática · Doctrina con respaldo bíblico',
                'Tutor de Consejería Pastoral · Casos pastorales con fundamento bíblico',
            ]}
            mockup={<TutorsMock />}
        />
    );
}

export function PillarProduccion() {
    return (
        <PillarSection
            id="pilar-4"
            number="04"
            eyebrow="Pilar 04 · Producción ministerial"
            title="Del estudio al púlpito, con respaldo exegético."
            description="Transforma tus hallazgos en bosquejos, proposiciones, notas de estudio, series de predicación y material exportable. Cada pieza conserva referencias a las fuentes consultadas para que la trazabilidad llegue hasta el documento final."
            bullets={[
                'Asistente para estructurar sermones expositivos',
                'Planificador de series expositivas sobre libros completos',
                'Proyectos de investigación sobre libros, pasajes y temas',
                'Exportación en Markdown, PDF y texto plano',
            ]}
            mockup={<SermonMock />}
            reversed
            dark
        />
    );
}
