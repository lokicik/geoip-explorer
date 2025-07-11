<template>
  <div class="compact-info-card">
    <!-- Timezone & Weather Combined Header -->
    <div class="info-header">
      <div class="location-info">
        <h4 class="location-title">{{ data.city }}, {{ data.country_name }}</h4>
        <div class="timezone-badge">{{ getTimezoneName(data.timezone) }}</div>
      </div>
      <button
        @click="refreshData"
        class="refresh-btn"
        :class="{ spinning: loading }"
        title="Refresh"
      >
        🔄
      </button>
    </div>

    <!-- Time Comparison -->
    <div class="time-section">
      <div class="time-item">
        <span class="time-label">Local Time</span>
        <span class="time-value">{{ formattedLocalTime }}</span>
      </div>
      <div class="time-divider">⟷</div>
      <div class="time-item" v-if="timeData">
        <span class="time-label">{{ data.city }} Time</span>
        <span class="time-value" :class="{ 'night-time': !timeData.isDaytime }">
          {{ timeData.targetTime }}
        </span>
      </div>
    </div>

    <!-- Weather Info -->
    <div class="weather-section" v-if="!weatherError && weatherData">
      <div class="weather-main">
        <span class="weather-icon">{{ weatherData.icon }}</span>
        <div class="weather-text">
          <span class="temperature">{{ weatherData.temperature }}°C</span>
          <span class="description">{{ weatherData.description }}</span>
        </div>
      </div>

      <div class="weather-details">
        <div class="detail-item">
          <span class="detail-icon">💧</span>
          <span class="detail-text">{{ weatherData.humidity }}%</span>
        </div>
        <div class="detail-item">
          <span class="detail-icon">🌬️</span>
          <span class="detail-text">{{ weatherData.windSpeed }} km/h</span>
        </div>
        <div class="detail-item">
          <span class="detail-icon">👁️</span>
          <span class="detail-text">{{ weatherData.visibility }} km</span>
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="loading-state">
      <span class="loading-spinner">⏳</span>
      <span class="loading-text">Loading...</span>
    </div>

    <!-- Error State -->
    <div v-if="weatherError" class="error-state">
      <span class="error-icon">⚠️</span>
      <span class="error-text">Weather unavailable</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useTimezone } from '@/composables/useTimezone'
import { useWeather } from '@/composables/useWeather'
import type { GeolocationData } from '@/composables/useIpGeolocation'

const props = defineProps<{
  data: GeolocationData
}>()

const { timeData, formattedLocalTime, updateTimeData, getTimezoneName } = useTimezone()
const { weatherData, error: weatherError, fetchWeather } = useWeather()

const loading = ref(false)

async function refreshData() {
  loading.value = true
  try {
    updateTimeData(props.data.timezone)
    await fetchWeather(props.data.latitude, props.data.longitude, props.data.city)
  } catch (error) {
    console.error('Error refreshing data:', error)
  } finally {
    loading.value = false
  }
}

watch(() => props.data, refreshData, { immediate: true })
onMounted(() => refreshData())
</script>

<style scoped>
.compact-info-card {
  background: var(--tactical-bg);
  border: 2px solid var(--tactical-border-dim);
  padding: var(--space-lg);
  transition: all 0.2s ease;
  position: relative;
}

.compact-info-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 25px;
  height: 25px;
  border-top: 2px solid var(--tactical-border);
  border-left: 2px solid var(--tactical-border);
}

.compact-info-card::after {
  content: '';
  position: absolute;
  bottom: 0;
  right: 0;
  width: 25px;
  height: 25px;
  border-bottom: 2px solid var(--tactical-border);
  border-right: 2px solid var(--tactical-border);
}

.compact-info-card:hover {
  border-color: var(--tactical-border);
  box-shadow: var(--shadow-hover);
}

/* Header Section */
.info-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: var(--space-md);
  padding-bottom: var(--space-sm);
  border-bottom: 2px solid var(--tactical-border-dim);
  position: relative;
}

.info-header::before {
  content: '';
  position: absolute;
  bottom: -2px;
  left: 0;
  width: 50px;
  height: 2px;
  background: var(--tactical-border);
  box-shadow: 0 0 3px var(--tactical-border);
}

.location-info {
  flex: 1;
}

.location-title {
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0 0 var(--space-xs) 0;
  line-height: 1.3;
  text-transform: uppercase;
  letter-spacing: 1px;
  font-family: 'Courier New', monospace;
  text-shadow: 0 0 3px currentColor;
}

.location-title::before {
  content: '> ';
  color: var(--tactical-border);
}

.timezone-badge {
  font-size: 0.85rem;
  color: var(--text-secondary);
  background: var(--tactical-bg);
  padding: var(--space-xs) var(--space-sm);
  border: 1px solid var(--tactical-border-dim);
  display: inline-block;
  text-transform: uppercase;
  letter-spacing: 1px;
  font-family: 'Courier New', monospace;
  font-weight: 600;
}

