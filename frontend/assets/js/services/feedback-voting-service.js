/**
 * Feedback Voting Service
 * Handles public feedback viewing and voting functionality
 * @version 2.0.0 - Simplified to support-only voting (no downvotes)
 */

(function() {
    'use strict';

    class FeedbackVotingService {
        constructor() {
            this.initialized = false;
            this.currentUser = null;
            this.cachedFeedback = {
                feature: [],
                bug: [],
                general: []
            };

            console.log('🗳️ Feedback Voting Service initialized');
            this.setupAuthListener();
        }

        /**
         * Setup auth state listener
         */
        setupAuthListener() {
            window.addEventListener('authStateChanged', (event) => {
                const { user } = event.detail;
                this.currentUser = user;
                console.log('🔐 Voting service: Auth state updated:', user?.email || 'signed out');
            });
        }

        /**
         * Get current user ID
         */
        getCurrentUserId() {
            const user = this.currentUser || window.firebaseAuth?.currentUser;
            return user?.uid || null;
        }

        /**
         * Check if user is logged in
         */
        isLoggedIn() {
            return !!this.getCurrentUserId();
        }

        /**
         * Load public feedback by type
         * @param {string} type - 'feature' or 'bug'
         * @returns {Promise<Array>} - Array of feedback items
         */
        async loadPublicFeedback(type) {
            try {
                console.log(`📥 Loading public ${type} feedback...`);

                if (!window.firebaseDb) {
                    throw new Error('Firestore not available');
                }

                // Build query: type filter, status=new, order by support count
                let feedbackQuery = window.firestoreFunctions.query(
                    window.firestoreFunctions.collection(window.firebaseDb, 'feedback'),
                    window.firestoreFunctions.where('type', '==', type),
                    window.firestoreFunctions.where('status', '==', 'new'),
                    window.firestoreFunctions.orderBy('votes.support', 'desc')
                );

                const snapshot = await window.firestoreFunctions.getDocs(feedbackQuery);
                const feedbackList = [];

                snapshot.forEach(doc => {
                    const data = doc.data();
                    // Backwards compatibility: use votes.support, fallback to votes.up
                    const support = data.votes?.support ?? data.votes?.up ?? 0;
                    feedbackList.push({
                        id: doc.id,
                        ...data,
                        createdAt: data.createdAt?.toDate?.() || new Date(data.metadata?.timestamp || Date.now()),
                        votes: { support },
                        supporters: data.supporters || {}
                    });
                });

                // Cache the results
                this.cachedFeedback[type] = feedbackList;

                console.log(`✅ Loaded ${feedbackList.length} ${type} items`);
                return feedbackList;

            } catch (error) {
                // If query fails (index not ready), fall back to simpler query
                if (error.code === 'failed-precondition') {
                    console.warn('⚠️ Index not ready, using fallback query...');
                    return this.loadPublicFeedbackFallback(type);
                }
                console.error(`❌ Error loading ${type} feedback:`, error);
                throw error;
            }
        }

        /**
         * Fallback query without score ordering (for when index isn't ready)
         */
        async loadPublicFeedbackFallback(type) {
            try {
                let feedbackQuery = window.firestoreFunctions.query(
                    window.firestoreFunctions.collection(window.firebaseDb, 'feedback'),
                    window.firestoreFunctions.where('type', '==', type),
                    window.firestoreFunctions.where('status', '==', 'new')
                );

                const snapshot = await window.firestoreFunctions.getDocs(feedbackQuery);
                const feedbackList = [];

                snapshot.forEach(doc => {
                    const data = doc.data();
                    // Backwards compatibility: use votes.support, fallback to votes.up
                    const support = data.votes?.support ?? data.votes?.up ?? 0;
                    feedbackList.push({
                        id: doc.id,
                        ...data,
                        createdAt: data.createdAt?.toDate?.() || new Date(data.metadata?.timestamp || Date.now()),
                        votes: { support },
                        supporters: data.supporters || {}
                    });
                });

                // Sort by support count client-side
                feedbackList.sort((a, b) => (b.votes?.support || 0) - (a.votes?.support || 0));

                this.cachedFeedback[type] = feedbackList;
                return feedbackList;

            } catch (error) {
                console.error(`❌ Error in fallback query:`, error);
                throw error;
            }
        }

        /**
         * Check if user has supported a feedback item
         * @param {Object} supporters - The supporters map
         * @returns {boolean} - true if user has supported
         */
        hasUserSupported(supporters) {
            const userId = this.getCurrentUserId();
            if (!userId || !supporters) return false;
            return !!supporters[userId];
        }

        /**
         * Toggle support for a feedback item
         * @param {string} feedbackId - The feedback ID
         * @returns {Promise<Object>} - Updated support count and status
         */
        async toggleSupport(feedbackId) {
            const userId = this.getCurrentUserId();
            if (!userId) {
                throw new Error('Must be logged in to support');
            }

            try {
                console.log(`👍 Toggling support on ${feedbackId}...`);

                if (!window.firebaseDb) {
                    throw new Error('Firestore not available');
                }

                const feedbackRef = window.firestoreFunctions.doc(window.firebaseDb, 'feedback', feedbackId);
                const docSnap = await window.firestoreFunctions.getDoc(feedbackRef);

                if (!docSnap.exists()) {
                    throw new Error('Feedback not found');
                }

                const data = docSnap.data();
                // Backwards compatibility: read from votes.support or votes.up
                let currentSupport = data.votes?.support ?? data.votes?.up ?? 0;
                const currentSupporters = data.supporters || {};
                const wasSupporting = !!currentSupporters[userId];

                let newSupport;
                if (wasSupporting) {
                    // Remove support
                    newSupport = Math.max(0, currentSupport - 1);
                    delete currentSupporters[userId];
                } else {
                    // Add support
                    newSupport = currentSupport + 1;
                    currentSupporters[userId] = true;
                }

                // Update Firestore with new structure
                await window.firestoreFunctions.updateDoc(feedbackRef, {
                    votes: { support: newSupport },
                    supporters: currentSupporters
                });

                const isNowSupporting = !!currentSupporters[userId];
                console.log(`✅ Support ${isNowSupporting ? 'added' : 'removed'}:`, newSupport);

                return {
                    votes: { support: newSupport },
                    supporters: currentSupporters,
                    isSupporting: isNowSupporting
                };

            } catch (error) {
                console.error('❌ Error toggling support:', error);
                throw error;
            }
        }

        /**
         * Search feedback by query string (client-side)
         * @param {string} query - Search query
         * @param {string} type - 'feature' or 'bug'
         * @returns {Array} - Filtered feedback items
         */
        searchFeedback(query, type) {
            const items = this.cachedFeedback[type] || [];
            if (!query || query.trim() === '') {
                return items;
            }

            const searchTerm = query.toLowerCase().trim();
            return items.filter(item =>
                item.title.toLowerCase().includes(searchTerm) ||
                item.description.toLowerCase().includes(searchTerm)
            );
        }

        /**
         * Format relative time (e.g., "2 hours ago")
         */
        formatRelativeTime(date) {
            if (!date) return 'Unknown';

            const now = Date.now();
            const diff = now - date.getTime();

            const seconds = Math.floor(diff / 1000);
            const minutes = Math.floor(seconds / 60);
            const hours = Math.floor(minutes / 60);
            const days = Math.floor(hours / 24);

            if (days > 0) return `${days}d ago`;
            if (hours > 0) return `${hours}h ago`;
            if (minutes > 0) return `${minutes}m ago`;
            return 'Just now';
        }
    }

    // Create global instance
    window.feedbackVotingService = new FeedbackVotingService();

    // Export for module use
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = FeedbackVotingService;
    }

    console.log('✅ Feedback Voting Service loaded');
})();
