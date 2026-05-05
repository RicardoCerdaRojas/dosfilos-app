import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ScrollText, Shield, AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';

interface UploadConsentModalProps {
    open: boolean;
    onAccept: () => void;
    onCancel: () => void;
}

/**
 * Shown before a user's FIRST document upload. Records acceptance in localStorage
 * (key `library-upload-consent-v1`) to avoid re-prompting on subsequent uploads.
 *
 * TODO (post-TOS-signoff): migrate acceptance storage to user profile in Firestore
 * so it's audited server-side (e.g., `user.libraryConsent: { acceptedAt, version }`).
 * Current localStorage approach is sufficient for MVP launch but not durable across
 * devices or auditable in a dispute.
 *
 * Legal framing (validate with attorney before production):
 *   - User warrants ownership/right-to-upload
 *   - Content is for user's personal use only
 *   - Platform acts as a processing tool, not distributor
 *   - User retains all rights to uploaded content
 *   - Platform does not train models on user content
 */
export function UploadConsentModal({ open, onAccept, onCancel }: UploadConsentModalProps) {
    const [ownershipChecked, setOwnershipChecked] = useState(false);
    const [personalUseChecked, setPersonalUseChecked] = useState(false);
    const [termsChecked, setTermsChecked] = useState(false);

    const canAccept = ownershipChecked && personalUseChecked && termsChecked;

    const handleAccept = () => {
        if (!canAccept) return;
        try {
            localStorage.setItem(
                'library-upload-consent-v1',
                JSON.stringify({
                    acceptedAt: new Date().toISOString(),
                    version: 1,
                })
            );
        } catch {
            // localStorage may be blocked (private mode, etc.) — proceed anyway
        }
        onAccept();
    };

    return (
        <Dialog open={open} onOpenChange={(o) => { if (!o) onCancel(); }}>
            <DialogContent className="sm:max-w-xl">
                <DialogHeader>
                    <div className="flex items-center gap-2 mb-1">
                        <Shield className="h-5 w-5 text-indigo-600" />
                        <DialogTitle>Antes de subir tu primer recurso</DialogTitle>
                    </div>
                    <DialogDescription>
                        Tu biblioteca personal es privada — solo tú ves su contenido y solo tú puedes
                        usarla para tus propias consultas. Para protegerte a ti y a la plataforma,
                        necesitamos que confirmes lo siguiente:
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-2">
                    <label className="flex items-start gap-3 cursor-pointer rounded-md border p-3 hover:bg-muted/50 transition-colors">
                        <Checkbox
                            id="consent-ownership"
                            checked={ownershipChecked}
                            onCheckedChange={(v) => setOwnershipChecked(v === true)}
                            className="mt-0.5"
                        />
                        <div className="space-y-1">
                            <Label htmlFor="consent-ownership" className="font-medium cursor-pointer">
                                Poseo los derechos legales sobre el material
                            </Label>
                            <p className="text-xs text-muted-foreground leading-relaxed">
                                He comprado el libro o tengo una licencia válida que me permite usar
                                este material para mi estudio personal. Si el material es de dominio
                                público, confirmo que así es.
                            </p>
                        </div>
                    </label>

                    <label className="flex items-start gap-3 cursor-pointer rounded-md border p-3 hover:bg-muted/50 transition-colors">
                        <Checkbox
                            id="consent-personal"
                            checked={personalUseChecked}
                            onCheckedChange={(v) => setPersonalUseChecked(v === true)}
                            className="mt-0.5"
                        />
                        <div className="space-y-1">
                            <Label htmlFor="consent-personal" className="font-medium cursor-pointer">
                                Uso exclusivamente personal
                            </Label>
                            <p className="text-xs text-muted-foreground leading-relaxed">
                                Usaré este material solo para mi estudio, investigación o preparación
                                de sermones personales. No lo redistribuiré ni lo compartiré con terceros
                                a través de la plataforma.
                            </p>
                        </div>
                    </label>

                    <label className="flex items-start gap-3 cursor-pointer rounded-md border p-3 hover:bg-muted/50 transition-colors">
                        <Checkbox
                            id="consent-terms"
                            checked={termsChecked}
                            onCheckedChange={(v) => setTermsChecked(v === true)}
                            className="mt-0.5"
                        />
                        <div className="space-y-1">
                            <Label htmlFor="consent-terms" className="font-medium cursor-pointer">
                                Acepto los términos de uso
                            </Label>
                            <p className="text-xs text-muted-foreground leading-relaxed">
                                He leído y acepto los{' '}
                                <Link to="/terms" target="_blank" className="text-indigo-600 hover:underline">
                                    Términos de Uso
                                </Link>
                                , la{' '}
                                <Link to="/privacy" target="_blank" className="text-indigo-600 hover:underline">
                                    Política de Privacidad
                                </Link>
                                {' '}y la{' '}
                                <Link to="/dmca" target="_blank" className="text-indigo-600 hover:underline">
                                    Política DMCA
                                </Link>
                                .
                            </p>
                        </div>
                    </label>

                    <div className="flex items-start gap-2 rounded-md bg-amber-50 border border-amber-200 dark:bg-amber-950/20 dark:border-amber-900 p-3">
                        <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                        <div className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
                            <strong>Dos Filos</strong> actúa como herramienta de procesamiento sobre
                            tus documentos. <strong>No entrenamos modelos de IA</strong> con tu
                            contenido y <strong>no accedemos</strong> a tu biblioteca fuera de las
                            consultas que tú mismo generas.
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onCancel}>
                        Cancelar
                    </Button>
                    <Button
                        onClick={handleAccept}
                        disabled={!canAccept}
                        className="gap-2"
                    >
                        <ScrollText className="h-4 w-4" />
                        Aceptar y continuar
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

/**
 * Helper: check if the user has accepted the upload consent in the current browser.
 * Call this before triggering an upload to decide whether to show the modal.
 */
export function hasAcceptedUploadConsent(): boolean {
    try {
        const raw = localStorage.getItem('library-upload-consent-v1');
        if (!raw) return false;
        const data = JSON.parse(raw);
        return data?.acceptedAt != null;
    } catch {
        return false;
    }
}
