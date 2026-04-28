import React from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowRight, BookOpen, LayoutDashboard, Sparkles, Lightbulb, MessageCircle, Bookmark } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BiblePassageSelector } from '@/components/sermons/BiblePassageSelector';
import { PassagePreview } from './PassagePreview';
import { FeatureModal } from './FeatureModal';

/**
 * Idle / passage-selection landing screen for the Greek Tutor.
 *
 * ── Design language note ──────────────────────────────────────────────────
 * This view uses an intentional brand-gradient palette (blue/purple/pink/
 * cyan/amber/orange/green/violet/fuchsia) — distinct from the app's semantic
 * theme tokens. Same editorial-design exception as the public Landing page:
 * a centralised, named decorative palette for this onboarding surface, NOT
 * ad-hoc literals scattered across the app.
 */

interface GreekTutorIntroViewProps {
    passage: string;
    setPassage: (p: string) => void;
    recentPassages: string[];
    handleStart: () => void;
    openFeatureModal: string | null;
    setOpenFeatureModal: (id: string | null) => void;
    setShowInsightsDialog: (open: boolean) => void;
}

export const GreekTutorIntroView: React.FC<GreekTutorIntroViewProps> = ({
    passage,
    setPassage,
    recentPassages,
    handleStart,
    openFeatureModal,
    setOpenFeatureModal,
    setShowInsightsDialog,
}) => {
    const { t } = useTranslation('greekTutor');
    const hasPassage = passage.trim().length > 0;

    return (
        <>
            <div className="h-full overflow-hidden flex flex-col">
                <div className="flex-1 overflow-auto">
                    <div className="container max-w-7xl mx-auto px-6 py-12 lg:py-20">
                        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-start">
                            <div className="space-y-6">
                                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 p-8 text-white shadow-xl">
                                    <div className="absolute inset-0 bg-gradient-to-r from-black/10 to-transparent"></div>
                                    <div className="relative space-y-3">
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="flex-1">
                                                <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2">
                                                    {t('title')}
                                                </h1>
                                                <p className="text-blue-100 text-base leading-relaxed">
                                                    {t('description')}
                                                </p>
                                            </div>
                                            <Button
                                                variant="secondary"
                                                size="sm"
                                                className="gap-2 bg-white/20 hover:bg-white/30 border-white/30 text-white backdrop-blur-sm shrink-0"
                                                onClick={() => window.location.href = '/dashboard/greek-tutor-dashboard'}
                                            >
                                                <LayoutDashboard className="h-4 w-4" />
                                                <span className="hidden sm:inline">{t('mySessions')}</span>
                                            </Button>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div className="flex items-center gap-2">
                                        <div className="h-1 w-8 bg-gradient-to-r from-primary to-purple-600 rounded-full" />
                                        <h3 className="text-sm font-bold uppercase tracking-wider text-primary">
                                            {t('biblicalPassage')}
                                        </h3>
                                    </div>

                                    <div className="relative">
                                        <BiblePassageSelector
                                            value={passage}
                                            onChange={setPassage}
                                            onValidPassage={() => {}}
                                            hidePreview={hasPassage}
                                            label={t('passageSelector.label')}
                                            placeholder={t('passageSelector.placeholder')}
                                        />
                                    </div>

                                    <Button
                                        className="w-full h-14 text-lg font-semibold bg-gradient-to-r from-primary via-purple-600 to-pink-600 hover:from-primary/90 hover:via-purple-600/90 hover:to-pink-600/90 shadow-lg hover:shadow-xl transition-all group"
                                        size="lg"
                                        onClick={handleStart}
                                        disabled={!passage.trim()}
                                    >
                                        {t('startTraining')}
                                        <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                                    </Button>
                                </div>

                                <div className="space-y-3">
                                    <p className="text-sm text-muted-foreground font-medium">{t('frequentPassages')}</p>
                                    <div className="flex flex-wrap gap-2">
                                        {recentPassages.map((ref) => (
                                            <button
                                                key={ref}
                                                onClick={() => setPassage(ref)}
                                                className="group px-4 py-2 text-sm rounded-full border-2 border-primary/20 bg-primary/5 hover:bg-primary hover:text-white hover:border-primary transition-all duration-200 font-medium"
                                            >
                                                <BookOpen className="h-3 w-3 inline mr-1.5 opacity-60 group-hover:opacity-100" />
                                                {ref}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="hidden lg:block">
                                {hasPassage ? (
                                    <div className="sticky top-6">
                                        <PassagePreview passage={passage} />
                                    </div>
                                ) : (
                                    <div className="space-y-6">
                                        <div className="space-y-3">
                                            <div className="flex items-center gap-2">
                                                <div className="h-1 w-8 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full" />
                                                <h3 className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                                                    {t('sections.overview')}
                                                </h3>
                                            </div>

                                            <div className="space-y-2">
                                                <div
                                                    onClick={() => setOpenFeatureModal('lectura-pasaje')}
                                                    className="group relative p-4 rounded-lg border border-blue-500/20 bg-gradient-to-br from-blue-500/5 to-cyan-500/5 hover:border-blue-500/50 hover:shadow-lg hover:scale-[1.02] transition-all duration-300 cursor-pointer overflow-hidden"
                                                >
                                                    <div className="flex items-start gap-3">
                                                        <div className="p-1.5 rounded-md bg-blue-500/10 group-hover:bg-blue-500/20 transition-colors">
                                                            <BookOpen className="h-4 w-4 text-blue-600" />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <h4 className="font-medium text-sm mb-0.5">{t('features.readPassage.title')}</h4>
                                                            <p className="text-xs text-muted-foreground leading-relaxed">
                                                                {t('features.readPassage.description')}
                                                            </p>
                                                            <div className="mt-3 pt-3 border-t border-blue-500/10 opacity-0 max-h-0 group-hover:opacity-100 group-hover:max-h-32 transition-all duration-300 overflow-hidden">
                                                                <div className="text-[10px] font-mono text-blue-600/80 space-y-1">
                                                                    <div>πιστεύοντες → <span className="text-muted-foreground">pisteúontes</span></div>
                                                                    <div className="text-[9px] text-muted-foreground italic">{t('features.readPassage.preview')}</div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                                        <span className="text-[9px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-700 dark:text-blue-300 font-medium">
                                                            {t('buttons.viewExample')}
                                                        </span>
                                                    </div>
                                                </div>

                                                <div
                                                    onClick={() => setOpenFeatureModal('estructura-sintactica')}
                                                    className="group relative p-4 rounded-lg border border-cyan-500/20 bg-gradient-to-br from-cyan-500/5 to-blue-500/5 hover:border-cyan-500/50 hover:shadow-lg hover:scale-[1.02] transition-all duration-300 cursor-pointer overflow-hidden"
                                                >
                                                    <div className="flex items-start gap-3">
                                                        <div className="p-1.5 rounded-md bg-cyan-500/10 group-hover:bg-cyan-500/20 transition-colors">
                                                            <svg className="h-4 w-4 text-cyan-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                                                            </svg>
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <h4 className="font-medium text-sm mb-0.5">{t('features.syntax.title')}</h4>
                                                            <p className="text-xs text-muted-foreground leading-relaxed">
                                                                {t('features.syntax.description')}
                                                            </p>
                                                            <div className="mt-3 pt-3 border-t border-cyan-500/10 opacity-0 max-h-0 group-hover:opacity-100 group-hover:max-h-32 transition-all duration-300 overflow-hidden">
                                                                <div className="text-[10px] space-y-1">
                                                                    <div className="flex items-center gap-1">
                                                                        <span className="w-1 h-1 rounded-full bg-cyan-500"></span>
                                                                        <span className="text-muted-foreground">{t('features.syntax.preview.mainClause')}</span>
                                                                    </div>
                                                                    <div className="flex items-center gap-1 ml-3">
                                                                        <span className="w-1 h-1 rounded-full bg-cyan-400"></span>
                                                                        <span className="text-muted-foreground">{t('features.syntax.preview.subordinateClause')}</span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                                        <span className="text-[9px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 font-medium">
                                                            {t('buttons.viewExample')}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-3">
                                            <div className="flex items-center gap-2">
                                                <div className="h-1 w-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full" />
                                                <h3 className="text-xs font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">
                                                    {t('sections.wordStudy')}
                                                </h3>
                                            </div>

                                            <div className="space-y-2">
                                                <div
                                                    onClick={() => setOpenFeatureModal('analisis-morfologico')}
                                                    className="group relative p-4 rounded-lg border border-purple-500/20 bg-gradient-to-br from-purple-500/5 to-pink-500/5 hover:border-purple-500/50 hover:shadow-lg hover:scale-[1.02] transition-all duration-300 cursor-pointer overflow-hidden"
                                                >
                                                    <div className="flex items-start gap-3">
                                                        <div className="p-1.5 rounded-md bg-purple-500/10 group-hover:bg-purple-500/20 transition-colors">
                                                            <Sparkles className="h-4 w-4 text-purple-600" />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <h4 className="font-medium text-sm mb-0.5">{t('features.morphology.title')}</h4>
                                                            <p className="text-xs text-muted-foreground leading-relaxed">
                                                                {t('features.morphology.description')}
                                                            </p>
                                                            <div className="mt-3 pt-3 border-t border-purple-500/10 opacity-0 max-h-0 group-hover:opacity-100 group-hover:max-h-32 transition-all duration-300 overflow-hidden">
                                                                <div className="text-[10px] space-y-1.5">
                                                                    <div><span className="font-mono text-purple-600">πιστ-</span> <span className="text-muted-foreground">{t('features.morphology.preview.root')}</span></div>
                                                                    <div><span className="font-mono text-purple-600">-ευ-</span> <span className="text-muted-foreground">{t('features.morphology.preview.thematicVowel')}</span></div>
                                                                    <div><span className="font-mono text-purple-600">-οντες</span> <span className="text-muted-foreground">{t('features.morphology.preview.participle')}</span></div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                                        <span className="text-[9px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-700 dark:text-purple-300 font-medium">
                                                            {t('buttons.viewExample')}
                                                        </span>
                                                    </div>
                                                </div>

                                                <div
                                                    onClick={() => setOpenFeatureModal('claves-reconocimiento')}
                                                    className="group relative p-4 rounded-lg border border-pink-500/20 bg-gradient-to-br from-pink-500/5 to-purple-500/5 hover:border-pink-500/50 hover:shadow-lg hover:scale-[1.02] transition-all duration-300 cursor-pointer overflow-hidden"
                                                >
                                                    <div className="flex items-start gap-3">
                                                        <div className="p-1.5 rounded-md bg-pink-500/10 group-hover:bg-pink-500/20 transition-colors">
                                                            <svg className="h-4 w-4 text-pink-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                                                            </svg>
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <h4 className="font-medium text-sm mb-0.5">{t('features.recognitionKeys.title')}</h4>
                                                            <p className="text-xs text-muted-foreground leading-relaxed">
                                                                {t('features.recognitionKeys.description')}
                                                            </p>
                                                            <div className="mt-3 pt-3 border-t border-pink-500/10 opacity-0 max-h-0 group-hover:opacity-100 group-hover:max-h-32 transition-all duration-300 overflow-hidden">
                                                                <div className="text-[10px] text-muted-foreground space-y-1">
                                                                    <div>💡 <span className="font-medium">-οντες</span> {t('features.recognitionKeys.preview.indicator')}</div>
                                                                    <div>📌 {t('features.recognitionKeys.preview.typical')}</div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                                        <span className="text-[9px] px-2 py-0.5 rounded-full bg-pink-500/20 text-pink-700 dark:text-pink-300 font-medium">
                                                            {t('buttons.viewExample')}
                                                        </span>
                                                    </div>
                                                </div>

                                                <div
                                                    onClick={() => setOpenFeatureModal('funcion-contexto')}
                                                    className="group relative p-4 rounded-lg border border-fuchsia-500/20 bg-gradient-to-br from-fuchsia-500/5 to-purple-500/5 hover:border-fuchsia-500/50 hover:shadow-lg hover:scale-[1.02] transition-all duration-300 cursor-pointer overflow-hidden"
                                                >
                                                    <div className="flex items-start gap-3">
                                                        <div className="p-1.5 rounded-md bg-fuchsia-500/10 group-hover:bg-fuchsia-500/20 transition-colors">
                                                            <svg className="h-4 w-4 text-fuchsia-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                                            </svg>
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <h4 className="font-medium text-sm mb-0.5">{t('features.contextFunction.title')}</h4>
                                                            <p className="text-xs text-muted-foreground leading-relaxed">
                                                                {t('features.contextFunction.description')}
                                                            </p>
                                                            <div className="mt-3 pt-3 border-t border-fuchsia-500/10 opacity-0 max-h-0 group-hover:opacity-100 group-hover:max-h-32 transition-all duration-300 overflow-hidden">
                                                                <div className="text-[10px] text-muted-foreground">
                                                                    <div className="font-medium text-fuchsia-600 mb-1">{t('features.contextFunction.preview.subject')}</div>
                                                                    <div>{t('features.contextFunction.preview.function')}</div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                                        <span className="text-[9px] px-2 py-0.5 rounded-full bg-fuchsia-500/20 text-fuchsia-700 dark:text-fuchsia-300 font-medium">
                                                            {t('buttons.viewExample')}
                                                        </span>
                                                    </div>
                                                </div>

                                                <div
                                                    onClick={() => setOpenFeatureModal('insight-experto')}
                                                    className="group relative p-4 rounded-lg border border-violet-500/20 bg-gradient-to-br from-violet-500/5 to-purple-500/5 hover:border-violet-500/50 hover:shadow-lg hover:scale-[1.02] transition-all duration-300 cursor-pointer overflow-hidden"
                                                >
                                                    <div className="flex items-start gap-3">
                                                        <div className="p-1.5 rounded-md bg-violet-500/10 group-hover:bg-violet-500/20 transition-colors">
                                                            <Lightbulb className="h-4 w-4 text-violet-600" />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <h4 className="font-medium text-sm mb-0.5">{t('features.expertInsight.title')}</h4>
                                                            <p className="text-xs text-muted-foreground leading-relaxed">
                                                                {t('features.expertInsight.description')}
                                                            </p>
                                                            <div className="mt-3 pt-3 border-t border-violet-500/10 opacity-0 max-h-0 group-hover:opacity-100 group-hover:max-h-32 transition-all duration-300 overflow-hidden">
                                                                <div className="text-[10px] text-muted-foreground italic">
                                                                    "{t('features.expertInsight.preview')}"
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                                        <span className="text-[9px] px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-700 dark:text-violet-300 font-medium">
                                                            {t('buttons.viewExample')}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-3">
                                            <div className="flex items-center gap-2">
                                                <div className="h-1 w-8 bg-gradient-to-r from-amber-500 to-orange-500 rounded-full" />
                                                <h3 className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                                                    {t('sections.learningReinforcement')}
                                                </h3>
                                            </div>

                                            <div className="space-y-2">
                                                <div
                                                    onClick={() => setOpenFeatureModal('conceptos-generales')}
                                                    className="group relative p-4 rounded-lg border border-amber-500/20 bg-gradient-to-br from-amber-500/5 to-orange-500/5 hover:border-amber-500/50 hover:shadow-lg hover:scale-[1.02] transition-all duration-300 cursor-pointer overflow-hidden"
                                                >
                                                    <div className="flex items-start gap-3">
                                                        <div className="p-1.5 rounded-md bg-amber-500/10 group-hover:bg-amber-500/20 transition-colors">
                                                            <svg className="h-4 w-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                                            </svg>
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <h4 className="font-medium text-sm mb-0.5">{t('features.generalConcepts.title')}</h4>
                                                            <p className="text-xs text-muted-foreground leading-relaxed">
                                                                {t('features.generalConcepts.description')}
                                                            </p>
                                                            <div className="mt-3 pt-3 border-t border-amber-500/10 opacity-0 max-h-0 group-hover:opacity-100 group-hover:max-h-32 transition-all duration-300 overflow-hidden">
                                                                <div className="text-[10px] text-muted-foreground space-y-1">
                                                                    <div>📚 {t('features.generalConcepts.preview.cases')}</div>
                                                                    <div>📚 {t('features.generalConcepts.preview.tenses')}</div>
                                                                    <div>📚 {t('features.generalConcepts.preview.moods')}</div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                                        <span className="text-[9px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 font-medium">
                                                            {t('buttons.explore')}
                                                        </span>
                                                    </div>
                                                </div>

                                                <div
                                                    onClick={() => setOpenFeatureModal('preguntas-tutor')}
                                                    className="group relative p-4 rounded-lg border border-orange-500/20 bg-gradient-to-br from-orange-500/5 to-red-500/5 hover:border-orange-500/50 hover:shadow-lg hover:scale-[1.02] transition-all duration-300 cursor-pointer overflow-hidden"
                                                >
                                                    <div className="flex items-start gap-3">
                                                        <div className="p-1.5 rounded-md bg-orange-500/10 group-hover:bg-orange-500/20 transition-colors">
                                                            <MessageCircle className="h-4 w-4 text-orange-600" />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <h4 className="font-medium text-sm mb-0.5">{t('features.tutorQuestions.title')}</h4>
                                                            <p className="text-xs text-muted-foreground leading-relaxed">
                                                                {t('features.tutorQuestions.description')}
                                                            </p>
                                                            <div className="mt-3 pt-3 border-t border-orange-500/10 opacity-0 max-h-0 group-hover:opacity-100 group-hover:max-h-32 transition-all duration-300 overflow-hidden">
                                                                <div className="text-[10px] text-muted-foreground italic">
                                                                    "{t('features.tutorQuestions.preview')}"
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                                        <span className="text-[9px] px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-700 dark:text-orange-300 font-medium">
                                                            {t('buttons.ask')}
                                                        </span>
                                                    </div>
                                                </div>

                                                <div
                                                    onClick={() => setOpenFeatureModal('quiz-comprension')}
                                                    className="group relative p-4 rounded-lg border border-green-500/20 bg-gradient-to-br from-green-500/5 to-emerald-500/5 hover:border-green-500/50 hover:shadow-lg hover:scale-[1.02] transition-all duration-300 cursor-pointer overflow-hidden"
                                                >
                                                    <div className="flex items-start gap-3">
                                                        <div className="p-1.5 rounded-md bg-green-500/10 group-hover:bg-green-500/20 transition-colors">
                                                            <svg className="h-4 w-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                            </svg>
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <h4 className="font-medium text-sm mb-0.5">{t('features.quiz.title')}</h4>
                                                            <p className="text-xs text-muted-foreground leading-relaxed">
                                                                {t('features.quiz.description')}
                                                            </p>
                                                            <div className="mt-3 pt-3 border-t border-green-500/10 opacity-0 max-h-0 group-hover:opacity-100 group-hover:max-h-32 transition-all duration-300 overflow-hidden">
                                                                <div className="text-[10px] text-muted-foreground space-y-1">
                                                                    <div>✓ {t('features.quiz.preview.identify')}</div>
                                                                    <div>✓ {t('features.quiz.preview.analyze')}</div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                                        <span className="text-[9px] px-2 py-0.5 rounded-full bg-green-500/20 text-green-700 dark:text-green-300 font-medium">
                                                            {t('buttons.practice')}
                                                        </span>
                                                    </div>
                                                </div>

                                                <div
                                                    onClick={() => setShowInsightsDialog(true)}
                                                    className="group relative p-4 rounded-lg border border-purple-500/20 bg-gradient-to-br from-purple-500/5 to-pink-500/5 hover:border-purple-500/50 hover:shadow-lg hover:scale-[1.02] transition-all duration-300 cursor-pointer overflow-hidden"
                                                >
                                                    <div className="flex items-start gap-3">
                                                        <div className="p-1.5 rounded-md bg-purple-500/10 group-hover:bg-purple-500/20 transition-colors">
                                                            <Bookmark className="h-4 w-4 text-purple-600" />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <h4 className="font-medium text-sm mb-0.5">{t('features.myInsights.title')}</h4>
                                                            <p className="text-xs text-muted-foreground leading-relaxed">
                                                                {t('features.myInsights.description')}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                                        <span className="text-[9px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-700 dark:text-purple-300 font-medium">
                                                            {t('buttons.view')}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <FeatureModal
                isOpen={openFeatureModal === 'lectura-pasaje'}
                onClose={() => setOpenFeatureModal(null)}
                title={t('features.readPassage.title')}
                description={t('features.readPassage.description')}
                screenshotPath="/greek-tutor-previews/lectura_pasaje.png"
                details={t('features.readPassage.details', { returnObjects: true }) as string[]}
            />
            <FeatureModal
                isOpen={openFeatureModal === 'estructura-sintactica'}
                onClose={() => setOpenFeatureModal(null)}
                title={t('features.syntax.title')}
                description={t('features.syntax.description')}
                screenshotPath="/greek-tutor-previews/estructura_sintactica.png"
                details={t('features.syntax.details', { returnObjects: true }) as string[]}
            />
            <FeatureModal
                isOpen={openFeatureModal === 'analisis-morfologico'}
                onClose={() => setOpenFeatureModal(null)}
                title={t('features.morphology.title')}
                description={t('features.morphology.description')}
                screenshotPath="/greek-tutor-previews/analisis_morfologico.png"
                details={t('features.morphology.details', { returnObjects: true }) as string[]}
            />
            <FeatureModal
                isOpen={openFeatureModal === 'claves-reconocimiento'}
                onClose={() => setOpenFeatureModal(null)}
                title={t('features.recognitionKeys.title')}
                description={t('features.recognitionKeys.description')}
                screenshotPath="/greek-tutor-previews/claves_reconocimiento.png"
                details={t('features.recognitionKeys.details', { returnObjects: true }) as string[]}
            />
            <FeatureModal
                isOpen={openFeatureModal === 'funcion-contexto'}
                onClose={() => setOpenFeatureModal(null)}
                title={t('features.contextFunction.title')}
                description={t('features.contextFunction.description')}
                screenshotPath="/greek-tutor-previews/funcion_contexto.png"
                details={t('features.contextFunction.details', { returnObjects: true }) as string[]}
            />
            <FeatureModal
                isOpen={openFeatureModal === 'insight-experto'}
                onClose={() => setOpenFeatureModal(null)}
                title={t('features.expertInsight.title')}
                description={t('features.expertInsight.description')}
                screenshotPath="/greek-tutor-previews/insight_experto.png"
                details={t('features.expertInsight.details', { returnObjects: true }) as string[]}
            />
            <FeatureModal
                isOpen={openFeatureModal === 'conceptos-generales'}
                onClose={() => setOpenFeatureModal(null)}
                title={t('features.generalConcepts.title')}
                description={t('features.generalConcepts.description')}
                screenshotPath="/greek-tutor-previews/conceptos_generales.png"
                details={t('features.generalConcepts.details', { returnObjects: true }) as string[]}
            />
            <FeatureModal
                isOpen={openFeatureModal === 'preguntas-tutor'}
                onClose={() => setOpenFeatureModal(null)}
                title={t('features.tutorQuestions.title')}
                description={t('features.tutorQuestions.description')}
                screenshotPath="/greek-tutor-previews/preguntas_tutor.png"
                details={t('features.tutorQuestions.details', { returnObjects: true }) as string[]}
            />
            <FeatureModal
                isOpen={openFeatureModal === 'quiz-comprension'}
                onClose={() => setOpenFeatureModal(null)}
                title={t('features.quiz.title')}
                description={t('features.quiz.description')}
                screenshotPath="/greek-tutor-previews/quiz_comprension.png"
                details={t('features.quiz.details', { returnObjects: true }) as string[]}
            />
        </>
    );
};
