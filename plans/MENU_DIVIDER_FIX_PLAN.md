# Menu Divider Fix Plan

## Problem

The "Workout Settings" menu in workout mode shows a **blank button** below the "Sound" toggle. This is caused by a `{ type: 'divider' }` configuration item that isn't properly handled by the menu rendering code.

### Root Cause

In [bottom-action-bar-config.js:1145](frontend/assets/js/config/bottom-action-bar-config.js#L1145), the menu includes:
```javascript
{ type: 'divider' },
```

But [offcanvas-menu.js:24-56](frontend/assets/js/components/offcanvas/offcanvas-menu.js#L24-L56) only handles two cases:
1. `item.type === 'toggle'` → renders toggle switch
2. `else` → renders clickable menu item (catches everything else)

When a divider is passed, it falls through to `else` and renders as an empty menu item with undefined icon/title/description.

---

## Solution

Add proper divider handling to the `createMenuOffcanvas` function in `offcanvas-menu.js`.

---

## Implementation Steps

### Step 1: Update offcanvas-menu.js

**File:** `frontend/assets/js/components/offcanvas/offcanvas-menu.js`

**Change:** Add a condition for `type: 'divider'` in the `menuItems.map()` function (around line 24-56).

**Before:**
```javascript
const menuHtml = menuItems.map((item, index) => {
    if (item.type === 'toggle') {
        // Toggle switch item
        return `...`;
    } else {
        // Regular clickable item
        return `...`;
    }
}).join('');
```

**After:**
```javascript
const menuHtml = menuItems.map((item, index) => {
    if (item.type === 'divider') {
        // Visual divider/separator
        return `<hr class="menu-divider my-2">`;
    } else if (item.type === 'toggle') {
        // Toggle switch item
        return `...`;
    } else {
        // Regular clickable item
        return `...`;
    }
}).join('');
```

### Step 2: Add CSS for divider (optional)

**File:** `frontend/assets/css/components/unified-offcanvas.css`

Add styling for the menu divider if the default `<hr>` doesn't look right:

```css
/* Menu divider */
.offcanvas-bottom-base .menu-divider {
    border: none;
    border-top: 1px solid var(--bs-border-color);
    margin: 0.75rem 0;
    opacity: 0.5;
}
```

---

## Files to Modify

| File | Change |
|------|--------|
| `frontend/assets/js/components/offcanvas/offcanvas-menu.js` | Add divider type handling |
| `frontend/assets/css/components/unified-offcanvas.css` | Add divider styling (optional) |

---

## Testing

1. Open workout mode page
2. Click "More" button in bottom action bar
3. Verify "Workout Settings" menu shows:
   - Rest Timer toggle
   - Sound toggle
   - **Horizontal divider line** (not blank button)
   - Share Workout
   - Edit Workout
   - Change Workout

---

## Risk Assessment

**Low risk** - This is a simple UI fix:
- Only affects menu rendering
- No changes to functionality or data
- Isolated to offcanvas-menu.js
