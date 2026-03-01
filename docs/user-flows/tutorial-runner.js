/**
 * Ghost Gym V2 - Tutorial Walkthrough Runner
 * Automates step-by-step app walkthroughs and captures screenshots for social media.
 *
 * Usage:
 *   npx playwright install chromium  (first time only)
 *   node docs/user-flows/tutorial-runner.js --tutorial create-workout --viewport mobile
 *   node docs/user-flows/tutorial-runner.js --tutorial browse-exercises --viewport desktop --base-url http://localhost:8001
 *
 * Output:
 *   - Screenshots saved to frontend/assets/img/tutorials/
 *   - JSON manifest printed to stdout
 */

const { chromium, devices } = require('playwright');
const path = require('path');
const fs = require('fs');

// --- Configuration ---

const DEFAULT_BASE_URL = 'http://localhost:8001';
const SCREENSHOT_DIR = path.join(__dirname, '..', '..', 'frontend', 'assets', 'img', 'tutorials');

const VIEWPORTS = {
  mobile: { name: 'mobile', width: 390, height: 844 },
  desktop: { name: 'desktop', width: 1400, height: 900 }
};

// --- Tutorial Definitions ---

const TUTORIALS = {
  'create-workout': {
    title: 'How to Create a Workout',
    startUrl: '/workout-builder.html?new=true',
    steps: [
      {
        action: 'wait',
        target: { mobile: '#workoutEditorForm', desktop: '#desktopEditorForm' },
        caption: 'Start with a blank workout'
      },
      {
        action: 'type',
        target: { mobile: '#workoutName', desktop: '#desktopWorkoutName' },
        value: 'Push Day',
        caption: 'Name your workout'
      },
      {
        action: 'click',
        target: { mobile: '#addExerciseGroupBtnVisible', desktop: '#addExerciseGroupBtnVisible' },
        waitAfter: '.exercise-name-input',
        caption: 'Add your first exercise'
      },
      {
        action: 'type',
        target: '.exercise-name-input:last-of-type',
        value: 'Bench Press',
        waitAfter: '.autocomplete-dropdown, .tt-menu',
        caption: 'Search for an exercise'
      },
      {
        action: 'click',
        target: '.autocomplete-dropdown .autocomplete-item:first-child, .tt-suggestion:first-child',
        caption: 'Exercise added with default sets'
      },
      {
        action: 'fill-sets',
        sets: '3',
        reps: '8-12',
        caption: 'Customize your sets and reps'
      },
      {
        action: 'click',
        target: { mobile: '#mobileSaveFab', desktop: '#desktopSaveBtn' },
        waitAfter: '.toast-success, .alert-success, .save-confirmation',
        waitTime: 1500,
        caption: 'Workout saved!'
      }
    ]
  },

  'add-exercise': {
    title: 'Adding an Exercise to a Workout',
    startUrl: '/workout-builder.html',
    steps: [
      {
        action: 'wait',
        target: { mobile: '#workoutEditorForm', desktop: '#desktopEditorForm' },
        waitTime: 2000,
        caption: 'Open an existing workout'
      },
      {
        action: 'scroll-click',
        target: '#addExerciseGroupBtnVisible',
        waitAfter: '.exercise-name-input',
        caption: 'Tap the add button'
      },
      {
        action: 'type',
        target: '.exercise-name-input:last-of-type',
        value: 'Romanian Deadlift',
        waitAfter: '.autocomplete-dropdown, .tt-menu',
        caption: 'Search for exercises'
      },
      {
        action: 'click',
        target: '.autocomplete-dropdown .autocomplete-item:first-child, .tt-suggestion:first-child',
        caption: 'New exercise added'
      },
      {
        action: 'click',
        target: { mobile: '#mobileSaveFab', desktop: '#desktopSaveBtn' },
        waitAfter: '.toast-success, .alert-success',
        waitTime: 1500,
        caption: 'Changes saved'
      }
    ]
  },

  'browse-exercises': {
    title: 'Browsing the Exercise Database',
    startUrl: '/exercise-database.html',
    steps: [
      {
        action: 'wait',
        target: '#exerciseTableContainer',
        waitTime: 2000,
        caption: 'Browse 2,500+ exercises'
      },
      {
        action: 'type',
        target: '#exerciseSearchInput',
        value: 'squat',
        waitTime: 1000,
        caption: 'Search by name'
      },
      {
        action: 'click',
        target: '#filterBtn',
        waitAfter: '.offcanvas.show, .filter-panel',
        caption: 'Filter by muscle group'
      },
      {
        action: 'dismiss-then-click',
        dismiss: '.offcanvas .btn:has-text("Cancel"), .offcanvas .btn-close',
        dismissWait: 500,
        target: '#exerciseTableContainer .card[data-exercise-id]',
        waitAfter: '#exerciseDetailModal.show, .modal.show, #exerciseDetailContent',
        caption: 'View exercise details'
      }
    ]
  },

  'start-workout': {
    title: 'Starting a Workout',
    startUrl: '/workout-mode.html',
    steps: [
      {
        action: 'wait',
        target: '#workoutLandingPage',
        waitTime: 2000,
        caption: 'Choose a workout to start'
      },
      {
        action: 'click',
        target: '.workout-suggestion-card:first-child, .workout-card:first-child',
        waitAfter: '#exerciseCardsContainer',
        waitTime: 2000,
        caption: 'Review your exercises'
      },
      {
        action: 'click',
        target: '#wmFabStart',
        waitAfter: '#floatingTimer',
        caption: 'Workout timer is running'
      }
    ]
  },

  'log-workout': {
    title: 'Logging Your Sets',
    startUrl: '/workout-mode.html',
    requiresSession: true,
    steps: [
      {
        action: 'wait',
        target: '#exerciseCardsContainer',
        waitTime: 2000,
        caption: 'Your workout is loaded'
      },
      {
        action: 'type',
        target: '.weight-input:first-of-type, input[name*="weight"]:first-of-type',
        value: '135',
        caption: 'Log your weight'
      },
      {
        action: 'click',
        target: '.set-checkbox:first-of-type, .set-complete-btn:first-of-type',
        caption: 'Mark set as complete'
      },
      {
        action: 'wait',
        target: '.rest-timer, #restTimerDisplay',
        waitTime: 1500,
        caption: 'Rest timer starts automatically'
      }
    ]
  }
};

