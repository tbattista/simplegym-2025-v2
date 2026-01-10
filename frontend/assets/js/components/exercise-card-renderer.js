/**
 * Ghost Gym - Exercise Card Renderer
 * Handles rendering of exercise cards in workout mode
 * @version 1.0.0
 * @date 2025-11-18
 */

class ExerciseCardRenderer {
    /**
     * @param {Object} sessionService - Workout session service instance
     */
    constructor(sessionService) {
        this.sessionService = sessionService;
    }

    /**
     * Render an exercise card
     * @param {Object} group - Exercise group data
     * @param {number} index - Card index
     * @param {boolean} isBonus - Whether this is a bonus exercise
     * @param {number} totalCards - Total number of cards (to determine if this is the last one)
     * @returns {string} HTML string for the card
     */
    renderCard(group, index, isBonus = false, totalCards = 0) {
        const exercises = group.exercises || {};
        const mainExercise = exercises.a || 'Unknown Exercise';
        const alternates = this._getAlternates(exercises);
        
        // PHASE 1: Check data in priority order: Session > Pre-Session Edits > Template
        // This ensures edited values are displayed correctly before and during workout
        const isSessionActive = this.sessionService.isSessionActive();
        const exerciseData = this.sessionService.getExerciseWeight(mainExercise);
        const preSessionEdit = !isSessionActive ? this.sessionService.getPreSessionEdits(mainExercise) : null;
        
        // Priority: Active Session > Pre-Session Edit > Template
        const sets = exerciseData?.target_sets || preSessionEdit?.target_sets || group.sets || '3';
        const reps = exerciseData?.target_reps || preSessionEdit?.target_reps || group.reps || '8-12';
        const rest = exerciseData?.rest || preSessionEdit?.rest || group.rest || '60s';
        const notes = exerciseData?.notes || group.notes || '';
        
        const restSeconds = this._parseRestTime(rest);
        const timerId = `timer-${index}`;
        const bonusClass = isBonus ? 'bonus-exercise' : '';
        
        // Get exercise history
        const history = this.sessionService.getExerciseHistory(mainExercise);
        const lastWeight = history?.last_weight || '';
        const lastWeightUnit = history?.last_weight_unit || 'lbs';
        const lastSessionDate = history?.last_session_date || null;
        const recentSessions = history?.recent_sessions || [];
        
        // Get last weight direction from history (for display on new session)
        const lastDirection = this.sessionService.getLastWeightDirection(mainExercise);
        
        // 🔍 DEBUG: Log direction retrieval for each exercise
        console.log(`🔍 [Card ${index}] Exercise: "${mainExercise}"`);
        console.log(`  📊 History object:`, history);
        console.log(`  📝 Last direction from history:`, lastDirection);
        console.log(`  ⚙️ Is session active:`, isSessionActive);
        
        // Get current direction for this session
        const currentDirection = this.sessionService.getWeightDirection(mainExercise);
        
        // Get weight data with proper fallback chain
        const weightData = this.sessionService.getExerciseWeight(mainExercise);
        const templateWeight = group.default_weight || '';
        const templateUnit = group.default_weight_unit || 'lbs';
        
        // PHASE 2: Check if exercise is skipped (active session OR pre-session)
        const preSessionSkipped = !isSessionActive && this.sessionService.isPreSessionSkipped(mainExercise);
        const isSkipped = weightData?.is_skipped || preSessionSkipped;
        const skipReason = weightData?.skip_reason || (preSessionSkipped ? 'Skipped before workout' : '');
        
        // PHASE 3: Check if exercise is completed
        const isCompleted = weightData?.is_completed || false;
        
        // Determine current weight with proper fallback
        const currentWeight = weightData?.weight || templateWeight || lastWeight || '';
        const currentUnit = weightData?.weight_unit ||
                          (weightData?.weight ? templateUnit : (templateWeight ? templateUnit : lastWeightUnit));
        
        // Determine weight source for better UX feedback
        const weightSource = weightData?.weight ? 'session' :
                           (templateWeight ? 'template' :
                           (lastWeight ? 'history' : 'none'));
        
        // Calculate plate breakdown for barbell exercises
        const plateBreakdown = this._calculatePlateBreakdown(currentWeight, currentUnit);
        
        return `
            <div class="card exercise-card ${bonusClass} ${isSkipped ? 'skipped' : ''} ${isCompleted ? 'completed' : ''}" data-exercise-index="${index}" data-exercise-name="${this._escapeHtml(mainExercise)}">
                <div class="card-header exercise-card-header" onclick="window.workoutModeController.toggleExerciseCard(${index})">
                    <div class="exercise-card-summary">
                        <!-- MORPH: Exercise Name with inline badge -->
                        <h6 class="mb-0 morph-title" data-morph-id="title-${index}">
                            ${isBonus ? '<span class="additional-exercise-badge" title="Additional exercise - added to this workout session, not part of the workout template">+</span>' : ''}
                            ${isCompleted ? '<i class="bx bx-check-circle text-success me-1"></i>' : ''}
                            ${isSkipped ? '<i class="bx bx-x-circle text-warning me-1"></i>' : ''}
                            ${this._escapeHtml(mainExercise)}
                        </h6>
                        
                        <!-- MORPH: Meta info (visible when collapsed, hidden when expanded) -->
                        <div class="exercise-card-meta morph-meta" data-morph-id="meta-${index}">
                            <span class="morph-sets-reps">${sets} sets × ${reps} reps • ${rest}</span>
                        </div>
                        
                        <!-- MORPH: Weight badge (visible when collapsed, hidden when expanded) -->
                        <div class="exercise-card-weight-row morph-weight" data-morph-id="weight-${index}">
                            ${this._renderWeightBadge(currentWeight, currentUnit, weightSource, lastWeight, lastWeightUnit, lastDirection, currentDirection, isSessionActive)}
                        </div>
                    </div>
                    
                    <!-- Right-aligned expand icon only -->
                    <div class="exercise-card-expand-container">
                        <i class="bx bx-chevron-down expand-icon"></i>
                    </div>
                </div>
                
                <div class="card-body exercise-card-body" style="display: none;">
                    <!-- Alternate Exercises - Discreet Subtitle -->
                    ${alternates.length > 0 ? `
                        <div class="alternate-exercises-subtitle">
                            ${alternates.map(alt => `<span>${alt.label}: ${this._escapeHtml(alt.name)}</span>`).join(' · ')}
                        </div>
                    ` : ''}
                    
                    ${isSkipped ? `
                        <div class="alert alert-warning">
                            <i class="bx bx-info-circle me-2"></i>
                            <strong>Exercise Skipped</strong>
                            ${skipReason ? `<p class="mb-0 mt-1 small">${this._escapeHtml(skipReason)}</p>` : ''}
                        </div>
                    ` : ''}
                    
                    <!-- Weight Direction Reminder from Last Session (shows always if exists) -->
                    ${lastDirection ? `
                        <div class="alert alert-${lastDirection === 'up' ? 'success' : 'warning'} d-flex align-items-center mb-3" role="alert">
                            <i class="bx bx-chevron-${lastDirection} me-2" style="font-size: 1.5rem;"></i>
                            <div>
                                <strong>From last session:</strong> ${lastDirection === 'up' ? 'Increase' : 'Decrease'} weight
                            </div>
                        </div>
                    ` : ''}
                    
                    <!-- Weight Section (2-Column Layout) -->
                    <div class="exercise-weight-section">
                        <div class="weight-section-row">
                            <!-- Left Column: Weight Display -->
                            <div class="weight-section-left">
                                <div class="exercise-weight-display">
                                    <span class="exercise-weight-value">${currentWeight || '—'}</span>
                                    ${currentWeight && currentUnit !== 'other' ? `<span class="exercise-weight-unit">${currentUnit}</span>` : ''}
                                    ${currentWeight && currentUnit === 'other' ? `<span class="exercise-weight-unit text-muted">(custom)</span>` : ''}
                                </div>
                                ${this._renderWeightHistory(mainExercise, lastWeight, lastWeightUnit, lastSessionDate, recentSessions)}
                            </div>
                            
                            <!-- Right Column: Weight Direction Buttons (During Active Session Only) -->
                            ${isSessionActive ? `
                                <div class="weight-section-right">
                                    <div class="weight-direction-section">
                                        <span class="weight-direction-label">Next session (optional):</span>
                                        <div class="weight-direction-toggle">
                                            <button class="btn btn-sm weight-direction-btn increase ${currentDirection === 'up' ? 'active' : ''}"
                                                    data-exercise-name="${this._escapeHtml(mainExercise)}"
                                                    data-direction="up"
                                                    onclick="window.workoutModeController.toggleWeightDirection(this, '${this._escapeHtml(mainExercise)}', 'up'); event.stopPropagation();"
                                                    title="Increase weight next session">
                                                <i class="bx bx-chevron-up"></i> Increase
                                            </button>
                                            <button class="btn btn-sm weight-direction-btn same ${!currentDirection || currentDirection === 'same' ? 'active' : ''}"
                                                    data-exercise-name="${this._escapeHtml(mainExercise)}"
                                                    data-direction="same"
                                                    onclick="window.workoutModeController.toggleWeightDirection(this, '${this._escapeHtml(mainExercise)}', 'same'); event.stopPropagation();"
                                                    title="Keep same weight next session">
                                                <i class="bx bx-minus"></i> No Change
                                            </button>
                                            <button class="btn btn-sm weight-direction-btn decrease ${currentDirection === 'down' ? 'active' : ''}"
                                                    data-exercise-name="${this._escapeHtml(mainExercise)}"
                                                    data-direction="down"
                                                    onclick="window.workoutModeController.toggleWeightDirection(this, '${this._escapeHtml(mainExercise)}', 'down'); event.stopPropagation();"
                                                    title="Decrease weight next session">
                                                <i class="bx bx-chevron-down"></i> Decrease
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ` : ''}
                        </div>
                    </div>
                    
                    <!-- Exercise Details - List Group Style -->
                    <ul class="list-group list-group-flush exercise-details-list">
                        <li class="list-group-item d-flex justify-content-between align-items-center px-0">
                            <span class="text-muted">Sets × Reps</span>
                            <strong>${sets} × ${reps}</strong>
                        </li>
                        <li class="list-group-item d-flex justify-content-between align-items-center px-0">
                            <span class="text-muted">Rest</span>
                            <div class="d-flex align-items-center gap-2">
                                <span data-inline-timer-display="${index}" class="inline-timer-display">
                                    <strong><i class="bx bx-time-five me-1"></i>${rest}</strong>
                                </span>
                                <span class="text-muted">|</span>
                                <span data-inline-timer="${index}" data-rest-seconds="${restSeconds}" data-rest-display="${rest}" class="inline-timer-container">
                                    <a href="#" class="inline-timer-link"
                                       onclick="window.inlineTimerStart(${index}); return false;"
                                       title="Start ${rest} rest timer">
                                        <i class="bx bx-play-circle"></i> Start Rest
                                    </a>
                                </span>
                            </div>
                        </li>
                        ${plateBreakdown ? `
                            <li class="list-group-item d-flex justify-content-between align-items-center px-0">
                                <span class="text-muted"><i class="bx bx-dumbbell me-1"></i>Plates</span>
                                <div class="d-flex align-items-center gap-2">
                                    <span class="text-muted small text-end">${plateBreakdown}</span>
                                    <button class="btn btn-sm btn-outline-secondary plate-settings-btn"
                                            onclick="window.workoutModeController.showPlateSettings(); event.stopPropagation();"
                                            title="Configure available plates">
                                        <i class="bx bx-cog"></i>
                                    </button>
                                </div>
                            </li>
                        ` : ''}
                    </ul>
                    
                    ${notes ? `
                        <div class="exercise-notes">
                            <i class="bx bx-info-circle me-1"></i>
                            <span>${this._escapeHtml(notes)}</span>
                        </div>
                    ` : ''}
                    
                    <!-- Card Action Buttons (Complete/Skip/Edit) -->
                    ${this._renderCardActionButtons(mainExercise, index, isSkipped, isCompleted, isSessionActive)}
                </div>
            </div>
        `;
    }

