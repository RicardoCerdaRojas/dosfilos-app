import { useState, useEffect } from 'react';
import { BiblicalPassage, PassageWord, UnitPreview, TrainingUnit } from '@dosfilos/domain';
import { useGreekTutor } from '../GreekTutorProvider';

/**
 * Custom hook for managing passage reader state and logic
 */
export const usePassageReader = (
    passage: BiblicalPassage | null,
    sessionId: string,
    currentUnits: TrainingUnit[],
    fileSearchStoreId?: string,
    onUnitAdded?: (unit: TrainingUnit) => void
) => {
    // Visible versions state
    const [visibleVersions, setVisibleVersions] = useState<Set<string>>(
        new Set(['rv60', 'greek', 'transliteration']) // All visible by default
    );

    // Word selection and preview state
    const [selectedWord, setSelectedWord] = useState<PassageWord | null>(null);
    const [unitPreview, setUnitPreview] = useState<UnitPreview | null>(null);
    const [isLoadingPreview, setIsLoadingPreview] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isAddingUnit, setIsAddingUnit] = useState(false);

    const { identifyPassageWord, addPassageWordToUnits } = useGreekTutor();

    // Helper function to normalize Greek text for comparison
    const normalizeGreek = (text: string): string => {
        return text
            .toLowerCase()
            .normalize('NFD') // Decompose accents
            .replace(/[\u0300-\u036f]/g, '') // Remove accent marks
            .replace(/[,;.·!?]/g, '') // Remove punctuation
            // Handle common Greek consonant assimilations
            // συν- assimilations
            .replace(/συνσχ/g, 'συσχ') // συν- before σχ becomes συσχ
            .replace(/συνζ/g, 'συζ')   // συν- before ζ becomes συζ
            .replace(/συνψ/g, 'συψ')   // συν- before ψ becomes συψ
            .replace(/συνξ/g, 'συξ')   // συν- before ξ becomes συξ
            // ἐν- assimilations
            .replace(/ενβ/g, 'εμβ')    // ἐν- before β becomes ἐμ-
            .replace(/ενπ/g, 'εμπ')    // ἐν- before π becomes ἐμ-
            .replace(/ενφ/g, 'εμφ')    // ἐν- before φ becomes ἐμ-
            .replace(/ενψ/g, 'εμψ')    // ἐν- before ψ becomes ἐμ-
            .replace(/ενγ/g, 'εγγ')    // ἐν- before γ becomes ἐγγ-
            .replace(/ενκ/g, 'εγκ')    // ἐν- before κ becomes ἐγκ-
            .replace(/ενχ/g, 'εγχ')    // ἐν- before χ becomes ἐγχ-
            .replace(/ενξ/g, 'εγξ');   // ἐν- before ξ becomes ἐγξ-
    };

    // Mark words that are already in units
    const wordsWithStatus = passage?.words.map(word => {
        const isInUnits = currentUnits.some(unit => {
            // PRIORITY 1: Compare lemmas (most reliable)
            // If both have lemmas and they match, it's a definite match
            if (unit.greekForm.lemma && word.lemma) {
                const lemmaMatch = normalizeGreek(unit.greekForm.lemma) === normalizeGreek(word.lemma);
                if (lemmaMatch) {
                    return true; // Early return - lemmas match!
                }
            }

            // PRIORITY 2: Exact text match (normalized)
            const exactTextMatch = normalizeGreek(unit.greekForm.text) === normalizeGreek(word.greek);
            if (exactTextMatch) {
                return true;
            }

            // PRIORITY 3: Bidirectional substring matching (for inflected forms)
            const unitNorm = normalizeGreek(unit.greekForm.text);
            const wordNorm = normalizeGreek(word.greek);

            // Check if unit text is contained in passage word
            const unitInWord = wordNorm.includes(unitNorm) && unitNorm.length >= 3;

            // Check if passage word is contained in unit text
            const wordInUnit = unitNorm.includes(wordNorm) && wordNorm.length >= 3;

            const substringMatch = unitInWord || wordInUnit;

            return substringMatch;
        });

        return {
            ...word,
            isInUnits
        };
    }) || [];

    // Words processed

    /**
     * Toggle visibility of a version
     */
    const toggleVersion = (version: string) => {
        setVisibleVersions(prev => {
            const newSet = new Set(prev);
            if (newSet.has(version)) {
                newSet.delete(version);
            } else {
                newSet.add(version);
            }
            return newSet;
        });
    };

    /**
     * Handle word click - identify and show preview
     */
    const handleWordClick = async (word: PassageWord) => {
        if (!passage || !identifyPassageWord) return;

        // Don't allow selecting words already in units
        if (word.isInUnits) {
            // Word already in units
            return;
        }

        setSelectedWord(word);
        setIsModalOpen(true);
        setIsLoadingPreview(true);
        setUnitPreview(null);

        try {
            const preview = await identifyPassageWord.execute(
                word,
                passage.greekText,
                fileSearchStoreId
            );
            setUnitPreview(preview);
        } catch (error) {
            console.error('[usePassageReader] Error identifying word:', error);
            // Keep modal open to show error state
        } finally {
            setIsLoadingPreview(false);
        }
    };

    /**
     * Handle confirming to add word to units
     */
    const handleConfirmAdd = async () => {
        if (!selectedWord || !unitPreview || !passage || !addPassageWordToUnits) return;

        // Check if this word is already in units (duplicate prevention)
        const isDuplicate = currentUnits.some(unit => {
            const lemmaMatch = unit.greekForm.lemma && selectedWord.lemma &&
                normalizeGreek(unit.greekForm.lemma) === normalizeGreek(selectedWord.lemma);

            const textMatch = normalizeGreek(unit.greekForm.text) === normalizeGreek(selectedWord.greek);

            return lemmaMatch || textMatch;
        });

        if (isDuplicate) {
            console.warn('[usePassageReader] Word already in units, skipping:', selectedWord.greek);
            alert(`La palabra "${selectedWord.greek}" ya está en tus unidades de estudio.`);
            handleCloseModal();
            return;
        }

        setIsAddingUnit(true);

        try {
            const newUnit = await addPassageWordToUnits.execute(
                sessionId,
                unitPreview,
                selectedWord,
                passage.greekText,
                fileSearchStoreId
            );

            // Notify parent component that a new unit was added
            if (onUnitAdded) {
                // Notifying parent of new unit
                onUnitAdded(newUnit);
            }

            // Close modal on success
            handleCloseModal();
        } catch (error) {
            console.error('[usePassageReader] Error adding unit:', error);
            // Keep modal open to show error
        } finally {
            setIsAddingUnit(false);
        }
    };

    /**
     * Close modal and reset state
     */
    const handleCloseModal = () => {
        setIsModalOpen(false);
        setSelectedWord(null);
        setUnitPreview(null);
        setIsLoadingPreview(false);
        setIsAddingUnit(false);
    };

    // Reset state when passage changes
    useEffect(() => {
        handleCloseModal();
    }, [passage?.reference]);

    return {
        visibleVersions,
        toggleVersion,
        wordsWithStatus,
        selectedWord,
        unitPreview,
        isLoadingPreview,
        isModalOpen,
        isAddingUnit,
        handleWordClick,
        handleConfirmAdd,
        handleCloseModal
    };
};
