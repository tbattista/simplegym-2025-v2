# Dashboard Calendar Improvements Plan

**Created:** 2026-01-24
**Status:** Ready for Implementation
**Branch:** feature/sharing_v0.9.5

---

## Overview

This plan addresses gaps between the current dashboard implementation and the UX guide requirements, focusing on the calendar view interaction pattern.

---

## Gap Summary

| Priority | Gap | Impact |
|----------|-----|--------|
| **P0** | No "View Session" button in day detail panel | Users can't drill into session details |
| **P1** | Day detail is inline card, not bottom sheet | Doesn't match Apple Fitness interaction pattern |
| **P2** | No monthly consistency stat | Missing insight metric |
| **P3** | Quick Stats may be overloaded (4 items) | Minor UX clutter |

---

## Implementation Plan

### Phase 1: Add "View Session" Button (P0)

**Goal:** Enable users to navigate to full session details from the calendar day panel.

#### Files to Modify
- `frontend/dashboard.html` - Update `showDayDetail()` function

#### Changes

**In `showDayDetail()` function (dashboard.html:361-387):**

```javascript
// Current session item render (line 374-387):
return `
    <div class="day-session-item">
        <div class="day-session-info">
            <div class="day-session-name">${escapeHtmlCalendar(session.workout_name || 'Workout')}</div>
            <div class="day-session-meta">
                ${duration ? `<i class="bx bx-time-five me-1"></i>${duration}` : ''}
                ${session.exercises_performed ? ` • ${session.exercises_performed} exercises` : ''}
            </div>
        </div>
        <div class="day-session-actions">
            ${statusBadge}
            <a href="workout-history.html?session=${session.id}"
               class="btn btn-sm btn-outline-primary ms-2"
               onclick="event.stopPropagation()">
                View <i class="bx bx-chevron-right"></i>
            </a>
        </div>
    </div>
`;
```

#### CSS Updates (calendar-view.css)

```css
.day-session-actions {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-shrink: 0;
}

.day-session-item .btn-sm {
    padding: 0.25rem 0.5rem;
    font-size: 0.75rem;
}
```

---

### Phase 2: Convert to Bottom Sheet/Offcanvas (P1)

**Goal:** Replace inline day detail panel with a bottom sheet that slides up from the bottom on mobile.

#### Approach Options

| Option | Pros | Cons |
|--------|------|------|
| **A. Bootstrap Offcanvas (bottom)** | Native Bootstrap, easy to implement | Less "Apple Fitness" feel |
| **B. Custom Bottom Sheet** | Full control, matches iOS feel | More code to maintain |
| **C. Reuse existing offcanvas pattern** | Consistent with rest of app | May need adaptation |

**Recommended:** Option A (Bootstrap Offcanvas) - simplest, leverages existing framework.

#### Files to Modify
- `frontend/dashboard.html` - Add offcanvas markup, update JS
- `frontend/assets/css/components/calendar-view.css` - Bottom sheet styles

#### HTML Changes (dashboard.html)

**Remove inline panel, add offcanvas:**

```html
<!-- Remove #dayDetailPanel div (lines 137-149) -->

<!-- Add at end of page, before scripts: -->
<div class="offcanvas offcanvas-bottom calendar-day-offcanvas"
     tabindex="-1"
     id="calendarDayOffcanvas"
     aria-labelledby="calendarDayOffcanvasLabel">
    <div class="offcanvas-header">
        <h6 class="offcanvas-title" id="calendarDayOffcanvasLabel">
            <i class="bx bx-calendar me-2"></i>
            <span id="selectedDayTitle">Thursday, January 23</span>
        </h6>
        <button type="button" class="btn-close" data-bs-dismiss="offcanvas" aria-label="Close"></button>
    </div>
    <div class="offcanvas-body" id="dayDetailContent">
        <!-- Session cards rendered here -->
    </div>
</div>
```

#### JavaScript Changes (dashboard.html)

