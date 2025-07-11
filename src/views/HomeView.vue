<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { useIpGeolocation } from '@/composables/useIpGeolocation'
import { useAnalyticsStore } from '@/stores/analytics'
import IpInput from '@/components/IpInput.vue'
import IpDetails from '@/components/IpDetails.vue'
import MapView from '@/components/MapView.vue'
import LoadingSpinner from '@/components/LoadingSpinner.vue'
import TimezoneWeatherCard from '@/components/TimezoneWeatherCard.vue'

const { data, loading, error, fetchGeolocation } = useIpGeolocation()
const analyticsStore = useAnalyticsStore()

// This reactive object holds the data for the most recent search to pass to MapView.
// This ensures MapView is not unmounted and can persist its internal state (ipMarkers).
const latestIpData = reactive({
  lat: 40.7128, // Default to a neutral location like NYC
  lon: -74.006,
  ip: '',
  city: '',
  country: '',
})

// Track user's own IP
const userOwnIp = ref('')

// A ref to track if it's the very first load.
const isInitialLoad = ref(true)

onMounted(() => {
  analyticsStore.loadAnalytics()
  // Fetch user's initial IP on mount without showing a loader for it.
  handleSearch('')
})

async function handleSearch(ip: string) {
  // On subsequent searches, we want to show the loader.
  if (!isInitialLoad.value) {
    loading.value = true
    error.value = null // Clear previous errors
  }

  const startTime = Date.now()
  await fetchGeolocation(ip)

  // Always turn off loading state after fetch.
  loading.value = false

  if (data.value && !error.value) {
    const queryTime = Date.now() - startTime
    analyticsStore.addSearchRecord(data.value, queryTime)

    // Update the reactive object with the new data
    latestIpData.lat = data.value.latitude
    latestIpData.lon = data.value.longitude
    latestIpData.ip = data.value.ip
    latestIpData.city = data.value.city
    latestIpData.country = data.value.country_name

    // If this is the initial load (empty IP search), save as user's own IP
    if (isInitialLoad.value && !ip) {
      userOwnIp.value = data.value.ip
    }
  }

  isInitialLoad.value = false // It's no longer the initial load
}

function retrySearch() {
  if (data.value) {
    handleSearch(data.value.ip)
  } else {
    handleSearch('')
  }
}
</script>
<template>
  <div class="app-container">
    <header class="app-header">
      <div class="app-logo">🌐 GeoIP Explorer</div>
      <div class="header-controls"></div>
    </header>

    <main class="main-content">
      <div class="command-center fade-in-up">
        <!-- The map is no longer inside a v-if and will not be unmounted -->
        <div class="map-container">
          <div class="map-header">
            <div class="map-header-left">
              <span class="map-title">TACTICAL MAP</span>
              <span v-if="latestIpData.ip" class="coordinates"
                >{{ latestIpData.lat.toFixed(4) }}, {{ latestIpData.lon.toFixed(4) }}</span
              >
            </div>
            <div class="map-header-right">
              <div v-if="userOwnIp" class="user-ip-display">
                <span class="user-ip-label">Your IP:</span>
                <span class="user-ip-value">{{ userOwnIp }}</span>
              </div>
              <IpInput @search="handleSearch" />
            </div>
          </div>
          <div class="map-display">
            <MapView
              :lat="latestIpData.lat"
              :lon="latestIpData.lon"
              :ip="latestIpData.ip"
              :city="latestIpData.city"
              :country="latestIpData.country"
            />
          </div>
        </div>

        <!-- Info panels now correctly handle loading/error/data states -->
        <div class="info-panels">
          <div v-if="loading && !isInitialLoad" class="panel-full">
            <LoadingSpinner />
          </div>

          <div v-else-if="error" class="panel-full error-state">
            <h3>⚠️ ERROR OCCURRED</h3>
            <p>{{ error }}</p>
            <button @click="retrySearch" class="search-button" style="margin-top: 1rem">
              RETRY
            </button>
          </div>

          <template v-else-if="data">
            <div class="info-bar-replacement">
              <div class="target-info">
                <span class="target-label">LAST SEARCH:</span>
                <span class="target-ip">{{ data.ip }}</span>
                <span class="target-location">{{ data.city }}, {{ data.country_name }}</span>
              </div>
              <div class="status-info">
                <span class="status-label">STATUS:</span>
                <span class="status-active">TARGET ACQUIRED</span>
              </div>
            </div>
            <div class="panel-left">
              <IpDetails :data="data" />
            </div>
            <div class="panel-right">
              <TimezoneWeatherCard :data="data" />
            </div>
          </template>

          <div v-else-if="isInitialLoad" class="panel-full">
            <p>Enter an IP address above to begin.</p>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<style scoped>
/* Compact Search Section */
.search-section {
  text-align: center;
  padding: var(--space-lg) var(--space-lg) var(--space-md);
  max-width: 800px;
  margin: 0 auto;
}

