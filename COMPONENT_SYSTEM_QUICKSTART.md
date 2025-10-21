# Component System - Quick Start Guide

## 🚀 Quick Start

### Add Workouts to Any Page (3 Steps)

**Step 1**: Add the scripts
```html
<script src="/static/assets/js/core/component-registry.js"></script>
<script src="/static/assets/js/core/page-initializer.js"></script>
<script src="/static/assets/js/components/workout-components.js"></script>
```

**Step 2**: Add the container
```html
<div id="myWorkouts"></div>
```

**Step 3**: Initialize
```javascript
document.addEventListener('DOMContentLoaded', function() {
    const page = new PageInitializer('MyPage')
        .addComponent('workoutGrid', 'myWorkouts')
        .init();
});
```

**Done!** Workouts will load automatically. ✅

---

## 📦 Available Components

### Workout Components

| Component | Use Case | Container ID |
|-----------|----------|--------------|
| `workoutGrid` | Full workout list with search | Any `<div>` |
| `workoutCards` | Compact cards for builder | Any `<div>` |
| `workoutModal` | Create/edit modal | `workoutModal` |
| `workoutList` | Simple list widget | Any `<div>` |

---

## 🎨 Customization Examples

### Limit Number of Items
```javascript
.addComponent('workoutList', 'container', {
    maxItems: 5
})
```

### Disable Search
```javascript
.addComponent('workoutGrid', 'container', {
    showSearch: false
})
```

### Enable Drag-and-Drop
```javascript
.addComponent('workoutCards', 'container', {
    draggable: true
})
```

### Add Callbacks
```javascript
.configure({
    onSuccess: () => console.log('Ready!'),
    onError: (err) => console.error(err)
})
```

---

## 🔧 Common Patterns

### Pattern 1: Full Page
```javascript
const page = new PageInitializer('Workouts')
    .addComponent('workoutGrid', 'workoutsViewGrid')
    .addComponent('workoutModal', 'workoutModal')
    .init();
```

### Pattern 2: Dashboard Widget
```javascript
componentRegistry.mount('workoutList', 'recentWorkouts', {
    maxItems: 5
});
```

### Pattern 3: Multiple Components
```javascript
const page = new PageInitializer('Dashboard')
    .addComponent('workoutList', 'recent', { maxItems: 5 })
    .addComponent('programList', 'programs', { maxItems: 3 })
    .addComponent('exerciseSearch', 'search')
    .init();
```

---

## 🐛 Troubleshooting

### Workouts Not Showing?

**Check 1**: Scripts loaded?
```javascript
console.log(window.componentRegistry); // Should exist
```

**Check 2**: Container exists?
```javascript
console.log(document.getElementById('myContainer')); // Should exist
```

**Check 3**: Dependencies loaded?
```javascript
console.log(window.renderWorkoutsView); // Should be a function
```

**Check 4**: Data loaded?
```javascript
console.log(window.ghostGym.workouts); // Should be an array
```

### Still Not Working?

Check browser console for errors:
- Red errors = missing dependencies
- Yellow warnings = missing elements
- Blue logs = initialization progress

---

## 📚 Full Documentation

See [`COMPONENT_SYSTEM_ARCHITECTURE.md`](COMPONENT_SYSTEM_ARCHITECTURE.md) for complete documentation.

---

**Need Help?** Check the console logs - they're very detailed! 🔍