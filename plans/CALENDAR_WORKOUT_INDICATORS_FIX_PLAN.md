# Calendar Workout Indicators Fix Plan

## Problem Statement
The dashboard calendar is not showing workout indicators (green dots/highlights) on days when workouts were performed. Users expect to see visual feedback on which days they worked out.

## Investigation Findings

### 1. Missing Debug Logging
The calendar component has no debug logging, making it impossible to diagnose issues. When `setSessionData()` is called, we don't know:
- How many sessions were received
- What dates were parsed
- Which sessions matched which days

### 2. Data Structure Bug in Day Detail Panel
**File**: `frontend/dashboard.html` line 366-367
```javascript
const exerciseCount = session.exercises_performed
    ? `${session.exercises_performed} exercises`  // BUG: treats array as number
    : '';
```

The backend returns `exercises_performed` as an **array of ExercisePerformance objects**, but the code treats it as a number.

### 3. Potential Timezone Mismatch
The calendar uses local timezone methods (`getMonth()`, `getDate()`) which should work correctly, but without logging we can't verify the session dates are being parsed correctly.

### 4. API Response Format Not Validated
The code assumes the API returns `{ sessions: [...] }` but doesn't validate this or log what was received.

## Root Cause Analysis

The most likely cause is one of:
1. **Silent failure** - API call failing but no error shown
2. **Auth token issues** - User appears authenticated but token is invalid
3. **Empty data** - Sessions exist but aren't being returned
4. **Date parsing** - Sessions are returned but dates don't match calendar days

Without debug logging, it's impossible to determine which.

## Implementation Plan

### Phase 1: Add Debug Logging to Calendar Component
**File**: `frontend/assets/js/components/calendar-view.js`

1. Add logging to `setSessionData()`:
```javascript
setSessionData(sessions) {
    console.log(`📅 CalendarView.setSessionData() called with ${sessions?.length || 0} sessions`);
    this.sessions = sessions || [];
    if (this.sessions.length > 0) {
        console.log('📅 First session:', JSON.stringify(this.sessions[0], null, 2));
    }
    this.render();
}
```

2. Add logging to `buildSessionMap()`:
```javascript
buildSessionMap() {
    const map = new Map();
    console.log(`📅 Building session map from ${this.sessions.length} sessions`);

    this.sessions.forEach((session, index) => {
        const dateStr = session.completed_at || session.started_at;
        if (!dateStr) {
            console.warn(`📅 Session ${index} has no date (completed_at or started_at)`);
            return;
        }

        const date = new Date(dateStr);
        const key = this.formatDateKey(date.getFullYear(), date.getMonth(), date.getDate());
        console.log(`📅 Session "${session.workout_name}" date ${dateStr} -> key ${key}`);

        if (!map.has(key)) {
            map.set(key, []);
        }
        map.get(key).push(session);
    });

    console.log(`📅 Session map has ${map.size} unique days with workouts`);
    return map;
}
```

3. Add logging to `render()` to show which days have workouts:
```javascript
// After building sessionMap
console.log(`📅 Rendering calendar for ${year}-${month + 1}, sessionMap has ${sessionMap.size} days`);
if (sessionMap.size > 0) {
    console.log('📅 Days with workouts:', Array.from(sessionMap.keys()).join(', '));
}
```

### Phase 2: Fix Data Structure Bug in Day Detail
**File**: `frontend/dashboard.html` line 366-368

Change from:
```javascript
const exerciseCount = session.exercises_performed
    ? `${session.exercises_performed} exercises`
    : '';
```

To:
```javascript
const exerciseCount = session.exercises_performed?.length
    ? `${session.exercises_performed.length} exercises`
    : '';
```

### Phase 3: Improve Error Handling in Session Loading
**File**: `frontend/dashboard.html` in `loadCalendarSessions()` function

Add more detailed logging:
```javascript
async function loadCalendarSessions() {
    console.log('📅 loadCalendarSessions() starting...');
    try {
        // ... existing wait for dataManager code ...

        console.log('📅 Fetching sessions from API...');
        const token = await window.dataManager.getAuthToken();
        console.log('📅 Got auth token:', token ? 'yes' : 'no');

        const response = await fetch('/api/v3/workout-sessions?page_size=200', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        console.log('📅 API response status:', response.status);

        if (response.ok) {
            const data = await response.json();
            console.log('📅 API response data:', data);
            const sessions = data.sessions || [];
            console.log(`📅 Passing ${sessions.length} sessions to calendar`);
            window.calendarView.setSessionData(sessions);
        } else {
            const errorText = await response.text();
            console.error('📅 API error response:', errorText);
            window.calendarView.render();
        }
    } catch (error) {
        console.error('📅 Error in loadCalendarSessions:', error);
        window.calendarView.render();
    }
}
```

## Files to Modify

| File | Changes |
|------|---------|
| `frontend/assets/js/components/calendar-view.js` | Add debug logging to setSessionData, buildSessionMap, render |
| `frontend/dashboard.html` | Fix exercises_performed bug (line 366), improve logging in loadCalendarSessions |

## Testing Plan

1. Clear browser cache and refresh dashboard
2. Open browser console (F12)
3. Look for these log messages:
   - `📅 loadCalendarSessions() starting...`
   - `📅 Fetching sessions from API...`
   - `📅 API response status: 200`
   - `📅 Passing X sessions to calendar`
   - `📅 CalendarView.setSessionData() called with X sessions`
   - `📅 Building session map from X sessions`
   - `📅 Days with workouts: 2026-01-15, 2026-01-20, ...`

4. If no sessions show:
   - Check if API returns sessions
   - Check if dates are being parsed correctly
   - Check if session dates fall within current month view

## Success Criteria

- Days with completed workouts show green dot indicators
- Days with in-progress workouts show orange dot indicators
- Console logs clearly show data flow from API to calendar
- No silent failures - all errors logged
