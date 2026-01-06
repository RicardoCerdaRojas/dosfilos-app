/**
 * Educational capsules about Biblical Greek concepts
 * Language-aware selector that returns content based on current locale
 */

import { CAPSULES_ES } from './greekCapsules.es';
import { CAPSULES_EN } from './greekCapsules.en';

export interface GreekCapsule {
    id: string;
    title: string;
    content: string;
    example?: string;
}

/**
 * Get all capsules for a specific locale
 */
export function getCapsules(locale: string = 'es'): GreekCapsule[] {
    return locale === 'en' ? CAPSULES_EN : CAPSULES_ES;
}

/**
 * Get a random capsule from the collection for a specific locale
 */
export function getRandomCapsule(locale: string = 'es'): GreekCapsule {
    const capsules = getCapsules(locale);
    const randomIndex = Math.floor(Math.random() * capsules.length);
    return capsules[randomIndex];
}

/**
 * Get a specific capsule by ID for a specific locale
 */
export function getCapsuleById(id: string, locale: string = 'es'): GreekCapsule | undefined {
    const capsules = getCapsules(locale);
    return capsules.find(capsule => capsule.id === id);
}

// Export the array directly for backwards compatibility (defaults to Spanish)
export const GREEK_CAPSULES = CAPSULES_ES;
