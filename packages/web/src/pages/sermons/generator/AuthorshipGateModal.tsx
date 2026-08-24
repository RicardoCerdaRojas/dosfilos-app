import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PenLine } from 'lucide-react';
import { AUTHORSHIP_OVERRIDE_MIN_CHARS, type AuthorshipReport } from '@dosfilos/domain';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';

interface Props {
    open: boolean;
    report: AuthorshipReport | null;
    publishing: boolean;
    onBack: () => void;
    onPublishAnyway: (note: string) => void;
}

/**
 * CONFRONTA, NO BLOQUEA (ADR-027, y el precedente directo del contra-scan).
 *
 * El pastor SIEMPRE puede publicar. Lo que se le pide es que, si va a llevar al
 * púlpito un sermón que salió mayormente del generador, lo diga con sus
 * palabras — y eso queda auditado.
 *
 * POR QUÉ NO SE BLOQUEA: un piso duro sin salida invita a burlarlo. Pegar texto
 * cualquiera sube el número sin mejorar el sermón, y el sistema habría
 * conseguido una métrica bonita a cambio de nada. Una pregunta honesta rinde
 * más que un candado.
 */
export function AuthorshipGateModal({ open, report, publishing, onBack, onPublishAnyway }: Props) {
    const { t } = useTranslation('generator');
    const [nota, setNota] = useState('');
    if (!report) return null;

    const faltan = AUTHORSHIP_OVERRIDE_MIN_CHARS - nota.trim().length;
    const puede = faltan <= 0;

    return (
        <Dialog open={open} onOpenChange={(v) => { if (!v) onBack(); }}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <PenLine className="h-4 w-4 text-warning" />
                        {t('authorship.gateTitle')}
                    </DialogTitle>
                    <DialogDescription>
                        {t('authorship.gateBody', {
                            pct: Math.round(report.overall * 100),
                            floor: Math.round(report.floor * 100),
                        })}
                    </DialogDescription>
                </DialogHeader>

                {/* El desglose por sección dice DÓNDE trabajar, que es más útil
                    que un total: casi siempre hay una sección que arrastra. */}
                <ul className="space-y-1 rounded-md bg-muted/50 p-3 text-xs">
                    {report.bySection.map((s) => (
                        <li key={s.sectionId} className="flex items-center justify-between">
                            <span>{t(`authorship.section.${s.sectionId}`)}</span>
                            <span className="font-medium tabular-nums">{Math.round(s.pastorRatio * 100)}%</span>
                        </li>
                    ))}
                </ul>

                <div className="space-y-1.5">
                    <label htmlFor="autoria-nota" className="text-xs font-medium">
                        {t('authorship.gateNoteLabel', { min: AUTHORSHIP_OVERRIDE_MIN_CHARS })}
                    </label>
                    <Textarea
                        id="autoria-nota"
                        value={nota}
                        onChange={(e) => setNota(e.target.value)}
                        rows={3}
                        placeholder={t('authorship.gateNotePlaceholder')}
                        className="text-sm"
                    />
                    {!puede && nota.length > 0 && (
                        <p className="text-xs text-muted-foreground">
                            {t('authorship.gateNoteShort', { n: faltan })}
                        </p>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onBack} disabled={publishing}>
                        {t('authorship.gateBack')}
                    </Button>
                    <Button
                        onClick={() => onPublishAnyway(nota.trim())}
                        disabled={!puede || publishing}
                    >
                        {t('authorship.gatePublish')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
