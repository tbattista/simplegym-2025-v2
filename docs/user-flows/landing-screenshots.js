/**
 * Fitness Field Notes - Landing Page Screenshot Capture
 * Captures app screenshots for the /launch marketing landing page.
 *
 * Usage:
 *   npx playwright install chromium  (first time only)
 *   node docs/user-flows/landing-screenshots.js
 *   node docs/user-flows/landing-screenshots.js --base-url http://localhost:8001
 *
 * Prerequisites:
 *   - Dev server running at the base URL (default: http://localhost:8001)
 *
 * Output:
 *   - Screenshots saved to frontend/assets/img/landing/
 */

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

// --- Configuration ---

const DEFAULT_BASE_URL = 'http://localhost:8001';
const SCREENSHOT_DIR = path.join(__dirname, '..', '..', 'frontend', 'assets', 'img', 'landing');

const VIEWPORT = { width: 390, height: 844 };
const DEVICE_SCALE_FACTOR = 2; // Retina

// --- Seed Data ---
// Uses the EXACT localStorage format the app expects (key: 'gym_workouts').

function makeSeedWorkouts() {
  const now = new Date().toISOString();
  return [
    {
      id: 'landing-push-day',
      name: 'Push Day',
      description: 'Upper body push workout',
      tags: ['push', 'upper'],
      exercise_groups: [
        {
          group_id: 'group-lp-001',
          exercises: { a: 'Barbell Bench Press' },
          sets: '4', reps: '6-8', rest: '2min',
          default_weight: 185, default_weight_unit: 'lbs',
          group_type: 'standard', group_name: null,
          cardio_config: null, interval_config: null, block_id: null
        },
        {
          group_id: 'group-lp-002',
          exercises: { a: 'Overhead Press' },
          sets: '3', reps: '8-10', rest: '90s',
          default_weight: 115, default_weight_unit: 'lbs',
          group_type: 'standard', group_name: null,
          cardio_config: null, interval_config: null, block_id: null
        },
        {
          group_id: 'group-lp-003',
          exercises: { a: 'Incline Dumbbell Press' },
          sets: '3', reps: '10-12', rest: '60s',
          default_weight: 60, default_weight_unit: 'lbs',
          group_type: 'standard', group_name: null,
          cardio_config: null, interval_config: null, block_id: null
        },
        {
          group_id: 'group-lp-004',
          exercises: { a: 'Lateral Raises' },
          sets: '3', reps: '12-15', rest: '45s',
          default_weight: 20, default_weight_unit: 'lbs',
          group_type: 'standard', group_name: null,
          cardio_config: null, interval_config: null, block_id: null
        },
        {
          group_id: 'group-lp-005',
          exercises: { a: 'Tricep Pushdowns' },
          sets: '3', reps: '12-15', rest: '45s',
          default_weight: 40, default_weight_unit: 'lbs',
          group_type: 'standard', group_name: null,
          cardio_config: null, interval_config: null, block_id: null
        }
      ],
      sections: [],
      template_notes: [],
      is_template: true,
      is_archived: false, archived_at: null,
      is_favorite: true, favorited_at: now,
      created_date: now, modified_date: now
    },
    {
      id: 'landing-pull-day',
      name: 'Pull Day',
      description: 'Upper body pull workout',
      tags: ['pull', 'upper'],
      exercise_groups: [
        {
          group_id: 'group-lp-101',
          exercises: { a: 'Barbell Rows' },
          sets: '4', reps: '6-8', rest: '2min',
          default_weight: 155, default_weight_unit: 'lbs',
          group_type: 'standard', group_name: null,
          cardio_config: null, interval_config: null, block_id: null
        },
        {
          group_id: 'group-lp-102',
          exercises: { a: 'Pull-Ups' },
          sets: '3', reps: '8-10', rest: '90s',
          default_weight: null, default_weight_unit: 'lbs',
          group_type: 'standard', group_name: null,
          cardio_config: null, interval_config: null, block_id: null
        },
        {
          group_id: 'group-lp-103',
          exercises: { a: 'Face Pulls' },
          sets: '3', reps: '12-15', rest: '45s',
          default_weight: 30, default_weight_unit: 'lbs',
          group_type: 'standard', group_name: null,
          cardio_config: null, interval_config: null, block_id: null
        },
        {
          group_id: 'group-lp-104',
          exercises: { a: 'Barbell Curls' },
          sets: '3', reps: '10-12', rest: '45s',
          default_weight: 65, default_weight_unit: 'lbs',
          group_type: 'standard', group_name: null,
          cardio_config: null, interval_config: null, block_id: null
        }
      ],
      sections: [],
      template_notes: [],
      is_template: true,
      is_archived: false, archived_at: null,
      is_favorite: false, favorited_at: null,
      created_date: now, modified_date: now
    },
    {
      id: 'landing-leg-day',
      name: 'Leg Day',
      description: 'Lower body strength',
      tags: ['legs', 'lower'],
      exercise_groups: [
        {
          group_id: 'group-lp-201',
          exercises: { a: 'Barbell Squat' },
          sets: '4', reps: '5', rest: '3min',
          default_weight: 225, default_weight_unit: 'lbs',
          group_type: 'standard', group_name: null,
          cardio_config: null, interval_config: null, block_id: null
        },
        {
          group_id: 'group-lp-202',
          exercises: { a: 'Romanian Deadlift' },
          sets: '3', reps: '8-10', rest: '2min',
          default_weight: 185, default_weight_unit: 'lbs',
          group_type: 'standard', group_name: null,
          cardio_config: null, interval_config: null, block_id: null
        },
        {
          group_id: 'group-lp-203',
          exercises: { a: 'Leg Press' },
          sets: '3', reps: '10-12', rest: '90s',
          default_weight: 360, default_weight_unit: 'lbs',
          group_type: 'standard', group_name: null,
          cardio_config: null, interval_config: null, block_id: null
        }
      ],
      sections: [],
      template_notes: [],
      is_template: true,
      is_archived: false, archived_at: null,
      is_favorite: true, favorited_at: now,
      created_date: now, modified_date: now
    }
  ];
}

