/**
 * Redacción v2 Fase 2 — catálogo de cumplimiento por FORMA homilética + los
 * descalificadores GLOBALES. Materializa `approach-compliance-criteria.md` con
 * los campos que la revisión criterio-por-criterio del fundador selló en §9.
 *
 * DATO EDITABLE (SSOT domain, movible a `config/approachComplianceCriteria` en
 * Firestore). Llaves = enum `ApproachType`: un test rompe CI si difieren, porque
 * una forma sin vara deja al juez sin nada contra qué adjudicar.
 *
 * CATÁLOGO HERMANO: `genreComplianceCatalog.ts` trae los descalificadores del
 * GÉNERO del pasaje. NO se fusionan — forma ≠ género (§8.2, invariante sellado).
 */

import type { ApproachType } from '../entities/HomileticalApproach';
import type { CriterioCumplimiento, Descalificador } from './complianceTypes';

/**
 * Los CUATRO globales son severidad CRÍTICA (§9.7). No son criterios de calidad:
 * son las líneas rojas de fidelidad. Violar cualquiera es falla de fondo, no
 * defecto de ejecución. Viven una sola vez (DRY) y aplican a las seis formas.
 */
export const DESCALIFICADORES_GLOBALES: readonly Descalificador[] = [
    {
        id: 'G1',
        text: 'Sin FCF: no traza la condición caída / incapacidad del oyente que el texto expone (moraliza: lista de mandatos sin la brecha).',
        severidad: 'critica',
        tipo: 'contenido',
        fuente: 'Redacción v2 §9.7',
    },
    {
        // CRISTOTÉLICO, no cristocéntrico (§9.7, decisión del fundador).
        // "Cristocéntrico" se abusa como "cada texto habla de Cristo" y empuja a
        // eisegesis. La cláusula "donde la trayectoria canónica lo sostiene" es
        // la que impide que G2 dispare contra un pastor que respeta que su texto
        // no tiene conexión cristológica directa — forzarla sería violar G3.
        id: 'G2',
        text: 'No traza el telos cristológico (la manera en que el pasaje apunta a Cristo): el sermón no ubica el texto en su trayectoria hacia la culminación en Cristo y su obra redentora, DONDE la trayectoria canónica lo sostiene.',
        severidad: 'critica',
        tipo: 'contenido',
        fuente: 'Redacción v2 §9.7',
    },
    {
        id: 'G3',
        text: 'No expositivo (el texto no gobernó el contenido): el predicador impuso su idea y usó el texto de excusa, en vez de someter mensaje, énfasis, doctrinas y aplicaciones al sentido correcto de la Escritura.',
        severidad: 'critica',
        tipo: 'contenido',
        fuente: 'Redacción v2 §9.7 · approach-compliance-criteria.md',
    },
    {
        // G4 subió a global en §9.2 (Camino 2). Distinto de G3: G3 = "el texto no
        // gobernó el contenido"; G4 = "el texto citado no dice eso". Se puede
        // cometer uno sin el otro.
        //
        // DOBLE CARA (§9.3): G4 dispara SOLO cuando un apoyo queda en el sermón
        // SIN verificar — NO cuando el pastor no encontró el paralelo solo.
        // Aceptar un paralelo sugerido y verificado CUMPLE G4. La ayuda de G4 es
        // de AMPLIFICACIÓN (§9.4): permanece generosa en todos los niveles, no se
        // retira con la experiencia, porque ni el experto tiene los 66 libros
        // indexados en la cabeza.
        id: 'G4',
        text: 'Proof-texting: usa un texto que no respalda lo que el sermón afirma. Citar o apoyarse en un pasaje (o paralelo, o autoridad) que, leído en contexto, NO dice lo que el predicador afirma.',
        severidad: 'critica',
        tipo: 'contenido',
        fuente: 'Redacción v2 §9.2',
    },
] as const;

export interface ApproachComplianceEntry {
    /** La promesa de la forma: qué se compromete a hacer con el texto. */
    promise: string;
    criteriosCumplimiento: readonly CriterioCumplimiento[];
    /** ADEMÁS de los globales, que aplican siempre. */
    descalificadoresEspecificos: readonly Descalificador[];
}

