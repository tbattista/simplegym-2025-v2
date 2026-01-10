# Floating FAB Button Standardization Plan

## Overview

This plan standardizes all floating action buttons (FABs) in the workout-mode page to ensure consistent height, placement, and spacing using mobile-first best practices.

## Current Problems

### Inconsistent Heights
| Element | Current Desktop | Current 768px | Current 576px |
|---------|----------------|---------------|---------------|
| `.floating-action-fab` | 48px | 48px | 48px |
| `.floating-start-button` | 48px | 44px | 40px |
| `.floating-end-button` | 48px | 44px | 40px |
| `.floating-timer-display` | 48px | 44px | 40px |
| `.global-rest-timer-button` | 48px | 44px | 40px |
| `.global-timer-btn` | 48px | 44px | 40px |
| `.global-timer-countdown` | 48px | 44px | 40px |

### Inconsistent Right Edge Spacing
| Element | Desktop | 768px | 576px |
|---------|---------|-------|-------|
| `.floating-action-fab` | 16px | 12px | 10px |
| `.floating-timer-end-combo` | 16px | 12px | 10px |

### Inconsistent Bottom Spacing (from action bar)
| Element | Desktop | 768px | 576px |
|---------|---------|-------|-------|
| `.floating-action-fab` | calc(100% + 24px) | calc(100% + 16px) | calc(100% + 12px) |
| `.floating-timer-end-combo` | calc(100% + 24px) | calc(100% + 16px) | calc(100% + 12px) |

## New Standard (Mobile-First)

### Design Tokens (CSS Custom Properties)
```css
:root {
  /* Floating FAB Standard Values - Mobile First */
  --floating-fab-height: 44px;
  --floating-fab-min-width: 44px;
  --floating-fab-padding-x: 12px;
  --floating-fab-spacing-right: 16px;
  --floating-fab-spacing-bottom: 12px;
  --floating-fab-border-radius: 12px;
  --floating-fab-gap: 8px;
  --floating-fab-font-size: 14px;
  --floating-fab-icon-size: 18px;
}
```

### Final Specifications
| Property | Value | Notes |
|----------|-------|-------|
| **Height** | 44px | Fixed across all breakpoints |
| **Min-width** | 44px | For icon-only buttons |
| **Width** | auto | Expands based on content |
| **Padding (horizontal)** | 12px | For text buttons |
| **Right edge spacing** | 16px | Fixed across all breakpoints |
| **Bottom spacing** | calc(100% + 12px) | Fixed across all breakpoints |
| **Border radius** | 12px | Consistent with existing design |
| **Gap** | 8px | Between icon and text/elements |

## Affected CSS Selectors

### File: `frontend/assets/css/bottom-action-bar.css`

#### Primary Selectors to Update:
1. `.floating-action-fab` (lines 289-313)
2. `.floating-action-fab.floating-start-button` (lines 316-327)
3. `.floating-action-fab.floating-end-button` (lines 316-327)
4. `.floating-timer-end-combo` (lines 336-345)
5. `.floating-timer-display` (lines 348-366)
6. `.floating-end-button` (lines 374-410)
7. `.floating-start-button` (lines 412-426)
8. `.global-rest-timer-button` (lines 514-526)
9. `.global-timer-btn` (lines 529-546)
10. `.global-timer-countdown` (lines 561-577)
11. `.global-timer-paused` (lines 608-624)

#### Media Queries to Remove/Simplify:
- `@media (max-width: 768px)` - lines 451-478
- `@media (max-width: 576px)` - lines 480-507
- `@media (max-width: 768px)` for global timer - lines 760-793
- `@media (max-width: 576px)` for global timer - lines 796-830

## Implementation Steps

### Step 1: Add CSS Custom Properties
Add new CSS custom properties at the top of `bottom-action-bar.css` (before line 8):