// --- Helpers ---

/** Inject seed workouts into localStorage on the current page. */
async function seedWorkouts(page) {
  const workouts = makeSeedWorkouts();
  await page.evaluate((w) => {
    localStorage.setItem('gym_workouts', JSON.stringify(w));
    // Light theme
    document.documentElement.setAttribute('data-bs-theme', 'light');
    localStorage.setItem('theme', 'light');
  }, workouts);
}

/** Force light theme after navigation. */
async function forceLight(page) {
  await page.evaluate(() => {
    document.documentElement.setAttribute('data-bs-theme', 'light');
  });
}

/** Wait for any of the given selectors (comma-separated). */
async function waitForAny(page, selectorsStr, timeout = 6000) {
  const selectors = selectorsStr.split(',').map(s => s.trim());
  try {
    await Promise.race(
      selectors.map(sel =>
        page.waitForSelector(sel, { timeout }).catch(() => null)
      )
    );
  } catch (_) { /* ok */ }
}

// --- Scenario Definitions ---

const SCENARIOS = [
  {
    name: 'landing-hero-workout-mode',
    description: 'Hero: Workout mode with exercises loaded',
    run: async (page, baseUrl) => {
      // 1. Seed data on a blank page
      await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 10000 });
      await seedWorkouts(page);

      // 2. Navigate to workout mode with the Push Day workout ID
      await page.goto(`${baseUrl}/workout-mode.html?id=landing-push-day`, {
        waitUntil: 'networkidle', timeout: 15000
      });
      await forceLight(page);
      await waitForAny(page, '.exercise-card, #exerciseCardsContainer, .workout-landing', 8000);
      await page.waitForTimeout(2500);
    }
  },
  {
    name: 'landing-feature-builder',
    description: 'Feature: Workout builder editor with exercise group offcanvas',
    run: async (page, baseUrl) => {
      // Navigate to new workout editor
      await page.goto(`${baseUrl}/workout-builder.html?new=true`, {
        waitUntil: 'networkidle', timeout: 15000
      });
      await forceLight(page);
      await waitForAny(page, '#workoutName, #workoutEditorForm', 8000);
      await page.waitForTimeout(1500);

      // Type a workout name
      const nameInput = await page.$('#workoutName');
      if (nameInput) {
        await nameInput.fill('Push Day');
        await page.waitForTimeout(500);
      }

      // Click "Add Exercise" to open the exercise group editor offcanvas
      const addBtn = await page.$('#addExerciseGroupBtnVisible');
      if (addBtn) {
        await addBtn.click();
        await page.waitForTimeout(1200);

        // Type into the exercise search input inside the offcanvas
        const exInput = await page.$('#primaryExerciseInput');
        if (exInput) {
          await exInput.fill('Bench Press');
          await page.waitForTimeout(1500);
        }
      }

      await page.waitForTimeout(500);
    }
  },
  {
    name: 'landing-feature-session',
    description: 'Feature: Workout mode with expanded exercise card',
    run: async (page, baseUrl) => {
      // Seed data then navigate to workout-mode with Pull Day for variety
      await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 10000 });
      await seedWorkouts(page);

      await page.goto(`${baseUrl}/workout-mode.html?id=landing-pull-day`, {
        waitUntil: 'networkidle', timeout: 15000
      });
      await forceLight(page);
      await waitForAny(page, '.exercise-card', 8000);
      await page.waitForTimeout(1500);

      // Try to expand the first exercise card (click the chevron/expand button)
      const expandBtn = await page.$('.exercise-card:first-child .expand-toggle, .exercise-card:first-child [data-action="toggle-expand"], .exercise-card:first-child .card-expand-btn');
      if (expandBtn) {
        await expandBtn.click();
        await page.waitForTimeout(1000);
      }

      await page.waitForTimeout(1000);
    }
  },
  {
    name: 'landing-feature-ai-logger',
    description: 'Feature: Exercise database (publicly accessible)',
    run: async (page, baseUrl) => {
      // Exercise database loads from API — no auth needed, shows real content
      await page.goto(`${baseUrl}/exercise-database.html`, {
        waitUntil: 'networkidle', timeout: 15000
      });
      await forceLight(page);
      await waitForAny(page, '.exercise-card, #exerciseTableContainer, .card', 8000);
      await page.waitForTimeout(3000);
    }
  }
];