    /**
     * Render weight badge with visual progression feedback (Phase 4)
     * Redesigned: Badge shows only weight value, status indicator appears separately to the right
     * @private
     */
    _renderWeightBadge(currentWeight, currentUnit, weightSource, lastWeight, lastWeightUnit, lastDirection, currentDirection, isSessionActive) {
        // No current weight - show placeholder
        if (!currentWeight) {
            if (lastWeight) {
                const unitDisplay = lastWeightUnit !== 'other' ? ` ${lastWeightUnit}` : '';
                return `<span class="badge bg-label-secondary" title="Last used weight - click Edit Weight to use">Last: ${lastWeight}${unitDisplay}</span>`;
            }
            return `<span class="badge bg-label-secondary" title="No weight set - click Edit Weight to add">No weight</span>`;
        }
        
        // PHASE 4: Determine progression state for separate status indicator
        let progressionClass = '';
        let statusIcon = '';
        let statusLabel = '';
        let tooltipText = '';
        const unitDisplay = currentUnit !== 'other' ? ` ${currentUnit}` : '';
        
        // Determine which direction to display
        // Priority: Active session current direction > Last session reminder
        const displayDirection = isSessionActive ? currentDirection : lastDirection;
        
        // Status indicator logic - icon and label appear outside badge
        if (displayDirection) {
            if (isSessionActive) {
                // Current session direction (user just set this)
                if (displayDirection === 'up') {
                    progressionClass = 'direction-up';
                    statusIcon = '✓↑';
                    statusLabel = 'Next: Increase';
                    tooltipText = `Next session: Increase weight`;
                } else if (displayDirection === 'down') {
                    progressionClass = 'direction-down';
                    statusIcon = '✓↓';
                    statusLabel = 'Next: Decrease';
                    tooltipText = `Next session: Decrease weight`;
                } else if (displayDirection === 'same') {
                    progressionClass = 'direction-same';
                    statusIcon = '✓→';
                    statusLabel = 'Next: No change';
                    tooltipText = `Next session: Keep same weight`;
                }
            } else {
                // Last session reminder (what they noted last time)
                if (displayDirection === 'up') {
                    progressionClass = 'direction-reminder direction-up';
                    statusIcon = '📝↑';
                    statusLabel = 'Reminder: Increase';
                    tooltipText = `Last session reminder: Increase weight`;
                } else if (displayDirection === 'down') {
                    progressionClass = 'direction-reminder direction-down';
                    statusIcon = '📝↓';
                    statusLabel = 'Reminder: Decrease';
                    tooltipText = `Last session reminder: Decrease weight`;
                } else if (displayDirection === 'same') {
                    progressionClass = 'direction-reminder direction-same';
                    statusIcon = '📝→';
                    statusLabel = 'Reminder: No change';
                    tooltipText = `Last session reminder: Keep same weight`;
                }
            }
        } else if (!lastWeight) {
            // First time doing this exercise
            progressionClass = 'new';
            statusIcon = '★';
            statusLabel = 'New';
            tooltipText = `First time doing this exercise!`;
        } else {
            const weightDiff = currentWeight - lastWeight;
            if (weightDiff > 0) {
                // Weight increased
                progressionClass = 'increased';
                statusIcon = '↑';
                statusLabel = 'Increased';
                tooltipText = `Increased ${weightDiff.toFixed(1)}${unitDisplay} from last time`;
            } else if (weightDiff < 0) {
                // Weight decreased
                progressionClass = 'decreased';
                statusIcon = '↓';
                statusLabel = 'Decreased';
                tooltipText = `Decreased ${Math.abs(weightDiff).toFixed(1)}${unitDisplay} from last time`;
            } else {
                // Same weight
                progressionClass = 'same';
                statusIcon = '→';
                statusLabel = 'No change';
                tooltipText = `Same as last time`;
            }
        }
        
        // Add modified indicator if user changed from template
        const modifiedClass = weightSource === 'session' ? 'modified' : '';
        
        // Build the HTML: Badge (weight only) + Status indicator (icon + label)
        return `<span class="badge weight-badge ${progressionClass} ${modifiedClass}"
                      data-direction="${displayDirection || 'none'}"
                      data-bs-toggle="tooltip"
                      data-bs-placement="top"
                      title="${currentWeight}${unitDisplay}${modifiedClass ? ' - Modified from template' : ''}">
            ${currentWeight}${unitDisplay}
        </span>
        <span class="weight-status-indicator status-${progressionClass}"
              data-bs-toggle="tooltip"
              data-bs-placement="top"
              title="${tooltipText}">
            <span class="weight-status-icon">${statusIcon}</span>
            <span class="weight-status-label">${statusLabel}</span>
        </span>`;
    }

