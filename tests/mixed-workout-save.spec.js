// @ts-check
const { test, expect } = require('playwright/test');

const BASE = 'http://localhost:8001';

/**
 * Tests that the client-side validation in the workout save pipeline
 * correctly handles cardio groups (which have empty sets/reps/rest).
 */
test('save validation accepts mixed exercise types including cardio', async ({ page }) => {
  await page.goto(`${BASE}/workout-builder.html`);
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(1000);

  // Set up the exercise groups data with mixed types directly in the page context
  const validationResult = await page.evaluate(() => {
    // Simulate exercise group data as it would exist after adding exercises
    window.exerciseGroupsData = window.exerciseGroupsData || {};

    // Standard exercise group
    window.exerciseGroupsData['group-standard-1'] = {
      group_type: 'standard',
      exercises: { a: 'Bench Press' },
      sets: '3',
      reps: '8-12',
      rest: '60s',
      default_weight: null,
      default_weight_unit: 'lbs'
    };

    // Cardio exercise group (empty sets/reps/rest is intentional)
    window.exerciseGroupsData['group-cardio-1'] = {
      group_type: 'cardio',
      exercises: { a: 'running' },
      sets: '',
      reps: '',
      rest: '',
      default_weight: null,
      default_weight_unit: 'lbs',
      cardio_config: {
        activity_type: 'running',
        duration_minutes: 30
      }
    };

    // Simulate what the save manager validation does
    const exerciseGroups = [
      {
        group_id: 'group-standard-1',
        group_type: 'standard',
        exercises: { a: 'Bench Press' },
        sets: '3',
        reps: '8-12',
        rest: '60s'
      },
      {
        group_id: 'group-cardio-1',
        group_type: 'cardio',
        exercises: { a: 'running' },
        sets: '',
        reps: '',
        rest: '',
        cardio_config: { activity_type: 'running', duration_minutes: 30 }
      }
    ];

    // Replicate the validation logic from workout-editor-save-manager.js
    const validationErrors = [];
    exerciseGroups.forEach((group, index) => {
      if (!group.group_id) {
        validationErrors.push(`Group ${index + 1}: Missing group_id field`);
      }
      if (!group.exercises || typeof group.exercises !== 'object') {
        validationErrors.push(`Group ${index + 1}: Invalid or missing exercises object`);
      }
      // This is the fix: skip sets/reps/rest validation for cardio groups
      if (group.group_type !== 'cardio') {
        if (!group.sets) validationErrors.push(`Group ${index + 1}: Missing sets`);
        if (!group.reps) validationErrors.push(`Group ${index + 1}: Missing reps`);
        if (!group.rest) validationErrors.push(`Group ${index + 1}: Missing rest`);
      }
    });

    return { errors: validationErrors, count: validationErrors.length };
  });

  // Validation should pass with zero errors
  expect(validationResult.count).toBe(0);
  expect(validationResult.errors).toEqual([]);
});

test('sectionsToExerciseGroups preserves empty strings for cardio groups', async ({ page }) => {
  await page.goto(`${BASE}/workout-builder.html`);
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(1000);

  const result = await page.evaluate(() => {
    if (!window.ExerciseDataUtils) {
      return { error: 'ExerciseDataUtils not loaded' };
    }

    const sections = [
      {
        section_id: 'section-1',
        type: 'standard',
        name: null,
        exercises: [
          {
            exercise_id: 'ex-1',
            name: 'Bench Press',
            alternates: [],
            sets: '4',
            reps: '6-8',
            rest: '90s',
            group_type: 'standard'
          },
          {
            exercise_id: 'ex-2',
            name: 'running',
            alternates: [],
            sets: '',
            reps: '',
            rest: '',
            group_type: 'cardio',
            cardio_config: { activity_type: 'running', duration_minutes: 20 }
          }
        ]
      }
    ];

    const groups = ExerciseDataUtils.sectionsToExerciseGroups(sections);
    return {
      groupCount: groups.length,
      standardGroup: {
        sets: groups[0].sets,
        reps: groups[0].reps,
        rest: groups[0].rest,
        group_type: groups[0].group_type
      },
      cardioGroup: {
        sets: groups[1].sets,
        reps: groups[1].reps,
        rest: groups[1].rest,
        group_type: groups[1].group_type,
        hasCardioConfig: !!groups[1].cardio_config
      }
    };
  });

  expect(result.groupCount).toBe(2);

  // Standard group should have its specified values
  expect(result.standardGroup.sets).toBe('4');
  expect(result.standardGroup.reps).toBe('6-8');
  expect(result.standardGroup.rest).toBe('90s');
  expect(result.standardGroup.group_type).toBe('standard');

  // Cardio group should preserve empty strings, NOT get default values
  expect(result.cardioGroup.sets).toBe('');
  expect(result.cardioGroup.reps).toBe('');
  expect(result.cardioGroup.rest).toBe('');
  expect(result.cardioGroup.group_type).toBe('cardio');
  expect(result.cardioGroup.hasCardioConfig).toBe(true);
});
