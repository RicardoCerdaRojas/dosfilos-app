/**
 * Approach Selection Info Component
 * 
 * Right panel content for Step 2a: Information about approach selection
 * @layer Presentation - Informational component
 * @solid SRP - Single responsibility: educate user about approach selection
 */

import { Card } from '@/components/ui/card';
import { Sparkles, Target, Users, BookOpen } from 'lucide-react';
import { useTranslation } from '@/i18n';

export function ApproachSelectionInfo() {
    const { t } = useTranslation('generator');

    return (
        <Card className="p-6 h-full flex flex-col justify-start">
            <div className="space-y-6">
                {/* Header */}
                <div className="text-center space-y-2">
                    <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                        <Sparkles className="h-8 w-8 text-primary" />
                    </div>
                    <h3 className="font-semibold text-lg">{t('homiletics.infoTitle')}</h3>
                    <p className="text-sm text-muted-foreground">
                        {t('homiletics.infoDesc')}
                    </p>
                </div>

                {/* Info Sections */}
                <div className="space-y-4 border-t pt-4">
                    <div className="flex gap-3">
                        <Target className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                        <div>
                            <h4 className="font-medium text-sm mb-1">{t('homiletics.typesTitle')}</h4>
                            <p className="text-xs text-muted-foreground">
                                {t('homiletics.typesDesc')}
                            </p>
                        </div>
                    </div>

                    <div className="flex gap-3">
                        <Users className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                        <div>
                            <h4 className="font-medium text-sm mb-1">{t('homiletics.audienceTitle')}</h4>
                            <p className="text-xs text-muted-foreground">
                                {t('homiletics.audienceDesc')}
                            </p>
                        </div>
                    </div>

                    <div className="flex gap-3">
                        <BookOpen className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                        <div>
                            <h4 className="font-medium text-sm mb-1">{t('homiletics.developmentTitle')}</h4>
                            <p className="text-xs text-muted-foreground">
                                {t('homiletics.developmentDesc')}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Tip */}
                <div className="bg-primary/5 border border-primary/20 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground">
                        <span className="font-medium text-primary">💡 {t('homiletics.tip')}</span> {t('homiletics.tipText')}
                    </p>
                </div>
            </div>
        </Card>
    );
}
