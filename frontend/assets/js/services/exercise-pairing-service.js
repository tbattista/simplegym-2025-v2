/**
 * Exercise Pairing Service
 * Computes complementary exercise recommendations based on
 * real-world programming patterns (PPL, 5/3/1, PHUL, etc.)
 *
 * Pure logic module — no DOM dependencies.
 * @module exercise-pairing-service
 * @version 1.0.0
 */

(function () {
    'use strict';

    // ============================================
    // STATIC KNOWLEDGE MAPS
    // Encode real-world strength training pairings
    // ============================================

    /** Movement pattern antagonist pairs (opposite movement directions) */
    const ANTAGONIST_PATTERNS = {
        'Horizontal Push': 'Horizontal Pull',
        'Horizontal Pull': 'Horizontal Push',
        'Vertical Push': 'Vertical Pull',
        'Vertical Pull': 'Vertical Push',
        'Elbow Flexion': 'Elbow Extension',
        'Elbow Extension': 'Elbow Flexion',
        'Squat': 'Hip Hinge',
        'Hip Hinge': 'Squat',
        'Hip Adduction': 'Hip Abduction',
        'Hip Abduction': 'Hip Adduction',
    };

    /** Antagonist fallback using forceType when movementPattern1 is missing */
    const FORCE_ANTAGONIST = {
        'Push': 'Pull',
        'Pull': 'Push',
    };

    /** Compound → isolation follow-up chains (by movement pattern) */
    const ISOLATION_FOLLOWUP = {
        'Horizontal Push': ['Elbow Extension'],
        'Horizontal Pull': ['Elbow Flexion'],
        'Vertical Push': ['Elbow Extension'],
        'Vertical Pull': ['Elbow Flexion'],
        'Squat': ['Ankle Plantar Flexion'],
        'Hip Hinge': ['Hip Extension'],
        'Hip Extension': ['Hip Hinge'],
    };

    /** Complementary compound patterns (same training split) */
    const COMPLEMENTARY_PATTERNS = {
        'Horizontal Push': ['Vertical Push'],
        'Vertical Push': ['Horizontal Push'],
        'Horizontal Pull': ['Vertical Pull', 'Scapular Elevation'],
        'Vertical Pull': ['Horizontal Pull', 'Scapular Elevation'],
        'Squat': ['Ankle Plantar Flexion', 'Hip Adduction'],
        'Hip Hinge': ['Hip Extension', 'Ankle Plantar Flexion'],
        'Hip Extension': ['Hip Hinge', 'Squat'],
        'Scapular Elevation': ['Horizontal Pull', 'Vertical Pull'],
    };

    // ============================================
    // HELPERS
    // ============================================

    /** Sort by tier (ascending) then foundational score (descending) */
    function sortByQuality(a, b) {
        const tierA = a.exerciseTier || 3;
        const tierB = b.exerciseTier || 3;
        if (tierA !== tierB) return tierA - tierB;
        return (b.foundationalScore || 0) - (a.foundationalScore || 0);
    }

    /** Exclude the source exercise and any already-picked exercises */
    function excludeIds(exercises, excludeSet) {
        return exercises.filter(e => !excludeSet.has(e.id));
    }

    // ============================================
    // CATEGORY FINDERS
    // ============================================

    /**
     * Find antagonist exercises (opposite movement pattern)
     * e.g., Bench Press (Horizontal Push) → Barbell Row (Horizontal Pull)
     */
    function findAntagonists(source, pool) {
        const pattern = source.movementPattern1;

        let candidates;
        if (pattern && ANTAGONIST_PATTERNS[pattern]) {
            const targetPattern = ANTAGONIST_PATTERNS[pattern];
            candidates = pool.filter(e =>
                e.movementPattern1 === targetPattern && e.mechanics === 'Compound'
            );
        } else if (source.forceType && FORCE_ANTAGONIST[source.forceType]) {
            // Fallback: use forceType + same bodyRegion
            const targetForce = FORCE_ANTAGONIST[source.forceType];
            candidates = pool.filter(e =>
                e.forceType === targetForce &&
                e.bodyRegion === source.bodyRegion &&
                e.mechanics === 'Compound'
            );
        } else {
            return [];
        }

        return candidates.sort(sortByQuality).slice(0, 2);
    }

    /**
     * Find complementary compound exercises (same split, different movement)
     * e.g., Bench Press (Horizontal Push) → OHP (Vertical Push)
     */
    function findComplementary(source, pool) {
        const pattern = source.movementPattern1;

        let targetPatterns;
        if (pattern && COMPLEMENTARY_PATTERNS[pattern]) {
            targetPatterns = COMPLEMENTARY_PATTERNS[pattern];
        } else {
            // Fallback: same bodyRegion, same forceType, different muscle group
            return pool.filter(e =>
                e.bodyRegion === source.bodyRegion &&
                e.forceType === source.forceType &&
                e.targetMuscleGroup !== source.targetMuscleGroup &&
                e.mechanics === 'Compound'
            ).sort(sortByQuality).slice(0, 2);
        }

        const candidates = pool.filter(e =>
            targetPatterns.includes(e.movementPattern1) &&
            e.mechanics === 'Compound'
        );

        return candidates.sort(sortByQuality).slice(0, 2);
    }

    /**
     * Find isolation follow-ups for a compound exercise
     * e.g., Bench Press → Tricep Pushdown, Cable Fly
     *
     * For isolation source: reverse — find compound foundations
     * e.g., Bicep Curl → Barbell Row, Pull-up
     */
    function findIsolationFollowups(source, pool) {
        if (source.mechanics === 'Isolation') {
            return null; // handled separately
        }

        const pattern = source.movementPattern1;
        const results = [];
        const seen = new Set();

        // Strategy 1: Pattern-based isolation follow-up
        if (pattern && ISOLATION_FOLLOWUP[pattern]) {
            const isoPatterns = ISOLATION_FOLLOWUP[pattern];
            const patternMatches = pool.filter(e =>
                isoPatterns.includes(e.movementPattern1) &&
                e.mechanics === 'Isolation'
            ).sort(sortByQuality);

            for (const ex of patternMatches) {
                if (!seen.has(ex.id) && results.length < 2) {
                    results.push(ex);
                    seen.add(ex.id);
                }
            }
        }

        // Strategy 2: Isolation exercises targeting the source's secondary muscle
        if (results.length < 2 && source.secondaryMuscle) {
            const secMatches = pool.filter(e =>
                e.targetMuscleGroup === source.secondaryMuscle &&
                e.mechanics === 'Isolation' &&
                !seen.has(e.id)
            ).sort(sortByQuality);

            for (const ex of secMatches) {
                if (!seen.has(ex.id) && results.length < 2) {
                    results.push(ex);
                    seen.add(ex.id);
                }
            }
        }

        // Strategy 3: Isolation exercises for the same target muscle (different angle)
        if (results.length < 2) {
            const sameMusclIso = pool.filter(e =>
                e.targetMuscleGroup === source.targetMuscleGroup &&
                e.mechanics === 'Isolation' &&
                !seen.has(e.id)
            ).sort(sortByQuality);

            for (const ex of sameMusclIso) {
                if (!seen.has(ex.id) && results.length < 2) {
                    results.push(ex);
                    seen.add(ex.id);
                }
            }
        }

        return results;
    }

    /**
     * Find compound foundations for an isolation exercise (reverse lookup)
     * e.g., Bicep Curl (Elbow Flexion) → Barbell Row (Horizontal Pull)
     */
    function findCompoundFoundations(source, pool) {
        const results = [];
        const seen = new Set();

        // Strategy 1: Compounds where source's targetMuscleGroup is their secondary
        const secondaryMatches = pool.filter(e =>
            e.mechanics === 'Compound' &&
            (e.secondaryMuscle === source.targetMuscleGroup ||
             e.tertiaryMuscle === source.targetMuscleGroup)
        ).sort(sortByQuality);

        for (const ex of secondaryMatches) {
            if (!seen.has(ex.id) && results.length < 2) {
                results.push(ex);
                seen.add(ex.id);
            }
        }

        // Strategy 2: Compounds with same bodyRegion and compatible forceType
        if (results.length < 2) {
            const regionMatches = pool.filter(e =>
                e.mechanics === 'Compound' &&
                e.bodyRegion === source.bodyRegion &&
                !seen.has(e.id)
            ).sort(sortByQuality);

            for (const ex of regionMatches) {
                if (!seen.has(ex.id) && results.length < 2) {
                    results.push(ex);
                    seen.add(ex.id);
                }
            }
        }

        return results;
    }

    /**
     * Find same-muscle variations (different pattern or equipment)
     * e.g., Bench Press (Barbell) → Incline DB Press (Dumbbell), Cable Fly (Cable)
     */
    function findVariations(source, pool) {
        const candidates = pool.filter(e =>
            e.targetMuscleGroup === source.targetMuscleGroup &&
            (e.movementPattern1 !== source.movementPattern1 ||
             e.primaryEquipment !== source.primaryEquipment)
        );

        return candidates.sort(sortByQuality).slice(0, 2);
    }

    // ============================================
    // MAIN API
    // ============================================

    /**
     * Get complementary exercise pairings for a given exercise.
     *
     * @param {Object} exercise - Source exercise object
     * @param {Array} allExercises - Full exercise array (window.ffn.exercises.all)
     * @returns {Object} { categories: Array<{key, label, icon, description, exercises}> }
     */
    function getPairings(exercise, allExercises) {
        if (!exercise || !allExercises?.length) {
            return { categories: [] };
        }

        // Skip cardio exercises
        if (exercise.targetMuscleGroup === 'Cardio') {
            return { categories: [] };
        }

        // Build pool: exclude self, only global exercises
        const usedIds = new Set([exercise.id]);
        const globalPool = allExercises.filter(e => e.isGlobal !== false);

        const categories = [];

        // 1. Antagonist Pair (skip for Core — no clear antagonist)
        if (exercise.movementPattern1 !== 'Core') {
            const antagonists = findAntagonists(exercise, excludeIds(globalPool, usedIds));
            if (antagonists.length > 0) {
                antagonists.forEach(e => usedIds.add(e.id));
                categories.push({
                    key: 'antagonist',
                    label: 'Antagonist Pair',
                    icon: 'bx-transfer',
                    description: 'Opposite movement for balanced training',
                    exercises: antagonists
                });
            }
        }

        // 2. Complementary Compound
        const complementary = findComplementary(exercise, excludeIds(globalPool, usedIds));
        if (complementary.length > 0) {
            complementary.forEach(e => usedIds.add(e.id));
            categories.push({
                key: 'complementary',
                label: 'Complementary Compound',
                icon: 'bx-unite',
                description: 'Same training split, different movement',
                exercises: complementary
            });
        }

        // 3. Isolation Follow-up OR Compound Foundation (depends on source mechanics)
        if (exercise.mechanics === 'Isolation') {
            const foundations = findCompoundFoundations(exercise, excludeIds(globalPool, usedIds));
            if (foundations.length > 0) {
                foundations.forEach(e => usedIds.add(e.id));
                categories.push({
                    key: 'foundation',
                    label: 'Compound Foundation',
                    icon: 'bx-shield',
                    description: 'Compound lifts that work this muscle',
                    exercises: foundations
                });
            }
        } else {
            const isolations = findIsolationFollowups(exercise, excludeIds(globalPool, usedIds));
            if (isolations && isolations.length > 0) {
                isolations.forEach(e => usedIds.add(e.id));
                categories.push({
                    key: 'isolation',
                    label: 'Isolation Follow-up',
                    icon: 'bx-target-lock',
                    description: 'Targeted isolation for synergist muscles',
                    exercises: isolations
                });
            }
        }

        // 4. Same Muscle Variation
        const variations = findVariations(exercise, excludeIds(globalPool, usedIds));
        if (variations.length > 0) {
            variations.forEach(e => usedIds.add(e.id));
            categories.push({
                key: 'variation',
                label: 'Same Muscle Variation',
                icon: 'bx-shuffle',
                description: 'Different angle or equipment for the same muscle',
                exercises: variations
            });
        }

        return { categories };
    }

    // ============================================
    // EXPORT
    // ============================================

    window.ExercisePairingService = { getPairings };

    console.log('📦 Exercise Pairing Service loaded');
})();