// --- Main ---

async function main() {
  const args = process.argv.slice(2);
  const baseUrl = getArg(args, '--base-url') || DEFAULT_BASE_URL;

  // Ensure output directory exists
  if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  }

  console.log(`\n🖼️  Landing Page Screenshot Capture`);
  console.log(`   Base URL: ${baseUrl}`);
  console.log(`   Output:   ${SCREENSHOT_DIR}`);
  console.log(`   Viewport: ${VIEWPORT.width}x${VIEWPORT.height} @${DEVICE_SCALE_FACTOR}x`);
  console.log(`   Scenarios: ${SCENARIOS.length}\n`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: DEVICE_SCALE_FACTOR,
    locale: 'en-US'
  });

  let captured = 0;

  for (const scenario of SCENARIOS) {
    console.log(`📸 ${scenario.name}: ${scenario.description}`);
    const page = await context.newPage();

    try {
      await scenario.run(page, baseUrl);

      // Capture screenshot
      const filepath = path.join(SCREENSHOT_DIR, `${scenario.name}.png`);
      await page.screenshot({ path: filepath, fullPage: false });

      const stats = fs.statSync(filepath);
      console.log(`   ✅ Saved: ${scenario.name}.png (${(stats.size / 1024).toFixed(0)} KB)\n`);
      captured++;
    } catch (err) {
      console.log(`   ❌ Failed: ${err.message}\n`);
    } finally {
      await page.close();
    }
  }

  await browser.close();
  console.log(`\n✨ Done! Captured ${captured}/${SCENARIOS.length} screenshots.`);
  console.log(`   Files saved to: ${SCREENSHOT_DIR}\n`);
}

function getArg(args, flag) {
  const idx = args.indexOf(flag);
  return idx !== -1 && args[idx + 1] ? args[idx + 1] : null;
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