// --- Helper Functions ---

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function getDatePrefix() {
  const now = new Date();
  return now.toISOString().split('T')[0]; // YYYY-MM-DD
}

function resolveTarget(target, viewport) {
  if (typeof target === 'string') return target;
  return target[viewport] || target.mobile || target.desktop;
}

async function setLightTheme(page) {
  await page.evaluate(() => {
    localStorage.setItem('theme', 'light');
    localStorage.setItem('templateCustomizer-style', 'light');
    document.documentElement.setAttribute('data-bs-theme', 'light');
    document.documentElement.classList.remove('dark-style');
    document.documentElement.classList.add('light-style');
  });
}

async function waitForSelector(page, selector, timeout = 10000) {
  const selectors = selector.split(',').map(s => s.trim());
  try {
    await Promise.race(
      selectors.map(s => page.waitForSelector(s, { timeout }).catch(() => null))
    );
  } catch (e) {
    console.error(`  Warning: selector "${selector}" not found within ${timeout}ms`);
  }
}

async function executeStep(page, step, viewportName, baseUrl) {
  const target = step.target ? resolveTarget(step.target, viewportName) : null;

  switch (step.action) {
    case 'navigate':
      await page.goto(baseUrl + step.url);
      if (target) await waitForSelector(page, target);
      break;

    case 'wait':
      if (target) await waitForSelector(page, target);
      break;

    case 'click':
      if (target) {
        await page.click(target);
      }
      if (step.waitAfter) {
        await waitForSelector(page, step.waitAfter);
      }
      break;

    case 'scroll-click':
      if (target) {
        const el = await page.$(target);
        if (el) {
          await el.scrollIntoViewIfNeeded();
          await page.waitForTimeout(300);
          await el.click();
        }
      }
      if (step.waitAfter) {
        await waitForSelector(page, step.waitAfter);
      }
      break;

    case 'type':
      if (target) {
        await page.click(target);
        await page.fill(target, step.value || '');
      }
      if (step.waitAfter) {
        await waitForSelector(page, step.waitAfter);
      }
      break;

    case 'dismiss-then-click': {
      // Close an overlay (offcanvas, modal) then click a target behind it
      if (step.dismiss) {
        const dismissSelectors = step.dismiss.split(',').map(s => s.trim());
        for (const sel of dismissSelectors) {
          try {
            const btn = await page.$(sel);
            if (btn) { await btn.click(); break; }
          } catch (e) { /* try next selector */ }
        }
        await page.waitForTimeout(step.dismissWait || 500);
      }
      if (target) {
        await waitForSelector(page, target);
        await page.click(target);
      }
      if (step.waitAfter) {
        await waitForSelector(page, step.waitAfter);
      }
      break;
    }

    case 'fill-sets': {
      // Fill in the last exercise group's sets and reps fields
      const setsInputs = await page.$$('.sets-input, input[name*="sets"]');
      const repsInputs = await page.$$('.reps-input, input[name*="reps"]');
      if (setsInputs.length > 0) {
        const lastSets = setsInputs[setsInputs.length - 1];
        await lastSets.fill(step.sets || '3');
      }
      if (repsInputs.length > 0) {
        const lastReps = repsInputs[repsInputs.length - 1];
        await lastReps.fill(step.reps || '10');
      }
      break;
    }

    default:
      console.error(`  Unknown action: ${step.action}`);
  }

  // Wait for animations
  await page.waitForTimeout(step.waitTime || 400);
}