export const APPROACH_COMPLIANCE_CATALOG: Record<ApproachType, ApproachComplianceEntry> = {
    'temático': {
        promise: 'Desarrolla un TEMA dejando que la Escritura lo defina, corrija y ordene.',
        criteriosCumplimiento: [
            { id: 'C1', text: 'Reúne varios textos alrededor de un tema y respeta el contexto e intención de CADA uno.', severidad: 'esperado' },
            { id: 'C2', text: 'Deja que los textos DEFINAN, CORRIJAN y ORDENEN el tema (el tema emerge de la Escritura, no al revés).', severidad: 'esperado' },
            { id: 'C3', text: 'La síntesis final es fiel a lo que los textos dicen juntos, no a una idea preconcebida.', severidad: 'esperado' },
        ],
        descalificadoresEspecificos: [
            {
                // La CAUSA (imponer el tema), no el síntoma (proof-texting).
                id: 'E1',
                text: 'Impone el tema sobre los textos: los usa como apoyo de una idea preconcebida en vez de dejar que definan, corrijan y ordenen el tema.',
                severidad: 'critica',
                tipo: 'contenido',
                refina: 'G3',
                fuente: 'Redacción v2 §9.5',
            },
            {
                // §9.8 — cierra la asimetría: el enfoque más expuesto a
                // proof-texting tenía un solo descalificador propio.
                id: 'E2',
                text: 'Yuxtapone sin sintetizar: reúne varios textos sobre el tema pero los LISTA en vez de mostrar cómo se corrigen, matizan y ordenan entre sí; cada texto queda como compartimento aislado.',
                severidad: 'estandar',
                tipo: 'tratamiento',
                fuente: 'Redacción v2 §9.8',
            },
        ],
    },
    'pastoral': {
        promise: 'Consuelo / cuidado dirigido a la condición real del oyente.',
        criteriosCumplimiento: [
            { id: 'C1', text: 'Nombra la condición/lucha real de la congregación.', severidad: 'esperado' },
            { id: 'C2', text: 'Aplica el texto como consuelo/cuidado/exhortación a ESA condición.', severidad: 'esperado' },
            { id: 'C3', text: 'Tono pastoral, dirigido a la situación del oyente (no lección abstracta).', severidad: 'esperado' },
        ],
        descalificadoresEspecificos: [
            { id: 'E1', text: 'Consuelo falso/terapéutico que evade el llamado del texto: suaviza lo que el texto confronta.', severidad: 'estandar', tipo: 'contenido', fuente: 'Redacción v2 §9.5' },
            { id: 'E2', text: 'Aplicación sin anclaje: consejos genéricos no derivados del pasaje.', severidad: 'estandar', tipo: 'contenido', fuente: 'Redacción v2 §9.5' },
            {
                // NO duplica G2: G2 pregunta "¿evadió a Cristo?" genérico; E3
                // pregunta "¿fue terapia disfrazada aunque mencione a Cristo de
                // pasada?". Un pastoral puede pasar G2 y fallar E3.
                id: 'E3',
                text: 'Consuelo sin la obra de Cristo: cuidado que se siente bien pero nunca llega a la cruz.',
                severidad: 'critica',
                tipo: 'contenido',
                refina: 'G2',
                fuente: 'Redacción v2 §9.5',
            },
        ],
    },
    'teológico': {
        promise: 'Inmersión doctrinal anclada en el pasaje.',
        criteriosCumplimiento: [
            { id: 'C1', text: 'Desarrolla una doctrina/tema teológico con rigor (define términos, la traza).', severidad: 'esperado' },
            { id: 'C2', text: 'La conecta con la teología bíblica más amplia (categorías sistemáticas / otros pasajes).', severidad: 'esperado' },
            { id: 'C3', text: 'La doctrina está ANCLADA en el pasaje, no flota libre.', severidad: 'esperado' },
        ],
        descalificadoresEspecificos: [
            { id: 'E1', text: 'Proof-texting: usa el verso de percha para colgar la doctrina sin exégesis del pasaje.', severidad: 'critica', tipo: 'contenido', refina: 'G4', fuente: 'Redacción v2 §9.5 (hereda crítica de G4)' },
            { id: 'E2', text: 'Especulación sin respaldo: afirma sobre Dios lo que el texto (y la Escritura) no dice.', severidad: 'critica', tipo: 'contenido', fuente: 'Redacción v2 §9.5' },
        ],
    },
    'apologético': {
        promise: 'Defiende la fe / responde objeciones desde el texto.',
        criteriosCumplimiento: [
            { id: 'C1', text: 'Plantea una objeción/duda real.', severidad: 'esperado' },
            { id: 'C2', text: 'La responde desde el texto + razón.', severidad: 'esperado' },
            { id: 'C3', text: 'Presenta la objeción con justicia (no un hombre de paja).', severidad: 'esperado' },
        ],
        descalificadoresEspecificos: [
            { id: 'E1', text: 'Hombre de paja: caricaturiza la objeción para tumbarla fácil.', severidad: 'estandar', tipo: 'tratamiento', fuente: 'Redacción v2 §9.5' },
            { id: 'E2', text: 'Gana la discusión pero pierde el pasaje: se va a la apologética abstracta y abandona el texto.', severidad: 'estandar', tipo: 'contenido', refina: 'G3', fuente: 'Redacción v2 §9.5' },
        ],
    },
    'evangelístico': {
        promise: 'Llama al no-creyente a Cristo.',
        criteriosCumplimiento: [
            { id: 'C1', text: 'Presenta el evangelio con claridad (condición, Cristo, respuesta).', severidad: 'esperado' },
            { id: 'C2', text: 'Se dirige al no-creyente.', severidad: 'esperado' },
            { id: 'C3', text: 'Hace un llamado claro a responder.', severidad: 'esperado' },
        ],
        descalificadoresEspecificos: [
            { id: 'E1', text: 'Moralismo/decisionismo: llama a "portarse bien" o a una decisión sin el evangelio de gracia.', severidad: 'critica', tipo: 'contenido', fuente: 'Redacción v2 §9.5' },
            { id: 'E2', text: 'Manipulación emocional: presión/culpa sin contenido de cruz.', severidad: 'critica', tipo: 'tratamiento', fuente: 'Redacción v2 §9.5' },
        ],
    },
    'narrativo': {
        promise: 'Traza la historia con movimiento dramático, anclada a la redención.',
        criteriosCumplimiento: [
            { id: 'C1', text: 'Sigue un arco narrativo (tensión→resolución).', severidad: 'esperado' },
            { id: 'C2', text: 'Usa el movimiento de la historia, no puntos abstractos.', severidad: 'esperado' },
            { id: 'C3', text: 'Aterriza el punto de la historia.', severidad: 'esperado' },
            {
                // ÚNICO esencial sellado (§9.6): su ausencia descalifica aunque
                // C1-C3 pasen — sin la trayectoria a Cristo es drama moral, no
                // sermón cristiano. Por el invariante, exige ayuda upstream.
                id: 'C4',
                text: 'Traza cómo ESTE pasaje narrativo funciona en la historia de la redención: trayectoria hacia Cristo, no un arco emocional cerrado en sí mismo.',
                severidad: 'esencial',
                ayudaUpstream: 'Paso 3 del estudio guiado — ayuda estructural sensible al género (narrativa) + guía socrática del arco redentor antes del ensamble.',
            },
        ],
        descalificadoresEspecificos: [
            { id: 'E1', text: 'Caricaturiza personajes o moraliza sobre uno traicionando el balance del texto: identificación solo con lo negativo ("no seas como X").', severidad: 'critica', tipo: 'contenido', fuente: 'Redacción v2 §9.5' },
            { id: 'E2', text: 'Drama por drama: tensión emocional como fin en sí, no vehículo del FCF/redención.', severidad: 'estandar', tipo: 'tratamiento', fuente: 'Redacción v2 §9.5' },
        ],
    },
};

/** Llaves del catálogo (para el test de invariante enum ≡ llaves). */
export const APPROACH_COMPLIANCE_FORMS = Object.keys(APPROACH_COMPLIANCE_CATALOG) as ApproachType[];
