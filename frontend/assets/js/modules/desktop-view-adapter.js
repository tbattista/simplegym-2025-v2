/**
 * Desktop View Adapter Module
 * Detects desktop view and overrides rendering/interaction functions
 * to route through the desktop card renderer instead of mobile.
 * Must load AFTER card-renderer.js and desktop-card-renderer.js
 * but BEFORE exercise-group-manager.js and workout-editor.js.
 * @version 1.0.0
 */

(function() {
    'use strict';

    const isDesktop = document.documentElement.classList.contains('desktop-view');

    if (!isDesktop) {
        console.log('📱 Mobile view detected — desktop adapter not activated');
        return;
    }

    console.log('🖥️ Desktop view adapter activating...');

    // =========================================
    // Override card rendering functions
    // =========================================

    // Save original mobile renderers
    const _mobileCreateCard = window.createExerciseGroupCard;
    const _mobileUpdatePreview = window.updateExerciseGroupCardPreview;

    /**
     * Override createExerciseGroupCard to use desktop row renderer.
     * Routes to the correct card type based on group_type.
     */
    window.createExerciseGroupCard = function(groupId, groupData, groupNumber, index, totalCards) {
        if (window.desktopCardRenderer) {
            if (groupData && groupData.group_type === 'cardio') {
                return window.desktopCardRenderer.createCardioRow(groupId, groupData);
            }
            if (groupData && groupData.group_type === 'note') {
                return window.desktopCardRenderer.createNoteRow(groupId, groupData);
            }
            return window.desktopCardRenderer.createExerciseGroupRow(groupId, groupData, groupNumber, index, totalCards);
        }
        return _mobileCreateCard(groupId, groupData, groupNumber, index, totalCards);
    };

    /**
     * Override updateExerciseGroupCardPreview to use desktop row updater
     */
    window.updateExerciseGroupCardPreview = function(groupId, groupData) {
        if (window.desktopCardRenderer) {
            window.desktopCardRenderer.updateExerciseGroupRowPreview(groupId, groupData);
            return;
        }
        _mobileUpdatePreview(groupId, groupData);
    };

    // =========================================
    // Suppress auto-open offcanvas on Add Exercise Group
    // Desktop uses inline editing, so auto-open is unnecessary.
    // Explicit "Full Edit" from dropdown menu still works.
    // =========================================

    let _suppressNextEditorOpen = false;

    /**
     * Override addExerciseGroup and openExerciseGroupEditor.
     * Called from initDesktopView() after all scripts have loaded.
     */
    function overrideEditorAutoOpen() {
        // Wrap openExerciseGroupEditor to check suppress flag
        const _origOpen = window.openExerciseGroupEditor;
        if (_origOpen) {
            window.openExerciseGroupEditor = function(groupId) {
                if (_suppressNextEditorOpen) {
                    _suppressNextEditorOpen = false;
                    console.log('🖥️ Desktop: Skipped auto-open editor (use inline editing)');
                    return;
                }
                _origOpen(groupId);
            };
        }

        // Wrap addExerciseGroup to set suppress flag before add
        const _origAdd = window.addExerciseGroup;
        if (_origAdd) {
            window.addExerciseGroup = function() {
                _suppressNextEditorOpen = true;
                _origAdd();
            };
        }

        // Also wrap ExerciseGroupManager.add
        if (window.ExerciseGroupManager && window.ExerciseGroupManager.add) {
            const _origManagerAdd = window.ExerciseGroupManager.add.bind(window.ExerciseGroupManager);
            window.ExerciseGroupManager.add = function() {
                _suppressNextEditorOpen = true;
                _origManagerAdd();
            };
        }
    }

    // =========================================
    // Initialize desktop components after DOM ready
    // =========================================

    function initDesktopView() {
        console.log('🖥️ Initializing desktop view components...');

        // Override add/open to suppress auto-open offcanvas on desktop
        overrideEditorAutoOpen();

        // Initialize inline editing on exercise groups container
        const exerciseGroupsContainer = document.getElementById('exerciseGroups');
        if (exerciseGroupsContainer && window.desktopCardRenderer) {
            window.desktopCardRenderer.initInlineEditing(exerciseGroupsContainer);
        }

        // Initialize Sortable.js on desktop exercise container (reorder only)
        initDesktopSorting(exerciseGroupsContainer);

        // Setup native drop zone for sidebar → editor drag
        setupEditorDropZone(exerciseGroupsContainer);

        // Initialize block header click listeners (delegated)
        if (window.ExerciseGroupManager?.initBlockHeaderListeners) {
            window.ExerciseGroupManager.initBlockHeaderListeners();
        }

        // Wire desktop toolbar buttons
        wireDesktopToolbar();

        // Initialize sidebar (always visible on desktop)
        if (window.desktopSidebar && window.desktopSidebar.init) {
            window.desktopSidebar.init();
        }

        // Wire inline tags/description fields
        wireDesktopMetadataFields();

        // Wire note full-edit offcanvas
        window.openNoteEditor = function(groupId) {
            const groupData = window.exerciseGroupsData[groupId];
            if (!groupData) return;

            if (window.UnifiedOffcanvasFactory?.createTemplateNoteEditor) {
                window.UnifiedOffcanvasFactory.createTemplateNoteEditor({
                    note: { id: groupId, content: groupData.note_content || '' },
                    onSave: function(content) {
                        groupData.note_content = content;
                        if (window.desktopCardRenderer) {
                            window.desktopCardRenderer.updateNoteRowPreview(groupId, content);
                        }
                        if (window.markEditorDirty) window.markEditorDirty();
                    },
                    onDelete: function() {
                        if (window.deleteExerciseGroupCard) {
                            window.deleteExerciseGroupCard(groupId);
                        }
                    }
                });
            }
        };

        // Wire cardio full-edit offcanvas
        window.openCardioEditor = function(groupId) {
            const groupData = window.exerciseGroupsData[groupId];
            if (!groupData) return;

            if (window.UnifiedOffcanvasFactory && window.UnifiedOffcanvasFactory.createCardioEditor) {
                window.UnifiedOffcanvasFactory.createCardioEditor({
                    groupId: groupId,
                    cardioConfig: groupData.cardio_config || {},
                    onSave: function(updatedConfig) {
                        groupData.cardio_config = updatedConfig;
                        // Sync activity_type to exercises.a for form-data-collector
                        if (updatedConfig.activity_type) {
                            groupData.exercises = groupData.exercises || {};
                            groupData.exercises.a = updatedConfig.activity_type;
                        }
                        // Update row preview
                        if (window.desktopCardRenderer) {
                            window.desktopCardRenderer.updateCardioRowPreview(groupId, groupData);
                        }
                        if (window.markEditorDirty) window.markEditorDirty();
                    },
                    onDelete: function() {
                        if (window.deleteExerciseGroupCard) {
                            window.deleteExerciseGroupCard(groupId);
                        }
                    }
                });
            }
        };

        console.log('✅ Desktop view initialization complete');
    }

    /**
     * Initialize Sortable.js drag-and-drop on desktop
     */
    function initDesktopSorting(container) {
        if (!container || !window.Sortable) return;
        if (container.sortableInstance) return; // Prevent duplicate

        container.sortableInstance = new Sortable(container, {
            animation: 150,
            handle: '.drag-handle',
            ghostClass: 'sortable-ghost',
            dragClass: 'sortable-drag',
            chosenClass: 'sortable-chosen',
            filter: '.desktop-exercise-header, .block-group-header',
            onStart: function() {
                container.classList.add('is-dragging');
            },
            onEnd: function(evt) {
                container.classList.remove('is-dragging');

                // Update block membership based on new position (exercise cards only)
                const movedCard = evt.item;
                if (movedCard.dataset.cardType === 'note') {
                    // Note card moved — just mark dirty, skip block logic
                    if (window.markEditorDirty) window.markEditorDirty();
                    return;
                }
                const movedData = window.exerciseGroupsData[movedCard.dataset.groupId];
                if (movedData) {
                    let prevCard = movedCard.previousElementSibling;
                    while (prevCard && !prevCard.classList.contains('exercise-group-card')) {
                        prevCard = prevCard.previousElementSibling;
                    }
                    let nextCard = movedCard.nextElementSibling;
                    while (nextCard && !nextCard.classList.contains('exercise-group-card')) {
                        nextCard = nextCard.nextElementSibling;
                    }

                    const prevBlockId = prevCard ? window.exerciseGroupsData[prevCard.dataset.groupId]?.block_id : null;
                    const nextBlockId = nextCard ? window.exerciseGroupsData[nextCard.dataset.groupId]?.block_id : null;

                    // Between two cards of the same block → join
                    if (prevBlockId && prevBlockId === nextBlockId && movedData.block_id !== prevBlockId) {
                        movedData.block_id = prevBlockId;
                        movedData.group_name = window.exerciseGroupsData[prevCard.dataset.groupId]?.group_name;
                    }
                    // Adjacent to a block on one side (other side empty/different) → join
                    else if (prevBlockId && !nextBlockId && movedData.block_id !== prevBlockId) {
                        movedData.block_id = prevBlockId;
                        movedData.group_name = window.exerciseGroupsData[prevCard.dataset.groupId]?.group_name;
                    }
                    else if (!prevBlockId && nextBlockId && movedData.block_id !== nextBlockId) {
                        movedData.block_id = nextBlockId;
                        movedData.group_name = window.exerciseGroupsData[nextCard.dataset.groupId]?.group_name;
                    }
                    // Block member now isolated from its block → leave
                    else if (movedData.block_id && prevBlockId !== movedData.block_id && nextBlockId !== movedData.block_id) {
                        movedData.block_id = null;
                        movedData.group_name = null;
                    }
                }

                if (window.applyBlockGrouping) window.applyBlockGrouping();
                if (window.markEditorDirty) window.markEditorDirty();
            }
        });
    }

    /**
     * Setup native HTML5 drop zone on the editor for sidebar exercises.
     * Sidebar cards have draggable="true" and set text/exercise-name in dataTransfer.
     */
    function setupEditorDropZone(container) {
        if (!container) return;

        container.addEventListener('dragover', function(e) {
            // Only accept exercises from sidebar (has exercise-name data)
            if (!e.dataTransfer.types.includes('text/exercise-name')) return;

            e.preventDefault();
            e.dataTransfer.dropEffect = 'copy';
            container.classList.add('sidebar-drop-target');
        });

        container.addEventListener('dragleave', function(e) {
            // Only clear if actually leaving the container
            if (!container.contains(e.relatedTarget)) {
                container.classList.remove('sidebar-drop-target');
            }
        });

        container.addEventListener('drop', function(e) {
            e.preventDefault();
            container.classList.remove('sidebar-drop-target');

            var exerciseName = e.dataTransfer.getData('text/exercise-name');
            if (!exerciseName) return;

            // Create proper exercise group
            var groupId = 'group-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
            var groupData = {
                exercises: { a: exerciseName, b: '', c: '' },
                sets: '3',
                reps: '8-12',
                rest: '60s',
                default_weight: '',
                default_weight_unit: 'lbs'
            };
            window.exerciseGroupsData[groupId] = groupData;

            var existingCards = container.querySelectorAll('.exercise-group-card');
            var index = existingCards.length;
            var cardHtml = window.createExerciseGroupCard(groupId, groupData, index + 1, index, index + 1);

            // Wrap card in a standard section so collectSections() can find it
            var sectionId = 'section-' + Date.now() + '-' + Math.random().toString(36).substr(2, 6);
            var sectionEl = document.createElement('div');
            sectionEl.className = 'workout-section';
            sectionEl.dataset.sectionId = sectionId;
            sectionEl.dataset.sectionType = 'standard';
            var exercisesEl = document.createElement('div');
            exercisesEl.className = 'section-exercises';
            exercisesEl.innerHTML = cardHtml;
            sectionEl.appendChild(exercisesEl);

            // Find drop position based on cursor Y relative to existing sections
            var insertBefore = null;
            var sections = container.querySelectorAll('.workout-section');
            for (var i = 0; i < sections.length; i++) {
                var rect = sections[i].getBoundingClientRect();
                if (e.clientY < rect.top + rect.height / 2) {
                    insertBefore = sections[i];
                    break;
                }
            }

            if (insertBefore) {
                container.insertBefore(sectionEl, insertBefore);
            } else {
                container.appendChild(sectionEl);
            }

            if (window.markEditorDirty) window.markEditorDirty();
            if (window.updateMuscleSummary) window.updateMuscleSummary();
            if (window.showToast) {
                window.showToast({ message: 'Added "' + exerciseName + '" to workout', type: 'success', delay: 2000 });
            }
            console.log('✅ Dropped exercise from sidebar:', exerciseName);
        });
    }

    /**
     * Wire up desktop-only toolbar buttons.
     * NOTE: Save, Cancel, Delete, Add Group, and Reorder buttons are already
     * wired by workout-editor.js via canonical IDs (after ID swap).
     * Only wire buttons that are unique to the desktop view.
     */
    function wireDesktopToolbar() {
        // Share button (desktop-only, not handled by existing code)
        const shareBtn = document.getElementById('desktopShareBtn');
        if (shareBtn) {
            shareBtn.addEventListener('click', (e) => {
                e.preventDefault();
                if (window.UnifiedOffcanvasFactory && window.UnifiedOffcanvasFactory.createShareMenu) {
                    window.UnifiedOffcanvasFactory.createShareMenu();
                }
            });
        }

        // Workout name input - trigger dirty state on change
        // (not tracked by existing code)
        const nameInput = document.getElementById('workoutName');
        if (nameInput) {
            nameInput.addEventListener('input', () => {
                if (window.markEditorDirty) window.markEditorDirty();
            });
        }
    }

    /**
     * Wire inline tags and description fields to sync with hidden inputs
     */
    function wireDesktopMetadataFields() {
        const tagsInline = document.getElementById('desktopTagsInline');
        const descInline = document.getElementById('desktopDescInline');
        const hiddenTags = document.getElementById('workoutTags');
        const hiddenDesc = document.getElementById('workoutDescription');

        if (tagsInline && hiddenTags) {
            tagsInline.addEventListener('input', () => {
                hiddenTags.value = tagsInline.value;
                if (window.markEditorDirty) window.markEditorDirty();
            });
        }

        if (descInline && hiddenDesc) {
            descInline.addEventListener('input', () => {
                hiddenDesc.value = descInline.value;
                if (window.markEditorDirty) window.markEditorDirty();
            });
        }

        // Wire Add Note button
        const addNoteBtn = document.getElementById('desktopAddNoteBtn');
        if (addNoteBtn) {
            addNoteBtn.addEventListener('click', () => {
                if (window.handleAddTemplateNote) window.handleAddTemplateNote();
            });
        }

        // Wire Add Cardio button
        const addCardioBtn = document.getElementById('desktopAddCardioBtn');
        if (addCardioBtn) {
            addCardioBtn.addEventListener('click', () => {
                addCardioActivity();
            });
        }
    }

    /**
     * Add a new cardio activity card to the exercise list
     */
    function addCardioActivity() {
        const container = document.getElementById('exerciseGroups');
        if (!container || !window.desktopCardRenderer) return;

        const groupId = 'group-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
        const groupData = {
            exercises: { a: '' },
            sets: '', reps: '', rest: '',
            default_weight: '', default_weight_unit: 'lbs',
            group_type: 'cardio',
            cardio_config: {
                activity_type: '',
                duration_minutes: null,
                distance: null,
                distance_unit: 'mi',
                target_pace: '',
                target_heart_rate: null,
                target_calories: null,
                target_rpe: null,
                elevation_gain: null,
                elevation_unit: 'ft',
                activity_details: {},
                notes: ''
            }
        };

        const cardHtml = window.desktopCardRenderer.createCardioRow(groupId, groupData);

        // Wrap in a standard section for collectSections() compatibility
        const sectionId = 'section-' + Date.now() + '-' + Math.random().toString(36).substr(2, 6);
        const sectionEl = document.createElement('div');
        sectionEl.className = 'workout-section';
        sectionEl.dataset.sectionId = sectionId;
        sectionEl.dataset.sectionType = 'standard';
        const exercisesEl = document.createElement('div');
        exercisesEl.className = 'section-exercises';
        exercisesEl.innerHTML = cardHtml;
        sectionEl.appendChild(exercisesEl);

        container.appendChild(sectionEl);

        if (window.markEditorDirty) window.markEditorDirty();
        if (window.showToast) {
            window.showToast({ message: 'Added activity', type: 'success', delay: 2000 });
        }
    }

    /**
     * Override updateMetadataButtonStates to populate inline fields
     */
    const _origUpdateMetadata = window.updateMetadataButtonStates;
    window.updateMetadataButtonStates = function() {
        // Call original for mobile (if it exists)
        if (_origUpdateMetadata) _origUpdateMetadata();

        // Sync hidden inputs → inline fields
        const hiddenTags = document.getElementById('workoutTags');
        const hiddenDesc = document.getElementById('workoutDescription');
        const tagsInline = document.getElementById('desktopTagsInline');
        const descInline = document.getElementById('desktopDescInline');

        if (hiddenTags && tagsInline) {
            tagsInline.value = hiddenTags.value || '';
        }
        if (hiddenDesc && descInline) {
            descInline.value = hiddenDesc.value || '';
        }
    };

    // =========================================
    // Initialize on DOMContentLoaded
    // =========================================

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            // Delay slightly to ensure all other scripts have initialized
            setTimeout(initDesktopView, 100);
        });
    } else {
        setTimeout(initDesktopView, 100);
    }

    console.log('📦 Desktop View Adapter loaded (overrides active)');
})();
