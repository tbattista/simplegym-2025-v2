/**
 * Feedback Service
 * Handles feedback submission, metadata collection, and Firestore integration
 * @version 1.0.0
 */

(function() {
    'use strict';

    class FeedbackService {
        constructor() {
            this.initialized = false;
            this.sessionStartTime = Date.now();
            this.RATE_LIMIT = 5; // Max submissions per hour
            this.RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 hour in milliseconds
            this.DRAFT_KEY = 'ghostgym_feedback_draft';
            this.SUBMISSIONS_KEY = 'ghostgym_feedback_submissions';
            
            // Initialize session tracking
            this.initSessionTracking();
            
            console.log('📝 Feedback Service initialized');
        }

        /**
         * Initialize session tracking
         */
        initSessionTracking() {
            // Store page load time if not already set
            if (!sessionStorage.getItem('pageLoadTime')) {
                sessionStorage.setItem('pageLoadTime', Date.now().toString());
            }
        }

        /**
         * Get session duration in milliseconds
         */
        getSessionDuration() {
            const pageLoadTime = parseInt(sessionStorage.getItem('pageLoadTime') || Date.now());
            return Date.now() - pageLoadTime;
        }

        /**
         * Collect system metadata automatically
         */
        collectMetadata() {
            const metadata = {
                pageUrl: window.location.href,
                pageTitle: document.title,
                timestamp: new Date().toISOString(),
                userId: null,
                userEmail: null,
                userAgent: navigator.userAgent,
                screenResolution: `${window.screen.width}x${window.screen.height}`,
                viewport: this.getViewportType(),
                sessionDuration: this.getSessionDuration(),
                theme: this.getCurrentTheme()
            };

            // Add user info if authenticated
            if (window.firebaseAuth && window.firebaseAuth.currentUser) {
                const user = window.firebaseAuth.currentUser;
                metadata.userId = user.uid;
                metadata.userEmail = user.email;
            }

            return metadata;
        }

        /**
         * Get current viewport type
         */
        getViewportType() {
            const width = window.innerWidth;
            if (width < 768) return 'mobile';
            if (width < 1200) return 'tablet';
            return 'desktop';
        }

        /**
         * Get current theme preference
         */
        getCurrentTheme() {
            if (window.themeManager) {
                const preference = window.themeManager.getPreference();
                if (preference === 'auto') {
                    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
                }
                return preference;
            }
            return document.documentElement.getAttribute('data-theme') || 'light';
        }

        /**
         * Validate feedback form data
         */
        validateFeedback(data) {
            const errors = [];

            // Validate type
            if (!data.type || !['bug', 'feature', 'general'].includes(data.type)) {
                errors.push('Please select a feedback type');
            }

            // Validate title
            if (!data.title || data.title.trim().length < 3) {
                errors.push('Title must be at least 3 characters');
            }
            if (data.title && data.title.length > 100) {
                errors.push('Title must be less than 100 characters');
            }

            // Validate description
            if (!data.description || data.description.trim().length < 10) {
                errors.push('Description must be at least 10 characters');
            }
            if (data.description && data.description.length > 1000) {
                errors.push('Description must be less than 1000 characters');
            }

            // Validate priority (if provided)
            if (data.priority && !['low', 'medium', 'high', 'critical'].includes(data.priority)) {
                errors.push('Invalid priority value');
            }

            return {
                valid: errors.length === 0,
                errors: errors
            };
        }

        /**
         * Check rate limiting
         */
        checkRateLimit() {
            try {
                const submissions = JSON.parse(localStorage.getItem(this.SUBMISSIONS_KEY) || '[]');
                const now = Date.now();
                
                // Filter submissions within the rate limit window
                const recentSubmissions = submissions.filter(time => now - time < this.RATE_LIMIT_WINDOW);
                
                // Update localStorage with only recent submissions
                localStorage.setItem(this.SUBMISSIONS_KEY, JSON.stringify(recentSubmissions));
                
                if (recentSubmissions.length >= this.RATE_LIMIT) {
                    const oldestSubmission = Math.min(...recentSubmissions);
                    const timeUntilReset = this.RATE_LIMIT_WINDOW - (now - oldestSubmission);
                    const minutesUntilReset = Math.ceil(timeUntilReset / 60000);
                    
                    return {
                        allowed: false,
                        message: `Rate limit exceeded. Please try again in ${minutesUntilReset} minute${minutesUntilReset > 1 ? 's' : ''}.`
                    };
                }
                
                return { allowed: true };
            } catch (error) {
                console.error('❌ Error checking rate limit:', error);
                return { allowed: true }; // Allow submission if rate limit check fails
            }
        }

        /**
         * Record submission for rate limiting
         */
        recordSubmission() {
            try {
                const submissions = JSON.parse(localStorage.getItem(this.SUBMISSIONS_KEY) || '[]');
                submissions.push(Date.now());
                localStorage.setItem(this.SUBMISSIONS_KEY, JSON.stringify(submissions));
            } catch (error) {
                console.error('❌ Error recording submission:', error);
            }
        }

        /**
         * Submit feedback to Firestore
         */
        async submitFeedback(formData) {
            try {
                console.log('📤 Submitting feedback...', formData);

                // Check rate limit
                const rateLimitCheck = this.checkRateLimit();
                if (!rateLimitCheck.allowed) {
                    throw new Error(rateLimitCheck.message);
                }

                // Validate form data
                const validation = this.validateFeedback(formData);
                if (!validation.valid) {
                    throw new Error(validation.errors.join(', '));
                }

                // Wait for Firebase to be ready
                if (!window.firebaseReady) {
                    await new Promise((resolve, reject) => {
                        const timeout = setTimeout(() => reject(new Error('Firebase timeout')), 5000);
                        window.addEventListener('firebaseReady', () => {
                            clearTimeout(timeout);
                            resolve();
                        }, { once: true });
                    });
                }

                // Check if Firestore is available
                if (!window.firebaseDb) {
                    throw new Error('Firestore not available');
                }

                // Collect metadata
                const metadata = this.collectMetadata();

                // Prepare feedback document
                const feedbackDoc = {
                    // User input
                    type: formData.type,
                    title: formData.title.trim(),
                    description: formData.description.trim(),
                    priority: formData.priority || null,
                    contactMe: formData.contactMe || false,
                    
                    // Metadata
                    metadata: metadata,
                    
                    // Admin fields (default values)
                    status: 'new',
                    adminNotes: null,
                    assignedTo: null,
                    resolvedAt: null,
                    
                    // Timestamps
                    createdAt: window.firestoreFunctions.serverTimestamp(),
                    updatedAt: window.firestoreFunctions.serverTimestamp()
                };

                // Submit to Firestore using modular API
                const feedbackCollection = window.firestoreFunctions.collection(window.firebaseDb, 'feedback');
                const docRef = await window.firestoreFunctions.addDoc(feedbackCollection, feedbackDoc);
                
                console.log('✅ Feedback submitted successfully:', docRef.id);

                // Record submission for rate limiting
                this.recordSubmission();

                // Clear draft
                this.clearDraft();

                return {
                    success: true,
                    id: docRef.id,
                    message: 'Thank you for your feedback!'
                };

            } catch (error) {
                console.error('❌ Error submitting feedback:', error);
                return {
                    success: false,
                    error: error.message || 'Failed to submit feedback. Please try again.'
                };
            }
        }

        /**
         * Save draft to localStorage
         */
        saveDraft(formData) {
            try {
                const draft = {
                    ...formData,
                    savedAt: Date.now()
                };
                localStorage.setItem(this.DRAFT_KEY, JSON.stringify(draft));
                console.log('💾 Draft saved');
            } catch (error) {
                console.error('❌ Error saving draft:', error);
            }
        }

        /**
         * Load draft from localStorage
         */
        loadDraft() {
            try {
                const draftStr = localStorage.getItem(this.DRAFT_KEY);
                if (!draftStr) return null;

                const draft = JSON.parse(draftStr);
                
                // Check if draft is less than 24 hours old
                const age = Date.now() - draft.savedAt;
                const maxAge = 24 * 60 * 60 * 1000; // 24 hours
                
                if (age > maxAge) {
                    this.clearDraft();
                    return null;
                }

                console.log('📂 Draft loaded');
                return draft;
            } catch (error) {
                console.error('❌ Error loading draft:', error);
                return null;
            }
        }

        /**
         * Clear draft from localStorage
         */
        clearDraft() {
            try {
                localStorage.removeItem(this.DRAFT_KEY);
                console.log('🗑️ Draft cleared');
            } catch (error) {
                console.error('❌ Error clearing draft:', error);
            }
        }

        /**
         * Get feedback statistics (for admin dashboard - future feature)
         */
        async getStatistics() {
            try {
                if (!window.firebaseDb) {
                    throw new Error('Firestore not available');
                }

                const feedbackCollection = window.firestoreFunctions.collection(window.firebaseDb, 'feedback');
                const snapshot = await window.firestoreFunctions.getDocs(feedbackCollection);
                
                const stats = {
                    total: snapshot.size,
                    byType: { bug: 0, feature: 0, general: 0 },
                    byStatus: { new: 0, reviewing: 0, 'in-progress': 0, resolved: 0, closed: 0 }
                };

                snapshot.forEach(doc => {
                    const data = doc.data();
                    stats.byType[data.type] = (stats.byType[data.type] || 0) + 1;
                    stats.byStatus[data.status] = (stats.byStatus[data.status] || 0) + 1;
                });

                return stats;
            } catch (error) {
                console.error('❌ Error getting statistics:', error);
                return null;
            }
        }
    }

    // Create global instance
    window.feedbackService = new FeedbackService();

    // Export for module use
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = FeedbackService;
    }

    console.log('✅ Feedback Service loaded');
})();