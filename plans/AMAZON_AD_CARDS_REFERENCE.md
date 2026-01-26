# Amazon Affiliate Ad Cards - Complete Reference

> **Save this file** - Use the prompt at the bottom when you're ready to implement.

---

## Part 1: Amazon Affiliate Integration Options

### Option A: Manual Curated Links (Simplest)
- Create static JSON config with your curated products
- Use [SiteStripe](https://affiliate-program.amazon.com/resource-center/how-to-use-amazon-sitestripe) to generate affiliate links
- Host your own product descriptions (no prices allowed manually)

**Pros:** No API needed, works immediately, full control
**Cons:** Manual updates, no real-time prices

### Option B: Product Advertising API (PA-API 5.0)
- Register at [Associates Central → Tools → Product Advertising API](https://affiliate-program.amazon.com/help/node/topic/GUVFJTV7MGMMNY94)
- Requires **3+ qualifying sales** in last 180 days
- Use [PA-API Scratchpad](https://webservices.amazon.com/paapi5/scratchpad/index.html) to test
- Python library: [python-amazon-paapi](https://pypi.org/project/python-amazon-paapi/)

**Pros:** Real-time prices, official images, auto-updates
**Cons:** Requires sales history, can lose access if no sales in 30 days

### Option C: Hybrid (Recommended Long-term)
Start with manual links, add API for real-time data after qualifying.

---

## Part 2: Compliance Requirements

| Requirement | How to Comply |
|-------------|---------------|
| **FTC Disclosure** | Add "As an Amazon Associate I earn from qualifying purchases" to footer |
| **Link Attributes** | Always use `rel="noopener sponsored nofollow"` on affiliate links |
| **Ad Labeling** | Show "Recommended" or "Sponsored" label on ad cards |
| **No Manual Prices** | Never hardcode prices - only display via PA-API |
| **Image Linking** | All product images must link to Amazon product page |

---

## Part 3: Ad Injection Locations in Ghost Gym

### High Priority

| Location | Container ID | Notes |
|----------|--------------|-------|
| **Workout Database Grid** | `#workoutTableContainer` | Insert after every 4th card |
| **Dashboard - After Today** | After `#todaySection` | Prime visibility |
| **Favorites Scroll End** | `#favoritesContent` | Subtle placement |
| **Workout Completion** | Completion modal | Recovery product upsell |

### Medium Priority

| Location | Container ID | Notes |
|----------|--------------|-------|
| Exercise Database | After `#exerciseTableContainer` | Equipment suggestions |
| Dashboard Activity | After `#recentActivityContainer` | Accessory ads |
| Empty States | Various | Fill dead space |

---

## Part 4: Existing Card Patterns to Follow

### WorkoutCard Pattern (Recommended)
```javascript
// frontend/assets/js/components/workout-card.js
class WorkoutCard {
  constructor(workout, config) { ... }
  render() { return HTMLElement; }  // Returns DOM element
  destroy() { ... }
}
```

### ExerciseCardRenderer Pattern
```javascript
// frontend/assets/js/components/exercise-card-renderer.js
class ExerciseCardRenderer {
  renderCard(data, index) { return HTMLString; }  // Returns HTML string
}
```

---

## Part 5: Proposed File Structure

```
frontend/assets/
├── js/
│   ├── components/
│   │   └── ad-card.js           # AdCard component
│   └── config/
│       └── ad-config.js         # Product catalog & placements
└── css/
    └── components/
        └── ad-card.css          # Ad card styles
```

---

## Part 6: Sample Ad Card HTML (Text-Only)

```html
<div class="col">
  <div class="card ad-card" data-ad-id="resistance-bands">
    <div class="card-body d-flex flex-column h-100">
      <span class="ad-label">Recommended</span>
      <h6 class="ad-product-title mb-2">Resistance Bands Set</h6>
      <p class="ad-product-description text-muted small mb-3">
        Perfect for warm-ups and mobility work. Great for home or gym.
      </p>
      <a href="https://amzn.to/xxxxx"
         target="_blank"
         rel="noopener sponsored nofollow"
         class="btn btn-outline-primary btn-sm mt-auto">
        View on Amazon
      </a>
    </div>
  </div>
</div>
```

---

## Part 7: Sample Ad Card CSS

```css
/* frontend/assets/css/components/ad-card.css */

.ad-card {
  border: 1px dashed var(--bs-border-color);
  background: var(--bs-body-bg);
  height: 100%;
}

.ad-label {
  font-size: 0.6rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--bs-secondary);
  margin-bottom: 0.5rem;
}

.ad-product-title {
  font-size: 0.95rem;
  font-weight: 600;
  line-height: 1.3;
}

.ad-product-description {
  font-size: 0.8rem;
  line-height: 1.4;
  flex-grow: 1;
}

/* Dark mode */
[data-bs-theme="dark"] .ad-card {
  border-color: rgba(255, 255, 255, 0.1);
}
```

---

## Part 8: Sample Ad Configuration

```javascript
// frontend/assets/js/config/ad-config.js

export const AD_CATALOG = {
  'resistance-bands': {
    id: 'resistance-bands',
    asin: 'B08XXXXX',  // For future PA-API lookup
    title: 'Resistance Bands Set',
    description: 'Perfect for warm-ups and mobility work. Great for home or gym.',
    amazonUrl: 'https://amzn.to/xxxxx'  // Your SiteStripe link
  },
  'foam-roller': {
    id: 'foam-roller',
    asin: 'B07XXXXX',
    title: 'High-Density Foam Roller',
    description: 'Essential for muscle recovery and myofascial release.',
    amazonUrl: 'https://amzn.to/xxxxx'
  },
  'protein-powder': {
    id: 'protein-powder',
    asin: 'B09XXXXX',
    title: 'Whey Protein Powder',
    description: 'Build muscle and recover faster after intense workouts.',
    amazonUrl: 'https://amzn.to/xxxxx'
  },
  'lifting-straps': {
    id: 'lifting-straps',
    asin: 'B06XXXXX',
    title: 'Lifting Straps',
    description: 'Improve grip for heavy deadlifts and rows.',
    amazonUrl: 'https://amzn.to/xxxxx'
  }
};

export const AD_PLACEMENTS = {
  'workout-database-grid': {
    insertAfterEvery: 4,  // Insert ad after every 4th workout card
    maxAdsPerPage: 2,
    products: ['resistance-bands', 'foam-roller', 'lifting-straps']
  },
  'dashboard-today': {
    position: 'after-section',
    maxAds: 1,
    products: ['protein-powder', 'resistance-bands']
  },
  'workout-complete': {
    position: 'modal',
    maxAds: 1,
    products: ['protein-powder', 'foam-roller']
  }
};
```

---

## Part 9: Sample AdCard Component

```javascript
// frontend/assets/js/components/ad-card.js

export class AdCard {
  constructor(adData, config = {}) {
    this.ad = adData;
    this.config = {
      compact: false,
      ...config
    };
    this.element = null;
  }

  render() {
    const wrapper = document.createElement('div');
    wrapper.className = 'col';

    const card = document.createElement('div');
    card.className = 'card ad-card';
    card.dataset.adId = this.ad.id;

    card.innerHTML = `
      <div class="card-body d-flex flex-column h-100">
        <span class="ad-label">Recommended</span>
        <h6 class="ad-product-title mb-2">${this._escapeHtml(this.ad.title)}</h6>
        <p class="ad-product-description text-muted small mb-3">
          ${this._escapeHtml(this.ad.description)}
        </p>
        <a href="${this.ad.amazonUrl}"
           target="_blank"
           rel="noopener sponsored nofollow"
           class="btn btn-outline-primary btn-sm mt-auto">
          View on Amazon
        </a>
      </div>
    `;

    wrapper.appendChild(card);
    this.element = wrapper;
    return wrapper;
  }

  _escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  destroy() {
    if (this.element && this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
    }
    this.element = null;
  }
}
```

---

## Part 10: Workout Grid Modification

Modify `renderCards()` in `workout-grid.js`:

```javascript
// In renderCards() method, after creating workout cards:

import { AdCard } from './ad-card.js';
import { AD_CATALOG, AD_PLACEMENTS } from '../config/ad-config.js';

renderCards() {
  // ... existing code to get pageWorkouts ...

  const placement = AD_PLACEMENTS['workout-database-grid'];
  let adIndex = 0;
  let cardCount = 0;

  pageWorkouts.forEach(workout => {
    // Render workout card
    const card = new WorkoutCard(workout, this.config.cardConfig);
    const cardElement = card.render();
    const colWrapper = document.createElement('div');
    colWrapper.className = 'col';
    colWrapper.appendChild(cardElement);
    this.elements.grid.appendChild(colWrapper);
    this.cards.push(card);
    cardCount++;

    // Insert ad after every Nth card
    if (cardCount % placement.insertAfterEvery === 0 &&
        adIndex < placement.maxAdsPerPage) {
      const productId = placement.products[adIndex % placement.products.length];
      const adData = AD_CATALOG[productId];
      if (adData) {
        const adCard = new AdCard(adData);
        this.elements.grid.appendChild(adCard.render());
      }
      adIndex++;
    }
  });
}
```

---

## Part 11: Product Categories for Gym App

| Category | Product Ideas |
|----------|---------------|
| **Equipment** | Resistance bands, dumbbells, kettlebells, pull-up bar, foam roller, yoga mat |
| **Apparel** | Gym gloves, lifting belt, wrist wraps, gym bag, workout shoes |
| **Nutrition** | Protein powder, pre-workout, creatine, BCAAs, shaker bottles |
| **Recovery** | Massage gun, ice packs, compression sleeves, lacrosse balls |
| **Tech** | Fitness tracker, smart scale, wireless earbuds, phone armband |
| **Accessories** | Water bottle, gym towel, knee sleeves, chalk, grip pads |

---

## Part 12: Sources & Documentation

- [PA-API 5.0 Documentation](https://webservices.amazon.com/paapi5/documentation/)
- [Register for PA-API](https://webservices.amazon.com/paapi5/documentation/register-for-pa-api.html)
- [PA-API Scratchpad Tool](https://webservices.amazon.com/paapi5/scratchpad/index.html)
- [Amazon Associates Help](https://affiliate-program.amazon.com/help/node/topic/GUVFJTV7MGMMNY94)
- [SiteStripe Guide](https://affiliate-program.amazon.com/resource-center/how-to-use-amazon-sitestripe)
- [python-amazon-paapi (PyPI)](https://pypi.org/project/python-amazon-paapi/)
- [Associates Operating Agreement](https://affiliate-program.amazon.com/help/operating/policies)

---

# Ready-to-Use Implementation Prompt

Copy and paste this prompt when you're ready to implement:

---

```
I want to implement Amazon affiliate ad cards in my Ghost Gym app.

## What I need:
1. Create an AdCard component (frontend/assets/js/components/ad-card.js) that renders text-only cards
2. Create ad-card.css styling that matches my existing workout cards
3. Create ad-config.js with a product catalog I can easily update
4. Modify workout-grid.js to insert ad cards after every 4th workout card in the grid
5. Add affiliate disclosure to the footer

## Requirements:
- Text-only cards (no images for now)
- "Recommended" label for transparency
- Links use rel="noopener sponsored nofollow"
- Match existing card styling (Bootstrap 5, Sneat template)
- Support dark mode
- Max 2 ads per page

## Reference files:
- See plans/AMAZON_AD_CARDS_REFERENCE.md for full implementation details
- Follow WorkoutCard pattern in frontend/assets/js/components/workout-card.js
- Grid is in frontend/assets/js/components/workout-grid.js

Please implement this step by step.
```

---

**Last Updated:** January 2026
