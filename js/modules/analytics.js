/**
 * Analytics Module - Track usage patterns and insights
 * Shows where time goes and personal productivity insights
 */

const Analytics = {
  weeklyBarsContainer: null,
  lifetimeCostSpan: null,
  peakHourSpan: null,
  resetBtn: null,

  init() {
    this.weeklyBarsContainer = document.getElementById('weeklyBars');
    this.lifetimeCostSpan = document.getElementById('lifetimeCost');
    this.peakHourSpan = document.getElementById('peakHour');
    this.resetBtn = document.getElementById('resetAllDataBtn');

    if (this.resetBtn) {
      this.resetBtn.addEventListener('click', () => {
        if (confirm('⚠️ Reset all data? This cannot be undone.')) {
          AppState.resetAll();
          alert('✅ All data reset. Refresh to see changes.');
          location.reload();
        }
      });
    }

    this.updateAnalytics();
  },

  getWeeklyData() {
    const weekData = {
      Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0, Sat: 0, Sun: 0
    };

    const today = new Date();
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dayName = dayNames[date.getDay()];

      const dayTotal = AppState.focusSessions
        .filter(s => new Date(s.timestamp).toDateString() === date.toDateString())
        .reduce((sum, s) => sum + s.duration, 0);

      weekData[dayName] = Math.round(dayTotal);
    }

    return weekData;
  },

  renderWeeklyBars() {
    if (!this.weeklyBarsContainer) return;

    const data = this.getWeeklyData();
    const maxValue = Math.max(...Object.values(data), 1);

    let html = '';
    Object.entries(data).forEach(([day, value]) => {
      const percentage = (value / maxValue) * 100;
      html += `
        <div style="display: flex; flex-direction: column; align-items: center; gap: 0.5rem; flex: 1;">
          <div style="background: linear-gradient(180deg, #3b82f6, #2563eb); width: 100%; border-radius: 0.25rem; height: ${Math.max(percentage * 2, 8)}px;"></div>
          <div style="font-size: 0.75rem; color: var(--text-muted);">${day}</div>
          <div style="font-size: 0.85rem; font-weight: 600;">${value}m</div>
        </div>
      `;
    });

    this.weeklyBarsContainer.innerHTML = html;
  },

  getPeakHour() {
    const hourMap = {};
    AppState.focusSessions.forEach(session => {
      const date = new Date(session.timestamp);
      const hour = date.getHours();
      hourMap[hour] = (hourMap[hour] || 0) + session.duration;
    });

    const peakHour = Object.entries(hourMap).sort((a, b) => b[1] - a[1])[0];
    if (!peakHour) return '--:--';
    const hour = parseInt(peakHour[0], 10);
    const display = hour % 12 || 12;
    const period = hour >= 12 ? 'PM' : 'AM';
    return `${display} ${period}`;
  },

  updateAnalytics() {
    // Update weekly bars
    this.renderWeeklyBars();

    // Update lifetime cost
    if (this.lifetimeCostSpan) {
      const lifetimeTotal = AppState.purchases
        .reduce((sum, p) => sum + (parseFloat(p.hours) * AppState.hourlyRate), 0);
      this.lifetimeCostSpan.textContent = `$${Math.round(lifetimeTotal)}`;
    }

    // Update peak hour insight
    if (this.peakHourSpan) {
      this.peakHourSpan.textContent = this.getPeakHour();
    }

    // Update "well spent" ratio
    this.updateWellSpentRatio();
  },

  updateWellSpentRatio() {
    const wellSpentFill = document.getElementById('wellSpentFill');
    const wellSpentText = document.getElementById('wellSpentText');

    if (!wellSpentFill) return;

    const today = new Date().toDateString();
    const focusToday = AppState.focusSessions
      .filter(s => new Date(s.timestamp).toDateString() === today)
      .reduce((sum, s) => sum + s.duration, 0);

    // Simple ratio: 60 min focus = 100% well spent
    const ratio = Math.min((focusToday / 60) * 100, 100);
    wellSpentFill.style.width = `${ratio}%`;

    if (wellSpentText) {
      if (ratio === 0) {
        wellSpentText.textContent = 'Start a focus session to build your ratio';
      } else if (ratio < 33) {
        wellSpentText.textContent = `${Math.round(ratio)}% — Good start!`;
      } else if (ratio < 66) {
        wellSpentText.textContent = `${Math.round(ratio)}% — You're focused!`;
      } else if (ratio < 100) {
        wellSpentText.textContent = `${Math.round(ratio)}% — Excellent day!`;
      } else {
        wellSpentText.textContent = `100% — Outstanding focus!`;
      }
    }
  }
};
