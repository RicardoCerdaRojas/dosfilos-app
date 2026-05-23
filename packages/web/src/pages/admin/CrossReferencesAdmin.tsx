import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Loader2, ArrowLeft, Network, Database, Search } from 'lucide-react';
import { useTranslation } from '@/i18n';
import { useAdminAuth } from '@/hooks/admin/useAdminAuth';
import { useCrossReferences } from '@/hooks/admin/useCrossReferences';

const TYPE_TONE: Record<string, string> = {
    quotation: 'bg-destructive/15 text-destructive border-destructive/30',
    allusion: 'bg-warning/15 text-warning border-warning/30',
    parallel: 'bg-primary/15 text-primary border-primary/30',
    echo: 'bg-muted text-muted-foreground border-muted-foreground/30',
};

/**
 * Admin tester for the TSK-based Bible cross-reference engine
 * (ADR-008). Provides:
 *   1. "Ingest sample" button — populates Firestore with the bundled
 *      seed (~12 anchor verses).
 *   2. Interactive lookup form — enter `(book, chapter, verse)` or a
 *      pericope range and inspect the parallels returned by the
 *      `lookupCrossReferences` callable.
 *
 * Used to validate the engine end-to-end before Phase 2 wires it into
 * the three-witness orchestrator.
 */
export function CrossReferencesAdmin() {
    const navigate = useNavigate();
    const { t } = useTranslation('admin');
    const { isAdmin, loading: authLoading } = useAdminAuth();
    const { ingest, lookupVerse, lookupRange, isLoading, lookupResult, lookupError } =
        useCrossReferences();

    const [book, setBook] = useState('JHN');
    const [chapter, setChapter] = useState('1');
    const [verse, setVerse] = useState('1');
    const [verseEnd, setVerseEnd] = useState('');

    if (authLoading || !isAdmin) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    const handleLookup = async () => {
        const chap = Number(chapter);
        const v = Number(verse);
        if (!book.trim() || !Number.isFinite(chap) || !Number.isFinite(v)) return;
        if (verseEnd.trim()) {
            const vEnd = Number(verseEnd);
            if (!Number.isFinite(vEnd)) return;
            await lookupRange({
                book: book.trim().toUpperCase(),
                chapter: chap,
                startVerse: v,
                endVerse: vEnd,
            });
        } else {
            await lookupVerse({ book: book.trim().toUpperCase(), chapter: chap, verse: v });
        }
    };

    return (
        <div className="p-6 max-w-4xl mx-auto">
            <div className="flex items-center gap-3 mb-6">
                <Button variant="outline" onClick={() => navigate('/dashboard/admin')}>
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    {t('common.back')}
                </Button>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                    <Network className="h-6 w-6 text-primary" />
                    {t('crossRefs.title')}
                </h1>
            </div>

            <Card className="p-5 mb-6">
                <h2 className="text-lg font-semibold mb-1">{t('crossRefs.ingestTitle')}</h2>
                <p className="text-sm text-muted-foreground mb-4">{t('crossRefs.ingestDescription')}</p>
                <Button onClick={ingest} disabled={isLoading}>
                    {isLoading ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                        <Database className="h-4 w-4 mr-2" />
                    )}
                    {t('crossRefs.ingestSample')}
                </Button>
            </Card>

            <Card className="p-5 mb-6">
                <h2 className="text-lg font-semibold mb-1">{t('crossRefs.lookupTitle')}</h2>
                <p className="text-sm text-muted-foreground mb-4">{t('crossRefs.lookupDescription')}</p>

                <div className="grid grid-cols-1 md:grid-cols-5 gap-3 mb-4">
                    <div>
                        <Label className="text-xs">{t('crossRefs.book')}</Label>
                        <Input value={book} onChange={(e) => setBook(e.target.value)} placeholder="JHN" />
                    </div>
                    <div>
                        <Label className="text-xs">{t('crossRefs.chapter')}</Label>
                        <Input value={chapter} onChange={(e) => setChapter(e.target.value)} placeholder="1" />
                    </div>
                    <div>
                        <Label className="text-xs">{t('crossRefs.verse')}</Label>
                        <Input value={verse} onChange={(e) => setVerse(e.target.value)} placeholder="1" />
                    </div>
                    <div>
                        <Label className="text-xs">{t('crossRefs.verseEnd')}</Label>
                        <Input
                            value={verseEnd}
                            onChange={(e) => setVerseEnd(e.target.value)}
                            placeholder={t('crossRefs.verseEndPlaceholder')}
                        />
                    </div>
                    <div className="flex items-end">
                        <Button onClick={handleLookup} disabled={isLoading} className="w-full">
                            {isLoading ? (
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                                <Search className="h-4 w-4 mr-2" />
                            )}
                            {t('crossRefs.lookup')}
                        </Button>
                    </div>
                </div>

                {lookupError && (
                    <div className="text-sm text-destructive bg-destructive/10 rounded p-3">
                        {lookupError}
                    </div>
                )}
            </Card>

            {lookupResult !== null && (
                <Card className="p-5">
                    <h2 className="text-lg font-semibold mb-3">{t('crossRefs.resultsTitle')}</h2>
                    {lookupResult.length === 0 ? (
                        <p className="text-sm text-muted-foreground italic">{t('crossRefs.noResults')}</p>
                    ) : (
                        <div className="space-y-4">
                            {lookupResult.map((doc) => (
                                <div key={doc.id} className="border rounded-lg p-4">
                                    <div className="flex items-center gap-2 mb-3 flex-wrap">
                                        <Badge variant="outline" className="font-mono">
                                            {doc.sourceBook} {doc.sourceChapter}:{doc.sourceVerse}
                                        </Badge>
                                        <Badge variant="outline" className="text-xs">
                                            {doc.count} {t('crossRefs.parallels')}
                                        </Badge>
                                        <span className="text-xs text-muted-foreground ml-auto">
                                            {doc.source}
                                        </span>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                        {doc.parallels.map((p, idx) => (
                                            <div
                                                key={idx}
                                                className="flex items-center gap-2 p-2 rounded border bg-card text-sm"
                                            >
                                                <Badge variant="outline" className="font-mono text-xs">
                                                    {p.targetBook} {p.targetChapter}:{p.targetVerse}
                                                    {p.targetVerseEnd ? `-${p.targetVerseEnd}` : ''}
                                                </Badge>
                                                <Badge variant="outline" className={`text-xs ${TYPE_TONE[p.type] ?? ''}`}>
                                                    {p.type}
                                                </Badge>
                                                <span className="text-xs text-muted-foreground ml-auto tabular-nums">
                                                    {p.strength.toFixed(2)}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                    {doc.parallels.some((p) => p.note) && (
                                        <div className="mt-3 space-y-1">
                                            {doc.parallels
                                                .filter((p) => p.note)
                                                .map((p, idx) => (
                                                    <div key={idx} className="text-xs text-muted-foreground italic">
                                                        <span className="font-mono not-italic">
                                                            {p.targetBook} {p.targetChapter}:{p.targetVerse}
                                                        </span>
                                                        {' — '}
                                                        {p.note}
                                                    </div>
                                                ))}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </Card>
            )}
        </div>
    );
}
