/**
 * Recent Session Card Component
 * Card for displaying completed workout session summary
 * @version 1.0.0
 */

class RecentSessionCard {
  constructor(session, options = {}) {
    this.session = session;
    this.options = {
      showExercises: false, // expandable to show exercises
      maxExercises: 3,
      onViewDetails: null, // callback function
      onClick: null, // callback function for card click
      ...options
    };
    this.element = null;
  }
  
  /**
   * Render the session card
   * @returns {HTMLElement}
   */
  render() {
    const card = document.createElement('div');
    card.className = 'card recent-session-card';
    card.setAttribute('data-session-id', this.session.id);
    
    card.innerHTML = `
      <div class="card-body">
        ${this._renderHeader()}
        ${this._renderMeta()}
        ${this._renderExercises()}
      </div>
    `;
    
    this.element = card;
    this._attachEventListeners();
    
    return card;
  }
  
  /**
   * Render card header with icon, workout name, and date
   * @private
   */
  _renderHeader() {
    const workoutName = this.session.workout_name || 'Workout';
    const date = this._formatDate(this.session.completed_at);
    const badge = this._getCompletionBadge();
    
    return `
      <div class="session-header">
        <div class="session-icon bg-label-primary">
          <i class="bx bx-dumbbell"></i>
        </div>
        <div class="session-info">
          <div class="session-name">${this._escapeHtml(workoutName)}</div>
          <div class="session-meta">
            <span><i class="bx bx-calendar"></i> ${date}</span>
            ${this._renderDuration()}
            ${this._renderVolume()}
          </div>
        </div>
        ${badge}
      </div>
    `;
  }
  
  /**
   * Render session metadata
   * @private
   */
  _renderMeta() {
    const exercises = this.session.exercises_performed || [];
    const completed = exercises.filter(ex => !ex.is_skipped).length;
    const total = exercises.length;
    
    if (total === 0) return '';
    
    return `
      <div class="mt-2">
        <small class="text-muted">
          <i class="bx bx-check-circle"></i> ${completed}/${total} exercises completed
        </small>
      </div>
    `;
  }
  
  /**
   * Render exercises list (if enabled)
   * @private
   */
  _renderExercises() {
    if (!this.options.showExercises) return '';
    
    const exercises = this.session.exercises_performed || [];
    if (exercises.length === 0) return '';
    
    const displayExercises = exercises.slice(0, this.options.maxExercises);
    const remaining = exercises.length - displayExercises.length;
    
    return `
      <div class="mt-2 pt-2 border-top">
        <small class="text-muted d-block mb-1">Exercises:</small>
        ${displayExercises.map(ex => `
          <div class="d-flex align-items-center gap-2 mb-1">
            ${ex.is_skipped ? 
              '<i class="bx bx-x-circle text-warning"></i>' : 
              '<i class="bx bx-check-circle text-success"></i>'}
            <small>${this._escapeHtml(ex.exercise_name)}</small>
          </div>
        `).join('')}
        ${remaining > 0 ? `<small class="text-muted">+${remaining} more</small>` : ''}
      </div>
    `;
  }
  
  /**
   * Render duration if available
   * @private
   */
  _renderDuration() {
    if (!this.session.duration_minutes) return '';
    return `<span><i class="bx bx-time"></i> ${this.session.duration_minutes} min</span>`;
  }
  
  /**
   * Render volume if available
   * @private
   */
  _renderVolume() {
    const exercises = this.session.exercises_performed || [];
    const totalVolume = exercises.reduce((sum, ex) => {
      if (ex.is_skipped) return sum;
      const weight = ex.weight || 0;
      const sets = ex.sets_completed || ex.target_sets || 0;
      const reps = ex.target_reps || 0;
      return sum + (weight * sets * reps);
    }, 0);
    
    if (totalVolume === 0) return '';
    
    const formattedVolume = totalVolume >= 1000 ? 
      `${(totalVolume / 1000).toFixed(1)}K` : 
      totalVolume.toString();
    
    return `<span><i class="bx bx-trending-up"></i> ${formattedVolume} lbs</span>`;
  }
  
  /**
   * Get completion badge
   * @private
   */
  _getCompletionBadge() {
    const exercises = this.session.exercises_performed || [];
    const completed = exercises.filter(ex => !ex.is_skipped).length;
    const total = exercises.length;
    
    if (total === 0) return '';
    
    if (completed === total) {
      return '<span class="badge bg-success session-badge">✓ Complete</span>';
    } else if (completed > 0) {
      return '<span class="badge bg-warning session-badge">Partial</span>';
    } else {
      return '<span class="badge bg-secondary session-badge">Skipped</span>';
    }
  }
  
  /**
   * Format date for display
   * @private
   */
  _formatDate(dateString) {
    if (!dateString) return 'N/A';

    try {
      const diffDays = getCalendarDaysAgo(dateString);

      if (diffDays === 0) {
        return 'Today';
      } else if (diffDays === 1) {
        return 'Yesterday';
      } else if (diffDays < 7) {
        return `${diffDays} days ago`;
      } else {
        return new Date(dateString).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric'
        });
      }
    } catch (e) {
      return 'Invalid date';
    }
  }
  
  /**
   * Attach event listeners
   * @private
   */
  _attachEventListeners() {
    if (!this.element) return;
    
    // Card click
    if (this.options.onClick) {
      this.element.addEventListener('click', () => {
        this.options.onClick(this.session);
      });
    } else if (this.session.workout_id) {
      // Default: navigate to workout history
      this.element.addEventListener('click', () => {
        window.location.href = `workout-history.html?id=${this.session.workout_id}`;
      });
    }
    
    // View details action
    if (this.options.onViewDetails) {
      const viewBtn = this.element.querySelector('[data-action="view-details"]');
      if (viewBtn) {
        viewBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.options.onViewDetails(this.session);
        });
      }
    }
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
   * Update session data
   */
  update(session) {
    this.session = session;
    if (this.element) {
      const newElement = this.render();
      this.element.replaceWith(newElement);
    }
  }
  
  /**
   * Destroy the card
   */
  destroy() {
    if (this.element) {
      this.element.remove();
      this.element = null;
    }
  }
}

// Export for global use
window.RecentSessionCard = RecentSessionCard;

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = RecentSessionCard;
}

console.log('📦 RecentSessionCard component loaded (v1.0.0)');
