/**
 * Stats Widget Component
 * Configurable stats display grid
 * @version 1.0.0
 */

class StatsWidget {
  constructor(stats, options = {}) {
    this.stats = stats || [];
    this.options = {
      layout: '2x2', // '2x2', '4x1', '1x4'
      gridClass: 'stats-grid',
      ...options
    };
    this.element = null;
  }
  
  /**
   * Render the stats widget
   * @returns {HTMLElement}
   */
  render() {
    const container = document.createElement('div');
    container.className = this._getGridClass();
    
    this.stats.forEach(stat => {
      const statCard = this._createStatCard(stat);
      container.appendChild(statCard);
    });
    
    this.element = container;
    return container;
  }
  
  /**
   * Create a single stat card
   * @private
   */
  _createStatCard(stat) {
    const card = document.createElement('div');
    card.className = 'stat-card';
    
    if (stat.onClick) {
      card.style.cursor = 'pointer';
      card.addEventListener('click', () => stat.onClick());
    }
    
    card.innerHTML = `
      ${stat.icon ? `<i class="bx ${stat.icon} stat-icon" style="color: ${stat.iconColor || 'var(--bs-primary)'}"></i>` : ''}
      <span class="stat-value">${this._formatValue(stat.value)}</span>
      <span class="stat-label">${this._escapeHtml(stat.label)}</span>
    `;
    
    return card;
  }
  
  /**
   * Get grid class based on layout
   * @private
   */
  _getGridClass() {
    const baseClass = this.options.gridClass;
    
    switch (this.options.layout) {
      case '4x1':
        return `${baseClass} grid-cols-4`;
      case '1x4':
        return `${baseClass} grid-cols-1`;
      case '2x2':
      default:
        return baseClass;
    }
  }
  
  /**
   * Format stat value
   * @private
   */
  _formatValue(value) {
    if (typeof value === 'number') {
      // Format large numbers
      if (value >= 1000000) {
        return `${(value / 1000000).toFixed(1)}M`;
      } else if (value >= 1000) {
        return `${(value / 1000).toFixed(1)}K`;
      } else {
        return value.toString();
      }
    }
    return value;
  }
  
  /**
   * Escape HTML to prevent XSS
   * @private
   */
  _escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
  
  /**
   * Update stats data
   */
  update(stats) {
    this.stats = stats;
    if (this.element) {
      const newElement = this.render();
      this.element.replaceWith(newElement);
    }
  }
  
  /**
   * Destroy the widget
   */
  destroy() {
    if (this.element) {
      this.element.remove();
      this.element = null;
    }
  }
}

// Export for global use
window.StatsWidget = StatsWidget;

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = StatsWidget;
}

console.log('📦 StatsWidget component loaded (v1.0.0)');
