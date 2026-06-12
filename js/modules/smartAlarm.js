/**
 * Smart Alarm Module - Calendar + Traffic + Weather Aware
 * Intelligently suggests wake-up times based on calendar, traffic, and weather
 */

const SmartAlarm = {
  baseAlarmInput: null,
  trafficSlider: null,
  trafficValue: null,
  calculateBtn: null,
  setBtn: null,
  recommendedSpan: null,
  alarmReason: null,
  alarmTimeDisplay: null,
  lastRecommended: null,

  init() {
    this.baseAlarmInput = document.getElementById('baseAlarmTime');
    this.trafficSlider = document.getElementById('trafficSlider');
    this.trafficValue = document.getElementById('trafficValue');
    this.calculateBtn = document.getElementById('calculateSmartAlarmBtn');
    this.setBtn = document.getElementById('setSmartAlarmBtn');
    this.recommendedSpan = document.getElementById('recommendedTime');
    this.alarmReason = document.getElementById('alarmReason');
    this.alarmTimeDisplay = document.getElementById('alarmTimeDisplay');

    if (!this.calculateBtn) return; // Not on alarm page

    this.calculateBtn.addEventListener('click', () => this.calculate());
    this.setBtn.addEventListener('click', () => this.setAlarm());
    this.trafficSlider.addEventListener('input', (e) => {
      this.trafficValue.textContent = `+${e.target.value} min extra travel`;
      this.calculate();
    });
    this.baseAlarmInput.addEventListener('change', () => this.calculate());

    // Listen to calendar checkboxes
    document.querySelectorAll('[data-event]').forEach(cb => {
      cb.addEventListener('change', () => this.calculate());
    });

    this.loadSavedAlarm();
    this.calculate();
  },

  getEarliestMeetingTime() {
    let earliest = null;
    document.querySelectorAll('[data-event]:checked').forEach(cb => {
      const start = cb.dataset.start;
      if (!start) return;
      const [hour, minute] = start.split(':').map(Number);
      const totalMinutes = hour * 60 + minute;
      if (earliest === null || totalMinutes < earliest) {
        earliest = totalMinutes;
      }
    });
    return earliest;
  },

  formatTime(minutes) {
    const hour = Math.floor(minutes / 60) % 24;
    const min = minutes % 60;
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${min.toString().padStart(2, '0')} ${ampm}`;
  },

  loadSavedAlarm() {
    const alarmPreview = document.getElementById('nextAlarmPreview');
    const statusText = document.getElementById('alarmStatusText');
    const savedAlarm = AppState.smartAlarm;

    if (savedAlarm?.time) {
      if (alarmPreview) alarmPreview.textContent = savedAlarm.enabled ? savedAlarm.time : '--:--';
      if (statusText) statusText.textContent = savedAlarm.enabled ? `Enabled for ${savedAlarm.time}` : 'Disabled';
      if (savedAlarm.enabled) {
        this.scheduleAlarmNotification(savedAlarm.time);
      }
    }
  },

  calculate() {
    if (!this.baseAlarmInput) return;

    const baseTime = this.baseAlarmInput.value;
    const [baseHour, baseMinute] = baseTime.split(':').map(Number);
    let baseMinutes = baseHour * 60 + baseMinute;

    const meetingTime = this.getEarliestMeetingTime();
    let commuteMinutes = 30; // default commute
    const trafficExtra = parseInt(this.trafficSlider.value) || 0;
    const totalCommute = commuteMinutes + trafficExtra;

    let recommendedMinutes = baseMinutes;
    let reason = '';

    if (meetingTime !== null) {
      const requiredWake = meetingTime - totalCommute;
      if (requiredWake < baseMinutes) {
        recommendedMinutes = requiredWake;
        reason = `Meeting at ${this.formatTime(meetingTime)} requires ${totalCommute} min travel.`;
      } else {
        reason = `Meeting starts after your preferred wake time; keeping the requested alarm.`;
      }
    } else {
      reason = `No calendar conflicts. Alarm set as requested.`;
    }

    // Add weather-based adjustment
    if (typeof Weather !== 'undefined' && Weather.currentForecast) {
      const weatherAlert = Weather.getWeatherAlert(Weather.currentForecast);
      if (weatherAlert && weatherAlert.severity === 'danger') {
        // Add 15 minutes for severe weather
        recommendedMinutes = Math.max(recommendedMinutes - 15, 4 * 60);
        reason += ` ⚠️ Severe weather tomorrow — adding 15 min buffer.`;
      }
    }

    // Never wake before 4 AM sanity
    if (recommendedMinutes < 4 * 60) recommendedMinutes = 4 * 60;

    const recHour = Math.floor(recommendedMinutes / 60);
    const recMin = recommendedMinutes % 60;
    const recTimeStr = this.formatTime(recommendedMinutes);

    this.recommendedSpan.textContent = recTimeStr;
    this.alarmReason.textContent = reason;
    this.alarmTimeDisplay.textContent = recTimeStr;

    this.lastRecommended = { hour: recHour, minute: recMin, time: recTimeStr };
  },

  setAlarm() {
    if (this.lastRecommended) {
      const timeStr = `${this.lastRecommended.hour.toString().padStart(2, '0')}:${this.lastRecommended.minute.toString().padStart(2, '0')}`;
      AppState.smartAlarm = { time: timeStr, enabled: true };
      Storage.set('smartAlarm', AppState.smartAlarm);
      this.scheduleAlarmNotification(timeStr);
      alert(`✅ Alarm set for ${this.recommendedSpan.textContent}. Wake up intentionally!`);
      this.updateDashboardPreview();
    }
  },

  scheduleAlarmNotification(timeStr) {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    if (!timeStr) return;

    const [hour, minute] = timeStr.split(':').map(Number);
    const now = new Date();
    const target = new Date(now);
    target.setHours(hour, minute, 0, 0);
    if (target <= now) {
      target.setDate(target.getDate() + 1);
    }

    const delay = target - now;
    if (this.notificationTimeout) clearTimeout(this.notificationTimeout);
    this.notificationTimeout = setTimeout(() => {
      new Notification('⏰ Smart Alarm', {
        body: `Time to wake up: ${this.formatTime(hour * 60 + minute)}`,
      });
    }, delay);
  },

  updateDashboardPreview() {
    const alarmPreview = document.getElementById('nextAlarmPreview');
    const statusText = document.getElementById('alarmStatusText');
    const alarm = AppState.smartAlarm;

    if (alarmPreview) {
      alarmPreview.textContent = alarm?.enabled ? alarm.time : '--:--';
    }
    if (statusText) {
      statusText.textContent = alarm?.enabled ? `Enabled for ${alarm.time}` : 'Disabled';
    }
  }
};
