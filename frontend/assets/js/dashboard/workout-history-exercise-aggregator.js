/**
 * Workout History - Exercise Aggregator
 * Extracts and groups exercise data from sessions for the Exercises tab
 * @version 1.0.0
 */

/* ============================================
   EQUIPMENT PREFIX PARSING
   ============================================ */

// Sorted by length descending so multi-word prefixes match first
const EQUIPMENT_PREFIXES = [
  'Leverage Machine',
  'Smith Machine',
  'Cable Machine',
  'Body Weight',
  'Bodyweight',
  'Trap Bar',
  'Kettlebell',
  'EZ-Bar',
  'EZ Bar',
  'Barbell',
  'Dumbbell',
  'Cable',
  'Machine',
  'Band'
];

/**
 * Parse exercise name into base movement name and equipment
 * e.g., "Barbell Bench Press" -> { baseName: "Bench Press", equipment: "Barbell" }
 * e.g., "Push-up" -> { baseName: "Push-up", equipment: null }
 */
function parseExerciseName(fullName) {
  if (!fullName) return { baseName: fullName || '', equipment: null };

  const nameLower = fullName.toLowerCase();

  for (const prefix of EQUIPMENT_PREFIXES) {
    const prefixLower = prefix.toLowerCase();
    if (nameLower.startsWith(prefixLower + ' ')) {
      const baseName = fullName.substring(prefix.length).trim();
      if (baseName.length > 0) {
        // Normalize equipment display names
        let equipment = prefix;
        if (equipment === 'Body Weight') equipment = 'Bodyweight';
        if (equipment === 'EZ Bar') equipment = 'EZ-Bar';
        if (equipment === 'Leverage Machine') equipment = 'Machine';
        if (equipment === 'Cable Machine') equipment = 'Cable';
        return { baseName, equipment };
      }
    }
  }

  return { baseName: fullName, equipment: null };
}

/* ============================================
   SESSION AGGREGATION
   ============================================ */

/**
 * Aggregate exercise data from all sessions into grouped structure
 * @param {Array} sessions - Strength sessions (already filtered, no cardio)
 * @returns {Array} Sorted array of exercise group objects
 */
function aggregateExercisesFromSessions(sessions) {
  // Nested map: baseName -> equipment -> variantData
  const groupMap = new Map();

  for (const session of sessions) {
    const exercises = session.exercises_performed || [];
    const sessionDate = session.completed_at || session.started_at || session.created_at;

    for (const ex of exercises) {
      if (!ex.exercise_name || ex.is_skipped) continue;

      const { baseName, equipment } = parseExerciseName(ex.exercise_name);
      const equipmentKey = equipment || 'Other';

      // Get or create group
      if (!groupMap.has(baseName)) {
        groupMap.set(baseName, new Map());
      }
      const variants = groupMap.get(baseName);

      // Get or create variant
      if (!variants.has(equipmentKey)) {
        variants.set(equipmentKey, {
          fullName: ex.exercise_name,
          equipment: equipmentKey,
          entries: [],
          sessionDates: new Set()
        });
      }
      const variant = variants.get(equipmentKey);

      // Add entry
      const weight = ex.weight || null;
      const weightUnit = ex.weight_unit || 'lbs';
      const sets = ex.sets_completed || ex.target_sets || '';
      const reps = ex.target_reps || '';

      variant.entries.push({
        date: sessionDate,
        weight,
        weightUnit,
        sets,
        reps,
        sessionId: session.id
      });

      // Track unique session dates
      if (sessionDate) {
        variant.sessionDates.add(new Date(sessionDate).toDateString());
      }
    }
  }

  // Build result array
  const groups = [];

  for (const [baseName, variants] of groupMap) {
    const variantArray = [];
    let groupTotalSessions = 0;
    let groupLastDate = null;

    for (const [equipmentKey, variant] of variants) {
      // Sort entries by date descending
      variant.entries.sort((a, b) => new Date(b.date) - new Date(a.date));

      // Deduplicate: keep best weight per date
      const deduped = deduplicateVariantEntries(variant.entries);

      const totalSessions = variant.sessionDates.size;
      const lastEntry = deduped[0];
      const bestWeight = getBestWeight(deduped);

      variantArray.push({
        fullName: variant.fullName,
        equipment: equipmentKey,
        entries: deduped.slice(0, 5), // Keep last 5 for timeline
        totalSessions,
        lastWeight: lastEntry?.weight || null,
        lastWeightUnit: lastEntry?.weightUnit || 'lbs',
        lastReps: lastEntry?.reps || '',
        lastDate: lastEntry?.date || null,
        bestWeight
      });

      groupTotalSessions += totalSessions;
      if (lastEntry?.date) {
        const d = new Date(lastEntry.date);
        if (!groupLastDate || d > groupLastDate) groupLastDate = d;
      }
    }

    // Sort variants by session count descending
    variantArray.sort((a, b) => b.totalSessions - a.totalSessions);

    groups.push({
      baseName,
      variants: variantArray,
      totalSessions: groupTotalSessions,
      lastDate: groupLastDate ? groupLastDate.toISOString() : null
    });
  }

  // Default sort: frequency descending
  groups.sort((a, b) => b.totalSessions - a.totalSessions);

  return groups;
}

/**
 * Deduplicate entries by date, keeping best weight per date
 */
function deduplicateVariantEntries(entries) {
  const byDate = {};

  for (const entry of entries) {
    if (!entry.date) continue;
    const dateKey = new Date(entry.date).toDateString();
    const weight = parseFloat(entry.weight) || 0;

    if (!byDate[dateKey] || weight > (parseFloat(byDate[dateKey].weight) || 0)) {
      byDate[dateKey] = entry;
    }
  }

  return Object.values(byDate).sort((a, b) => new Date(b.date) - new Date(a.date));
}

/**
 * Find the best (highest) numeric weight from entries
 */
function getBestWeight(entries) {
  let best = 0;
  for (const entry of entries) {
    const w = parseFloat(entry.weight);
    if (!isNaN(w) && w > best) best = w;
  }
  return best > 0 ? best : null;
}

/* ============================================
   EXPORTS
   ============================================ */

window.parseExerciseName = parseExerciseName;
window.aggregateExercisesFromSessions = aggregateExercisesFromSessions;

console.log('Workout History Exercise Aggregator module loaded (v1.0.0)');