```css
/* ============================================
   FLOATING FAB DESIGN TOKENS - MOBILE FIRST
   ============================================ */
:root {
  --floating-fab-height: 44px;
  --floating-fab-min-width: 44px;
  --floating-fab-padding-x: 12px;
  --floating-fab-spacing-right: 16px;
  --floating-fab-spacing-bottom: 12px;
  --floating-fab-border-radius: 12px;
  --floating-fab-gap: 8px;
  --floating-fab-font-size: 14px;
  --floating-fab-icon-size: 18px;
}
```

### Step 2: Update `.floating-action-fab` Base Styles
Replace lines 289-313 with:

```css
.floating-action-fab {
    position: absolute;
    right: var(--floating-fab-spacing-right);
    bottom: calc(100% + var(--floating-fab-spacing-bottom));
    height: var(--floating-fab-height);
    min-width: var(--floating-fab-min-width);
    padding: 0 var(--floating-fab-padding-x);
    border-radius: var(--floating-fab-border-radius);
    background: var(--bs-success);
    color: #fff;
    border: none;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--floating-fab-gap);
    cursor: pointer;
    z-index: 1002;
    transition: all 0.3s ease;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
    font-weight: 600;
    font-size: var(--floating-fab-font-size);
    white-space: nowrap;
    pointer-events: auto !important;
}

.floating-action-fab i {
    font-size: var(--floating-fab-icon-size);
    flex-shrink: 0;
}
```

### Step 3: Update `.floating-start-button` and `.floating-end-button`
Replace lines 316-327 with:

```css
/* Start/End button uses same dimensions as base FAB */
.floating-action-fab.floating-start-button,
.floating-action-fab.floating-end-button {
    height: var(--floating-fab-height);
    min-width: var(--floating-fab-min-width);
    padding: 0 var(--floating-fab-padding-x);
    border-radius: var(--floating-fab-border-radius);
    gap: var(--floating-fab-gap);
    font-size: var(--floating-fab-font-size);
    font-weight: 600;
    line-height: 1.5;
}

.floating-action-fab.floating-start-button i,
.floating-action-fab.floating-end-button i {
    font-size: var(--floating-fab-icon-size);
}
```

### Step 4: Update `.floating-timer-end-combo`
Replace lines 336-345 with:

```css
.floating-timer-end-combo {
    position: absolute;
    right: var(--floating-fab-spacing-right);
    bottom: calc(100% + var(--floating-fab-spacing-bottom));
    display: flex;
    gap: var(--floating-fab-gap);
    align-items: center;
    z-index: 1002;
    pointer-events: auto;
}
```

### Step 5: Update Timer Display and Buttons
Replace lines 348-426 with unified styles:

```css
/* Timer Display */
.floating-timer-display {
    height: var(--floating-fab-height);
    min-width: 80px;
    padding: 0 var(--floating-fab-padding-x);
    background: var(--bs-body-bg);
    border: 2px solid var(--bs-primary);
    border-radius: var(--floating-fab-border-radius);
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--floating-fab-gap);
    font-size: var(--floating-fab-font-size);
    font-weight: 600;
    color: var(--bs-body-color);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
    transition: all 0.2s ease;
    align-self: center;
}

.floating-timer-display i {
    font-size: var(--floating-fab-icon-size);
    color: var(--bs-primary);
}

/* Start/End Button (standalone) */
.floating-end-button,
.floating-start-button {
    height: var(--floating-fab-height);
    min-width: var(--floating-fab-min-width);
    padding: 0 var(--floating-fab-padding-x);
    border: none;
    border-radius: var(--floating-fab-border-radius);
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--floating-fab-gap);
    font-size: var(--floating-fab-font-size);
    font-weight: 600;
    line-height: 1.5;
    cursor: pointer;
    transition: all 0.2s ease;
    white-space: nowrap;
    align-self: center;
    color: white;
}

.floating-end-button i,
.floating-start-button i {
    font-size: var(--floating-fab-icon-size);
}
```

### Step 6: Update Global Rest Timer Components
Replace lines 514-546 with:

