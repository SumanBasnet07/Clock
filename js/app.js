/**
 * TimeOS - Main Application Orchestrator
 * Production-grade entry point managing all modules
 */

const QuoteManager = {
  quotes: [
    '“The bad news is time flies. The good news is you’re the pilot.”',
    '“Focus on being productive instead of busy.”',
    '“Small habits make a big difference over time.”',
    '“The future depends on what you do today.”',
    '“The more you eliminate, the more powerful you become.”'
  ],
  getRandom() {
    return this.quotes[Math.floor(Math.random() * this.quotes.length)];
  }
};

function getDashboardGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

function refreshDashboardIntro() {
  const greetingEl = document.getElementById('dashboardGreeting');
  const summaryEl = document.getElementById('motivationalQuote');
  const alarmStatusEl = document.getElementById('alarmStatusText');
  const alarmStatusBadge = document.getElementById('alarmStatusPreview');

  if (greetingEl) greetingEl.textContent = `${getDashboardGreeting()}, welcome back.`;
  if (summaryEl) summaryEl.textContent = QuoteManager.getRandom();

  const alarm = AppState.smartAlarm;
  if (alarmStatusEl) {
    alarmStatusEl.textContent = alarm?.enabled ? `Enabled for ${alarm.time}` : 'Disabled';
  }
  if (alarmStatusBadge) {
    alarmStatusBadge.textContent = alarm?.enabled ? `Alarm set ${alarm.time}` : 'No alarm set';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  console.log('🚀 TimeOS Initializing...');

  // Initialize all modules in order
  Weather.init();
  SmartAlarm.init();
  FocusTimer.init();
  TimeCost.init();
  Analytics.init();

  // Setup navigation
  setupNavigation();

  // Request notification permissions
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }

  // Initial dashboard updates
  setTimeout(() => {
    FocusTimer.updateStats();
    TimeCost.updateDashboardCost();
    SmartAlarm.updateDashboardPreview();
    Analytics.updateWellSpentRatio();
    refreshDashboardIntro();
  }, 100);

  // Periodic dashboard refreshes
  setInterval(() => {
    FocusTimer.updateStats();
    TimeCost.updateDashboardCost();
    SmartAlarm.updateDashboardPreview();
    Analytics.updateWellSpentRatio();
    refreshDashboardIntro();
  }, 30000); // Update every 30 seconds

  console.log('✅ TimeOS Ready');
});

/**
 * Setup navigation between views
 */
function setupNavigation() {
  const navItems = document.querySelectorAll('.nav-item');
  const views = document.querySelectorAll('.view');

  navItems.forEach(item => {
    item.addEventListener('click', () => {
      const viewId = item.getAttribute('data-view');

      // Update active nav item
      navItems.forEach(nav => nav.classList.remove('active'));
      item.classList.add('active');

      // Update active view
      views.forEach(view => view.classList.remove('active-view'));
      const targetView = document.getElementById(`${viewId}View`);
      if (targetView) {
        targetView.classList.add('active-view');

        // Trigger analytics view update if needed
        if (viewId === 'analytics') {
          Analytics.updateAnalytics();
        }
      }
    });
  });
}
