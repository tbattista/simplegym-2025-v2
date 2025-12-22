# Exercise History Comparison Page - Implementation Plan

## 📋 Overview

A mobile-first exercise history comparison page that shows the last 3-5 workout sessions side-by-side, allowing users to quickly see their progression (weight increases/decreases) and make informed decisions about when to increase weights.

## 🎯 User Goals

1. **Quick Progress Check**: See at a glance if weights are increasing or decreasing
2. **Decision Support**: Know when it's time to add more weight
3. **Pattern Recognition**: Identify exercises that are plateauing
4. **Motivation**: Visual confirmation of progress over time

## 📱 Mobile-First Design (375px)

### Page Layout

```
┌─────────────────────────────────────┐
│ ← Push Day A                        │
│ Exercise Progress History           │
├─────────────────────────────────────┤
│ ┌───────────────────────────────┐   │
│ │ Summary Stats                  │   │
│ │ ↑ 4 exercises improved         │   │
│ │ ─ 2 exercises same             │   │
│ │ ↓ 0 exercises decreased        │   │
│ └───────────────────────────────┘   │
├─────────────────────────────────────┤
│ Sessions:                           │
│ ┌─────────┬─────────┬─────────┐    │
│ │ Dec 21  │ Dec 18  │ Dec 15  │    │
│ │ Today   │ 3 days  │ 6 days  │    │
│ └─────────┴─────────┴─────────┘    │
├─────────────────────────────────────┤
│                                     │
│ ═══════════════════════════════════ │
│                                     │
│ 🏋️ Bench Press                      │
│ ┌─────────┬─────────┬─────────┐    │
│ │  185↑   │  180    │  175    │    │
│ │  4×8    │  4×8    │  4×8    │    │
│ └─────────┴─────────┴─────────┘    │
│ Total Volume: 5,920 │ 5,760 │ 5,600│
│                                     │
├─────────────────────────────────────┤
│                                     │
│ 🏋️ Incline DB Press                 │
│ ┌─────────┬─────────┬─────────┐    │
│ │  65─    │  65↑    │  60     │    │
│ │  3×10   │  3×10   │  3×10   │    │
│ └─────────┴─────────┴─────────┘    │
│ Total Volume: 1,950 │ 1,950 │ 1,800│
│                                     │
├─────────────────────────────────────┤
│ ... more exercises                  │
│                                     │
└─────────────────────────────────────┘
```

## 🎨 Visual Design System

### Progress Indicators

| State | Icon | Color | Background | Meaning |
|-------|------|-------|------------|---------|
| Increased | ↑ | #28a745 (green) | bg-label-success | Weight went UP |
| Same | ─ | #6c757d (gray) | bg-label-secondary | No change |
| Decreased | ↓ | #dc3545 (red) | bg-label-danger | Weight went DOWN |
| Baseline | • | #6c757d (gray) | none | First/oldest session |
| Skipped | ✕ | #ffc107 (yellow) | bg-label-warning | Exercise was skipped |

### Cell Design

Each exercise cell shows:
```
┌─────────────┐
│   185 ↑     │  ← Weight + indicator
│   +5 lbs    │  ← Delta from previous (optional)
│   4×8       │  ← Sets × Reps
└─────────────┘
```

### Color Coding Rules

1. **Compare to previous session** (not baseline)
2. **Most recent on LEFT** (standard chronological reading)
3. **Oldest session** = baseline (gray, no comparison)
4. **5+ lbs increase** = bright green
5. **Same weight** = neutral gray
6. **Any decrease** = red (might indicate deload or issue)

## 📦 Component Architecture

### 1. ExerciseComparisonRow

```javascript
class ExerciseComparisonRow {
  constructor(exerciseName, sessionsData)
  
  // sessionsData = [
  //   { weight: 185, sets: 4, reps: 8, isSkipped: false },
  //   { weight: 180, sets: 4, reps: 8, isSkipped: false },
  //   { weight: 175, sets: 4, reps: 8, isSkipped: false }
  // ]
  
  render() → HTMLElement
  getProgressIndicator(current, previous) → { icon, color, delta }
  calculateVolume(weight, sets, reps) → number
}
```

### 2. SessionHeader

```javascript
class SessionHeader {
  constructor(sessions)
  
  // sessions = [
  //   { date: '2024-12-21', duration: 52 },
  //   { date: '2024-12-18', duration: 48 },
  //   ...
  // ]
  
  render() → HTMLElement
  formatDate(date) → string (Dec 21, Today, 3 days ago)
}
```

### 3. ProgressSummary

