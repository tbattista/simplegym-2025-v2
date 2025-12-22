/**
 * Weekly Progress Component
 * Visual progress indicator for weekly workout goals
 * @version 1.0.0
 */

class WeeklyProgress {
  constructor(data, options = {}) {
    this.data = {
      completed: data.completed || 0,
      goal: data.goal || 5,
      streak: data.streak || 0,
      ...data
    };
    this.options = {
      showStreak: true,
      showProgressBar: true,
      animated: true,
      ...options
    };
    this.element = null;
  }
  
  /**
   * Render the weekly progress widget
   * @returns {HTMLElement}
   */
  render() {
    const card = document.createElement('div');
    card.className = 'weekly-progress-card';
    
    card.innerHTML = `
      ${this._renderHeader()}
      ${this._renderStats()}
      ${this.options.showProgressBar ? this._renderProgressBar() : ''}
    `;
    
    this.element = card;
    
    // Animate progress bar if enabled
    if (this.options.animated && this.options.showProgressBar) {
      setTimeout(() => this._animateProgressBar(), 100);
    }
    
    return card;
  }
  
  /**
   * Render header section
   * @private
   */
  _renderHeader() {
    return `
      <div class="weekly-progress-header">
        <h6 class="mb-0">
          <i class="bx bx-calendar-week me-2"></i>
          This Week
        </h6>
        <a href="workout-database.html" class="btn btn-sm btn-link p-0">
          View All →
        </a>
      </div>
    `;
  }
  
  /**
   * Render stats (completed/goal and streak)
   * @private
   */
  _renderStats() {
    return `
      <div class="weekly-progress-stats">
        <div class="weekly-stat">
          <div class="weekly-stat-value">
            ${this.data.completed}/${this.data.goal}
          </div>
          <div class="weekly-stat-label">Workouts</div>
        </div>
        ${this.options.showStreak ? `
          <div class="weekly-stat">
            <div class="weekly-stat-value">
              🔥 ${this.data.streak}
            </div>
            <div class="weekly-stat-label">Day Streak</div>
          </div>
        ` : ''}
      </div>
    `;
  }
  
  /**
   * Render progress bar
   * @private
   */
  _renderProgressBar() {
    const percentage = this._calculatePercentage();
    
    return `
      <div class="weekly-progress-bar-wrapper">
        <div class="weekly-progress-bar">
          <div class="weekly-progress-fill" 
               data-percentage="${percentage}"
               style="width: 0%"></div>
        </div>
        <div class="weekly-progress-text">
          ${percentage}% complete ${this._getMotivationalText()}
        </div>
      </div>
    `;
  }
  
  /**
   * Calculate completion percentage
   * @private
   */
  _calculatePercentage() {
    if (this.data.goal === 0) return 0;
    const percentage = Math.round((this.data.completed / this.data.goal) * 100);
    return Math.min(percentage, 100);
  }
  
  /**
   * Get motivational text based on progress
   * @private
   */
  _getMotivationalText() {
    const percentage = this._calculatePercentage();
    
    if (percentage >= 100) {
      return '🎉 Goal achieved!';
    } else if (percentage >= 80) {
      return '💪 Almost there!';
    } else if (percentage >= 50) {
      return '👍 Halfway there!';
    } else if (percentage >= 25) {
      return '🚀 Keep it up!';
    } else if (this.data.completed > 0) {
      return '✨ Great start!';
    } else {
      return '- Let\'s get started!';
    }
  }
  
  /**
   * Animate progress bar fill
   * @private
   */
  _animateProgressBar() {
    if (!this.element) return;
    
    const progressFill = this.element.querySelector('.weekly-progress-fill');
    if (progressFill) {
      const percentage = progressFill.dataset.percentage;
      progressFill.style.width = `${percentage}%`;
    }
  }
  
  /**
   * Update progress data
   */
  update(data) {
    this.data = {
      ...this.data,
      ...data
    };
    
    if (this.element) {
      const newElement = this.render();
      this.element.replaceWith(newElement);
    }
  }
  
  /**
   * Get current data
   */
  getData() {
    return { ...this.data };
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
window.WeeklyProgress = WeeklyProgress;

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = WeeklyProgress;
}

console.log('📦 WeeklyProgress component loaded (v1.0.0)');
