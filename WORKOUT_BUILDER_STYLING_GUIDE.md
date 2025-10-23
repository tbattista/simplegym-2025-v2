# Workout Builder - Styling Guide

## Quick Start: How to Edit Styles

### 1. **Main CSS File**
**Location**: [`frontend/assets/css/workout-builder.css`](frontend/assets/css/workout-builder.css:1)

This is your primary file for customizing the workout builder appearance. Open it in your code editor and you can modify any styles.

### 2. **HTML Structure**
**Location**: [`frontend/workouts.html`](frontend/workouts.html:1)

This file contains the page structure. You can modify layout, add/remove elements, or change classes.

### 3. **Live Preview**
To see your changes:
1. Save the CSS file
2. Refresh your browser (Ctrl+R or Cmd+R)
3. Changes appear immediately (no build step needed)

---

## Common Style Customizations

### 🎨 Colors

#### Change Primary Color (Buttons, Highlights)
**File**: `frontend/assets/css/workout-builder.css`

```css
/* Find and modify these sections */

/* Accordion when expanded */
.accordion-workout-groups .accordion-button:not(.collapsed) {
    background: var(--bs-primary-bg-subtle);  /* Light blue background */
    color: var(--bs-primary);                 /* Blue text */
}

/* Change to your color (example: purple) */
.accordion-workout-groups .accordion-button:not(.collapsed) {
    background: #f3e8ff;  /* Light purple */
    color: #7c3aed;       /* Purple */
}
```

#### Change Hover Effects
```css
/* Workout cards hover */
.workout-card-compact:hover {
    border-color: var(--bs-primary);  /* Change this */
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

/* Example: Green hover */
.workout-card-compact:hover {
    border-color: #10b981;  /* Green */
    box-shadow: 0 4px 12px rgba(16, 185, 129, 0.2);
}
```

#### Change Selected Workout Card
```css
/* Currently selected workout */
.workout-card-compact.selected {
    border-color: var(--bs-primary);
    border-width: 3px;
    box-shadow: 0 0 0 3px rgba(var(--bs-primary-rgb), 0.15);
    background: rgba(var(--bs-primary-rgb), 0.05);
}

/* Example: Orange selection */
.workout-card-compact.selected {
    border-color: #f97316;
    border-width: 3px;
    box-shadow: 0 0 0 3px rgba(249, 115, 22, 0.15);
    background: rgba(249, 115, 22, 0.05);
}
```

---

### 📏 Spacing & Sizing

#### Change Accordion Height
**Line ~192** in `workout-builder.css`

```css
.accordion-workout-groups .accordion-button {
    padding: 1rem 1.25rem;  /* Top/Bottom Left/Right */
}

/* Make it taller */
.accordion-workout-groups .accordion-button {
    padding: 1.5rem 1.25rem;  /* Increase first value */
}

/* Make it more compact */
.accordion-workout-groups .accordion-button {
    padding: 0.75rem 1rem;  /* Decrease both values */
}
```

#### Change Workout Card Size
**Line ~44** in `workout-builder.css`

```css
.workout-card-compact {
    min-width: 280px;
    max-width: 280px;
    padding: 1rem;
}

/* Make cards wider */
.workout-card-compact {
    min-width: 320px;
    max-width: 320px;
    padding: 1.25rem;
}

/* Make cards narrower */
.workout-card-compact {
    min-width: 240px;
    max-width: 240px;
    padding: 0.75rem;
}
```

#### Change Gap Between Elements
```css
/* Gap between workout cards */
.workout-library-scroll {
    gap: 1rem;  /* Space between cards */
}

/* Increase spacing */
.workout-library-scroll {
    gap: 1.5rem;
}

/* Gap between accordion items */
.accordion-workout-groups .accordion-item {
    margin-bottom: 1rem;  /* Space below each group */
}
```

---

### 🔤 Typography

