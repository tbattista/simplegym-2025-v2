# Workout Shared Components Architecture

## Overview

This document outlines the architecture for creating shared components that will be used by both the **Workout Database** (user's workouts) and **Discover Workouts** (public workouts) pages.

## Current State Analysis

### Existing Components
| Component | File | Purpose |
|-----------|------|---------|
| `GhostGymDataTable` | [`data-table.js`](frontend/assets/js/components/data-table.js) | Generic table with pagination, sorting |
| `GhostGymFilterBar` | [`filter-bar.js`](frontend/assets/js/components/filter-bar.js) | Search and filter controls |
| `WorkoutDetailModal` | [`workout-detail-modal.js`](frontend/assets/js/components/workout-detail-modal.js) | Modal for public workout details |

### Pages to Unify
| Page | File | Data Source | Actions |
|------|------|-------------|---------|
| Workout Database | [`workout-database.html`](frontend/workout-database.html) | User's workouts via `dataManager.getWorkouts()` | Start, View, History, Edit, Delete |
| Discover Workouts | [`public-workouts.html`](frontend/public-workouts.html) | Public workouts via `/api/v3/sharing/public-workouts` | View, Save to Library |

### Key Differences
```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        WORKOUT DATABASE (User's)                            │
├─────────────────────────────────────────────────────────────────────────────┤
│ • Shows user's own workouts                                                 │
│ • Actions: Start, View, History, Edit, Delete                               │
│ • Delete Mode toggle                                                        │
│ • Tags from user's workouts                                                 │
│ • Offcanvas detail view                                                     │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                        DISCOVER WORKOUTS (Public)                           │
├─────────────────────────────────────────────────────────────────────────────┤
│ • Shows community shared workouts                                           │
│ • Actions: View Details, Save to Library                                    │
│ • No delete mode (not owner)                                                │
│ • Shows creator name, view count, save count                                │
│ • Modal detail view (currently)                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Proposed Architecture

### Component Hierarchy

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           WorkoutBrowser                                     │
│                    (Page-level orchestrator)                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                      WorkoutFiltersBar                               │    │
│  │  • Search input                                                      │    │
│  │  • Sort dropdown                                                     │    │
│  │  • Tag filters                                                       │    │
│  │  • Stats display                                                     │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                        WorkoutGrid                                   │    │
│  │  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐                 │    │
│  │  │ WorkoutCard  │ │ WorkoutCard  │ │ WorkoutCard  │                 │    │
│  │  │              │ │              │ │              │                 │    │
│  │  │ • Title      │ │ • Title      │ │ • Title      │                 │    │
│  │  │ • Metadata   │ │ • Metadata   │ │ • Metadata   │                 │    │
│  │  │ • Actions    │ │ • Actions    │ │ • Actions    │                 │    │
│  │  └──────────────┘ └──────────────┘ └──────────────┘                 │    │
│  │                                                                      │    │
│  │  ┌─────────────────────────────────────────────────────────────┐    │    │
│  │  │                    Pagination                                │    │    │
│  │  └─────────────────────────────────────────────────────────────┘    │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                  WorkoutDetailOffcanvas                              │    │
│  │  • Workout info                                                      │    │
│  │  • Exercise groups                                                   │    │
│  │  • Bonus exercises                                                   │    │
│  │  • Action buttons (configurable)                                     │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### New Shared Components

#### 1. WorkoutCard Component
**File:** `frontend/assets/js/components/workout-card.js`

```javascript
/**
 * Configuration options for WorkoutCard
 */
interface WorkoutCardConfig {
    // Display options
    showCreator: boolean;        // Show creator name (for public workouts)
    showStats: boolean;          // Show view/save counts (for public workouts)
    showTags: boolean;           // Show tag badges
    showDescription: boolean;    // Show description preview
    
    // Action buttons
    actions: WorkoutCardAction[];
    
    // Delete mode
    deleteMode: boolean;         // Enable delete mode styling
    onDelete: (workoutId, workoutName) => void;
}

interface WorkoutCardAction {
    id: string;                  // 'start', 'view', 'edit', 'history', 'save'
    label: string;
    icon: string;                // Boxicons class
    variant: string;             // 'primary', 'outline-secondary', etc.
    onClick: (workout) => void;
}
```

**Usage Examples:**
```javascript
// User's Workout Database
const userWorkoutCard = new WorkoutCard(workout, {
    showCreator: false,
    showStats: false,
    showTags: true,
    actions: [
        { id: 'start', label: 'Start', icon: 'bx-play', variant: 'primary', onClick: doWorkout },
        { id: 'view', label: 'View', icon: 'bx-show', variant: 'outline-secondary', onClick: viewDetails },
        { id: 'history', label: 'History', icon: 'bx-history', variant: 'outline-info', onClick: viewHistory },
        { id: 'edit', label: 'Edit', icon: 'bx-edit', variant: 'outline-secondary', onClick: editWorkout }
    ],
    deleteMode: false,
    onDelete: deleteWorkout
});

// Public Workouts
const publicWorkoutCard = new WorkoutCard(workout, {
    showCreator: true,
    showStats: true,
    showTags: true,
    actions: [
        { id: 'view', label: 'View Details', icon: 'bx-show', variant: 'primary', onClick: viewDetails }
    ],
    deleteMode: false
});
```

#### 2. WorkoutGrid Component
**File:** `frontend/assets/js/components/workout-grid.js`

```javascript
/**
 * Configuration options for WorkoutGrid
 */
interface WorkoutGridConfig {
    containerId: string;
    cardConfig: WorkoutCardConfig;
    
    // Pagination
    pageSize: number;
    showPagination: boolean;
    
    // Empty state
    emptyIcon: string;
    emptyTitle: string;
    emptyMessage: string;
    emptyAction: { label: string, onClick: () => void } | null;
    
    // Loading state
    loadingMessage: string;
    
    // Callbacks
    onPageChange: (page: number) => void;
}
```

#### 3. WorkoutDetailOffcanvas Component
**File:** `frontend/assets/js/components/workout-detail-offcanvas.js`

```javascript
/**
 * Configuration options for WorkoutDetailOffcanvas
 */
interface WorkoutDetailOffcanvasConfig {
    // Display options
    showCreator: boolean;
    showStats: boolean;
    showDates: boolean;
    
    // Footer actions
    actions: OffcanvasAction[];
}

interface OffcanvasAction {
    id: string;
    label: string;
    icon: string;
    variant: string;
    onClick: (workout) => void;
}
```

**Usage Examples:**
```javascript
// User's Workout Database
const userDetailOffcanvas = new WorkoutDetailOffcanvas({
    showCreator: false,
    showStats: false,
    showDates: true,
    actions: [
        { id: 'close', label: 'Close', variant: 'label-secondary' },
        { id: 'edit', label: 'Edit', icon: 'bx-edit', variant: 'outline-primary', onClick: editWorkout },
        { id: 'start', label: 'Start', icon: 'bx-play', variant: 'primary', onClick: doWorkout }
    ]
});

// Public Workouts
const publicDetailOffcanvas = new WorkoutDetailOffcanvas({
    showCreator: true,
    showStats: true,
    showDates: false,
    actions: [
        { id: 'close', label: 'Close', variant: 'secondary' },
        { id: 'save', label: 'Save to Library', icon: 'bx-bookmark', variant: 'primary', onClick: saveWorkout }
    ]
});
```

### Data Flow Diagram

```mermaid
flowchart TB
    subgraph Pages
        WD[workout-database.html]
        PW[public-workouts.html]
    end
    
    subgraph DataSources
        DM[dataManager.getWorkouts]
        API[/api/v3/sharing/public-workouts]
    end
    
    subgraph SharedComponents
        WG[WorkoutGrid]
        WC[WorkoutCard]
        WDO[WorkoutDetailOffcanvas]
        WF[WorkoutFiltersBar]
    end
    
    subgraph Configuration
        UC[User Config]
        PC[Public Config]
    end
    
    WD --> UC
    PW --> PC
    
    UC --> WG
    PC --> WG
    
    WD --> DM
    PW --> API
    
    DM --> WG
    API --> WG
    
    WG --> WC
    WG --> WDO
    WG --> WF
```

### File Structure

```
frontend/assets/js/components/
├── workout-card.js              # NEW: Workout card component
├── workout-grid.js              # NEW: Grid with pagination
├── workout-detail-offcanvas.js  # NEW: Unified detail view
├── workout-filters-bar.js       # NEW: Filters offcanvas
├── data-table.js                # EXISTING: Keep for other uses
├── filter-bar.js                # EXISTING: Keep for other uses
├── workout-detail-modal.js      # EXISTING: Deprecate after migration
├── pagination.js                # EXISTING: Reuse
└── modal-manager.js             # EXISTING: Keep

frontend/assets/js/dashboard/
├── workout-database.js          # REFACTOR: Use shared components
├── public-workouts.js           # REFACTOR: Use shared components
└── workout-browser-base.js      # NEW: Shared page logic
```

### CSS Strategy

The existing [`workout-database.css`](frontend/assets/css/workout-database.css) already contains most needed styles. We'll:

1. **Keep existing CSS** - No changes needed to workout-database.css
2. **Add component-specific CSS** - Create `workout-components.css` for shared component styles
3. **Both pages include both CSS files** - Ensures consistent styling

### Implementation Plan

#### Phase 1: Create Base Components (Day 1)
1. Create `WorkoutCard` component with configurable actions
2. Create `WorkoutGrid` component with pagination
3. Create `WorkoutDetailOffcanvas` component

#### Phase 2: Create Page Configurations (Day 1)
1. Create user workout configuration
2. Create public workout configuration
3. Create shared utility functions

#### Phase 3: Refactor Workout Database (Day 2)
1. Update `workout-database.js` to use new components
2. Test all existing functionality works
3. Verify delete mode still works

#### Phase 4: Refactor Public Workouts (Day 2)
1. Update `public-workouts.js` to use new components
2. Update `public-workouts.html` to match structure
3. Test save to library functionality

#### Phase 5: Testing & Documentation (Day 3)
1. Test both pages thoroughly
2. Test responsive design
3. Document component APIs
4. Update any related documentation

### API Reference

#### WorkoutCard

```javascript
class WorkoutCard {
    constructor(workout, config)
    
    // Methods
    render(): HTMLElement
    setDeleteMode(enabled: boolean): void
    update(workout): void
    destroy(): void
}
```

#### WorkoutGrid

```javascript
class WorkoutGrid {
    constructor(containerId, config)
    
    // Methods
    setData(workouts: Array): void
    setPage(page: number): void
    showLoading(): void
    showEmpty(): void
    refresh(): void
    destroy(): void
    
    // Getters
    getCurrentPage(): number
    getTotalPages(): number
    getDisplayedData(): Array
}
```

#### WorkoutDetailOffcanvas

```javascript
class WorkoutDetailOffcanvas {
    constructor(config)
    
    // Methods
    show(workout): void
    hide(): void
    update(workout): void
    destroy(): void
}
```

### Migration Checklist

#### workout-database.html
- [ ] Include new component scripts
- [ ] Remove inline card rendering code
- [ ] Update initialization to use WorkoutGrid
- [ ] Verify delete mode toggle works
- [ ] Verify all action buttons work
- [ ] Test pagination
- [ ] Test search/filter

#### public-workouts.html
- [ ] Include new component scripts
- [ ] Remove inline card rendering code
- [ ] Update initialization to use WorkoutGrid
- [ ] Verify save to library works
- [ ] Test pagination
- [ ] Test search/filter
- [ ] Update to use offcanvas instead of modal

### Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Breaking existing functionality | High | Keep old code until new is tested |
| CSS conflicts | Medium | Use BEM naming, scope styles |
| Performance regression | Low | Use virtual scrolling if needed |
| Mobile responsiveness | Medium | Test on multiple devices |

### Success Criteria

1. ✅ Both pages render identically styled workout cards
2. ✅ All existing functionality preserved
3. ✅ Code duplication reduced by >50%
4. ✅ New features easy to add to both pages
5. ✅ No performance regression
6. ✅ Responsive design works on all devices