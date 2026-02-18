# CSS Architecture Reference

A comprehensive guide to the CSS organization in Ghost Gym V2. This document helps developers quickly find where to edit specific styles.

**Version:** 1.2.0
**Last Updated:** 2026-02-18

---

## Table of Contents

1. [File Organization Overview](#file-organization-overview)
2. [Import Hierarchy](#import-hierarchy)
3. [Design System & Variables](#design-system--variables)
4. [Page-Specific Styles](#page-specific-styles)
5. [Component Location Map](#component-location-map)
6. [Dark Mode System](#dark-mode-system)
7. [Responsive Breakpoints](#responsive-breakpoints)
8. [Common Edit Scenarios](#common-edit-scenarios)
9. [File Reference](#file-reference)

---

## File Organization Overview

### Directory Structure

```
frontend/assets/css/
├── components.css          # Master component imports (LOAD THIS FILE)
├── design-system.css       # Core design tokens (--gs-* variables)
├── ghost-gym-custom.css    # App-wide overrides & card styling
├── layout.css              # Container & grid layouts
├── menu-sidebar.css        # Sidebar & mobile menu
├── utilities.css           # Animations, scrollbar, loading states
├── navbar-custom.css       # Top navigation bar
├── bottom-action-bar.css   # Bottom navigation & FAB buttons
│
├── components/             # Reusable component styles
│   ├── buttons.css
│   ├── forms.css
│   ├── badges.css
│   ├── dark-mode.css
│   ├── unified-offcanvas.css
│   ├── note-card.css
│   └── ... (17+ component files)
│
├── workout-mode/           # Workout execution page partials
│   ├── _variables.css      # Workout-specific CSS variables
│   ├── _card-base.css      # Exercise card base styles
│   ├── _weight-field.css   # Weight input component
│   ├── _repssets-field.css # Reps/sets input component
│   ├── _responsive.css     # Mobile responsive rules
│   └── ... (14 partial files)
│
├── workout-database/       # Workout library page partials
│   ├── _variables.css      # --wdb-* CSS custom properties
│   ├── _offcanvas.css      # Workout detail offcanvas
│   ├── _table.css          # Datatable styles
│   ├── _filter-bar.css     # Badges, buttons, filter bar, pagination
│   ├── _cards.css          # Card grid, base, menu, z-index fix
│   ├── _card-preview.css   # Exercise preview list in cards
│   ├── _modal.css          # Workout detail modal
│   ├── _states.css         # Loading & empty states
│   ├── _sections.css       # Today/Favorites/My Workouts sections
│   ├── _delete-mode.css    # Delete mode, selection bar, card selection
│   ├── _toolbar.css        # Toolbar + responsive/dark/print
│   ├── _dark-mode.css      # General dark mode overrides
│   └── _utilities.css      # Stats, animations, utilities, responsive, print
│
└── [page].css              # Page-specific stylesheets
    ├── workout-mode.css    # Workout execution page
    ├── workout-builder.css # Workout builder page
    ├── workout-database.css # Workout library page
    ├── exercise-database.css # Exercise library page
    └── workout-history.css # Session history page
```

### File Categories

| Category | Files | Purpose |
|----------|-------|---------|
| **Design System** | `design-system.css` | CSS custom properties (variables) |
| **Master Imports** | `components.css` | Imports all shared components |
| **Core Layout** | `layout.css`, `menu-sidebar.css` | Page structure, sidebar |
| **Navigation** | `navbar-custom.css`, `bottom-action-bar.css` | Top/bottom nav bars |
| **Page-Specific** | `workout-*.css`, `exercise-*.css` | Styles for specific pages |
| **Components** | `components/*.css` | Reusable UI components |
| **Partials** | `workout-mode/_*.css`, `workout-database/_*.css` | Module partials (prefixed with `_`) |
| **Vendor** | `vendor/css/core.css`, `demo.css` | Sneat Bootstrap template |

---

## Import Hierarchy

### How CSS Files Are Loaded

Most pages load CSS in this order:

```html
<!-- 1. Vendor Fonts -->
<link rel="stylesheet" href="assets/vendor/fonts/iconify-icons.css" />

<!-- 2. Core Bootstrap/Sneat Theme -->
<link rel="stylesheet" href="assets/vendor/css/core.css" />
<link rel="stylesheet" href="assets/css/demo.css" />

<!-- 3. Master Component File (imports design-system, components, etc.) -->
<link rel="stylesheet" href="assets/css/components.css" />

<!-- 4. App-Wide Custom Styles -->
<link rel="stylesheet" href="assets/css/ghost-gym-custom.css" />

<!-- 5. Page-Specific Styles -->
<link rel="stylesheet" href="assets/css/workout-mode.css" />
<link rel="stylesheet" href="assets/css/bottom-action-bar.css" />
```

### components.css Import Tree

```css
/* File: components.css */

/* Core Design System (MUST be first) */
@import url('design-system.css');

/* Layout & Structure */
@import url('layout.css');
@import url('menu-sidebar.css');
@import url('utilities.css');

/* Component Modules */
@import url('components/data-table.css');
@import url('components/filter-bar.css');
@import url('components/badges.css');
@import url('components/sticky-footer.css');
@import url('components/feedback-button.css');
@import url('components/bonus-exercise-offcanvas.css');

/* Shared Consolidated Styles */
@import url('components/buttons.css');
@import url('components/forms.css');
@import url('components/dark-mode.css');

/* Workout Builder Components */
@import url('components/exercise-group-card.css');
@import url('components/compact-card-layout.css');
@import url('components/card-actions.css');
@import url('components/builder-card-menu.css');
@import url('components/offcanvas-editor.css');
@import url('components/alternate-exercise-field.css');
@import url('components/template-note-card.css');
@import url('components/edit-mode.css');
```

---

## Design System & Variables

### Primary Location

**File:** `frontend/assets/css/design-system.css`

### Variable Naming Convention

| Prefix | Purpose | Example |
|--------|---------|---------|
| `--gs-*` | Ghost System (new standard) | `--gs-primary`, `--gs-success` |
| `--ghost-*` | Legacy aliases (deprecated) | `--ghost-primary` |
| `--bs-*` | Bootstrap variables | `--bs-body-bg` |
| `--workout-*` | Workout mode specific | `--workout-card-bg` |
| `--floating-fab-*` | FAB button sizing | `--floating-fab-height` |

### Color Tokens

```css
/* Brand Colors - Soft Clay Palette */
--gs-primary: #C97C5D;          /* Soft Clay - primary actions */
--gs-secondary: #64748B;        /* Slate - secondary accent */
--gs-accent: #E5E7EB;           /* Border Gray - highlights */

/* Semantic Colors */
--gs-success: #8CBF9F;          /* Sage Green - positive states */
--gs-warning: #E3A14F;          /* Warm Amber - warnings */
--gs-danger: #D66A6A;           /* Muted Red - errors, destructive */
--gs-info: #64748B;             /* Slate - informational */

/* Weight Progression Colors (workout mode) */
--gs-weight-increased: #8CBF9F; /* Sage Green - weight went up */
--gs-weight-decreased: #D66A6A; /* Muted Red - weight went down */
--gs-weight-same: #6c757d;      /* Gray - no change */
--gs-weight-new: #C97C5D;       /* Soft Clay - first time */
--gs-weight-modified: #E3A14F;  /* Warm Amber - modified */
```

### Spacing Scale

```css
--gs-space-1: 0.25rem;   /* 4px */
--gs-space-2: 0.5rem;    /* 8px */
--gs-space-3: 0.75rem;   /* 12px */
--gs-space-4: 1rem;      /* 16px */
--gs-space-5: 1.25rem;   /* 20px */
--gs-space-6: 1.5rem;    /* 24px */
--gs-space-7: 2rem;      /* 32px */
```

### Shadow Tokens

```css
--gs-shadow-sm: 0 2px 4px rgba(0, 0, 0, 0.05);
--gs-shadow-md: 0 2px 6px rgba(67, 89, 113, 0.12);  /* Default card */
--gs-shadow-lg: 0 4px 12px rgba(67, 89, 113, 0.16); /* Hover state */
--gs-shadow-xl: 0 8px 24px rgba(0, 0, 0, 0.15);     /* Modals */
```

### Workout Mode Variables

**File:** `frontend/assets/css/workout-mode/_variables.css`

```css
/* Card colors */
--workout-bg: #ffffff;
--workout-card-bg: #ffffff;
--workout-border: #e2e8f0;
--workout-text: #1e293b;
--workout-muted: #6B7280;
--workout-accent: #C97C5D;           /* Soft Clay */

/* Status backgrounds (card states) */
--workout-status-logged: rgba(var(--gs-success-rgb), 0.1);
--workout-status-active: rgba(var(--gs-primary-rgb), 0.06);
--workout-status-skipped: rgba(var(--gs-warning-rgb), 0.1);
```

---

## Page-Specific Styles

### Page to CSS File Mapping

| Page | Primary CSS | Secondary CSS |
|------|-------------|---------------|
| `workout-mode.html` | `workout-mode.css` | `bottom-action-bar.css`, `components/note-card.css` |
| `workout-builder.html` | `workout-builder.css` | `components/exercise-group-card.css`, `components/unified-offcanvas.css` |
| `workout-database.html` | `workout-database.css` | `bottom-action-bar.css` |
| `exercise-database.html` | `exercise-database.css` | `components/data-table.css` |
| `workout-history.html` | `workout-history.css` | - |
| `index.html` (Dashboard) | `ghost-gym-custom.css` | - |
| Auth pages | `vendor/css/pages/page-auth.css` | - |

### workout-mode.css Structure

This file imports partials from the `workout-mode/` folder:

```css
/* File: workout-mode.css */

/* Core imports (order matters) */
@import url('workout-mode/_variables.css');
@import url('workout-mode/_card-base.css');
@import url('workout-mode/_weight-field.css');
@import url('workout-mode/_repssets-field.css');
@import url('workout-mode/_notes.css');
@import url('workout-mode/_chips.css');
@import url('workout-mode/_badges.css');
@import url('workout-mode/_history.css');
@import url('workout-mode/_menu.css');
@import url('workout-mode/_actions.css');
@import url('workout-mode/_timer.css');
@import url('workout-mode/_direction-toggle.css');
@import url('workout-mode/_session-controls.css');
@import url('workout-mode/_bottom-bar.css');
@import url('workout-mode/_responsive.css');
```

### workout-database.css Structure

This file imports partials from the `workout-database/` folder:

```css
/* File: workout-database.css */

@import url('workout-database/_variables.css');
@import url('workout-database/_offcanvas.css');
@import url('workout-database/_table.css');
@import url('workout-database/_filter-bar.css');
@import url('workout-database/_cards.css');
@import url('workout-database/_card-preview.css');
@import url('workout-database/_modal.css');
@import url('workout-database/_states.css');
@import url('workout-database/_sections.css');
@import url('workout-database/_delete-mode.css');
@import url('workout-database/_toolbar.css');
@import url('workout-database/_dark-mode.css');
@import url('workout-database/_utilities.css');
```

---

## Component Location Map

### Buttons

| Component | File | Line Reference |
|-----------|------|----------------|
| Primary buttons | `components/buttons.css` | `.btn-primary` styles |
| Outline buttons | `components/buttons.css` | `.btn-outline-*` styles |
| FAB buttons | `bottom-action-bar.css` | `.action-fab`, `.floating-action-fab` |
| Action bar buttons | `bottom-action-bar.css` | `.action-btn` |
| Weight unit buttons | `workout-mode/_weight-field.css` | `.weight-unit-btn` |

### Cards

| Component | File |
|-----------|------|
| Base card styling | `ghost-gym-custom.css` (line ~36) |
| Workout list cards | `workout-database/_cards.css` |
| Exercise cards (workout mode) | `workout-mode/_card-base.css` |
| Note cards | `components/note-card.css` |
| Exercise group cards | `components/exercise-group-card.css` |

### Forms

| Component | File |
|-----------|------|
| Form controls | `components/forms.css` |
| Search inputs | `components.css` (line ~220) |
| Weight inputs | `workout-mode/_weight-field.css` |
| Reps/sets inputs | `workout-mode/_repssets-field.css` |
| Textarea (notes) | `workout-mode/_notes.css` |

### Badges & Chips

| Component | File |
|-----------|------|
| General badges | `components/badges.css` |
| Workout mode badges | `workout-mode/_badges.css` |
| Next exercise chips | `workout-mode/_chips.css` |
| Tag badges | `workout-database/_filter-bar.css` |

### Offcanvas & Modals

| Component | File |
|-----------|------|
| Unified offcanvas base | `components/unified-offcanvas.css` |
| Exercise editor offcanvas | `components/offcanvas-editor.css` |
| Bonus exercise offcanvas | `components/bonus-exercise-offcanvas.css` |
| Modal enhancements | `ghost-gym-custom.css` (line ~205) |

### Navigation

| Component | File |
|-----------|------|
| Top navbar | `navbar-custom.css` |
| Bottom action bar | `bottom-action-bar.css` |
| Sidebar menu | `menu-sidebar.css` |
| Mobile menu | `menu-sidebar.css` |

### Tables

| Component | File |
|-----------|------|
| Data tables | `components/data-table.css` |
| Exercise database table | `exercise-database.css` |
| Workout database table | `workout-database/_table.css` |

### Timers

| Component | File |
|-----------|------|
| Rest timer | `workout-mode/_timer.css` |
| Floating timer | `bottom-action-bar.css` (line ~375) |
| Global rest timer button | `bottom-action-bar.css` (line ~509) |

---

## Dark Mode System

### How Dark Mode Works

1. Bootstrap 5's `data-bs-theme="dark"` attribute on `<html>`
2. All dark mode styles use selector: `[data-bs-theme="dark"]`
3. JavaScript toggles the attribute when user changes theme

### Primary Dark Mode File

**File:** `frontend/assets/css/components/dark-mode.css`

This file contains shared dark mode styles that apply across all pages.

### Per-Component Dark Mode

Most component files include their own dark mode section at the bottom:

```css
/* Example pattern in component files */

/* ============================================
   DARK MODE SUPPORT
   ============================================ */

[data-bs-theme="dark"] .my-component {
    background-color: #1e293b;
    color: #f8fafc;
}
```

### Dark Mode Color Palette

```css
/* Standard dark mode colors */
--workout-bg: var(--bs-body-bg, #1a1d21);
--workout-card-bg: var(--bs-card-bg, #232730);
--workout-border: var(--bs-border-color, #3a3f47);
--workout-text: var(--bs-body-color, #e4e6eb);
--workout-muted: var(--bs-secondary-color, #9ca3af);

/* Hardcoded dark values (when Bootstrap variables don't apply) */
background-color: #1e293b;    /* Card backgrounds */
background-color: #334155;    /* Input backgrounds */
border-color: #475569;        /* Borders */
color: #f8fafc;               /* Primary text */
color: #94a3b8;               /* Muted text */
```

### Files with Dark Mode Sections

- `components/dark-mode.css` - Shared dark mode
- `workout-mode/_variables.css` - Dark mode variables
- `workout-builder.css` - Page-specific dark (line ~200)
- `workout-database/_dark-mode.css` - General page dark mode
- `workout-database/_toolbar.css` - Toolbar dark mode (co-located)
- `workout-database/_delete-mode.css` - Delete mode dark (co-located)
- `workout-database/_sections.css` - Sections dark (co-located)
- `components/unified-offcanvas.css` - Offcanvas dark (line ~514)
- `bottom-action-bar.css` - Action bar dark (line ~60)

---

## Responsive Breakpoints

### Standard Breakpoints

```css
/* Mobile-first (min-width) */
@media (min-width: 576px)  { /* sm - Small devices */ }
@media (min-width: 768px)  { /* md - Tablets */ }
@media (min-width: 992px)  { /* lg - Desktops */ }
@media (min-width: 1200px) { /* xl - Large desktops */ }
@media (min-width: 1400px) { /* xxl - Extra large */ }

/* Max-width (for overrides) */
@media (max-width: 575.98px)  { /* Below sm */ }
@media (max-width: 767.98px)  { /* Below md */ }
@media (max-width: 991.98px)  { /* Below lg */ }
@media (max-width: 1199.98px) { /* Below xl */ }
```

### Files with Media Queries

| File | Breakpoints Covered |
|------|---------------------|
| `workout-mode/_responsive.css` | < 400px, < 576px, 576-768px, > 768px |
| `workout-builder.css` | < 576px, < 768px, < 1199px |
| `workout-database/_utilities.css` | < 768px, < 992px |
| `workout-database/_toolbar.css` | < 576px |
| `components/unified-offcanvas.css` | < 576px, < 768px |
| `bottom-action-bar.css` | > 768px, > 1200px |
| `navbar-custom.css` | < 768px |

### Reduced Motion Support

All animation-heavy files include:

```css
@media (prefers-reduced-motion: reduce) {
    .my-component {
        transition: none !important;
        animation: none !important;
    }
}
```

---

## Common Edit Scenarios

### "I want to change button colors"

**Primary/Secondary Buttons:**
```
File: frontend/assets/css/components/buttons.css
```

**FAB Buttons (floating action buttons):**
```
File: frontend/assets/css/bottom-action-bar.css
Lines: 240-302 (.action-fab)
Lines: 308-370 (.floating-action-fab)
```

### "I want to adjust card spacing"

**General Cards:**
```
File: frontend/assets/css/ghost-gym-custom.css
Lines: 36-52 (.card)
```

**Workout List Cards:**
```
File: frontend/assets/css/workout-database/_cards.css
```

**Exercise Cards (workout mode):**
```
File: frontend/assets/css/workout-mode/_card-base.css
```

### "I want to modify the navbar"

**Top Navbar:**
```
File: frontend/assets/css/navbar-custom.css
```

**Bottom Action Bar:**
```
File: frontend/assets/css/bottom-action-bar.css
Lines: 31-67 (.bottom-action-bar)
```

### "I want to change form input styles"

**General Form Controls:**
```
File: frontend/assets/css/components/forms.css
```

**Search Inputs:**
```
File: frontend/assets/css/components.css
Lines: 220-255 (search input normalization)
```

### "I want to adjust badge colors"

**General Badges:**
```
File: frontend/assets/css/components/badges.css
```

**Workout Mode Badges:**
```
File: frontend/assets/css/workout-mode/_badges.css
```

### "I want to change offcanvas styling"

**All Offcanvas Components:**
```
File: frontend/assets/css/components/unified-offcanvas.css
```

**Exercise Editor Offcanvas:**
```
File: frontend/assets/css/components/offcanvas-editor.css
```

### "I want to update the color scheme"

**Brand Colors & Design Tokens:**
```
File: frontend/assets/css/design-system.css
Lines: 22-76 (color tokens)
```

### "I want to add/modify dark mode styles"

**Shared Dark Mode:**
```
File: frontend/assets/css/components/dark-mode.css
```

**Page-Specific Dark Mode:**
Check the bottom of each page's CSS file for `[data-bs-theme="dark"]` sections.

### "I want to change mobile layouts"

**Workout Mode Mobile:**
```
File: frontend/assets/css/workout-mode/_responsive.css
```

**General Mobile:**
Check the `@media` sections at the bottom of each page CSS file.

### "I want to modify the weight/reps input fields"

**Weight Field:**
```
File: frontend/assets/css/workout-mode/_weight-field.css
```

**Reps/Sets Field:**
```
File: frontend/assets/css/workout-mode/_repssets-field.css
```

### "I want to change timer styles"

**Rest Timer:**
```
File: frontend/assets/css/workout-mode/_timer.css
```

**Floating Timer:**
```
File: frontend/assets/css/bottom-action-bar.css
Lines: 375-500 (.floating-timer-*)
```

---

## File Reference

### Core Files

| File | Purpose | Key Classes |
|------|---------|-------------|
| `design-system.css` | CSS variables (design tokens) | `--gs-*` variables |
| `components.css` | Master import file | Component utilities |
| `ghost-gym-custom.css` | App-wide overrides | `.card`, `.list-group-item`, `.workout-card` |
| `layout.css` | Container & grid layouts | Layout utilities |
| `menu-sidebar.css` | Sidebar & mobile menu | `.menu`, `.layout-menu` |
| `utilities.css` | Animations & utilities | `.fade-in`, loading states |

### Navigation Files

| File | Purpose | Key Classes |
|------|---------|-------------|
| `navbar-custom.css` | Top navigation | `.navbar-*` |
| `bottom-action-bar.css` | Bottom nav & FABs | `.action-btn`, `.action-fab`, `.floating-*` |

### Page Files

| File | Purpose |
|------|---------|
| `workout-mode.css` | Workout execution page |
| `workout-builder.css` | Workout builder page |
| `workout-database.css` | Workout library page |
| `exercise-database.css` | Exercise library page |
| `workout-history.css` | Session history page |

### Component Files (in `components/`)

| File | Purpose |
|------|---------|
| `buttons.css` | Button styling |
| `forms.css` | Form control styling |
| `badges.css` | Badge styling |
| `dark-mode.css` | Shared dark mode styles |
| `unified-offcanvas.css` | Offcanvas patterns |
| `note-card.css` | Note card component |
| `exercise-group-card.css` | Exercise group cards |
| `compact-card-layout.css` | Compact card variant |
| `card-actions.css` | Card action buttons |
| `builder-card-menu.css` | Dropdown menus |
| `offcanvas-editor.css` | Exercise editor offcanvas |
| `alternate-exercise-field.css` | Alternate exercise inputs |
| `template-note-card.css` | Template note styling |
| `edit-mode.css` | Edit mode states |
| `sticky-footer.css` | Sticky footer pattern |
| `feedback-button.css` | Feedback button |
| `bonus-exercise-offcanvas.css` | Add exercise modal |
| `data-table.css` | Data table styling |
| `filter-bar.css` | Filter bar component |

### Workout Mode Partials (in `workout-mode/`)

| File | Purpose |
|------|---------|
| `_variables.css` | CSS custom properties |
| `_card-base.css` | Exercise card base |
| `_weight-field.css` | Weight input component |
| `_repssets-field.css` | Reps/sets input |
| `_notes.css` | Notes textarea |
| `_chips.css` | Next exercise chips |
| `_badges.css` | Status badges |
| `_history.css` | Exercise history display |
| `_menu.css` | Exercise card menu |
| `_actions.css` | Card action buttons |
| `_timer.css` | Rest timer |
| `_direction-toggle.css` | Weight direction toggle |
| `_session-controls.css` | Session start/end |
| `_bottom-bar.css` | Bottom navigation |
| `_responsive.css` | Mobile responsive |

### Workout Database Partials (in `workout-database/`)

| File | Purpose |
|------|---------|
| `_variables.css` | `--wdb-*` CSS custom properties |
| `_offcanvas.css` | Workout detail offcanvas |
| `_table.css` | Datatable styles |
| `_filter-bar.css` | Badges, buttons, filter bar, pagination |
| `_cards.css` | Card grid, base, menu, z-index fix |
| `_card-preview.css` | Exercise preview list in cards |
| `_modal.css` | Workout detail modal |
| `_states.css` | Loading & empty states |
| `_sections.css` | Today/Favorites/My Workouts sections |
| `_delete-mode.css` | Delete mode, selection bar, card selection |
| `_toolbar.css` | Toolbar + responsive/dark/print |
| `_dark-mode.css` | General dark mode overrides |
| `_utilities.css` | Stats, animations, utilities, responsive, print |

---

## Best Practices

### When Adding New Styles

1. **Check if a component file exists** - Add to existing component file if possible
2. **Use design system variables** - Reference `--gs-*` variables from `design-system.css`
3. **Follow naming conventions** - Use BEM-like naming (`.component-element-modifier`)
4. **Include dark mode** - Add `[data-bs-theme="dark"]` variants
5. **Include responsive rules** - Add media queries for mobile

### When Modifying Existing Styles

1. **Find the source file first** - Use this document to locate the correct file
2. **Maintain specificity** - Don't add `!important` unless necessary
3. **Test both themes** - Check light and dark mode
4. **Test responsive** - Check mobile and desktop views

### File Organization Rules

1. **Partials start with underscore** - `_variables.css` indicates it's imported elsewhere
2. **Page files are self-contained** - Each page CSS imports what it needs
3. **Component files are reusable** - Should work across multiple pages
4. **Design tokens are centralized** - Only in `design-system.css`

---

*This document is maintained as part of the Ghost Gym V2 codebase. Update it when adding new CSS files or making significant architectural changes.*
