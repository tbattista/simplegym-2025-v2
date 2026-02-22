/**
 * Dashboard Demo - Main Controller
 * Orchestrates dashboard components and data fetching
 * @version 1.0.0
 */

// Global dashboard state
window.dashboardDemo = {
  data: {
    workouts: [],
    recentSessions: [],
    weeklyProgress: null,
    quickStats: null
  },
  components: {},
  isLoading: false,
  useRealData: false // Toggle between mock and Firebase data
};

/**
 * Initialize dashboard
 */
async function initDashboard() {
  console.log('📊 Initializing Dashboard Demo...');
  
  try {
    // Wait for Firebase if using real data
    if (window.firebaseReady && window.dataManager) {
      await window.dataManager.waitForAuthReady();
      
      // Check if user is authenticated
      if (window.dataManager.isUserAuthenticated()) {
        console.log('✅ User authenticated - using real data');
        window.dashboardDemo.useRealData = true;
      } else {
        console.log('ℹ️ User not authenticated - using mock data');
        window.dashboardDemo.useRealData = false;
      }
    }
    
    // Load and render dashboard
    await loadDashboardData();
    renderDashboard();
    
    // Set up event listeners
    setupEventListeners();
    
    console.log('✅ Dashboard initialized successfully');
    
  } catch (error) {
    console.error('❌ Dashboard initialization error:', error);
    showError('Failed to load dashboard. Please refresh the page.');
  }
}

/**
 * Load dashboard data
 */
async function loadDashboardData() {
  showLoading();
  
  try {
    if (window.dashboardDemo.useRealData) {
      await loadRealData();
    } else {
      loadMockData();
    }
    
    hideLoading();
  } catch (error) {
    console.error('❌ Error loading dashboard data:', error);
    hideLoading();
    throw error;
  }
}

/**
 * Load real data from Firebase
 */
async function loadRealData() {
  console.log('📡 Loading real data from Firebase...');
  
  try {
    // Load workouts
    const workouts = await window.dataManager.getWorkouts({ pageSize: 20 });
    window.dashboardDemo.data.workouts = workouts;
    
    // Load recent sessions (if API available)
    try {
      const token = await window.dataManager.getAuthToken();
      const response = await fetch('/api/v3/workout-sessions?page_size=100&sort=desc', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        window.dashboardDemo.data.recentSessions = data.sessions || [];
      }
    } catch (err) {
      console.warn('⚠️ Could not load recent sessions:', err);
      window.dashboardDemo.data.recentSessions = [];
    }
    
    // Calculate weekly progress and stats
    window.dashboardDemo.data.weeklyProgress = await calculateWeeklyProgress();
    window.dashboardDemo.data.quickStats = await calculateQuickStats();
    
    console.log('✅ Real data loaded successfully');
  } catch (error) {
    console.error('❌ Error loading real data:', error);
    // Fallback to mock data
    loadMockData();
  }
}

/**
 * Load mock data for demo
 */
function loadMockData() {
  console.log('📦 Loading mock data for demo...');
  
  window.dashboardDemo.data.workouts = getMockWorkouts();
  window.dashboardDemo.data.recentSessions = getMockSessions();
  window.dashboardDemo.data.weeklyProgress = getMockWeeklyProgress();
  window.dashboardDemo.data.quickStats = getMockQuickStats();
}

/**
 * Render dashboard sections
 */
function renderDashboard() {
  renderCompactHeader();
  renderQuickStats();
  renderWeeklyProgress();
  renderRecentActivity();
}

/**
 * Render compact header with greeting only (no action buttons - this is a review page)
 */
function renderCompactHeader() {
  const container = document.getElementById('compactHeader');
  if (!container) return;

  const user = window.dataManager?.getCurrentUser();
  const userName = user?.displayName || user?.email?.split('@')[0] || '';
  const greeting = getTimeBasedGreeting();

  // Format current date
  const today = new Date();
  const dateOptions = { weekday: 'long', month: 'long', day: 'numeric' };
  const formattedDate = today.toLocaleDateString('en-US', dateOptions);

  container.innerHTML = `
    <div class="dashboard-header">
      <span class="text-muted small">${formattedDate}</span>
      <h4 class="mb-0 greeting-text">${greeting}${userName ? ', ' + escapeHtml(userName) : ''}!</h4>
    </div>
  `;
}

/**
 * Render weekly progress section
 */
