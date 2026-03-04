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
// Injected into localStorage so the app renders realistic content for anonymous users.

const SEED_WORKOUTS = [
  {
    id: 'landing-push-day',
    name: 'Push Day',
    exercises: [
      { name: 'Barbell Bench Press', sets: '4', reps: '6-8', rest: '90s', muscleGroup: 'chest' },
      { name: 'Overhead Press', sets: '3', reps: '8-10', rest: '60s', muscleGroup: 'shoulders' },
      { name: 'Incline Dumbbell Press', sets: '3', reps: '10-12', rest: '60s', muscleGroup: 'chest' },
      { name: 'Lateral Raises', sets: '3', reps: '12-15', rest: '45s', muscleGroup: 'shoulders' },
      { name: 'Tricep Pushdowns', sets: '3', reps: '12-15', rest: '45s', muscleGroup: 'triceps' }
    ],
    created: new Date().toISOString(),
    isFavorite: true
  },
  {
    id: 'landing-pull-day',
    name: 'Pull Day',
    exercises: [
      { name: 'Barbell Rows', sets: '4', reps: '6-8', rest: '90s', muscleGroup: 'back' },
      { name: 'Pull-Ups', sets: '3', reps: '8-10', rest: '60s', muscleGroup: 'back' },
      { name: 'Face Pulls', sets: '3', reps: '12-15', rest: '45s', muscleGroup: 'shoulders' },
      { name: 'Barbell Curls', sets: '3', reps: '10-12', rest: '45s', muscleGroup: 'biceps' }
    ],
    created: new Date().toISOString(),
    isFavorite: false
  }
];

// --- Scenario Definitions ---

const SCENARIOS = [
  {
    name: 'landing-hero-workout-mode',
    url: '/workout-mode.html',
    description: 'Hero screenshot: Workout mode with exercises loaded',
    setup: async (page) => {
      // Inject a workout to display in workout mode
      await page.evaluate((workouts) => {
        localStorage.setItem('workouts', JSON.stringify(workouts));
        // Set the active workout for workout mode
        localStorage.setItem('ffn-active-workout-id', workouts[0].id);
        localStorage.setItem('ffn-active-workout', JSON.stringify(workouts[0]));
        // Set light theme
        document.documentElement.setAttribute('data-bs-theme', 'light');
        localStorage.setItem('theme', 'light');
      }, SEED_WORKOUTS);
    },
    waitFor: '#exerciseCardsContainer, .exercise-card, .landing-page-content, .workout-landing',
    waitTimeout: 8000,
    delay: 2000
  },
  {
    name: 'landing-feature-builder',
    url: '/workout-builder.html',
    description: 'Feature: Workout builder with exercises filled',
    setup: async (page) => {
      await page.evaluate((workouts) => {
        localStorage.setItem('workouts', JSON.stringify(workouts));
        document.documentElement.setAttribute('data-bs-theme', 'light');
        localStorage.setItem('theme', 'light');
      }, SEED_WORKOUTS);
    },
    waitFor: '#workoutEditorForm, .exercise-group, #exerciseGroups',
    waitTimeout: 8000,
    delay: 2000
  },
  {
    name: 'landing-feature-session',
    url: '/workout-mode.html',
    description: 'Feature: Active workout session',
    setup: async (page) => {
      await page.evaluate((workouts) => {
        localStorage.setItem('workouts', JSON.stringify(workouts));
        localStorage.setItem('ffn-active-workout-id', workouts[0].id);
        localStorage.setItem('ffn-active-workout', JSON.stringify(workouts[0]));
        document.documentElement.setAttribute('data-bs-theme', 'light');
        localStorage.setItem('theme', 'light');
      }, SEED_WORKOUTS);
    },
    waitFor: '#exerciseCardsContainer, .exercise-card, .workout-landing',
    waitTimeout: 8000,
    delay: 2000
  },
  {
    name: 'landing-feature-ai-logger',
    url: '/activity-log.html',
    description: 'Feature: Activity log page (AI logger entry point)',
    setup: async (page) => {
      await page.evaluate(() => {
        document.documentElement.setAttribute('data-bs-theme', 'light');
        localStorage.setItem('theme', 'light');
      });
    },
    waitFor: '.content-wrapper, #recentCardioSessions, .card',
    waitTimeout: 8000,
    delay: 2000
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
      // Run setup (inject localStorage data) before navigation
      await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 10000 });
      if (scenario.setup) {
        await scenario.setup(page);
      }

      // Navigate to the target page
      await page.goto(`${baseUrl}${scenario.url}`, { waitUntil: 'networkidle', timeout: 15000 });

      // Set light theme after navigation too (some pages reset it)
      await page.evaluate(() => {
        document.documentElement.setAttribute('data-bs-theme', 'light');
      });

      // Wait for key content
      if (scenario.waitFor) {
        try {
          // waitFor may be a comma-separated list of selectors — try the first one that exists
          const selectors = scenario.waitFor.split(',').map(s => s.trim());
          await Promise.race(
            selectors.map(sel =>
              page.waitForSelector(sel, { timeout: scenario.waitTimeout || 5000 }).catch(() => null)
            )
          );
        } catch (e) {
          console.log(`   ⚠️  Selector timeout (continuing anyway): ${scenario.waitFor}`);
        }
      }

      // Extra delay for animations/rendering
      if (scenario.delay) {
        await page.waitForTimeout(scenario.delay);
      }

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

// --- Helpers ---

function getArg(args, flag) {
  const idx = args.indexOf(flag);
  return idx !== -1 && args[idx + 1] ? args[idx + 1] : null;
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