#### Change Font Sizes
```css
/* Page title */
h4 {
    font-size: 1.5rem;  /* Default */
}

/* Make it larger */
h4 {
    font-size: 2rem;
}

/* Accordion group title */
.accordion-workout-groups .group-title {
    font-size: 1rem;
    font-weight: 600;
}

/* Make it bolder and larger */
.accordion-workout-groups .group-title {
    font-size: 1.125rem;
    font-weight: 700;
}

/* Workout card title */
.workout-card-compact-title {
    font-size: 1rem;
}
```

#### Change Font Weights
```css
/* Make titles bolder */
.accordion-workout-groups .accordion-button {
    font-weight: 600;  /* Default */
}

/* Options: 300 (light), 400 (normal), 500 (medium), 600 (semibold), 700 (bold) */
.accordion-workout-groups .accordion-button {
    font-weight: 700;  /* Bolder */
}
```

---

### 🎭 Visual Effects

#### Change Border Radius (Roundness)
```css
/* Workout cards */
.workout-card-compact {
    border-radius: var(--bs-border-radius);  /* Default */
}

/* More rounded */
.workout-card-compact {
    border-radius: 1rem;  /* 16px */
}

/* Very rounded */
.workout-card-compact {
    border-radius: 1.5rem;  /* 24px */
}

/* Square corners */
.workout-card-compact {
    border-radius: 0;
}

/* Accordion items */
.accordion-workout-groups .accordion-item {
    border-radius: 0.5rem;  /* Adjust this */
}
```

#### Change Shadow Effects
```css
/* Hover shadow on cards */
.workout-card-compact:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

/* Stronger shadow */
.workout-card-compact:hover {
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
}

/* Softer shadow */
.workout-card-compact:hover {
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

/* Colored shadow (example: blue) */
.workout-card-compact:hover {
    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}
```

#### Change Animations
```css
/* Hover lift effect */
.workout-card-compact:hover {
    transform: translateY(-2px);  /* Lifts 2px */
}

/* More dramatic lift */
.workout-card-compact:hover {
    transform: translateY(-4px);
}

/* No lift */
.workout-card-compact:hover {
    transform: none;
}

/* Add rotation */
.workout-card-compact:hover {
    transform: translateY(-2px) rotate(1deg);
}
```

---

### 🎯 Specific Element Customization

#### Drag Handle Icon
**Line ~234** in `workout-builder.css`

```css
.accordion-workout-groups .drag-handle {
    opacity: 0;           /* Hidden by default */
    font-size: 1.2rem;    /* Icon size */
    color: var(--bs-secondary);
}

/* Always visible */
.accordion-workout-groups .drag-handle {
    opacity: 1;
}

/* Larger icon */
.accordion-workout-groups .drag-handle {
    font-size: 1.5rem;
}

/* Different color */
.accordion-workout-groups .drag-handle {
    color: #6366f1;  /* Indigo */
}
```

#### Remove/Delete Button
**Line ~217** in `workout-builder.css`

```css
.accordion-workout-groups .btn-remove-group {
    opacity: 0;  /* Hidden by default */
    padding: 0.25rem 0.5rem;
}

/* Always visible */
.accordion-workout-groups .btn-remove-group {
    opacity: 1;
}

/* Larger button */
.accordion-workout-groups .btn-remove-group {
    padding: 0.5rem 0.75rem;
    font-size: 1.1rem;
}
```

#### Search Input
**In HTML**: `frontend/workouts.html` around line 185

```html
<!-- Current -->
<input type="text" class="form-control" placeholder="Search workouts..." />

<!-- Add custom styling via CSS -->
```

```css
/* In workout-builder.css */
.card-body .input-group .form-control {
    font-size: 1rem;
    padding: 0.625rem 0.75rem;
    border-radius: 0.375rem;  /* Roundness */
}

/* Larger search box */
.card-body .input-group .form-control {
    font-size: 1.125rem;
    padding: 0.75rem 1rem;
}

/* Different border */
.card-body .input-group .form-control {
    border: 2px solid #e5e7eb;
}

.card-body .input-group .form-control:focus {
    border-color: #3b82f6;  /* Blue on focus */
}
```