```javascript
// Global offcanvas instance
let dayOffcanvas = null;

function initCalendar() {
    // ... existing code ...

    // Initialize offcanvas
    const offcanvasEl = document.getElementById('calendarDayOffcanvas');
    if (offcanvasEl) {
        dayOffcanvas = new bootstrap.Offcanvas(offcanvasEl);
    }
}

function showDayDetail(dateKey, sessions) {
    const title = document.getElementById('selectedDayTitle');
    const content = document.getElementById('dayDetailContent');

    if (!title || !content) return;

    // Format the date for display
    const [year, month, day] = dateKey.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    const options = { weekday: 'long', month: 'long', day: 'numeric' };
    title.textContent = date.toLocaleDateString('en-US', options);

    if (sessions.length === 0) {
        content.innerHTML = `
            <div class="text-center py-4">
                <i class="bx bx-calendar-x text-muted" style="font-size: 3rem;"></i>
                <p class="text-muted mt-3 mb-3">No workouts on this day</p>
                <a href="workout-database.html" class="btn btn-primary">
                    <i class="bx bx-play me-1"></i>Start a workout
                </a>
            </div>
        `;
    } else {
        content.innerHTML = sessions.map(session => {
            const duration = session.duration_minutes
                ? (session.duration_minutes >= 60
                    ? `${Math.floor(session.duration_minutes / 60)}h ${session.duration_minutes % 60}m`
                    : `${session.duration_minutes}m`)
                : '';

            const statusBadge = session.status === 'completed'
                ? '<span class="badge bg-success">Completed</span>'
                : session.status === 'in_progress'
                    ? '<span class="badge bg-warning">In Progress</span>'
                    : '<span class="badge bg-secondary">Partial</span>';

            return `
                <div class="day-session-card card mb-2">
                    <div class="card-body py-3">
                        <div class="d-flex justify-content-between align-items-start">
                            <div class="day-session-info">
                                <div class="day-session-name fw-semibold">${escapeHtmlCalendar(session.workout_name || 'Workout')}</div>
                                <div class="day-session-meta text-muted small mt-1">
                                    ${duration ? `<i class="bx bx-time-five me-1"></i>${duration}` : ''}
                                    ${session.exercises_performed ? ` <span class="mx-1">•</span> ${session.exercises_performed} exercises` : ''}
                                </div>
                            </div>
                            <div class="day-session-badge">
                                ${statusBadge}
                            </div>
                        </div>
                        <div class="mt-3">
                            <a href="workout-history.html?session=${session.id}"
                               class="btn btn-sm btn-outline-primary w-100">
                                <i class="bx bx-show me-1"></i>View Session Details
                            </a>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    // Show the offcanvas
    if (dayOffcanvas) {
        dayOffcanvas.show();
    }
}

function closeDayPanel() {
    if (dayOffcanvas) {
        dayOffcanvas.hide();
    }
}
```

#### CSS Changes (calendar-view.css)

```css
/* ============================================
   BOTTOM SHEET / OFFCANVAS STYLES
   ============================================ */

.calendar-day-offcanvas {
    max-height: 60vh;
    border-radius: 1rem 1rem 0 0;
}

