/**
 * Ghost Gym - Workout Editor Listeners
 * Event bindings and DOM initialization for workout builder
 * Extracted from workout-editor.js
 * @version 1.0.0
 */

/**
 * Setup event listeners for editor
 */
function setupWorkoutEditorListeners() {
    // Form field change listeners
    const formFields = ['workoutName', 'workoutDescription', 'workoutTags'];
    formFields.forEach(fieldId => {
        const field = document.getElementById(fieldId);
        if (field) {
            field.addEventListener('input', window.markEditorDirty);
        }
    });

    // Save button with diagnostic logging
    const saveBtn = document.getElementById('saveWorkoutBtn');
    if (saveBtn) {
        console.log('✅ Save button found, attaching click listener');
        saveBtn.addEventListener('click', () => {
            console.log('🖱️ Save button clicked!');
            console.log('📊 Current workout state:', window.ffn?.workoutBuilder);
            window.saveWorkoutFromEditor();
        });
    } else {
        console.error('❌ Save button (#saveWorkoutBtn) not found in DOM!');
    }

    // Cancel button
    const cancelBtn = document.getElementById('cancelEditBtn');
    if (cancelBtn) {
        cancelBtn.addEventListener('click', (e) => {
            e.preventDefault();
            window.cancelEditWorkout();
        });
    }

    // Delete button
    const deleteBtn = document.getElementById('deleteWorkoutBtn');
    if (deleteBtn) {
        deleteBtn.addEventListener('click', (e) => {
            e.preventDefault();
            window.deleteWorkoutFromEditor();
        });
    }

    // New workout button
    const newBtn = document.getElementById('workoutsViewNewBtn');
    if (newBtn) {
        newBtn.addEventListener('click', window.createNewWorkoutInEditor);
    }

    // Add Exercise Group button (visible inline button only)
    const addGroupBtnVisible = document.getElementById('addExerciseGroupBtnVisible');

    if (addGroupBtnVisible) {
        addGroupBtnVisible.addEventListener('click', () => {
            console.log('🖱️ Add Exercise Group button clicked');
            if (window.addExerciseGroup) {
                window.addExerciseGroup();
                window.markEditorDirty();
            }
        });
    }

    // NEW: Save Exercise Group from Offcanvas button
    const saveExerciseGroupBtn = document.getElementById('saveExerciseGroupBtn');
    if (saveExerciseGroupBtn) {
        saveExerciseGroupBtn.addEventListener('click', () => {
            if (window.saveExerciseGroupFromOffcanvas) {
                window.saveExerciseGroupFromOffcanvas();
            }
        });
    }

    // NEW: Delete Exercise Group from Offcanvas button
    const deleteExerciseGroupBtn = document.getElementById('deleteExerciseGroupBtn');
    if (deleteExerciseGroupBtn) {
        deleteExerciseGroupBtn.addEventListener('click', () => {
            const groupId = window.currentEditingGroupId;
            if (groupId && window.deleteExerciseGroupCard) {
                // Close offcanvas first
                const offcanvas = bootstrap.Offcanvas.getInstance(document.getElementById('exerciseGroupEditOffcanvas'));
                if (offcanvas) offcanvas.hide();

                // Delete after a short delay to allow offcanvas to close
                setTimeout(() => {
                    window.deleteExerciseGroupCard(groupId);
                }, 300);
            }
        });
    }

    // NEW: Weight unit button listeners in offcanvas
    const setupOffcanvasWeightButtons = () => {
        document.querySelectorAll('#exerciseGroupEditOffcanvas .weight-unit-btn').forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.preventDefault();
                const container = this.closest('.btn-group');
                container.querySelectorAll('.weight-unit-btn').forEach(b => {
                    b.classList.remove('active', 'btn-secondary');
                    b.classList.add('btn-outline-secondary');
                });
                this.classList.add('active', 'btn-secondary');
                this.classList.remove('btn-outline-secondary');
            });
        });
    };
    setupOffcanvasWeightButtons();

    // NEW: More Menu - Cancel Workout Item
    const cancelWorkoutMenuItem = document.getElementById('cancelWorkoutMenuItem');
    if (cancelWorkoutMenuItem) {
        cancelWorkoutMenuItem.addEventListener('click', () => {
            console.log('❌ Cancel workout menu item clicked');

            // Close more menu offcanvas first
            const moreMenuOffcanvas = document.getElementById('moreMenuOffcanvas');
            if (moreMenuOffcanvas) {
                const offcanvasInstance = bootstrap.Offcanvas.getInstance(moreMenuOffcanvas);
                if (offcanvasInstance) {
                    offcanvasInstance.hide();
                }
            }

            // Trigger cancel after offcanvas closes (300ms animation)
            setTimeout(() => {
                if (window.cancelEditWorkout) {
                    window.cancelEditWorkout();
                } else {
                    console.error('❌ cancelEditWorkout function not found');
                }
            }, 300);
        });
        console.log('✅ Cancel workout menu item listener attached');
    } else {
        console.warn('⚠️ Cancel workout menu item not found in DOM');
    }

    // NEW: More Menu - Share Workout Item
    const shareWorkoutMenuItem = document.getElementById('shareWorkoutMenuItem');
    if (shareWorkoutMenuItem) {
        shareWorkoutMenuItem.addEventListener('click', () => {
            console.log('🔗 Share workout menu item clicked');

            // Close more menu offcanvas first
            const moreMenuOffcanvas = document.getElementById('moreMenuOffcanvas');
            if (moreMenuOffcanvas) {
                const offcanvasInstance = bootstrap.Offcanvas.getInstance(moreMenuOffcanvas);
                if (offcanvasInstance) {
                    offcanvasInstance.hide();
                }
            }

            // Get current workout ID
            const workoutId = window.ffn?.workoutBuilder?.selectedWorkoutId ||
                            window.ffn?.workoutBuilder?.currentWorkout?.id;

            if (workoutId) {
                // Open share offcanvas after more menu closes (300ms animation)
                setTimeout(() => {
                    if (window.shareModal && window.shareModal.open) {
                        window.shareModal.open(workoutId);
                    } else {
                        console.error('❌ shareModal.open function not found');
                        alert('Share feature is loading. Please try again in a moment.');
                    }
                }, 300);
            } else {
                console.warn('⚠️ No workout ID available for sharing');
                alert('Please save the workout first before sharing');
            }
        });
        console.log('✅ Share workout menu item listener attached');
    } else {
        console.warn('⚠️ Share workout menu item not found in DOM');
    }

    // NEW: Share Menu - Public Share Item
    const publicShareMenuItem = document.getElementById('publicShareMenuItem');
    if (publicShareMenuItem) {
        publicShareMenuItem.addEventListener('click', () => {
            console.log('🌐 Public share menu item clicked');

            // Close share menu offcanvas first
            const shareMenuOffcanvas = document.getElementById('shareMenuOffcanvas');
            if (shareMenuOffcanvas) {
                const offcanvasInstance = bootstrap.Offcanvas.getInstance(shareMenuOffcanvas);
                if (offcanvasInstance) {
                    offcanvasInstance.hide();
                }
            }

            // Trigger public share after offcanvas closes (300ms animation)
            setTimeout(() => {
                if (window.shareModal && window.shareModal.handlePublicShare) {
                    // Get current workout ID
                    const workoutId = window.ffn?.workoutBuilder?.selectedWorkoutId ||
                                    window.ffn?.workoutBuilder?.currentWorkout?.id;

                    if (workoutId) {
                        // Set current workout in share modal and open modal dialog
                        window.shareModal.currentWorkoutId = workoutId;
                        const workouts = window.ffn?.workouts || [];
                        window.shareModal.currentWorkout = workouts.find(w => w.id === workoutId);
                        window.shareModal.openModal(workoutId);
                    } else {
                        console.error('❌ No workout ID available for public share');
                        alert('Please save the workout first before sharing');
                    }
                } else {
                    console.error('❌ shareModal.handlePublicShare function not found');
                }
            }, 300);
        });
        console.log('✅ Public share menu item listener attached');
    } else {
        console.warn('⚠️ Public share menu item not found in DOM');
    }

    // NEW: Share Menu - Private Share Item
    const privateShareMenuItem = document.getElementById('privateShareMenuItem');
    if (privateShareMenuItem) {
        privateShareMenuItem.addEventListener('click', () => {
            console.log('🔗 Private share menu item clicked');

            // Close share menu offcanvas first
            const shareMenuOffcanvas = document.getElementById('shareMenuOffcanvas');
            if (shareMenuOffcanvas) {
                const offcanvasInstance = bootstrap.Offcanvas.getInstance(shareMenuOffcanvas);
                if (offcanvasInstance) {
                    offcanvasInstance.hide();
                }
            }

            // Trigger private share after offcanvas closes (300ms animation)
            setTimeout(() => {
                if (window.shareModal && window.shareModal.handlePrivateShare) {
                    // Get current workout ID
                    const workoutId = window.ffn?.workoutBuilder?.selectedWorkoutId ||
                                    window.ffn?.workoutBuilder?.currentWorkout?.id;

                    if (workoutId) {
                        // Set current workout in share modal and open modal dialog
                        window.shareModal.currentWorkoutId = workoutId;
                        const workouts = window.ffn?.workouts || [];
                        window.shareModal.currentWorkout = workouts.find(w => w.id === workoutId);
                        window.shareModal.openModal(workoutId);
                    } else {
                        console.error('❌ No workout ID available for private share');
                        alert('Please save the workout first before sharing');
                    }
                } else {
                    console.error('❌ shareModal.handlePrivateShare function not found');
                }
            }, 300);
        });
        console.log('✅ Private share menu item listener attached');
    } else {
        console.warn('⚠️ Private share menu item not found in DOM');
    }

    // NEW: More Menu - Delete Workout Item
    const deleteWorkoutMenuItem = document.getElementById('deleteWorkoutMenuItem');
    if (deleteWorkoutMenuItem) {
        deleteWorkoutMenuItem.addEventListener('click', () => {
            console.log('🗑️ Delete workout menu item clicked');

            // Close the more menu offcanvas first
            const moreMenuOffcanvas = document.getElementById('moreMenuOffcanvas');
            if (moreMenuOffcanvas) {
                const offcanvasInstance = bootstrap.Offcanvas.getInstance(moreMenuOffcanvas);
                if (offcanvasInstance) {
                    offcanvasInstance.hide();
                }
            }

            // Trigger delete after offcanvas closes (300ms animation)
            setTimeout(() => {
                if (window.deleteWorkoutFromEditor) {
                    window.deleteWorkoutFromEditor();
                } else {
                    console.error('❌ deleteWorkoutFromEditor function not found');
                }
            }, 300);
        });
        console.log('✅ Delete workout menu item listener attached');
    } else {
        console.warn('⚠️ Delete workout menu item not found in DOM');
    }

    // Import Workout Buttons - Opens import wizard offcanvas
    // Uses class-based selector to catch all import buttons across both views
    document.querySelectorAll('.import-workout-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            console.log('📥 Import workout button clicked');
            if (window.UnifiedOffcanvasFactory?.createImportWizard) {
                window.UnifiedOffcanvasFactory.createImportWizard();
            } else {
                console.error('❌ Import wizard not available');
            }
        });
    });
    console.log('✅ Import workout button listeners attached');

    // Reorder Exercises Button - Opens reorder offcanvas
    const reorderBtn = document.getElementById('reorderExercisesBtn');
    if (reorderBtn) {
        reorderBtn.addEventListener('click', () => {
            console.log('📋 Reorder button clicked');
            window.openReorderOffcanvas();
        });
        console.log('✅ Reorder button listener attached');
    }

    // Warn on navigation if dirty, and clean up localStorage on intentional navigation
    window.addEventListener('beforeunload', (e) => {
        if (window.ffn.workoutBuilder.isDirty) {
            e.preventDefault();
            e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
        }
    });

    // Clear localStorage when navigating away from workout builder (but not on refresh)
    // This uses pagehide which fires on actual navigation but not on refresh
    let isRefreshing = false;
    window.addEventListener('beforeunload', () => {
        // Check if this is a refresh (F5, Ctrl+R, etc.) vs navigation
        // Performance navigation type 1 = reload
        isRefreshing = true;
    });

    window.addEventListener('pagehide', () => {
        // Only clear if we're not on the workout builder page anymore
        // and it's not a refresh
        if (!isRefreshing && !window.location.pathname.includes('workout-builder')) {
            try {
                localStorage.removeItem('currentEditingWorkoutId');
                console.log('🗑️ Cleared workout ID from localStorage (navigated away)');
            } catch (error) {
                console.warn('⚠️ Could not clear localStorage:', error);
            }
        }
    });

    // ── Mobile floating FABs (Save + Go) ──

    const mobileSaveFab = document.getElementById('mobileSaveFab');
    if (mobileSaveFab) {
        mobileSaveFab.addEventListener('click', () => {
            const saveBtn = document.getElementById('saveWorkoutBtn');
            if (saveBtn) saveBtn.click();
        });
    }

    function handleStartWorkout() {
        const workoutId = window.ffn?.workoutBuilder?.selectedWorkoutId ||
                        window.ffn?.workoutBuilder?.currentWorkout?.id;
        if (workoutId) {
            window.location.href = `workout-mode.html?id=${workoutId}`;
        } else {
            alert('Please save the workout first before starting workout mode');
        }
    }

    const mobileGoFab = document.getElementById('mobileGoFab');
    if (mobileGoFab) {
        mobileGoFab.addEventListener('click', handleStartWorkout);
    }

    const desktopStartBtn = document.getElementById('desktopStartWorkoutBtn');
    if (desktopStartBtn) {
        desktopStartBtn.addEventListener('click', handleStartWorkout);
    }

    // ── Mobile More Options button ──

    const mobileMoreBtn = document.getElementById('mobileMoreOptionsBtn');
    if (mobileMoreBtn) {
        mobileMoreBtn.addEventListener('click', () => {
            if (!window.UnifiedOffcanvasFactory) return;
            window.UnifiedOffcanvasFactory.createMenuOffcanvas({
                id: 'moreMenuOffcanvas',
                title: 'More Options',
                icon: 'bx-dots-vertical-rounded',
                menuItems: [
                    {
                        icon: 'bx-plus-circle',
                        title: 'New Workout',
                        description: 'Start editing a new workout template',
                        onClick: () => {
                            try { localStorage.removeItem('currentEditingWorkoutId'); } catch (e) {}
                            if (window.createNewWorkoutInEditor) window.createNewWorkoutInEditor();
                        }
                    },
                    {
                        icon: 'bx-x',
                        title: 'Cancel Edit',
                        description: 'Discard changes and exit',
                        onClick: () => { window.location.href = 'workout-database.html'; }
                    },
                    {
                        icon: 'bx-share-alt',
                        title: 'Share Workout',
                        description: 'Share publicly or create private link',
                        onClick: () => {
                            const wid = window.ffn?.workoutBuilder?.selectedWorkoutId ||
                                       window.ffn?.workoutBuilder?.currentWorkout?.id;
                            if (wid && window.shareModal) {
                                window.shareModal.open(wid);
                            } else if (!wid) {
                                alert('Please save the workout first before sharing');
                            }
                        }
                    },
                    {
                        icon: 'bx-trash',
                        title: 'Delete Workout',
                        description: 'This action cannot be undone',
                        variant: 'danger',
                        onClick: () => {
                            const deleteBtn = document.getElementById('deleteWorkoutBtn');
                            if (deleteBtn) deleteBtn.click();
                        }
                    }
                ]
            });
        });
    }

    // ── Show/hide builder FABs based on editor form visibility ──

    const builderFabs = document.getElementById('builderFloatingFabs');
    const editorForm = document.getElementById('workoutEditorForm');
    if (builderFabs && editorForm) {
        const observer = new MutationObserver(() => {
            builderFabs.style.display = editorForm.style.display === 'none' ? 'none' : 'flex';
        });
        observer.observe(editorForm, { attributes: true, attributeFilter: ['style'] });
    }

    console.log('✅ Workout editor listeners setup');
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupWorkoutEditorListeners);
} else {
    setupWorkoutEditorListeners();
}

console.log('📦 Workout Editor Listeners loaded');