---

### 📱 Mobile Customization

#### Mobile-Specific Styles
**Line ~460** in `workout-builder.css`

All styles inside `@media (max-width: 768px) { }` only apply to mobile devices.

```css
@media (max-width: 768px) {
    /* These styles ONLY apply on mobile */
    
    /* Make cards smaller on mobile */
    .workout-card-compact {
        min-width: 200px;
        max-width: 200px;
    }
    
    /* Larger touch targets */
    .btn {
        min-height: 48px;
    }
}
```

---

## 🎨 Complete Style Examples

### Example 1: Dark Theme Accordion
```css
/* Add to workout-builder.css */

.accordion-workout-groups .accordion-item {
    background: #1f2937;  /* Dark gray */
    border-color: #374151;
}

.accordion-workout-groups .accordion-button {
    background: #111827;  /* Darker */
    color: #f9fafb;       /* Light text */
}

.accordion-workout-groups .accordion-button:not(.collapsed) {
    background: #1e40af;  /* Blue when open */
    color: #ffffff;
}
```

### Example 2: Colorful Workout Cards
```css
/* Rainbow effect on hover */
.workout-card-compact:nth-child(1):hover {
    border-color: #ef4444;  /* Red */
}

.workout-card-compact:nth-child(2):hover {
    border-color: #f59e0b;  /* Orange */
}

.workout-card-compact:nth-child(3):hover {
    border-color: #10b981;  /* Green */
}

.workout-card-compact:nth-child(4):hover {
    border-color: #3b82f6;  /* Blue */
}

.workout-card-compact:nth-child(5):hover {
    border-color: #8b5cf6;  /* Purple */
}
```

### Example 3: Minimal Clean Style
```css
/* Remove all shadows and effects */
.workout-card-compact {
    border: 1px solid #e5e7eb;
    border-radius: 0.5rem;
    box-shadow: none;
}

.workout-card-compact:hover {
    border-color: #3b82f6;
    transform: none;
    box-shadow: none;
}

.accordion-workout-groups .accordion-item {
    border: 1px solid #e5e7eb;
    box-shadow: none;
}
```

### Example 4: Bold & Chunky Style
```css
/* Thick borders and large spacing */
.workout-card-compact {
    border: 3px solid #1f2937;
    border-radius: 1rem;
    padding: 1.5rem;
}

.accordion-workout-groups .accordion-button {
    padding: 1.5rem;
    font-size: 1.125rem;
    font-weight: 700;
}

.accordion-workout-groups .accordion-item {
    border: 3px solid #1f2937;
    margin-bottom: 1.5rem;
}
```

---

## 🛠️ Development Workflow

### Step-by-Step Editing Process

1. **Open the CSS file**
   ```
   frontend/assets/css/workout-builder.css
   ```

2. **Find the section you want to edit**
   - Use Ctrl+F (Cmd+F on Mac) to search
   - Look for section comments like `/* ACCORDION */`

3. **Make your changes**
   - Modify values (colors, sizes, spacing)
   - Add new rules if needed

4. **Save the file**
   - Ctrl+S (Cmd+S on Mac)

5. **Refresh browser**
   - Ctrl+R (Cmd+R on Mac)
   - Or F5

6. **See changes immediately**
   - No build step required
   - Changes apply instantly

### Tips for Experimenting

1. **Use Browser DevTools**
   - Right-click any element → "Inspect"
   - Edit styles live in the browser
   - Copy working styles to your CSS file

2. **Comment Out Old Code**
   ```css
   /* Old style (commented out)
   .workout-card-compact {
       border: 2px solid blue;
   }
   */
   
   /* New style (active) */
   .workout-card-compact {
       border: 3px solid red;
   }
   ```

3. **Keep Backups**
   - Copy the original CSS file before major changes
   - Or use Git to track changes