    /**
     * Get alternate exercises
     * @private
     */
    _getAlternates(exercises) {
        const alternates = [];
        if (exercises.b) alternates.push({ label: 'Alt1', name: exercises.b });
        if (exercises.c) alternates.push({ label: 'Alt2', name: exercises.c });
        return alternates;
    }

    /**
     * Parse rest time string to seconds
     * @private
     */
    _parseRestTime(restStr) {
        const match = restStr.match(/(\d+)/);
        return match ? parseInt(match[1]) : 60;
    }

    /**
     * Calculate barbell plate breakdown using plate calculator service
     * @private
     */
    _calculatePlateBreakdown(weightStr, unit) {
        // Use plate calculator service if available
        if (window.plateCalculatorService) {
            return window.plateCalculatorService.calculateBreakdown(weightStr, unit);
        }
        
        // Fallback to basic calculation if service not loaded
        if (unit !== 'lbs') return null;
        
        const totalWeight = parseFloat(weightStr);
        if (isNaN(totalWeight) || totalWeight <= 45) {
            return null;
        }
        
        const barWeight = 45;
        const weightPerSide = (totalWeight - barWeight) / 2;
        
        if (weightPerSide <= 0) {
            return null;
        }
        
        const plates = [45, 35, 25, 10, 5, 2.5];
        const plateCount = {};
        let remaining = weightPerSide;
        
        for (const plate of plates) {
            const count = Math.floor(remaining / plate);
            if (count > 0) {
                plateCount[plate] = count;
                remaining -= count * plate;
            }
        }
        
        const plateParts = [];
        for (const [plate, count] of Object.entries(plateCount)) {
            plateParts.push(`${count}×${plate}lb`);
        }
        
        if (plateParts.length === 0) {
            return null;
        }
        
        return `45lb bar + (${plateParts.join(' + ')}) each side`;
    }

