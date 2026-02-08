/**
 * Bonus Exercise Manager Module
 * Handles bonus exercise CRUD, numbering, and previews
 * Extracted from workouts.js
 */

const BonusExerciseManager = {

    /**
     * Add bonus exercise to workout form (card-based layout)
     */
    add() {
        const container = document.getElementById('bonusExercises');
        if (!container) return;

        const bonusCount = container.children.length + 1;
        const bonusId = `bonus-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        const bonusHtml = createBonusExerciseCard(bonusId, null, bonusCount);
        container.insertAdjacentHTML('beforeend', bonusHtml);

        // Auto-open editor for new bonus exercise
        setTimeout(() => {
            openBonusExerciseEditor(bonusId);
        }, 100);

        if (window.markEditorDirty) window.markEditorDirty();

        console.log('✅ Added new bonus exercise card:', bonusId);
    },

    /**
     * Remove bonus exercise
     */
    remove(button) {
        const bonus = button.closest('.bonus-exercise');
        if (bonus) {
            bonus.remove();
            BonusExerciseManager.renumber();
            if (window.markEditorDirty) window.markEditorDirty();
        }
    },

    /**
     * Renumber bonus exercises after removal or reordering
     */
    renumber() {
        const bonuses = document.querySelectorAll('#bonusExercises .bonus-exercise');
        bonuses.forEach((bonus, index) => {
            const title = bonus.querySelector('.bonus-title');
            if (title) {
                title.textContent = `Additional Exercise ${index + 1}`;
            }
        });
    },

    /**
     * Update bonus exercise preview in header
     */
    updatePreview(bonusElement) {
        if (!bonusElement) return;

        const nameInput = bonusElement.querySelector('.bonus-name-input');
        const setsInput = bonusElement.querySelector('.bonus-sets-input');
        const repsInput = bonusElement.querySelector('.bonus-reps-input');
        const restInput = bonusElement.querySelector('.bonus-rest-input');
        const preview = bonusElement.querySelector('.bonus-preview');
        const title = bonusElement.querySelector('.bonus-title');

        if (!preview || !title) return;

        const name = nameInput?.value?.trim() || '';
        const sets = setsInput?.value || '2';
        const reps = repsInput?.value || '15';
        const rest = restInput?.value || '30s';

        if (name) {
            title.textContent = name;
            preview.textContent = `${sets}×${reps} • Rest: ${rest}`;
            preview.style.display = 'block';
        } else {
            const bonusNumber = Array.from(bonusElement.parentElement.children).indexOf(bonusElement) + 1;
            title.textContent = `Additional Exercise ${bonusNumber}`;
            preview.textContent = '';
            preview.style.display = 'none';
        }
    }
};

// Expose module
window.BonusExerciseManager = BonusExerciseManager;

// Backward-compat globals
window.addBonusExercise = BonusExerciseManager.add;
window.removeBonusExercise = BonusExerciseManager.remove;
window.renumberBonusExercises = BonusExerciseManager.renumber;
window.updateBonusExercisePreview = BonusExerciseManager.updatePreview;

console.log('📦 BonusExerciseManager module loaded');
