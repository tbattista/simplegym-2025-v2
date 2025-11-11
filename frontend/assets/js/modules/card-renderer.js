/**
 * Card Renderer Module
 * Handles rendering of exercise group and bonus exercise cards
 * @version 1.0.0
 */

class CardRenderer {
    constructor() {
        // Initialize storage for card data
        this.exerciseGroupsData = {};
        this.bonusExercisesData = {};
        
        // Make data accessible globally for backward compatibility
        window.exerciseGroupsData = this.exerciseGroupsData;
        window.bonusExercisesData = this.bonusExercisesData;
        
        console.log('✅ CardRenderer initialized');
    }
    
    /**
     * Create exercise group card HTML
     * @param {string} groupId - Unique group ID
     * @param {object} groupData - Group data (optional)
     * @param {number} groupNumber - Group number for display
     * @returns {string} HTML string
     */
    createExerciseGroupCard(groupId, groupData = null, groupNumber = 1) {
        const data = groupData || {
            exercises: { a: '', b: '', c: '' },
            sets: '3',
            reps: '8-12',
            rest: '60s',
            default_weight: '',
            default_weight_unit: 'lbs'
        };
        
        // Store data
        this.exerciseGroupsData[groupId] = data;
        
        // Build exercise list (main, alt, alt2)
        const exercises = [];
        if (data.exercises.a) exercises.push(data.exercises.a);
        if (data.exercises.b) exercises.push(data.exercises.b);
        if (data.exercises.c) exercises.push(data.exercises.c);
        
        const hasData = data.exercises.a;
        
        // Build exercises HTML - each on new line
        let exercisesHtml = '';
        if (exercises.length > 0) {
            exercisesHtml = exercises.map((ex, idx) => {
                const label = idx === 0 ? '' : `<span class="text-muted">Alt${idx > 1 ? idx : ''}: </span>`;
                return `<div class="exercise-line">${label}${this.escapeHtml(ex)}</div>`;
            }).join('');
        } else {
            exercisesHtml = '<div class="exercise-line text-muted">Click edit to add exercises</div>';
        }
        
        // Build meta text (plain text, not badges)
        let metaText = '';
        if (hasData) {
            const parts = [`${data.sets} sets`, `${data.reps} reps`, `${data.rest} rest`];
            if (data.default_weight) {
                parts.push(`${data.default_weight} ${data.default_weight_unit}`);
            }
            metaText = parts.join(' • ');
        }
        
        return `
            <div class="exercise-group-card compact" data-group-id="${groupId}">
                <div class="card">
                    <div class="card-body">
                        <button type="button" class="btn btn-sm btn-icon btn-edit-compact"
                                onclick="event.preventDefault(); event.stopPropagation(); openExerciseGroupEditor('${groupId}');"
                                title="Edit exercise group">
                            <i class="bx bx-edit"></i>
                        </button>
                        <div class="exercise-content">
                            <div class="exercise-list">
                                ${exercisesHtml}
                            </div>
                            ${metaText ? `<div class="exercise-meta-text text-muted small">${metaText}</div>` : ''}
                        </div>
                        <div class="drag-handle" style="display: none;">
                            <i class="bx bx-menu"></i>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
    
    /**
     * Update exercise group card preview
     * @param {string} groupId - Group ID
     * @param {object} groupData - Group data
     */
    updateExerciseGroupCardPreview(groupId, groupData) {
        const card = document.querySelector(`[data-group-id="${groupId}"]`);
        if (!card) return;
        
        // Build exercise list (main, alt, alt2)
        const exercises = [];
        if (groupData.exercises.a) exercises.push(groupData.exercises.a);
        if (groupData.exercises.b) exercises.push(groupData.exercises.b);
        if (groupData.exercises.c) exercises.push(groupData.exercises.c);
        
        const hasData = groupData.exercises.a;
        
        // Build exercises HTML - each on new line
        let exercisesHtml = '';
        if (exercises.length > 0) {
            exercisesHtml = exercises.map((ex, idx) => {
                const label = idx === 0 ? '' : `<span class="text-muted">Alt${idx > 1 ? idx : ''}: </span>`;
                return `<div class="exercise-line">${label}${this.escapeHtml(ex)}</div>`;
            }).join('');
        } else {
            exercisesHtml = '<div class="exercise-line text-muted">Click edit to add exercises</div>';
        }
        
        // Build meta text (plain text, not badges)
        let metaText = '';
        if (hasData) {
            const parts = [`${groupData.sets} sets`, `${groupData.reps} reps`, `${groupData.rest} rest`];
            if (groupData.default_weight) {
                parts.push(`${groupData.default_weight} ${groupData.default_weight_unit}`);
            }
            metaText = parts.join(' • ');
        }
        
        // Update exercise list
        const exerciseList = card.querySelector('.exercise-list');
        if (exerciseList) {
            exerciseList.innerHTML = exercisesHtml;
        }
        
        // Update meta text
        const metaTextEl = card.querySelector('.exercise-meta-text');
        if (metaTextEl) {
            if (metaText) {
                metaTextEl.textContent = metaText;
                metaTextEl.style.display = 'block';
            } else {
                metaTextEl.textContent = '';
                metaTextEl.style.display = 'none';
            }
        }
    }
    
    /**
     * Get exercise group data from storage
     * @param {string} groupId - Group ID
     * @returns {object} Group data
     */
    getExerciseGroupData(groupId) {
        return this.exerciseGroupsData[groupId] || {
            exercises: { a: '', b: '', c: '' },
            sets: '3',
            reps: '8-12',
            rest: '60s',
            default_weight: '',
            default_weight_unit: 'lbs'
        };
    }
    
    /**
     * Delete exercise group card
     * @param {string} groupId - Group ID to delete
     */
    deleteExerciseGroupCard(groupId) {
        const card = document.querySelector(`[data-group-id="${groupId}"]`);
        if (!card) return;
        
        const groupData = this.exerciseGroupsData[groupId];
        const exerciseName = groupData?.exercises?.a || 'this exercise group';
        
        if (confirm(`Are you sure you want to delete "${exerciseName}"?\n\nThis action cannot be undone.`)) {
            // Remove from DOM
            card.remove();
            
            // Remove from data storage
            delete this.exerciseGroupsData[groupId];
            
            // Mark as dirty
            if (window.markEditorDirty) {
                window.markEditorDirty();
            }
            
            console.log('✅ Exercise group deleted:', groupId);
        }
    }
    
    /**
     * Create bonus exercise card HTML
     * @param {string} bonusId - Unique bonus ID
     * @param {object} bonusData - Bonus data (optional)
     * @param {number} bonusNumber - Bonus number for display
     * @returns {string} HTML string
     */
    createBonusExerciseCard(bonusId, bonusData = null, bonusNumber = 1) {
        const data = bonusData || {
            name: '',
            sets: '2',
            reps: '15',
            rest: '30s'
        };
        
        // Store data
        this.bonusExercisesData[bonusId] = data;
        
        const exerciseName = data.name || `New Bonus Exercise ${bonusNumber}`;
        const hasData = data.name;
        
        // Build meta text (plain text, not badges)
        let metaText = '';
        if (hasData) {
            metaText = `${data.sets} sets • ${data.reps} reps • ${data.rest} rest`;
        } else {
            metaText = 'Click edit to add exercise';
        }
        
        return `
            <div class="bonus-exercise-card compact" data-bonus-id="${bonusId}">
                <div class="card">
                    <div class="card-body">
                        <button type="button" class="btn btn-sm btn-icon btn-edit-compact"
                                onclick="event.preventDefault(); event.stopPropagation(); openBonusExerciseEditor('${bonusId}');"
                                title="Edit bonus exercise">
                            <i class="bx bx-edit"></i>
                        </button>
                        <div class="exercise-content">
                            <div class="exercise-line">${this.escapeHtml(exerciseName)}</div>
                            <div class="exercise-meta-text text-muted small">${metaText}</div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
    
    /**
     * Update bonus exercise card preview
     * @param {string} bonusId - Bonus ID
     * @param {object} bonusData - Bonus data
     */
    updateBonusExerciseCardPreview(bonusId, bonusData) {
        const card = document.querySelector(`[data-bonus-id="${bonusId}"]`);
        if (!card) return;
        
        const exerciseName = bonusData.name || 'New Bonus Exercise';
        const hasData = bonusData.name;
        
        // Build meta text (plain text, not badges)
        let metaText = '';
        if (hasData) {
            metaText = `${bonusData.sets} sets • ${bonusData.reps} reps • ${bonusData.rest} rest`;
        } else {
            metaText = 'Click edit to add exercise';
        }
        
        // Update exercise name
        const exerciseLine = card.querySelector('.exercise-line');
        if (exerciseLine) {
            exerciseLine.textContent = exerciseName;
        }
        
        // Update meta text
        const metaTextEl = card.querySelector('.exercise-meta-text');
        if (metaTextEl) {
            metaTextEl.textContent = metaText;
        }
    }
    
    /**
     * Delete bonus exercise card
     * @param {string} bonusId - Bonus ID to delete
     */
    deleteBonusExerciseCard(bonusId) {
        const card = document.querySelector(`[data-bonus-id="${bonusId}"]`);
        if (!card) return;
        
        const bonusData = this.bonusExercisesData[bonusId];
        const exerciseName = bonusData?.name || 'this bonus exercise';
        
        if (confirm(`Are you sure you want to delete "${exerciseName}"?\n\nThis action cannot be undone.`)) {
            // Remove from DOM
            card.remove();
            
            // Remove from data storage
            delete this.bonusExercisesData[bonusId];
            
            // Mark as dirty
            if (window.markEditorDirty) {
                window.markEditorDirty();
            }
            
            console.log('✅ Bonus exercise deleted:', bonusId);
        }
    }
    
    /**
     * Escape HTML to prevent XSS
     * @param {string} text - Text to escape
     * @returns {string} Escaped text
     */
    escapeHtml(text) {
        // Use global escapeHtml if available (from common-utils.js)
        if (typeof window.escapeHtml === 'function') {
            return window.escapeHtml(text);
        }
        
        // Fallback implementation
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize global instance
window.cardRenderer = new CardRenderer();

// Export wrapper functions for backward compatibility
window.createExerciseGroupCard = (groupId, groupData, groupNumber) => 
    window.cardRenderer.createExerciseGroupCard(groupId, groupData, groupNumber);

window.updateExerciseGroupCardPreview = (groupId, groupData) => 
    window.cardRenderer.updateExerciseGroupCardPreview(groupId, groupData);

window.getExerciseGroupData = (groupId) => 
    window.cardRenderer.getExerciseGroupData(groupId);

window.deleteExerciseGroupCard = (groupId) => 
    window.cardRenderer.deleteExerciseGroupCard(groupId);

window.createBonusExerciseCard = (bonusId, bonusData, bonusNumber) => 
    window.cardRenderer.createBonusExerciseCard(bonusId, bonusData, bonusNumber);

window.updateBonusExerciseCardPreview = (bonusId, bonusData) => 
    window.cardRenderer.updateBonusExerciseCardPreview(bonusId, bonusData);

window.deleteBonusExerciseCard = (bonusId) => 
    window.cardRenderer.deleteBonusExerciseCard(bonusId);

console.log('📦 Card Renderer module loaded');