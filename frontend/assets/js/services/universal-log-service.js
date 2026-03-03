/**
 * Universal Log Service
 * Handles AI-powered session logging from photos, screenshots, and text.
 * Supports cardio sessions (treadmill, bike, watch data) and strength workout logs.
 *
 * Reuses: window.importService.compressImage() for image compression
 * @version 1.0.0
 */

window.universalLogService = {

    // ── AI Parsing ─────────────────────────────────────────────────────────

    /**
     * Parse activity data (text + images) using the backend AI endpoint.
     * @param {string|null} text - Free-text description of the activity
     * @param {File[]} imageFiles - Array of image File objects
     * @param {Object|null} answers - Answers to AI clarifying questions {questionId: answer}
     * @returns {Promise<Object>} UniversalLogParseResponse
     */
    async parse(text, imageFiles = [], answers = null) {
        const images = await this._encodeImages(imageFiles);

        const body = {};
        if (text && text.trim()) body.text = text.trim();
        if (images.length > 0) body.images = images;
        if (answers && Object.keys(answers).length > 0) body.answers = answers;

        const headers = { 'Content-Type': 'application/json' };
        await this._addAuthHeader(headers);

        const response = await fetch('/api/v3/universal-log/parse', {
            method: 'POST',
            headers,
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ detail: 'Analysis failed' }));
            throw new Error(error.detail || `Server error: ${response.status}`);
        }

        return response.json();
    },

    // ── Session Saving ─────────────────────────────────────────────────────

    /**
     * Save a cardio session using the existing cardio endpoint.
     * @param {Object} cardioData - ParsedCardioData fields + sessionDate (ISO string)
     * @returns {Promise<Object>} CardioSession
     */
    async saveCardio(cardioData) {
        const body = {
            activity_type: cardioData.activity_type || 'other',
            activity_name: cardioData.activity_name || null,
            duration_minutes: Math.round(cardioData.duration_minutes || 0),
            distance: cardioData.distance || null,
            distance_unit: cardioData.distance_unit || 'mi',
            avg_heart_rate: cardioData.avg_heart_rate || null,
            max_heart_rate: cardioData.max_heart_rate || null,
            calories: cardioData.calories || null,
            pace_per_unit: cardioData.pace_per_unit || null,
            rpe: cardioData.rpe || null,
            notes: cardioData.notes || null,
        };

        // Apply the session date if provided
        if (cardioData.sessionDate) {
            body.started_at = cardioData.sessionDate;
        }

        const headers = { 'Content-Type': 'application/json' };
        await this._addAuthHeader(headers);

        const response = await fetch('/api/v3/cardio-sessions', {
            method: 'POST',
            headers,
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ detail: 'Save failed' }));
            throw new Error(error.detail || `Server error: ${response.status}`);
        }

        return response.json();
    },

    /**
     * Save a strength workout log (creates workout record + session).
     * @param {Object} strengthData - Workout name, exercise_groups, duration, notes, started_at
     * @param {boolean} saveAsTemplate - Whether to save as a reusable template
     * @returns {Promise<Object>} { success, session_id, workout_id, saved_as_template }
     */
    async saveStrength(strengthData, saveAsTemplate = false) {
        const body = {
            workout_name: strengthData.workout_name || 'Ad-Hoc Workout',
            exercise_groups: strengthData.exercise_groups || [],
            duration_minutes: strengthData.duration_minutes || null,
            notes: strengthData.notes || null,
            started_at: strengthData.started_at || null,
            save_as_template: saveAsTemplate,
        };

        const headers = { 'Content-Type': 'application/json' };
        await this._addAuthHeader(headers);

        const response = await fetch('/api/v3/universal-log/save-strength-session', {
            method: 'POST',
            headers,
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ detail: 'Save failed' }));
            throw new Error(error.detail || `Server error: ${response.status}`);
        }

        return response.json();
    },

    // ── Helpers ────────────────────────────────────────────────────────────

    /**
     * Compress and base64-encode an array of image Files.
     * Uses window.importService.compressImage() if available (workout-builder page),
     * otherwise falls back to the inline compress function.
     * @param {File[]} files - Image files to encode
     * @returns {Promise<Array>} Array of { data, mime_type } objects
     */
    async _encodeImages(files) {
        if (!files || files.length === 0) return [];

        const encoded = [];
        for (const file of files) {
            try {
                const compressed = await this._compressImage(file, 4);
                const base64 = await this._fileToBase64(compressed);
                encoded.push({ data: base64, mime_type: compressed.type || 'image/jpeg' });
            } catch (e) {
                console.warn('Universal Logger: skipping unreadable image', file.name, e);
            }
        }
        return encoded;
    },

    /**
     * Compress an image File to at most maxSizeMB.
     * Mirrors the same logic as import-service.js compressImage().
     * @param {File} file
     * @param {number} maxSizeMB
     * @returns {Promise<File>}
     */
    _compressImage(file, maxSizeMB = 4) {
        const maxBytes = maxSizeMB * 1024 * 1024;
        if (file.size <= maxBytes) return Promise.resolve(file);

        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const maxDim = 2048;
                let { width, height } = img;
                if (width > maxDim || height > maxDim) {
                    if (width > height) { height = Math.round(height * maxDim / width); width = maxDim; }
                    else { width = Math.round(width * maxDim / height); height = maxDim; }
                }
                canvas.width = width;
                canvas.height = height;
                canvas.getContext('2d').drawImage(img, 0, 0, width, height);
                canvas.toBlob(blob => {
                    URL.revokeObjectURL(img.src);
                    resolve(blob
                        ? new File([blob], file.name, { type: 'image/jpeg', lastModified: Date.now() })
                        : file
                    );
                }, 'image/jpeg', 0.85);
            };
            img.onerror = () => { URL.revokeObjectURL(img.src); resolve(file); };
            img.src = URL.createObjectURL(file);
        });
    },

    /**
     * Read a File as a base64 data string (strips the data:mime;base64, prefix).
     * @param {File} file
     * @returns {Promise<string>} Base64-encoded content
     */
    _fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = e => {
                const dataUrl = e.target.result; // "data:image/jpeg;base64,..."
                const base64 = dataUrl.split(',')[1];
                resolve(base64);
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    },

    /**
     * Add Bearer token to headers if user is authenticated.
     * @param {Object} headers
     */
    async _addAuthHeader(headers) {
        try {
            if (window.authService?.currentUser) {
                const token = await window.authService.getIdToken();
                if (token) {
                    headers['Authorization'] = `Bearer ${token}`;
                }
            }
        } catch (e) {
            // Proceed without auth (backend will reject if auth required)
        }
    },
};