```css
.global-rest-timer-button {
    flex-shrink: 0;
    margin-right: var(--floating-fab-gap);
    z-index: 1002;
    pointer-events: auto;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    min-width: 80px;
    height: var(--floating-fab-height);
    align-self: center;
}

.global-timer-btn {
    width: 100%;
    height: var(--floating-fab-height);
    min-width: 80px;
    padding: 0 var(--floating-fab-padding-x);
    border-radius: var(--floating-fab-border-radius);
    border: none;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--floating-fab-gap);
    font-size: var(--floating-fab-font-size);
    font-weight: 600;
    cursor: pointer;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
    transition: all 0.2s ease;
    white-space: nowrap;
}
```

### Step 7: Update Countdown and Paused States
Replace lines 561-624 with:

```css
.global-timer-countdown {
    height: var(--floating-fab-height);
    min-width: 100px;
    padding: 0 var(--floating-fab-padding-x);
    background: var(--bs-body-bg);
    border: 2px solid var(--bs-primary);
    border-radius: var(--floating-fab-border-radius);
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--floating-fab-gap);
    font-size: var(--floating-fab-font-size);
    font-weight: 600;
    color: var(--bs-body-color);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
    transition: all 0.2s ease;
}

.global-timer-time {
    font-size: var(--floating-fab-font-size);
    font-weight: 700;
    font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace;
}

.global-timer-paused {
    height: var(--floating-fab-height);
    min-width: 120px;
    padding: 0 var(--floating-fab-padding-x);
    background: var(--bs-warning);
    border: 2px solid var(--bs-warning);
    border-radius: var(--floating-fab-border-radius);
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--floating-fab-gap);
    font-size: var(--floating-fab-font-size);
    font-weight: 600;
    color: white;
    box-shadow: 0 2px 8px rgba(255, 193, 7, 0.3);
    transition: all 0.2s ease;
}
```

### Step 8: Remove/Simplify Responsive Breakpoints
Remove or comment out all responsive breakpoints that override the FAB heights and spacing:

- Lines 451-507 (`.floating-timer-end-combo`, `.floating-action-fab` media queries)
- Lines 760-830 (`.global-rest-timer-button`, `.global-timer-btn` media queries)

**Keep only essential dark mode adjustments and hover states.**

## Visual Diagram

```
┌──────────────────────────────────────────────────────────────────┐
│                                                                  │
│                         Page Content                             │
│                                                                  │
│                                                                  │
│                                                                  │
│                                   ┌─────────────────────────────┐│
│                                   │                             ││
│                              12px │  [Rest] [00:00] [End]       ││ 44px
│                                   │                             ││
│                                   └─────────────────────────────┘│
│                                                            16px  │
├──────────────────────────────────────────────────────────────────┤
│                    Bottom Action Bar                             │
│   [Add]    [Note]    [Reorder]    [More]                        │
└──────────────────────────────────────────────────────────────────┘
```

## Testing Checklist

After implementation, verify:

- [ ] All floating buttons have 44px height
- [ ] All floating buttons align 16px from right edge
- [ ] All floating buttons are 12px above the action bar
- [ ] Start button (before workout) displays correctly
- [ ] Timer combo (during workout) displays correctly
- [ ] All elements align horizontally when in combo mode
- [ ] Text buttons expand to fit content
- [ ] Icon-only buttons remain square (44x44)
- [ ] Touch targets meet 44px minimum
- [ ] Visual consistency across all viewport sizes
- [ ] No regressions in dark mode

## Files to Modify

| File | Action |
|------|--------|
| `frontend/assets/css/bottom-action-bar.css` | Update FAB styles, add CSS variables, remove responsive overrides |

## Rollback Plan

If issues arise, revert `bottom-action-bar.css` to previous version. The CSS custom properties approach allows easy adjustments without changing multiple selectors.

---

**Approved Specifications:**
- Height: 44px (fixed)
- Right spacing: 16px (fixed)
- Bottom spacing: 12px (fixed)
- Border radius: 12px
- Mobile-first: No responsive breakpoint changes for sizing