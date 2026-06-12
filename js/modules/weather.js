/**
 * Weather Module - WeatherAPI.com Integration
 * Provides real-time weather, forecasts, and alerts
 * Enhances Smart Alarm with weather-aware wake-up times
 */

const Weather = {
  apiKey: null,
  baseUrl: 'https://api.weatherapi.com/v1',
  currentWeather: null,
  currentForecast: null,
  lastUpdate: null,
  updateInterval: null,

  /**
   * Initialize weather module with API key
   */
  init() {
    if (
      typeof CONFIG === 'undefined' ||
      !CONFIG.WEATHER_API_KEY ||
      CONFIG.WEATHER_API_KEY === '__WEATHER_API_KEY__'
    ) {
      console.warn('⚠️ Weather API not configured');
      this.apiKey = null;
      this.renderUnavailable('Weather features are disabled until the API key is configured.');
      this.setupWeatherView();
      return;
    }

    this.apiKey = CONFIG.WEATHER_API_KEY;

    const savedLocation = Storage.get('weatherLocation', null);
    if (savedLocation) {
      this.setLocation(savedLocation);
    } else {
      this.detectLocationByIP();
    }

    this.updateInterval = setInterval(() => this.refreshWeather(), 600000);
    this.setupWeatherView();

    console.log('✅ Weather module initialized');
  },

  /**
   * Detect first run location by IP and load weather
   */
  async detectLocationByIP() {
    try {
      await this.fetchCurrentWeather('auto:ip');
      await this.fetchForecast('auto:ip');
      const locationName = this.currentWeather?.location?.name;
      if (locationName) {
        Storage.set('weatherLocation', locationName);
      }
      this.updateDashboard();
      this.renderWeatherView();
      return true;
    } catch (error) {
      console.warn('⚠️ IP-based weather lookup failed:', error);
      return false;
    }
  },

  /**
   * Setup weather view interactions
   */
  setupWeatherView() {
    const searchBtn = document.getElementById('searchWeatherBtn');
    const locationInput = document.getElementById('weatherLocationInput');

    if (!searchBtn || !locationInput) return;

    if (!this.apiKey) {
      locationInput.disabled = true;
      searchBtn.disabled = true;
      searchBtn.textContent = 'Weather Unavailable';
      return;
    }

    searchBtn.addEventListener('click', () => {
      const location = locationInput.value.trim();
      if (location) {
        this.setLocation(location);
        locationInput.value = '';
      }
    });

    locationInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        const location = locationInput.value.trim();
        if (location) {
          this.setLocation(location);
          locationInput.value = '';
        }
      }
    });
  },

  /**
   * Set location and fetch weather
   */
  async setLocation(location) {
    if (!this.apiKey) {
      alert('Weather search is unavailable without an API key.');
      return false;
    }

    try {
      Storage.set('weatherLocation', location);
      await this.fetchCurrentWeather(location);
      await this.fetchForecast(location);
      this.updateDashboard();
      this.renderWeatherView();
      return true;
    } catch (error) {
      console.error('Error setting location:', error);
      alert(`❌ Could not find weather for "${location}". Try another location.`);
      return false;
    }
  },

  /**
   * Fetch current weather
   */
  async fetchCurrentWeather(query) {
    try {
      const url = `${this.baseUrl}/current.json?key=${this.apiKey}&q=${encodeURIComponent(query)}&aqi=yes`;
      const response = await fetch(url);
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Failed to fetch weather');
      }

      this.currentWeather = await response.json();
      this.lastUpdate = new Date();
      return this.currentWeather;
    } catch (error) {
      console.error('Weather fetch error:', error);
      throw error;
    }
  },

  /**
   * Fetch weather forecast (7 days)
   */
  async fetchForecast(query, days = 7) {
    try {
      const url = `${this.baseUrl}/forecast.json?key=${this.apiKey}&q=${encodeURIComponent(query)}&days=${days}&aqi=yes&alerts=yes`;
      const response = await fetch(url);
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Failed to fetch forecast');
      }

      this.currentForecast = await response.json();
      return this.currentForecast;
    } catch (error) {
      console.error('Forecast fetch error:', error);
      throw error;
    }
  },

  /**
   * Search for cities
   */
  async searchCities(query) {
    try {
      const url = `${this.baseUrl}/search.json?key=${this.apiKey}&q=${encodeURIComponent(query)}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error('City search failed');
      }

      return await response.json();
    } catch (error) {
      console.error('Search error:', error);
      return [];
    }
  },

  /**
   * Get astronomy data (sunrise, sunset, moon)
   */
  async getAstronomy(query, date = null) {
    try {
      let url = `${this.baseUrl}/astronomy.json?key=${this.apiKey}&q=${encodeURIComponent(query)}`;
      if (date) url += `&dt=${date}`;
      
      const response = await fetch(url);
      if (!response.ok) throw new Error('Astronomy fetch failed');
      
      return await response.json();
    } catch (error) {
      console.error('Astronomy error:', error);
      return null;
    }
  },

  /**
   * Refresh current weather
   */
  async refreshWeather() {
    if (!this.currentWeather) return;
    const location = this.currentWeather.location.name;
    await this.fetchCurrentWeather(location);
    this.updateDashboard();
    this.renderWeatherView();
  },

  /**
   * Format weather condition with emoji
   */
  getWeatherEmoji(conditionCode) {
    const weatherEmojis = {
      1000: '☀️', // Sunny
      1003: '⛅', // Partly cloudy
      1006: '☁️', // Cloudy
      1009: '☁️', // Overcast
      1030: '🌫️', // Mist
      1063: '🌧️', // Patchy rain
      1066: '🌨️', // Patchy snow
      1069: '🌨️', // Patchy sleet
      1072: '🌨️', // Patchy freezing drizzle
      1087: '⛈️', // Thundery outbreaks
      1114: '🌨️', // Blizzard
      1117: '🌨️', // Blizzard
      1135: '🌫️', // Fog
      1147: '🌫️', // Freezing fog
      1150: '🌧️', // Patchy light drizzle
      1153: '🌧️', // Light drizzle
      1180: '🌧️', // Patchy light rain
      1183: '🌧️', // Light rain
      1186: '🌧️', // Moderate rain
      1189: '🌧️', // Moderate rain
      1192: '🌧️', // Heavy rain
      1195: '🌧️', // Heavy rain
      1198: '🌧️', // Light freezing rain
      1201: '🌧️', // Moderate or heavy freezing rain
      1204: '🌧️', // Light sleet
      1207: '🌧️', // Moderate or heavy sleet
      1210: '🌨️', // Patchy light snow
      1213: '🌨️', // Light snow
      1216: '🌨️', // Patchy moderate snow
      1219: '🌨️', // Moderate snow
      1222: '🌨️', // Patchy heavy snow
      1225: '🌨️', // Heavy snow
      1237: '🧊', // Ice pellets
      1240: '🌧️', // Light rain shower
      1243: '🌧️', // Moderate or heavy rain shower
      1246: '🌧️', // Torrential rain shower
      1249: '🌧️', // Light sleet showers
      1252: '🌧️', // Moderate or heavy sleet showers
      1255: '🌨️', // Light snow showers
      1258: '🌨️', // Moderate or heavy snow showers
      1261: '🧊', // Light hail showers
      1264: '🧊', // Moderate or heavy hail showers
      1273: '⛈️', // Patchy light rain
      1276: '⛈️', // Moderate or heavy rain
      1279: '⛈️', // Patchy light snow
      1282: '⛈️'  // Moderate or heavy snow
    };
    return weatherEmojis[conditionCode] || '🌡️';
  },

  /**
   * Get weather recommendation for wake-up
   */
  getWeatherAlert(forecast) {
    if (!forecast?.forecast?.forecastday[0]) return null;

    const tomorrow = forecast.forecast.forecastday[0];
    const condition = tomorrow.day.condition.text.toLowerCase();
    const maxTemp = tomorrow.day.maxtemp_c;
    const rainChance = tomorrow.day.daily_chance_of_rain || 0;

    let alert = null;
    let severity = 'info'; // info, warning, danger

    if (rainChance > 70) {
      alert = `☔ ${rainChance}% chance of rain tomorrow. Bring umbrella!`;
      severity = 'warning';
    } else if (maxTemp > 30) {
      alert = `🔥 Hot day ahead (${maxTemp}°C). Stay hydrated!`;
      severity = 'warning';
    } else if (maxTemp < 0) {
      alert = `❄️ Freezing conditions (${maxTemp}°C). Dress warmly!`;
      severity = 'warning';
    } else if (condition.includes('snow') || condition.includes('sleet')) {
      alert = `🌨️ Snow expected. Plan extra commute time!`;
      severity = 'danger';
    } else if (condition.includes('storm') || condition.includes('thunder')) {
      alert = `⛈️ Thunderstorm possible. Stay safe!`;
      severity = 'danger';
    }

    return alert ? { message: alert, severity } : null;
  },

  /**
   * Update dashboard weather display
   */
  updateDashboard() {
    if (!this.currentWeather) return;

    const current = this.currentWeather.current;
    const location = this.currentWeather.location;

    // Update weather card in dashboard or smart alarm
    const weatherDisplay = document.getElementById('weatherDisplay');
    if (weatherDisplay) {
      const emoji = this.getWeatherEmoji(current.condition.code);
      weatherDisplay.innerHTML = `
        <div style="text-align: center;">
          <div style="font-size: 2rem; margin-bottom: 0.5rem;">${emoji}</div>
          <div style="font-size: 0.9rem; color: var(--text-muted);">${location.name}, ${location.country}</div>
          <div style="font-size: 1.5rem; font-weight: 700;">${current.temp_c}°C</div>
          <div style="font-size: 0.85rem; color: var(--text-muted);">${current.condition.text}</div>
          <div style="font-size: 0.8rem; margin-top: 0.5rem; color: var(--text-muted);">
            💧 ${current.humidity}% | 💨 ${Math.round(current.wind_kph)} km/h | 🌡️ Feels ${current.feelslike_c}°C
          </div>
        </div>
      `;
    }

    // Update smart alarm view if visible
    if (this.currentForecast) {
      const alert = this.getWeatherAlert(this.currentForecast);
      if (alert) {
        const alertEl = document.getElementById('weatherAlert');
        if (alertEl) {
          alertEl.innerHTML = `
            <div style="padding: 1rem; border-radius: 0.5rem; background: var(--surface-elevated); 
                        border-left: 4px solid ${alert.severity === 'danger' ? 'var(--danger)' : 'var(--warning)'};">
              ${alert.message}
            </div>
          `;
        }
      }
    }
  },

  /**
   * Render weather view with forecast
   */
  renderWeatherView() {
    if (!this.currentWeather || !this.currentForecast) {
      this.renderUnavailable('Weather data is unavailable. Please configure your API key or try again later.');
      return;
    }

    const current = this.currentWeather.current;
    const location = this.currentWeather.location;
    const forecast = this.currentForecast.forecast.forecastday;

    // Render current weather
    const currentDisplay = document.getElementById('currentWeatherDisplay');
    if (currentDisplay) {
      const emoji = this.getWeatherEmoji(current.condition.code);
      currentDisplay.innerHTML = `
        <div style="text-align: center;">
          <div style="font-size: 3rem; margin-bottom: 1rem;">${emoji}</div>
          <h2 style="margin-bottom: 0.5rem;">${location.name}, ${location.region}</h2>
          <div style="font-size: 2.5rem; font-weight: 700; margin-bottom: 0.5rem;">${current.temp_c}°C</div>
          <div style="font-size: 1.1rem; color: var(--text-muted); margin-bottom: 1rem;">${current.condition.text}</div>
          <div class="weather-details">
            <div class="detail-item">
              <div class="detail-label">Feels Like</div>
              <div class="detail-value">${current.feelslike_c}°C</div>
            </div>
            <div class="detail-item">
              <div class="detail-label">Humidity</div>
              <div class="detail-value">${current.humidity}%</div>
            </div>
            <div class="detail-item">
              <div class="detail-label">Wind</div>
              <div class="detail-value">${Math.round(current.wind_kph)} km/h</div>
            </div>
            <div class="detail-item">
              <div class="detail-label">UV Index</div>
              <div class="detail-value">${current.uv}</div>
            </div>
            <div class="detail-item">
              <div class="detail-label">Visibility</div>
              <div class="detail-value">${current.vis_km} km</div>
            </div>
            <div class="detail-item">
              <div class="detail-label">Pressure</div>
              <div class="detail-value">${current.pressure_mb} mb</div>
            </div>
          </div>
          <div style="margin-top: 1rem; font-size: 0.9rem; color: var(--text-muted);">
            Last updated: ${new Date(current.last_updated).toLocaleTimeString()}
          </div>
        </div>
      `;
    }

    // Render forecast
    const forecastDisplay = document.getElementById('forecastDisplay');
    if (forecastDisplay) {
      forecastDisplay.innerHTML = forecast.map(day => {
        const emoji = this.getWeatherEmoji(day.day.condition.code);
        const date = new Date(day.date);
        const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
        return `
          <div class="forecast-item">
            <div class="forecast-day">${dayName}</div>
            <div class="forecast-emoji">${emoji}</div>
            <div class="forecast-temp">${day.day.maxtemp_c}°C</div>
            <div class="forecast-condition">${day.day.condition.text}</div>
            <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 0.5rem;">
              ☔ ${day.day.daily_chance_of_rain}%
            </div>
          </div>
        `;
      }).join('');
    }
  },

  renderUnavailable(message) {
    const weatherDisplay = document.getElementById('weatherDisplay');
    const currentDisplay = document.getElementById('currentWeatherDisplay');
    const forecastDisplay = document.getElementById('forecastDisplay');
    const weatherAlertEl = document.getElementById('weatherAlert');

    const fallbackHtml = `
      <div style="text-align:center; padding:1.5rem; color: var(--text-muted);">
        <div style="font-size: 2.2rem; margin-bottom: 1rem;">🌧️</div>
        <div>${message}</div>
      </div>
    `;

    if (weatherDisplay) weatherDisplay.innerHTML = fallbackHtml;
    if (currentDisplay) currentDisplay.innerHTML = fallbackHtml;
    if (forecastDisplay) forecastDisplay.innerHTML = `<div style="text-align:center; color: var(--text-muted);">Forecast unavailable.</div>`;
    if (weatherAlertEl) weatherAlertEl.innerHTML = '';
  },

  /**
   * Get current weather data
   */
  getCurrentWeather() {
    return this.currentWeather;
  },

  /**
   * Get current forecast data
   */
  getForecast() {
    return this.currentForecast;
  },

  /**
   * Destroy weather module
   */
  destroy() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
  }
};