```javascript
class ProgressSummary {
  constructor(exercises)
  
  // Analyzes all exercises to produce summary:
  // - X exercises increased
  // - Y exercises same
  // - Z exercises decreased
  
  render() → HTMLElement
}
```

### 4. ExerciseHistoryPage (Controller)

```javascript
class ExerciseHistoryPage {
  constructor(workoutId)
  
  loadData() → Promise
  renderPage()
  setupEventListeners()
}
```

## 📊 Data Flow

```
URL: /exercise-history-demo.html?workoutId=xxx
                    │
                    ▼
        ┌───────────────────┐
        │  Page Controller   │
        │  exercise-history- │
        │  demo.js           │
        └─────────┬─────────┘
                  │
     ┌────────────┴───────────┐
     │                        │
     ▼                        ▼
┌─────────┐            ┌────────────┐
│ Firebase │            │  Mock Data │
│ Sessions │            │  Fallback  │
└────┬────┘            └─────┬──────┘
     │                       │
     └───────────┬───────────┘
                 │
                 ▼
    ┌────────────────────────┐
    │  Transform Data into   │
    │  Exercise Comparison   │
    │  Format                │
    └───────────┬────────────┘
                │
      ┌─────────┼─────────┐
      │         │         │
      ▼         ▼         ▼
┌─────────┐ ┌────────┐ ┌────────────┐
│ Session │ │Progress│ │  Exercise  │
│ Header  │ │Summary │ │ Comparison │
│         │ │        │ │    Rows    │
└─────────┘ └────────┘ └────────────┘
```

## 🔗 Navigation Integration

### From Dashboard Workout Card

Update [`dashboard-workout-card.js`](../frontend/assets/js/dashboard/dashboard-workout-card.js) to add a "View Progress" link:

```javascript
// In DashboardWorkoutCard.render()
<a href="exercise-history-demo.html?workoutId=${this.workout.id}" 
   class="btn btn-sm btn-outline-primary mt-2">
  <i class="bx bx-trending-up me-1"></i>
  View Progress
</a>
```

### From Workout Sessions Page

Add a "Compare" button to session cards that groups sessions by workout.

## 🧪 Mock Data Structure

```javascript
const mockExerciseHistory = {
  workout: {
    id: 'push-day-a',
    name: 'Push Day A'
  },
  sessions: [
    {
      id: 'session-1',
      date: '2024-12-21T10:30:00Z',
      duration: 52,
      exercises: [
        { name: 'Bench Press', weight: 185, sets: 4, reps: 8, isSkipped: false },
        { name: 'Incline DB Press', weight: 65, sets: 3, reps: 10, isSkipped: false },
        { name: 'Cable Flyes', weight: 30, sets: 3, reps: 12, isSkipped: false },
        { name: 'Tricep Dips', weight: 25, sets: 3, reps: 12, isSkipped: false },
        { name: 'Overhead Press', weight: 95, sets: 4, reps: 8, isSkipped: false },
        { name: 'Lateral Raises', weight: 20, sets: 3, reps: 12, isSkipped: false }
      ]
    },
    {
      id: 'session-2',
      date: '2024-12-18T11:00:00Z',
      duration: 48,
      exercises: [
        { name: 'Bench Press', weight: 180, sets: 4, reps: 8, isSkipped: false },
        { name: 'Incline DB Press', weight: 65, sets: 3, reps: 10, isSkipped: false },
        { name: 'Cable Flyes', weight: 30, sets: 3, reps: 12, isSkipped: false },
        { name: 'Tricep Dips', weight: 20, sets: 3, reps: 12, isSkipped: false },
        { name: 'Overhead Press', weight: 90, sets: 4, reps: 8, isSkipped: false },
        { name: 'Lateral Raises', weight: 20, sets: 3, reps: 12, isSkipped: false }
      ]
    },
    {
      id: 'session-3',
      date: '2024-12-15T09:30:00Z',
      duration: 50,
      exercises: [
        { name: 'Bench Press', weight: 175, sets: 4, reps: 8, isSkipped: false },
        { name: 'Incline DB Press', weight: 60, sets: 3, reps: 10, isSkipped: false },
        { name: 'Cable Flyes', weight: 25, sets: 3, reps: 12, isSkipped: false },
        { name: 'Tricep Dips', weight: 20, sets: 3, reps: 12, isSkipped: false },
        { name: 'Overhead Press', weight: 85, sets: 4, reps: 8, isSkipped: false },
        { name: 'Lateral Raises', weight: 17.5, sets: 3, reps: 12, isSkipped: false }
      ]
    }
  ]
};
```

