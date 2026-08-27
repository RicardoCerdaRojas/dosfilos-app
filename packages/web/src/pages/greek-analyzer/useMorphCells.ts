import { useTranslation } from 'react-i18next';
import type { GreekWordToken } from '@dosfilos/domain';

export interface MorphCell {
    label: string;
    value: string;
}

/**
 * Las celdas de morfología de una palabra, traducidas.
 *
 * UNA SOLA VEZ: la tarjeta y el popover construían esta lista por separado —
 * mismo orden, mismas claves, dos copias. Es la clase de duplicación que
 * diverge al primer cambio, y acá el cambio llega seguido: cada revisión con
 * un profesor agrega una capa nueva.
 *
 * El orden es el de la lectura gramatical: primero lo verbal (tiempo, voz,
 * modo, persona), después lo nominal (caso, número, género). Las ausentes no
 * se muestran — un rótulo sobre un guion no informa nada.
 */
export function useMorphCells(tag: GreekWordToken['tag']): MorphCell[] {
    const { t } = useTranslation('greekTutor');
    const celdas: MorphCell[] = [];
    const add = (field: string, dim: string, code?: string) => {
        if (code) celdas.push({ label: t(`analyzer.fields.${field}`), value: t(`analyzer.${dim}.${code}`) });
    };
    add('tense', 'tense', tag.tense);
    add('voice', 'voice', tag.voice);
    add('mood', 'mood', tag.mood);
    if (tag.person) celdas.push({ label: t('analyzer.fields.person'), value: tag.person });
    add('case', 'case', tag.case);
    add('number', 'number', tag.number);
    add('gender', 'gender', tag.gender);
    add('degree', 'degree', tag.degree);
    return celdas;
}
