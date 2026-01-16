# Feedback Dropdown CSS Integration Guide

## Problem
The feedback dropdown CSS (`feedback-dropdown.css`) needs to be loaded on all pages that use the navbar.

## Solution

### Option 1: Add to Individual Pages
Add this line to the `<head>` section of each HTML page:

```html
<link rel="stylesheet" href="/static/assets/css/feedback-dropdown.css">
```

**Place it AFTER the main Bootstrap/Sneat CSS files** to ensure proper cascade.

### Option 2: Add to Navbar Injection Service (Recommended)
If you have a common template or navbar injection service, add the CSS dynamically.

Update [`frontend/assets/js/services/navbar-injection-service.js`](frontend/assets/js/services/navbar-injection-service.js) to inject the CSS:

```javascript
// Add this function
function loadFeedbackCSS() {
    // Check if already loaded
    if (document.querySelector('link[href*="feedback-dropdown.css"]')) {
        return;
    }
    
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = '/static/assets/css/feedback-dropdown.css';
    document.head.appendChild(link);
    console.log('✅ Feedback dropdown CSS loaded');
}

// Call it when navbar is injected
loadFeedbackCSS();
```

### Option 3: Import in Main CSS File
If you have a main CSS file that's loaded on all pages, add this import at the top:

```css
@import url('/static/assets/css/feedback-dropdown.css');
```

## Verification

To verify the CSS is loaded:

1. Open browser DevTools (F12)
2. Go to Network tab
3. Filter by CSS
4. Refresh page
5. Look for `feedback-dropdown.css` in the list

OR

1. Open DevTools Console
2. Type: `document.querySelector('link[href*="feedback-dropdown"]')`
3. Should return the link element (not null)

## Current Status

The CSS file exists at: [`frontend/assets/css/feedback-dropdown.css`](frontend/assets/css/feedback-dropdown.css)

But it needs to be explicitly loaded in your HTML pages for the styles to take effect.

## Quick Test

Add this to your page temporarily to test:

```html
<style>
.dropdown-menu.feedback-dropdown-menu {
    padding: 0 8px !important;
    background: yellow; /* Temporary - to see if it's working */
}
</style>
```

If you see a yellow background, the selector is working and you just need to load the CSS file properly.