// --- Main ---

async function runTutorial(tutorialSlug, viewportName, baseUrl) {
  const tutorial = TUTORIALS[tutorialSlug];
  if (!tutorial) {
    console.error(`Unknown tutorial: ${tutorialSlug}`);
    console.error(`Available: ${Object.keys(TUTORIALS).join(', ')}`);
    process.exit(1);
  }

  const viewport = VIEWPORTS[viewportName];
  if (!viewport) {
    console.error(`Unknown viewport: ${viewportName}`);
    console.error(`Available: ${Object.keys(VIEWPORTS).join(', ')}`);
    process.exit(1);
  }

  const datePrefix = getDatePrefix();
  ensureDir(SCREENSHOT_DIR);

  console.log(`\nTutorial: ${tutorial.title}`);
  console.log(`Viewport: ${viewportName} (${viewport.width}x${viewport.height})`);
  console.log(`Base URL: ${baseUrl}`);
  console.log(`Steps: ${tutorial.steps.length}`);
  console.log('---');

  const browser = await chromium.launch({ headless: true });
  const contextOptions = viewportName === 'mobile'
    ? { ...devices['iPhone 14'], deviceScaleFactor: 2 }
    : { viewport: { width: viewport.width, height: viewport.height }, deviceScaleFactor: 2 };

  const context = await browser.newContext(contextOptions);
  const page = await context.newPage();

  // Navigate and set light theme
  await page.goto(baseUrl + tutorial.startUrl);
  await setLightTheme(page);
  await page.reload();
  await page.waitForTimeout(1000);

  const manifest = {
    tutorial: tutorialSlug,
    title: tutorial.title,
    viewport: viewportName,
    date: datePrefix,
    steps: []
  };

  for (let i = 0; i < tutorial.steps.length; i++) {
    const step = tutorial.steps[i];
    const stepNum = String(i + 1).padStart(2, '0');
    const filename = `${datePrefix}-tutorial-${tutorialSlug}-${stepNum}-${viewportName}.png`;
    const filepath = path.join(SCREENSHOT_DIR, filename);

    try {
      // Execute the action
      await executeStep(page, step, viewportName, baseUrl);

      // Take screenshot
      await page.screenshot({ path: filepath, fullPage: false });

      manifest.steps.push({
        number: i + 1,
        caption: step.caption,
        filename: filename,
        action: step.action,
        success: true
      });

      console.log(`  Step ${stepNum}: ${step.caption} -> ${filename}`);
    } catch (e) {
      console.error(`  Step ${stepNum}: FAILED - ${e.message}`);
      manifest.steps.push({
        number: i + 1,
        caption: step.caption,
        filename: null,
        action: step.action,
        success: false,
        error: e.message
      });
    }
  }

  await browser.close();

  // Output manifest as JSON
  console.log('\n--- MANIFEST ---');
  console.log(JSON.stringify(manifest, null, 2));

  return manifest;
}

// --- CLI ---

function parseArgs() {
  const args = process.argv.slice(2);
  const parsed = {
    tutorial: 'create-workout',
    viewport: 'mobile',
    baseUrl: DEFAULT_BASE_URL
  };

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--tutorial' && args[i + 1]) {
      parsed.tutorial = args[++i];
    } else if (args[i] === '--viewport' && args[i + 1]) {
      parsed.viewport = args[++i];
    } else if (args[i] === '--base-url' && args[i + 1]) {
      parsed.baseUrl = args[++i];
    } else if (args[i] === '--list') {
      console.log('Available tutorials:');
      for (const [slug, def] of Object.entries(TUTORIALS)) {
        console.log(`  ${slug} - ${def.title} (${def.steps.length} steps)`);
      }
      process.exit(0);
    } else if (args[i] === '--help') {
      console.log('Usage: node tutorial-runner.js --tutorial <slug> --viewport <mobile|desktop> [--base-url <url>]');
      console.log('       node tutorial-runner.js --list');
      process.exit(0);
    }
  }

  return parsed;
}

const args = parseArgs();
runTutorial(args.tutorial, args.viewport, args.baseUrl).catch(console.error);