function renderWeeklyProgress() {
  const container = document.getElementById('weeklyProgressContainer');
  if (!container) return;
  
  const progressData = window.dashboardDemo.data.weeklyProgress;
  const progressWidget = new WeeklyProgress(progressData);
  
  container.innerHTML = '';
  container.appendChild(progressWidget.render());
  
  window.dashboardDemo.components.weeklyProgress = progressWidget;
}

/**
 * Render recent activity section
 */
function renderRecentActivity() {
  const container = document.getElementById('recentActivityContainer');
  if (!container) return;
  
  const sessions = window.dashboardDemo.data.recentSessions;
  
  if (sessions.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <i class="bx bx-history empty-state-icon"></i>
        <h5 class="empty-state-title">No Activity Yet</h5>
        <p class="empty-state-text">Complete a workout to see it here</p>
      </div>
    `;
    return;
  }
  
  // Clear container
  container.innerHTML = '';
  
  // Render session cards (limit to 3)
  sessions.slice(0, 3).forEach(session => {
    const card = new RecentSessionCard(session);
    container.appendChild(card.render());
  });
}

/**
 * Render quick stats grid
 */
function renderQuickStats() {
  const container = document.getElementById('quickStatsContainer');
  if (!container) return;
  
  const stats = window.dashboardDemo.data.quickStats;
  const statsWidget = new StatsWidget(stats);
  
  container.innerHTML = '';
  container.appendChild(statsWidget.render());
  
  window.dashboardDemo.components.quickStats = statsWidget;
}

/**
 * Calculate weekly progress
 */
async function calculateWeeklyProgress() {
  const sessions = window.dashboardDemo.data.recentSessions;
  
  // Get sessions from this week
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay()); // Start of week (Sunday)
  weekStart.setHours(0, 0, 0, 0);
  
  const weekSessions = sessions.filter(session => {
    const sessionDate = new Date(session.completed_at);
    return sessionDate >= weekStart;
  });
  
  // Calculate streak
  const streak = await calculateStreak(sessions);
  
  return {
    completed: weekSessions.length,
    goal: 5, // Default goal, could be user preference
    streak: streak
  };
}

/**
 * Calculate consecutive day streak
 */
async function calculateStreak(sessions) {
  if (sessions.length === 0) return 0;
  
  // Sort sessions by date descending
  const sorted = [...sessions].sort((a, b) => 
    new Date(b.completed_at) - new Date(a.completed_at)
  );
  
  let streak = 0;
  let currentDate = new Date();
  currentDate.setHours(0, 0, 0, 0);
  
  for (const session of sorted) {
    const sessionDate = new Date(session.completed_at);
    sessionDate.setHours(0, 0, 0, 0);
    
    const diffDays = Math.floor((currentDate - sessionDate) / (1000 * 60 * 60 * 24));
    
    if (diffDays === streak || (streak === 0 && diffDays <= 1)) {
      streak++;
      currentDate = sessionDate;
    } else {
      break;
    }
  }
  
  return streak;
}

/**
 * Calculate quick stats - simplified for insight/recall
 * Answers: "What did I do this week/month?"
 */
async function calculateQuickStats() {
  const sessions = window.dashboardDemo.data.recentSessions;
  const now = new Date();

  // This week count
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay()); // Start of week (Sunday)
  weekStart.setHours(0, 0, 0, 0);

  const weekCount = sessions.filter(s => {
    const d = new Date(s.completed_at);
    return d >= weekStart;
  }).length;

  // This month count
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthCount = sessions.filter(s => {
    const d = new Date(s.completed_at);
    return d >= monthStart;
  }).length;

  // Average duration
  const totalDuration = sessions.reduce((sum, s) => sum + (s.duration_minutes || 0), 0);
  const avgDuration = sessions.length > 0 ? Math.round(totalDuration / sessions.length) : 0;

  return [
    {
      label: 'This Month',
      value: monthCount,
      icon: 'bx-calendar',
      iconColor: 'var(--bs-success)'
    },
    {
      label: 'Avg Duration',
      value: `${avgDuration}min`,
      icon: 'bx-time',
      iconColor: 'var(--bs-info)'
    }
  ];
}

/**
 * Set up event listeners
 */
function setupEventListeners() {
  // Refresh button
  const refreshBtn = document.getElementById('refreshDashboard');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', async () => {
      await loadDashboardData();
      renderDashboard();
    });
  }
  
  // Listen for auth state changes
  window.addEventListener('authStateChanged', async (event) => {
    const { isAuthenticated } = event.detail;
    window.dashboardDemo.useRealData = isAuthenticated;
    
    // Reload dashboard
    await loadDashboardData();
    renderDashboard();
  });
}

/**
 * Get time-based greeting
 */
function getTimeBasedGreeting() {
  const hour = new Date().getHours();
  
  if (hour < 12) return 'Good Morning';
  if (hour < 18) return 'Good Afternoon';
  return 'Good Evening';
}

/**
 * Show loading state
 */
function showLoading() {
  window.dashboardDemo.isLoading = true;
  const loadingEl = document.getElementById('dashboardLoading');
  if (loadingEl) loadingEl.style.display = 'block';
}

/**
 * Hide loading state
 */
function hideLoading() {
  window.dashboardDemo.isLoading = false;
  const loadingEl = document.getElementById('dashboardLoading');
  if (loadingEl) loadingEl.style.display = 'none';
}

/**
 * Show error message
 */
function showError(message) {
  console.error('Dashboard Error:', message);
  // Could show toast or alert
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Mock data generators
 */
function getMockWorkouts() {
  return [
    {
      id: 'mock-workout-1',
      name: 'Push Day A',
      workout_data: {
        exercise_groups: [
          { exercises: { '1': 'Bench Press', '2': 'Incline DB Press', '3': 'Cable Flyes', '4': 'Tricep Dips', '5': 'Overhead Press', '6': 'Lateral Raises' } }
        ],
      },
      estimated_duration: 45,
      last_completed: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'mock-workout-2',
      name: 'Pull Day',
      workout_data: {
        exercise_groups: [
          { exercises: { '1': 'Pull-ups', '2': 'Barbell Rows', '3': 'Lat Pulldown', '4': 'Face Pulls', '5': 'Bicep Curls' } }
        ],
      },
      estimated_duration: 40,
      last_completed: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'mock-workout-3',
      name: 'Leg Day',
      workout_data: {
        exercise_groups: [
          { exercises: { '1': 'Squats', '2': 'Romanian Deadlifts', '3': 'Leg Press', '4': 'Leg Curls', '5': 'Calf Raises' } }
        ],
      },
      estimated_duration: 50,
      last_completed: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
    }
  ];
}

function getMockSessions() {
  return [
    {
      id: 'session-1',
      workout_id: 'mock-workout-1',
      workout_name: 'Push Day A',
      completed_at: new Date().toISOString(),
      duration_minutes: 52,
      exercises_performed: [
        { exercise_name: 'Bench Press', weight: 185, target_sets: 4, target_reps: 8, is_skipped: false },
        { exercise_name: 'Incline DB Press', weight: 65, target_sets: 3, target_reps: 10, is_skipped: false },
        { exercise_name: 'Cable Flyes', weight: 30, target_sets: 3, target_reps: 12, is_skipped: false },
        { exercise_name: 'Tricep Dips', weight: 0, target_sets: 3, target_reps: 12, is_skipped: false },
        { exercise_name: 'Overhead Press', weight: 95, target_sets: 4, target_reps: 8, is_skipped: false },
        { exercise_name: 'Lateral Raises', weight: 20, target_sets: 3, target_reps: 12, is_skipped: false }
      ]
    },
    {
      id: 'session-2',
      workout_id: 'mock-workout-2',
      workout_name: 'Pull Day',
      completed_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      duration_minutes: 48,
      exercises_performed: [
        { exercise_name: 'Pull-ups', weight: 0, target_sets: 4, target_reps: 8, is_skipped: false },
        { exercise_name: 'Barbell Rows', weight: 135, target_sets: 4, target_reps: 8, is_skipped: false },
        { exercise_name: 'Lat Pulldown', weight: 120, target_sets: 3, target_reps: 10, is_skipped: false },
        { exercise_name: 'Face Pulls', weight: 40, target_sets: 3, target_reps: 15, is_skipped: false },
        { exercise_name: 'Bicep Curls', weight: 30, target_sets: 3, target_reps: 12, is_skipped: false }
      ]
    }
  ];
}

function getMockWeeklyProgress() {
  return {
    completed: 3,
    goal: 5,
    streak: 12
  };
}

function getMockQuickStats() {
  return [
    { label: 'This Month', value: 12, icon: 'bx-calendar', iconColor: 'var(--bs-success)' },
    { label: 'Avg Duration', value: '45min', icon: 'bx-time', iconColor: 'var(--bs-info)' }
  ];
}

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', initDashboard);

// Export for global use
window.initDashboard = initDashboard;
window.dashboardDemo.loadDashboardData = loadDashboardData;
window.dashboardDemo.renderDashboard = renderDashboard;

console.log('📦 Dashboard Demo controller loaded (v1.0.0)');