.refresh-btn {
  background: var(--tactical-bg);
  border: 2px solid var(--tactical-border-dim);
  padding: var(--space-xs);
  cursor: pointer;
  font-size: 1rem;
  transition: all 0.2s ease;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary);
}

.refresh-btn:hover {
  background: var(--tactical-hover);
  border-color: var(--tactical-border);
  color: var(--tactical-border);
  box-shadow: 0 0 8px rgba(139, 154, 139, 0.3);
}

.refresh-btn.spinning {
  animation: spin 1s linear infinite;
}

/* Time Section */
.time-section {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-md);
  padding: var(--space-sm);
  background: rgba(139, 154, 139, 0.02);
  border: 1px solid var(--tactical-border-dim);
  position: relative;
}

.time-section::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 4px;
  height: 100%;
  background: var(--tactical-border);
}

.time-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: 1;
}

.time-label {
  font-size: 0.8rem;
  color: var(--text-secondary);
  margin-bottom: 2px;
  text-align: center;
  text-transform: uppercase;
  letter-spacing: 1px;
  font-family: 'Courier New', monospace;
  font-weight: 600;
}

.time-value {
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--text-primary);
  text-align: center;
  font-family: 'Courier New', monospace;
  text-shadow: 0 0 3px currentColor;
  letter-spacing: 1px;
}

.time-value.night-time {
  color: var(--text-accent);
  text-shadow: 0 0 3px var(--text-accent);
}

.time-divider {
  font-size: 1.2rem;
  color: var(--tactical-border);
  margin: 0 var(--space-sm);
  font-weight: 900;
}

/* Weather Section */
.weather-section {
  border-top: 2px solid var(--tactical-border-dim);
  padding-top: var(--space-md);
  position: relative;
}

.weather-section::before {
  content: '';
  position: absolute;
  top: -2px;
  left: 0;
  width: 80px;
  height: 2px;
  background: var(--tactical-border);
  box-shadow: 0 0 3px var(--tactical-border);
}

.weather-main {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  margin-bottom: var(--space-sm);
  padding: var(--space-xs);
  border: 1px solid var(--tactical-border-dim);
}

.weather-icon {
  font-size: 2rem;
  flex-shrink: 0;
}

.weather-text {
  display: flex;
  flex-direction: column;
  flex: 1;
}

.temperature {
  font-size: 1.4rem;
  font-weight: 700;
  color: var(--text-primary);
  line-height: 1.2;
  font-family: 'Courier New', monospace;
  text-shadow: 0 0 3px currentColor;
  letter-spacing: 1px;
}

.description {
  font-size: 0.9rem;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 1px;
  font-family: 'Courier New', monospace;
  font-weight: 600;
}

.weather-details {
  display: flex;
  justify-content: space-between;
  gap: var(--space-xs);
}

.detail-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: 1;
  padding: var(--space-xs);
  background: var(--tactical-bg);
  border: 1px solid var(--tactical-border-dim);
  position: relative;
}

.detail-item::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 8px;
  height: 8px;
  border-top: 1px solid var(--tactical-border);
  border-left: 1px solid var(--tactical-border);
}

.detail-item:hover {
  border-color: var(--tactical-border);
  background: var(--tactical-hover);
}

.detail-icon {
  font-size: 1rem;
  margin-bottom: 2px;
}

.detail-text {
  font-size: 0.8rem;
  color: var(--text-secondary);
  font-weight: 600;
  text-align: center;
  font-family: 'Courier New', monospace;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

/* Loading & Error States */
.loading-state,
.error-state {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-sm);
  padding: var(--space-md);
  color: var(--text-secondary);
  font-size: 0.9rem;
  border: 2px solid var(--tactical-border-dim);
  background: var(--tactical-bg);
  text-transform: uppercase;
  letter-spacing: 1px;
  font-family: 'Courier New', monospace;
  font-weight: 600;
}

.loading-spinner {
  animation: spin 1s linear infinite;
}

.error-state {
  color: var(--danger-color);
  border-color: var(--danger-color);
  background: rgba(160, 82, 45, 0.05);
}

/* Animations */
@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

/* Responsive */
@media (max-width: 768px) {
  .compact-info-card {
    padding: var(--space-md);
  }

  .time-section {
    flex-direction: column;
    gap: var(--space-sm);
  }

  .time-divider {
    transform: rotate(90deg);
    margin: var(--space-xs) 0;
  }

  .weather-details {
    flex-wrap: wrap;
  }

  .detail-item {
    min-width: 80px;
  }
}

@media (max-width: 480px) {
  .location-title {
    font-size: 1rem;
  }

  .weather-main {
    flex-direction: column;
    text-align: center;
    gap: var(--space-xs);
  }

  .weather-details {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: var(--space-xs);
  }
}
</style>
