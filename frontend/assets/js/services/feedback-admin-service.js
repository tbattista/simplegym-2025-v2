/**
 * Feedback Admin Service
 * Handles admin operations for viewing and managing feedback
 * @version 1.0.0
 */

(function() {
    'use strict';

    class FeedbackAdminService {
        constructor() {
            this.ADMIN_EMAIL = 'tbattista@gmail.com';
            this.initialized = false;
            this.authResolved = false;
            this.currentUser = null;
            
            console.log('📋 Feedback Admin Service initialized');
            
            // Setup auth state listener (matches app pattern)
            this.setupAuthListener();
            
            // Check if auth state is already available
            this.checkInitialAuthState();
        }

        /**
         * Check if auth state is already available when service initializes
         * This handles the case where auth-service has already fired authStateChanged
         */
        checkInitialAuthState() {
            // Small delay to allow auth-service to initialize
            setTimeout(() => {
                if (window.authService && window.authService.currentUser) {
                    this.currentUser = window.authService.currentUser;
                    this.authResolved = true;
                    console.log('🔐 Admin service: Initial auth state captured:', this.currentUser.email);
                } else if (window.firebaseAuth && window.firebaseAuth.currentUser) {
                    this.currentUser = window.firebaseAuth.currentUser;
                    this.authResolved = true;
                    console.log('🔐 Admin service: Initial auth state captured from Firebase:', this.currentUser.email);
                } else {
                    console.log('🔐 Admin service: No initial auth state, waiting for event...');
                }
            }, 100);
        }

        /**
         * Setup auth state listener
         * Listens to authStateChanged events from auth-service.js
         */
        setupAuthListener() {
            window.addEventListener('authStateChanged', (event) => {
                const { user } = event.detail;
                this.currentUser = user;
                this.authResolved = true;
                console.log('🔐 Admin service: Auth state updated:', user?.email || 'signed out');
            });
            
            console.log('✅ Auth state listener registered');
        }

        /**
         * Check if current user is admin
         */
        isAdmin() {
            const user = this.currentUser || window.firebaseAuth?.currentUser;
            if (!user) {
                return false;
            }
            return user.email === this.ADMIN_EMAIL;
        }

        /**
         * Check admin access and redirect if not authorized
         * Uses Firebase onAuthStateChanged for reliable auth state
         */
        async checkAdminAccess() {
            console.log('🔐 Checking admin access...');
            
            // Wait for Firebase to be ready
            if (!window.firebaseReady) {
                console.log('⏳ Waiting for Firebase...');
                await new Promise(resolve => {
                    window.addEventListener('firebaseReady', resolve, { once: true });
                });
                console.log('✅ Firebase ready');
            }

            // Wait for Firebase Auth to be available
            if (!window.firebaseAuth || !window.firebaseAuthFunctions) {
                console.error('❌ Firebase Auth not available');
                alert('Authentication system not loaded. Please refresh the page.');
                window.location.href = '/';
                return false;
            }

            // Use Firebase's onAuthStateChanged to get definitive auth state
            console.log('⏳ Waiting for definitive auth state...');
            const user = await new Promise((resolve) => {
                const { onAuthStateChanged } = window.firebaseAuthFunctions;
                const unsubscribe = onAuthStateChanged(window.firebaseAuth, (user) => {
                    console.log('🔐 Auth state received:', user ? user.email : 'no user');
                    unsubscribe(); // Unsubscribe immediately after first call
                    resolve(user);
                });
            });
            
            if (!user) {
                console.warn('⚠️ No user signed in');
                alert('Please sign in to access the admin dashboard.');
                window.location.href = '/';
                return false;
            }
            
            console.log('🔍 Checking user email:', user.email);
            
            if (user.email !== this.ADMIN_EMAIL) {
                console.warn('⚠️ Unauthorized access attempt:', user.email);
                alert('Access denied. Admin privileges required.');
                window.location.href = '/';
                return false;
            }
            
            console.log('✅ Admin access granted:', user.email);
            this.currentUser = user;
            this.authResolved = true;
            return true;
        }

        /**
         * Load all feedback with optional filters
         */
        async loadFeedback(filters = {}) {
            try {
                console.log('📥 Loading feedback with filters:', filters);

                if (!window.firebaseDb) {
                    throw new Error('Firestore not available');
                }

                // Build query
                let feedbackQuery = window.firestoreFunctions.collection(window.firebaseDb, 'feedback');
                
                // Apply status filter
                if (filters.status && filters.status !== 'all') {
                    if (filters.status === 'new') {
                        feedbackQuery = window.firestoreFunctions.query(
                            feedbackQuery,
                            window.firestoreFunctions.where('status', '==', 'new')
                        );
                    } else if (filters.status === 'done') {
                        feedbackQuery = window.firestoreFunctions.query(
                            feedbackQuery,
                            window.firestoreFunctions.where('status', '==', 'resolved')
                        );
                    }
                }
                
                // Apply type filter
                if (filters.type && filters.type !== 'all') {
                    feedbackQuery = window.firestoreFunctions.query(
                        feedbackQuery,
                        window.firestoreFunctions.where('type', '==', filters.type)
                    );
                }

                // Order by creation date (newest first)
                feedbackQuery = window.firestoreFunctions.query(
                    feedbackQuery,
                    window.firestoreFunctions.orderBy('createdAt', 'desc')
                );

                // Get documents
                const snapshot = await window.firestoreFunctions.getDocs(feedbackQuery);
                const feedbackList = [];
                
                snapshot.forEach(doc => {
                    const data = doc.data();
                    feedbackList.push({
                        id: doc.id,
                        ...data,
                        // Convert Firestore timestamps to JS dates
                        createdAt: data.createdAt?.toDate?.() || new Date(data.metadata?.timestamp || Date.now()),
                        updatedAt: data.updatedAt?.toDate?.() || null,
                        resolvedAt: data.resolvedAt?.toDate?.() || null
                    });
                });

                // Apply date filter (client-side)
                let filteredList = feedbackList;
                if (filters.dateRange && filters.dateRange !== 'all') {
                    const now = Date.now();
                    const cutoff = filters.dateRange === '7days' 
                        ? now - (7 * 24 * 60 * 60 * 1000)
                        : now - (30 * 24 * 60 * 60 * 1000);
                    
                    filteredList = feedbackList.filter(item => 
                        item.createdAt.getTime() >= cutoff
                    );
                }

                console.log(`✅ Loaded ${filteredList.length} feedback items`);
                return filteredList;

            } catch (error) {
                console.error('❌ Error loading feedback:', error);
                throw error;
            }
        }

        /**
         * Get feedback statistics
         */
        async getStatistics() {
            try {
                console.log('📊 Loading statistics...');

                if (!window.firebaseDb) {
                    throw new Error('Firestore not available');
                }

                const feedbackCollection = window.firestoreFunctions.collection(window.firebaseDb, 'feedback');
                const snapshot = await window.firestoreFunctions.getDocs(feedbackCollection);
                
                const stats = {
                    total: 0,
                    new: 0,
                    done: 0,
                    bugs: 0,
                    features: 0,
                    general: 0
                };

                snapshot.forEach(doc => {
                    const data = doc.data();
                    stats.total++;
                    
                    // Count by status
                    if (data.status === 'new') stats.new++;
                    if (data.status === 'resolved') stats.done++;
                    
                    // Count by type
                    if (data.type === 'bug') stats.bugs++;
                    if (data.type === 'feature') stats.features++;
                    if (data.type === 'general') stats.general++;
                });

                console.log('✅ Statistics loaded:', stats);
                return stats;

            } catch (error) {
                console.error('❌ Error loading statistics:', error);
                return {
                    total: 0,
                    new: 0,
                    done: 0,
                    bugs: 0,
                    features: 0,
                    general: 0
                };
            }
        }

        /**
         * Mark feedback as done (resolved)
         */
        async markAsDone(feedbackId) {
            try {
                console.log('✅ Marking feedback as done:', feedbackId);

                if (!window.firebaseDb) {
                    throw new Error('Firestore not available');
                }

                const feedbackDoc = window.firestoreFunctions.doc(window.firebaseDb, 'feedback', feedbackId);
                
                await window.firestoreFunctions.updateDoc(feedbackDoc, {
                    status: 'resolved',
                    resolvedAt: window.firestoreFunctions.serverTimestamp(),
                    updatedAt: window.firestoreFunctions.serverTimestamp()
                });

                console.log('✅ Feedback marked as done');
                return { success: true };

            } catch (error) {
                console.error('❌ Error marking feedback as done:', error);
                throw error;
            }
        }

        /**
         * Get single feedback by ID
         */
        async getFeedbackById(feedbackId) {
            try {
                console.log('📄 Loading feedback:', feedbackId);

                if (!window.firebaseDb) {
                    throw new Error('Firestore not available');
                }

                const feedbackDoc = window.firestoreFunctions.doc(window.firebaseDb, 'feedback', feedbackId);
                const docSnap = await window.firestoreFunctions.getDoc(feedbackDoc);

                if (!docSnap.exists()) {
                    throw new Error('Feedback not found');
                }

                const data = docSnap.data();
                return {
                    id: docSnap.id,
                    ...data,
                    createdAt: data.createdAt?.toDate?.() || new Date(data.metadata?.timestamp || Date.now()),
                    updatedAt: data.updatedAt?.toDate?.() || null,
                    resolvedAt: data.resolvedAt?.toDate?.() || null
                };

            } catch (error) {
                console.error('❌ Error loading feedback:', error);
                throw error;
            }
        }

        /**
         * Delete feedback (admin only)
         */
        async deleteFeedback(feedbackId) {
            try {
                console.log('🗑️ Deleting feedback:', feedbackId);

                if (!window.firebaseDb) {
                    throw new Error('Firestore not available');
                }

                const feedbackDoc = window.firestoreFunctions.doc(window.firebaseDb, 'feedback', feedbackId);
                await window.firestoreFunctions.deleteDoc(feedbackDoc);

                console.log('✅ Feedback deleted');
                return { success: true };

            } catch (error) {
                console.error('❌ Error deleting feedback:', error);
                throw error;
            }
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
            
            if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
            if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
            if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
            return 'Just now';
        }

        /**
         * Format full date/time
         */
        formatDateTime(date) {
            if (!date) return 'Unknown';
            return date.toLocaleString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        }
    }

    // Create global instance
    window.feedbackAdminService = new FeedbackAdminService();

    // Export for module use
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = FeedbackAdminService;
    }

    console.log('✅ Feedback Admin Service loaded');
})();