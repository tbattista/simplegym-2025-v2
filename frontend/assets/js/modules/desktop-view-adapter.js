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
     * Override createExerciseGroupCard to use desktop row renderer
     */
    window.createExerciseGroupCard = function(groupId, groupData, groupNumber, index, totalCards) {
        if (window.desktopCardRenderer) {
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

        // Initialize Sortable.js on desktop exercise container
        initDesktopSorting(exerciseGroupsContainer);

        // Wire desktop toolbar buttons
        wireDesktopToolbar();

        // Initialize sidebar (always visible on desktop)
        if (window.desktopSidebar && window.desktopSidebar.init) {
            window.desktopSidebar.init();
        }

        // Wire desktop tags/description popovers
        wireDesktopMetadataPopovers();

        console.log('✅ Desktop view initialization complete');
    }

    /**
     * Initialize Sortable.js drag-and-drop on desktop
     */
    function initDesktopSorting(container) {
        if (!container || !window.Sortable) return;

        new Sortable(container, {
            animation: 150,
            handle: '.drag-handle',
            ghostClass: 'sortable-ghost',
            dragClass: 'sortable-drag',
            chosenClass: 'sortable-chosen',
            filter: '.template-note-card, .desktop-exercise-header',
            onEnd: function() {
                if (window.markEditorDirty) window.markEditorDirty();
            }
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
     * Wire desktop tags and description popovers
     */
    function wireDesktopMetadataPopovers() {
        // Tags button
        const tagsBtn = document.getElementById('desktopTagsBtn');
        if (tagsBtn && window.bootstrap) {
            const tagsPopover = new bootstrap.Popover(tagsBtn, {
                html: true,
                placement: 'bottom',
                trigger: 'click',
                customClass: 'tags-popover',
                sanitize: false,
                content: function() {
                    const currentTags = document.getElementById('workoutTags')?.value || '';
                    return `
                        <div class="popover-edit-container" style="min-width: 250px;">
                            <label class="form-label small mb-1">Tags (comma-separated)</label>
                            <input type="text" class="form-control form-control-sm" id="desktopTagsPopoverInput"
                                   value="${currentTags}" placeholder="push, chest, shoulders" maxlength="200">
                            <div class="d-flex gap-1 mt-2">
                                <button class="btn btn-sm btn-primary flex-grow-1" onclick="window._desktopSaveTags()">
                                    <i class="bx bx-check"></i> Save
                                </button>
                                <button class="btn btn-sm btn-outline-secondary" onclick="window._desktopCloseTags()">
                                    <i class="bx bx-x"></i>
                                </button>
                            </div>
                        </div>`;
                }
            });

            tagsBtn.addEventListener('shown.bs.popover', () => {
                const input = document.getElementById('desktopTagsPopoverInput');
                if (input) { input.focus(); input.select(); }
            });
        }

        // Description button
        const descBtn = document.getElementById('desktopDescBtn');
        if (descBtn && window.bootstrap) {
            const descPopover = new bootstrap.Popover(descBtn, {
                html: true,
                placement: 'bottom',
                trigger: 'click',
                customClass: 'description-popover',
                sanitize: false,
                content: function() {
                    const currentDesc = document.getElementById('workoutDescription')?.value || '';
                    return `
                        <div class="popover-edit-container" style="min-width: 280px;">
                            <label class="form-label small mb-1">Description</label>
                            <textarea class="form-control form-control-sm" id="desktopDescPopoverInput"
                                      rows="3" maxlength="500" placeholder="Brief description...">${currentDesc}</textarea>
                            <div class="d-flex gap-1 mt-2">
                                <button class="btn btn-sm btn-primary flex-grow-1" onclick="window._desktopSaveDesc()">
                                    <i class="bx bx-check"></i> Save
                                </button>
                                <button class="btn btn-sm btn-outline-secondary" onclick="window._desktopCloseDesc()">
                                    <i class="bx bx-x"></i>
                                </button>
                            </div>
                        </div>`;
                }
            });

            descBtn.addEventListener('shown.bs.popover', () => {
                const textarea = document.getElementById('desktopDescPopoverInput');
                if (textarea) textarea.focus();
            });
        }

        // Tags popover save/close helpers
        window._desktopSaveTags = function() {
            const input = document.getElementById('desktopTagsPopoverInput');
            const hiddenInput = document.getElementById('workoutTags');
            const btnText = document.getElementById('desktopTagsText');
            const btn = document.getElementById('desktopTagsBtn');

            if (input && hiddenInput) {
                const tags = input.value.trim();
                hiddenInput.value = tags;

                if (tags && btnText) {
                    const tagArray = tags.split(',').map(t => t.trim()).filter(t => t);
                    btnText.textContent = tagArray.length === 1 ? '1 tag' : `${tagArray.length} tags`;
                    if (btn) { btn.classList.remove('btn-outline-secondary'); btn.classList.add('btn-outline-primary'); }
                } else if (btnText) {
                    btnText.textContent = 'Tags';
                    if (btn) { btn.classList.remove('btn-outline-primary'); btn.classList.add('btn-outline-secondary'); }
                }

                if (window.markEditorDirty) window.markEditorDirty();
            }
            window._desktopCloseTags();
        };

        window._desktopCloseTags = function() {
            const btn = document.getElementById('desktopTagsBtn');
            if (btn) {
                const popover = bootstrap.Popover.getInstance(btn);
                if (popover) popover.hide();
            }
        };

        // Description popover save/close helpers
        window._desktopSaveDesc = function() {
            const textarea = document.getElementById('desktopDescPopoverInput');
            const hiddenTextarea = document.getElementById('workoutDescription');
            const btnText = document.getElementById('desktopDescText');
            const btn = document.getElementById('desktopDescBtn');

            if (textarea && hiddenTextarea) {
                const description = textarea.value.trim();
                hiddenTextarea.value = description;

                if (description && btnText) {
                    const preview = description.length > 25 ? description.substring(0, 25) + '...' : description;
                    btnText.textContent = preview;
                    if (btn) { btn.classList.remove('btn-outline-secondary'); btn.classList.add('btn-outline-primary'); }
                } else if (btnText) {
                    btnText.textContent = 'Description';
                    if (btn) { btn.classList.remove('btn-outline-primary'); btn.classList.add('btn-outline-secondary'); }
                }

                if (window.markEditorDirty) window.markEditorDirty();
            }
            window._desktopCloseDesc();
        };

        window._desktopCloseDesc = function() {
            const btn = document.getElementById('desktopDescBtn');
            if (btn) {
                const popover = bootstrap.Popover.getInstance(btn);
                if (popover) popover.hide();
            }
        };
    }

    /**
     * Override updateMetadataButtonStates for desktop toolbar buttons
     */
    const _origUpdateMetadata = window.updateMetadataButtonStates;
    window.updateMetadataButtonStates = function() {
        // Call original for mobile (if it exists)
        if (_origUpdateMetadata) _origUpdateMetadata();

        // Also update desktop toolbar buttons
        const tagsInput = document.getElementById('workoutTags');
        const descTextarea = document.getElementById('workoutDescription');
        const tagsBtnText = document.getElementById('desktopTagsText');
        const descBtnText = document.getElementById('desktopDescText');
        const tagsBtn = document.getElementById('desktopTagsBtn');
        const descBtn = document.getElementById('desktopDescBtn');

        if (tagsInput && tagsBtnText) {
            const tags = tagsInput.value.trim();
            if (tags) {
                const tagArray = tags.split(',').map(t => t.trim()).filter(t => t);
                tagsBtnText.textContent = tagArray.length === 1 ? '1 tag' : `${tagArray.length} tags`;
                if (tagsBtn) { tagsBtn.classList.remove('btn-outline-secondary'); tagsBtn.classList.add('btn-outline-primary'); }
            } else {
                tagsBtnText.textContent = 'Tags';
                if (tagsBtn) { tagsBtn.classList.remove('btn-outline-primary'); tagsBtn.classList.add('btn-outline-secondary'); }
            }
        }

        if (descTextarea && descBtnText) {
            const desc = descTextarea.value.trim();
            if (desc) {
                const preview = desc.length > 25 ? desc.substring(0, 25) + '...' : desc;
                descBtnText.textContent = preview;
                if (descBtn) { descBtn.classList.remove('btn-outline-secondary'); descBtn.classList.add('btn-outline-primary'); }
            } else {
                descBtnText.textContent = 'Description';
                if (descBtn) { descBtn.classList.remove('btn-outline-primary'); descBtn.classList.add('btn-outline-secondary'); }
            }
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