## 🎨 CSS Additions

Add to [`dashboard-demo.css`](../frontend/assets/css/dashboard-demo.css):

```css
/* Exercise History Comparison Grid */
.exercise-history-grid {
  display: grid;
  gap: 1rem;
}

.exercise-row {
  background: var(--bs-card-bg);
  border-radius: 0.5rem;
  padding: 1rem;
  border: 1px solid var(--bs-border-color);
}

.exercise-row-header {
  font-weight: 600;
  margin-bottom: 0.75rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.session-comparison-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.5rem;
}

.session-cell {
  text-align: center;
  padding: 0.75rem 0.5rem;
  border-radius: 0.375rem;
  background: var(--bs-gray-100);
}

.session-cell.increased {
  background: rgba(40, 167, 69, 0.1);
  border: 1px solid rgba(40, 167, 69, 0.3);
}

.session-cell.decreased {
  background: rgba(220, 53, 69, 0.1);
  border: 1px solid rgba(220, 53, 69, 0.3);
}

.session-cell.same {
  background: rgba(108, 117, 125, 0.1);
  border: 1px solid rgba(108, 117, 125, 0.2);
}

.session-weight {
  font-size: 1.25rem;
  font-weight: 700;
}

.session-weight .indicator {
  font-size: 0.875rem;
  margin-left: 0.25rem;
}

.session-weight .indicator.up { color: #28a745; }
.session-weight .indicator.down { color: #dc3545; }
.session-weight .indicator.same { color: #6c757d; }

.session-sets-reps {
  font-size: 0.75rem;
  color: var(--bs-secondary);
}

.session-delta {
  font-size: 0.6875rem;
  margin-top: 0.25rem;
}

.session-delta.positive { color: #28a745; }
.session-delta.negative { color: #dc3545; }

/* Progress Summary Card */
.progress-summary {
  display: flex;
  gap: 1rem;
  justify-content: space-around;
  padding: 1rem;
  background: var(--bs-card-bg);
  border-radius: 0.5rem;
  margin-bottom: 1rem;
}

.progress-summary-item {
  text-align: center;
}

.progress-summary-value {
  font-size: 1.5rem;
  font-weight: 700;
}

.progress-summary-label {
  font-size: 0.75rem;
  color: var(--bs-secondary);
}

/* Session Header */
.session-dates-header {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.session-date-cell {
  text-align: center;
  padding: 0.5rem;
  background: var(--bs-primary);
  color: white;
  border-radius: 0.375rem;
}

.session-date-cell .date {
  font-weight: 600;
  font-size: 0.875rem;
}

.session-date-cell .relative {
  font-size: 0.6875rem;
  opacity: 0.8;
}
```

## 📁 File Structure

```
frontend/
├── exercise-history-demo.html           # New page
└── assets/
    ├── css/
    │   └── dashboard-demo.css           # Add new styles
    └── js/
        └── dashboard/
            └── exercise-history-demo.js # Controller
```

## ✅ Implementation Checklist

1. [ ] Create HTML page structure
2. [ ] Create JavaScript controller with mock data
3. [ ] Implement ExerciseComparisonRow component
4. [ ] Implement SessionHeader component
5. [ ] Implement ProgressSummary component
6. [ ] Add CSS styles to dashboard-demo.css
7. [ ] Add backend route to main.py
8. [ ] Update DashboardWorkoutCard with "View Progress" link
9. [ ] Test on mobile viewport
10. [ ] Add loading states and empty states

## 🚀 Usage

### URL Format
```
/exercise-history-demo.html?workoutId=xxx
```

### From Dashboard
1. User clicks on a workout card
2. Card has a "View Progress" button
3. Button navigates to exercise history page
4. Page shows last 3 sessions side-by-side

### Standalone Demo
```
/exercise-history-demo.html
```
Shows demo data for "Push Day A" workout

## 📱 Responsive Behavior

### Mobile (375px)
- 3 columns (3 sessions)
- Compact cells
- Abbreviated labels

### Tablet (768px+)
- Could show 4-5 sessions
- Larger cells
- Full labels with deltas

## 🔮 Future Enhancements

1. **Chart Visualization**: Line graph of weight progression over time
2. **1RM Calculator**: Estimated one-rep max based on weight × reps
3. **PR Highlighting**: Golden border/badge for personal records
4. **Time Range Selection**: Show last week, month, all time
5. **Export to Image**: Share progress on social media
6. **Notes**: Show any notes from each session
7. **Rest Times**: Compare average rest times between sessions