    /**
     * Render card action buttons (Complete/Skip/Modify/Replace)
     * PHASE 1: Modify button now shows BEFORE session starts for pre-session editing
     * PRE-SESSION UPDATE: Now also shows Skip and Replace buttons
     * @private
     */
    _renderCardActionButtons(exerciseName, index, isSkipped, isCompleted, isSessionActive) {
        if (!isSessionActive) {
            // PRE-SESSION: Show Skip/Replace/Modify buttons (or Unskip if skipped)
            if (isSkipped) {
                return `
                    <div class="card-action-buttons mt-3 pt-3 border-top">
                        <button class="btn btn-sm btn-warning w-100 mb-2"
                                onclick="window.workoutModeController.handleUnskipExercise('${this._escapeHtml(exerciseName)}', ${index}); event.stopPropagation();"
                                title="Resume this exercise">
                            <i class="bx bx-undo me-1"></i>Unskip
                        </button>
                        <button class="btn btn-sm btn-outline-primary w-100"
                                onclick="window.workoutModeController.handleEditExercise('${this._escapeHtml(exerciseName)}', ${index}); event.stopPropagation();"
                                title="Modify exercise details">
                            <i class="bx bx-edit me-1"></i>Modify
                        </button>
                    </div>
                `;
            }
            
            // Normal pre-session: Modify, Replace, Skip
            return `
                <div class="card-action-buttons mt-3 pt-3 border-top">
                    <div class="d-flex gap-2">
                        <button class="btn btn-sm btn-outline-primary flex-fill"
                                onclick="window.workoutModeController.handleEditExercise('${this._escapeHtml(exerciseName)}', ${index}); event.stopPropagation();"
                                title="Modify exercise details">
                            <i class="bx bx-edit me-1"></i>Modify
                        </button>
                        <button class="btn btn-sm btn-outline-info flex-fill"
                                onclick="window.workoutModeController.handleReplaceExercise('${this._escapeHtml(exerciseName)}', ${index}); event.stopPropagation();"
                                title="Replace with alternative exercise">
                            <i class="bx bx-refresh me-1"></i>Replace
                        </button>
                        <button class="btn btn-sm btn-outline-warning flex-fill"
                                onclick="window.workoutModeController.handleSkipExercise('${this._escapeHtml(exerciseName)}', ${index}); event.stopPropagation();"
                                title="Skip this exercise">
                            <i class="bx bx-skip-next me-1"></i>Skip
                        </button>
                    </div>
                </div>
            `;
        }
        
        // ACTIVE SESSION: Show all action buttons in 2-line layout
        // Line 1: Completed button (full width)
        // Line 2: Modify and Skip buttons (side by side)
        return `
            <div class="card-action-buttons mt-3 pt-3 border-top">
                ${isSkipped ? `
                    <!-- Skipped state: Show Unskip button full width -->
                    <button class="btn btn-sm btn-warning w-100 mb-2"
                            onclick="window.workoutModeController.handleUnskipExercise('${this._escapeHtml(exerciseName)}', ${index}); event.stopPropagation();"
                            title="Resume this exercise">
                        <i class="bx bx-undo me-1"></i>Unskip
                    </button>
                    <div class="d-flex gap-2">
                        <button class="btn btn-sm btn-outline-primary flex-fill"
                                onclick="window.workoutModeController.handleEditExercise('${this._escapeHtml(exerciseName)}', ${index}); event.stopPropagation();"
                                title="Modify exercise details">
                            <i class="bx bx-edit me-1"></i>Modify
                        </button>
                    </div>
                ` : `
                    <!-- Line 1: Complete/Completed button (full width) -->
                    ${isCompleted ? `
                        <button class="btn btn-sm btn-success w-100 mb-2"
                                onclick="window.workoutModeController.handleUncompleteExercise('${this._escapeHtml(exerciseName)}', ${index}); event.stopPropagation();"
                                title="Mark as not completed">
                            <i class="bx bx-check-circle me-1"></i>Completed
                        </button>
                    ` : `
                        <button class="btn btn-sm btn-outline-success w-100 mb-2"
                                onclick="window.workoutModeController.handleCompleteExercise('${this._escapeHtml(exerciseName)}', ${index}); event.stopPropagation();"
                                title="Mark exercise as complete">
                            <i class="bx bx-check me-1"></i>Complete
                        </button>
                    `}
                    <!-- Line 2: Modify, Replace, and Skip buttons (side by side) -->
                    <div class="d-flex gap-2">
                        <button class="btn btn-sm btn-outline-primary flex-fill"
                                onclick="window.workoutModeController.handleEditExercise('${this._escapeHtml(exerciseName)}', ${index}); event.stopPropagation();"
                                title="Modify exercise details">
                            <i class="bx bx-edit me-1"></i>Modify
                        </button>
                        <button class="btn btn-sm btn-outline-info flex-fill"
                                onclick="window.workoutModeController.handleReplaceExercise('${this._escapeHtml(exerciseName)}', ${index}); event.stopPropagation();"
                                title="Skip this exercise and add a replacement">
                            <i class="bx bx-refresh me-1"></i>Replace
                        </button>
                        <button class="btn btn-sm btn-outline-warning flex-fill"
                                onclick="window.workoutModeController.handleSkipExercise('${this._escapeHtml(exerciseName)}', ${index}); event.stopPropagation();"
                                title="Skip this exercise">
                            <i class="bx bx-skip-next me-1"></i>Skip
                        </button>
                    </div>
                `}
            </div>
        `;
    }