/* Command Center Layout */
.command-center {
  max-width: 100vw;
  margin: 0 auto;
  padding: 0 var(--space-lg);
}

.info-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: var(--tactical-bg);
  border: 2px solid var(--tactical-border-dim);
  padding: var(--space-md);
  margin-bottom: var(--space-lg);
  position: relative;
}

.info-bar::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100px;
  height: 4px;
  background: var(--tactical-border);
  box-shadow: 0 0 10px var(--tactical-border);
}

.target-info,
.status-info {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  font-family: 'Courier New', monospace;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.target-label,
.status-label {
  color: var(--text-secondary);
  font-size: 0.9rem;
}

.target-ip {
  color: var(--tactical-border);
  font-size: 1.1rem;
  text-shadow: 0 0 5px currentColor;
}

.target-location {
  color: var(--text-primary);
  font-size: 1rem;
}

.status-active {
  color: var(--tactical-border);
  font-size: 0.9rem;
  text-shadow: 0 0 5px currentColor;
}

.status-active::before {
  content: '● ';
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.3;
  }
}

/* Large Full-Width Map Container */
.map-container {
  margin-bottom: var(--space-xl);
}

.map-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-md) var(--space-lg);
  background: var(--tactical-bg);
  border-bottom: 2px solid var(--tactical-border-dim);
  position: relative;
}

.map-header-left {
  display: flex;
  align-items: center;
  gap: var(--space-lg);
}

.map-header-right {
  display: flex;
  align-items: center;
  gap: var(--space-lg);
}

.user-ip-display {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-xs) var(--space-sm);
  background: var(--tactical-bg);
  border: 1px solid var(--tactical-border-dim);
  border-radius: var(--radius-sm);
}

.user-ip-label {
  font-family: 'Courier New', monospace;
  font-size: 0.75rem;
  color: var(--text-secondary);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.user-ip-value {
  font-family: 'Courier New', monospace;
  font-size: 0.875rem;
  color: var(--tactical-border);
  font-weight: 700;
  text-shadow: 0 0 3px currentColor;
}

.map-header::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 50px;
  height: 4px;
  background: var(--tactical-border);
  box-shadow: 0 0 10px var(--tactical-border);
}

.map-title {
  font-family: 'Courier New', monospace;
  font-weight: 700;
  font-size: 1.2rem;
  color: var(--text-primary);
  text-transform: uppercase;
  letter-spacing: 2px;
}

.coordinates {
  font-family: 'Courier New', monospace;
  font-size: 0.9rem;
  color: var(--text-secondary);
  background: var(--tactical-bg);
  padding: var(--space-xs) var(--space-sm);
  border: 1px solid var(--tactical-border-dim);
  border-radius: var(--radius-sm);
}

/* Large Map Display */
.map-display {
  width: 100%;
  height: 80vh;
  min-height: 700px;
  background: var(--tactical-bg);
  border: 2px solid var(--tactical-border-dim);
  border-top: none;
  position: relative;
  overflow: hidden;
}

.map-display::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: linear-gradient(90deg, var(--tactical-border), transparent, var(--tactical-border));
  z-index: 10;
}

.map-display::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: linear-gradient(90deg, transparent, var(--tactical-border), transparent);
  z-index: 10;
}

/* Bottom Info Panels */
.info-panels {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-xl);
}

.panel-left,
.panel-right {
  /* Panels will take equal width */
}

/* New style for full-width panels */
.panel-full {
  grid-column: 1 / -1; /* Span across both columns */
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--space-xl);
}

.info-bar-replacement {
  grid-column: 1 / -1;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: var(--tactical-bg);
  border: 2px solid var(--tactical-border-dim);
  padding: var(--space-md);
  margin-bottom: var(--space-lg);
}

/* Responsive Design */
@media (max-width: 1400px) {
  .info-panels {
    gap: var(--space-lg);
  }
}

@media (max-width: 1200px) {
  .map-display {
    height: 75vh;
    min-height: 600px;
  }

  .command-center {
    padding: 0 var(--space-md);
  }
}

@media (max-width: 768px) {
  .info-bar {
    flex-direction: column;
    gap: var(--space-sm);
    text-align: center;
  }

  .map-display {
    height: 70vh;
    min-height: 500px;
  }

  .info-panels {
    grid-template-columns: 1fr;
    gap: var(--space-lg);
  }

  .command-center {
    padding: 0 var(--space-sm);
  }

  .map-header {
    flex-direction: column;
    gap: var(--space-xs);
    text-align: center;
  }

  .search-section {
    padding: var(--space-md) var(--space-md) var(--space-lg);
  }
}

@media (max-width: 480px) {
  .map-display {
    height: 65vh;
    min-height: 400px;
  }

  .target-info,
  .status-info {
    flex-direction: column;
    gap: var(--space-xs);
  }
}
</style>
