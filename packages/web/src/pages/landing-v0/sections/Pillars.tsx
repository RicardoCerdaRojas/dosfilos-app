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
            title="Hebreo bíblico y griego koiné con metodología académica."
            description="Entrenadores especializados con análisis morfológico, sintaxis y vocabulario. Tipografía SBL especializada para renderizado correcto de niqqud, cantilación y acentos politónicos."
            bullets={[
                'Entrenador Hebreo con BHS + análisis morfológico',
                'Tutor Griego con NA28 + análisis sintáctico',
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
            title="Especialistas entrenados para cada área del ministerio."
            description="El sistema detecta tu pregunta y enruta automáticamente al tutor adecuado. Cada respuesta se adapta al modo elegido: académico, pastoral, conciso o para laicos."
            bullets={[
                'Dr. Alétheia · Exégesis e interpretación bíblica',
                'Dr. Berith · Hebreo y Antiguo Testamento',
                'Dr. Crisóstomo · Griego y Nuevo Testamento',
                'Pastor Noutético · Consejería y aplicación pastoral',
                'Dr. Calvino · Teología sistemática reformada',
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
            eyebrow="Pilar 04 · Producción"
            title="Del estudio al púlpito, con respaldo exegético."
            description="Genera sermones expositivos, planes de predicación y notas de estudio. Cada pieza producida mantiene las referencias al material fuente y puede exportarse en formatos útiles para el ministerio."
            bullets={[
                'Generador de sermones con metodología histórico-gramatical',
                'Planificador de series de predicación',
                'Proyectos de investigación sobre libros, pasajes y temas',
                'Exportación en Markdown, PDF y texto plano',
            ]}
            mockup={<SermonMock />}
            reversed
            dark
        />
    );
}