4. **Test on Mobile**
   - Use browser DevTools mobile view
   - Or test on actual device

---

## 📍 Quick Reference: Line Numbers

### Key Sections in `workout-builder.css`

| Section | Line | What It Controls |
|---------|------|------------------|
| Workout Library Scroll | 10 | Horizontal scrolling area |
| Workout Cards | 44 | Individual workout cards |
| Accordion Container | 175 | Overall accordion styling |
| Accordion Items | 181 | Individual exercise groups |
| Accordion Button | 192 | Clickable header |
| Drag Handle | 234 | Reorder icon |
| Remove Button | 217 | Delete button |
| Accordion Body | 283 | Content area |
| Mobile Styles | 460 | Mobile-specific styles |
| Navbar | 470 | Top navigation bar |
| Search Input | 505 | Search box styling |

---

## 🎓 CSS Basics Refresher

### Common Properties

```css
/* Colors */
color: #3b82f6;              /* Text color */
background: #f3f4f6;         /* Background color */
border-color: #e5e7eb;       /* Border color */

/* Sizing */
width: 280px;                /* Fixed width */
min-width: 200px;            /* Minimum width */
max-width: 400px;            /* Maximum width */
height: 44px;                /* Fixed height */
padding: 1rem;               /* Inside spacing */
margin: 1rem;                /* Outside spacing */

/* Typography */
font-size: 1rem;             /* Text size (16px) */
font-weight: 600;            /* Text boldness */
line-height: 1.5;            /* Line spacing */

/* Effects */
border-radius: 0.5rem;       /* Rounded corners */
box-shadow: 0 2px 4px rgba(0,0,0,0.1);  /* Shadow */
opacity: 0.5;                /* Transparency (0-1) */
transform: translateY(-2px); /* Move element */

/* Transitions */
transition: all 0.2s ease;   /* Smooth animations */
```

### Units Explained

- `px` = Pixels (fixed size)
- `rem` = Relative to root font size (16px default)
  - `1rem` = 16px
  - `1.5rem` = 24px
  - `0.5rem` = 8px
- `%` = Percentage of parent
- `vh` = Viewport height (100vh = full screen height)
- `vw` = Viewport width (100vw = full screen width)

---

## 🚀 Advanced Customization

### Add Custom Classes

1. **In CSS** (`workout-builder.css`):
```css
/* Add at the end of the file */
.my-custom-style {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 2rem;
    border-radius: 1rem;
}
```

2. **In HTML** (`workouts.html`):
```html
<!-- Add class to any element -->
<div class="card my-custom-style">
    <!-- Content -->
</div>
```

### Use CSS Variables

```css
/* Define variables at the top */
:root {
    --my-primary-color: #3b82f6;
    --my-spacing: 1rem;
    --my-radius: 0.5rem;
}

/* Use variables */
.workout-card-compact {
    border-color: var(--my-primary-color);
    padding: var(--my-spacing);
    border-radius: var(--my-radius);
}
```

---

## 📞 Need Help?

### Common Issues

**Q: Changes don't appear?**
- Hard refresh: Ctrl+Shift+R (Cmd+Shift+R on Mac)
- Clear browser cache
- Check for typos in CSS

**Q: Broke something?**
- Restore from backup
- Or use Git: `git checkout frontend/assets/css/workout-builder.css`

**Q: Want to reset everything?**
- Delete your changes
- Copy original CSS from Git

### Resources

- [CSS Reference](https://developer.mozilla.org/en-US/docs/Web/CSS)
- [Bootstrap Colors](https://getbootstrap.com/docs/5.3/customize/color/)
- [Tailwind Colors](https://tailwindcss.com/docs/customizing-colors) (for color inspiration)

---

## 🎉 Have Fun Experimenting!

The best way to learn is to try things! Don't worry about breaking anything - you can always undo changes. Start with small tweaks and build up to bigger customizations.

**Pro Tip**: Use browser DevTools to experiment live, then copy the working styles to your CSS file!