.calendar-day-offcanvas .offcanvas-header {
    border-bottom: 1px solid var(--gs-border, #e2e8f0);
    padding: 1rem 1.25rem;
}

.calendar-day-offcanvas .offcanvas-body {
    padding: 1rem 1.25rem;
    overflow-y: auto;
}

.day-session-card {
    border: 1px solid var(--gs-border, #e2e8f0);
    transition: transform 0.15s ease, box-shadow 0.15s ease;
}

.day-session-card:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

/* Dark mode */
[data-bs-theme="dark"] .calendar-day-offcanvas {
    background-color: var(--gs-card-bg-dark, #1e293b);
    border-color: var(--gs-border-dark, #334155);
}

[data-bs-theme="dark"] .calendar-day-offcanvas .offcanvas-header {
    border-color: var(--gs-border-dark, #334155);
}

[data-bs-theme="dark"] .day-session-card {
    background-color: var(--gs-card-bg-dark, #1e293b);
    border-color: var(--gs-border-dark, #334155);
}
```

---

### Phase 3: Simplify Stats Section (P2/P3)

**Goal:** Reduce Quick Stats to 3 focused metrics that answer "What did I do?"

#### Current Stats (4 items)
1. Total Workouts
2. Avg Duration
3. Total Volume
4. Best Streak

#### Proposed Stats (3 items)
1. **This Week** - X workouts (weekly count)
2. **This Month** - X workouts (monthly consistency)
3. **Avg Duration** - Xmin

#### Files to Modify
- `frontend/assets/js/dashboard/dashboard-demo.js` - Update `calculateQuickStats()`

#### Code Changes

```javascript
/**
 * Calculate quick stats - simplified for insight/recall
 */
async function calculateQuickStats() {
  const sessions = window.dashboardDemo.data.recentSessions;

  const now = new Date();

  // This week count
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay());
  weekStart.setHours(0, 0, 0, 0);

  const weekCount = sessions.filter(s => {
    const d = new Date(s.completed_at);
    return d >= weekStart;
  }).length;

  // This month count
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthCount = sessions.filter(s => {
    const d = new Date(s.completed_at);
    return d >= monthStart;
  }).length;

  // Average duration
  const totalDuration = sessions.reduce((sum, s) => sum + (s.duration_minutes || 0), 0);
  const avgDuration = sessions.length > 0 ? Math.round(totalDuration / sessions.length) : 0;

  return [
    {
      label: 'This Week',
      value: weekCount,
      icon: 'bx-calendar-week',
      iconColor: 'var(--bs-primary)'
    },
    {
      label: 'This Month',
      value: monthCount,
      icon: 'bx-calendar',
      iconColor: 'var(--bs-success)'
    },
    {
      label: 'Avg Duration',
      value: `${avgDuration}min`,
      icon: 'bx-time',
      iconColor: 'var(--bs-info)'
    }
  ];
}
```

Also update mock data:

```javascript
function getMockQuickStats() {
  return [
    { label: 'This Week', value: 3, icon: 'bx-calendar-week', iconColor: 'var(--bs-primary)' },
    { label: 'This Month', value: 12, icon: 'bx-calendar', iconColor: 'var(--bs-success)' },
    { label: 'Avg Duration', value: '45min', icon: 'bx-time', iconColor: 'var(--bs-info)' }
  ];
}
```

#### CSS Update for 3-column grid

In `dashboard-demo.css` or component CSS:

```css
.stats-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 0.75rem;
}

@media (max-width: 576px) {
    .stats-grid {
        grid-template-columns: repeat(3, 1fr);
    }
}
```

---

## Implementation Order

| Step | Task | Estimated Complexity |
|------|------|---------------------|
| 1 | Add "View Session" button to day panel | Low |
| 2 | Update CSS for session actions | Low |
| 3 | Create offcanvas markup | Low |
| 4 | Update `showDayDetail()` for offcanvas | Medium |
| 5 | Add offcanvas CSS | Low |
| 6 | Simplify `calculateQuickStats()` | Low |
| 7 | Update mock data | Low |
| 8 | Update stats grid CSS | Low |
| 9 | Test on mobile and desktop | - |

---

## Testing Checklist

- [ ] Calendar renders correctly with session dots
- [ ] Clicking a day opens the bottom sheet
- [ ] Day with no workouts shows empty state + CTA
- [ ] Day with workouts shows session cards
- [ ] "View Session" button navigates to workout-history.html
- [ ] Bottom sheet dismisses on close button
- [ ] Bottom sheet dismisses on backdrop click
- [ ] Stats show 3 items in a row
- [ ] Dark mode works for all new components
- [ ] Mobile: bottom sheet is touch-friendly
- [ ] Mobile: stats grid is readable

---

## Files Changed Summary

| File | Changes |
|------|---------|
| `frontend/dashboard.html` | Remove inline panel, add offcanvas, update JS |
| `frontend/assets/css/components/calendar-view.css` | Add bottom sheet styles |
| `frontend/assets/js/dashboard/dashboard-demo.js` | Simplify `calculateQuickStats()`, update mock |
| `frontend/assets/css/dashboard-demo.css` | Update stats grid to 3-column |

---

## Risks & Considerations

1. **workout-history.html session param** - Need to verify `?session=` query param is supported. May need to update workout-history.html to handle this.

2. **Session ID availability** - Ensure session objects from API include `id` field for the View button link.

3. **Offcanvas z-index** - May conflict with navbar or other fixed elements on mobile.

4. **Existing tests** - If any E2E tests exist for dashboard, they may need updates.

---

## Decision Log

| Decision | Rationale |
|----------|-----------|
| Use Bootstrap offcanvas instead of custom bottom sheet | Leverages existing framework, less maintenance |
| Keep 3 stats instead of 2 | Balance between simplicity and usefulness |
| Remove "Total Volume" and "Best Streak" | Not directly related to "what did I do" question |
| Link to workout-history.html | Reuse existing page rather than building new session detail view |

---

## Ready for Implementation

This plan is ready for Code Mode. Switch to code mode and implement in the order specified above.