    /**
     * Render weight history showing the 4 most recent weights
     * @private
     */
    _renderWeightHistory(exerciseName, lastWeight, lastWeightUnit, lastSessionDate, recentSessions) {
        if (!lastWeight || !lastSessionDate) {
            return '';
        }
        
        // Helper to format date consistently
        const formatDate = (dateStr) => {
            if (!dateStr) return '';
            const date = new Date(dateStr);
            return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        };
        
        // Show up to 4 most recent sessions
        const sessionsToShow = recentSessions ? recentSessions.slice(0, 4) : [];
        
        return `
            <div class="exercise-weight-history-container">
                <!-- Most recent session (always visible) -->
                <div class="exercise-weight-history-item">
                    <small class="exercise-weight-history">
                        Last: <strong>${lastWeight}${lastWeightUnit !== 'other' ? ` ${lastWeightUnit}` : ''}</strong> on ${formatDate(lastSessionDate)}
                    </small>
                </div>
                
                ${sessionsToShow.slice(1).map((session, index) => {
                    const isLast = index === sessionsToShow.length - 2;
                    const connector = isLast ? '└─' : '├─';
                    const weight = session.weight || '—';
                    const unit = session.weight_unit || 'lbs';
                    return `
                        <div class="weight-history-item visible-item">
                            <span class="weight-history-connector">${connector}</span>
                            <span class="weight-history-content">
                                <span class="weight-history-weight"><strong>${weight}${unit !== 'other' ? ` ${unit}` : ''}</strong></span>
                                <span class="weight-history-date">on ${formatDate(session.date)}</span>
                            </span>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    }
    
    /**
     * Get label for weight direction
     * @private
     */
    _getDirectionLabel(direction) {
        const labels = {
            'down': 'Decrease weight next session',
            'same': 'Keep same weight next session',
            'up': 'Increase weight next session'
        };
        return labels[direction] || '';
    }

    /**
     * Escape HTML to prevent XSS
     * @private
     */
    _escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Export globally
window.ExerciseCardRenderer = ExerciseCardRenderer;

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ExerciseCardRenderer;
}

console.log('📦 ExerciseCardRenderer component loaded');