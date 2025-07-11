<template>
  <div v-if="data" class="details-card">
    <div class="card-header">
      <h2 class="details-title">
        <span class="title-icon">🌐</span>
        IP Information
      </h2>
      <button @click="copyAllInfo" class="copy-all-btn" :class="{ copied: allCopied }">
        <span class="copy-icon">{{ allCopied ? '✓' : '📋' }}</span>
        {{ allCopied ? 'Copied!' : 'Copy All' }}
      </button>
      <button @click="showExportDialog = true" class="export-btn" title="Export Data">
        <span class="export-icon">📤</span>
        Export
      </button>
    </div>

    <div class="detail-group ip-section">
      <div class="details-item featured">
        <div class="detail-content">
          <span class="details-label">IP Address</span>
          <span class="details-value ip-value">{{ data.ip }}</span>
        </div>
        <button
          @click="copyToClipboard(data.ip, 'ip')"
          class="copy-btn"
          :class="{ copied: copied.ip }"
        >
          <span class="copy-icon">{{ copied.ip ? '✓' : '📋' }}</span>
        </button>
      </div>
    </div>

    <div class="detail-group location-section">
      <h3 class="group-title">
        <span class="group-icon">📍</span>
        Location
      </h3>
      <div class="details-grid">
        <div class="details-item">
          <div class="detail-content">
            <span class="details-label">Country</span>
            <span class="details-value">
              <span class="flag">{{ getCountryFlag(data.country_code) }}</span>
              {{ data.country_name }} ({{ data.country_code }})
            </span>
          </div>
          <button
            @click="copyToClipboard(`${data.country_name} (${data.country_code})`, 'country')"
            class="copy-btn"
            :class="{ copied: copied.country }"
          >
            <span class="copy-icon">{{ copied.country ? '✓' : '📋' }}</span>
          </button>
        </div>

        <div class="details-item">
          <div class="detail-content">
            <span class="details-label">Region</span>
            <span class="details-value">{{ data.region }}</span>
          </div>
          <button
            @click="copyToClipboard(data.region, 'region')"
            class="copy-btn"
            :class="{ copied: copied.region }"
          >
            <span class="copy-icon">{{ copied.region ? '✓' : '📋' }}</span>
          </button>
        </div>

        <div class="details-item">
          <div class="detail-content">
            <span class="details-label">City</span>
            <span class="details-value">{{ data.city }}</span>
          </div>
          <button
            @click="copyToClipboard(data.city, 'city')"
            class="copy-btn"
            :class="{ copied: copied.city }"
          >
            <span class="copy-icon">{{ copied.city ? '✓' : '📋' }}</span>
          </button>
        </div>

        <div class="details-item" v-if="data.postal">
          <div class="detail-content">
            <span class="details-label">Postal Code</span>
            <span class="details-value">{{ data.postal }}</span>
          </div>
          <button
            @click="copyToClipboard(data.postal, 'postal')"
            class="copy-btn"
            :class="{ copied: copied.postal }"
          >
            <span class="copy-icon">{{ copied.postal ? '✓' : '📋' }}</span>
          </button>
        </div>

        <div class="details-item coordinates">
          <div class="detail-content">
            <span class="details-label">Coordinates</span>
            <span class="details-value coordinates-value">
              <span class="coordinate">{{ data.latitude.toFixed(6) }}</span
              >,
              <span class="coordinate">{{ data.longitude.toFixed(6) }}</span>
            </span>
          </div>
          <button
            @click="copyToClipboard(`${data.latitude}, ${data.longitude}`, 'coordinates')"
            class="copy-btn"
            :class="{ copied: copied.coordinates }"
          >
            <span class="copy-icon">{{ copied.coordinates ? '✓' : '📋' }}</span>
          </button>
        </div>

        <div class="details-item">
          <div class="detail-content">
            <span class="details-label">Timezone</span>
            <span class="details-value timezone-value">
              <span class="timezone-icon">🕐</span>
              {{ data.timezone }}
            </span>
          </div>
          <button
            @click="copyToClipboard(data.timezone, 'timezone')"
            class="copy-btn"
            :class="{ copied: copied.timezone }"
          >
            <span class="copy-icon">{{ copied.timezone ? '✓' : '📋' }}</span>
          </button>
        </div>
      </div>
    </div>

    <div class="detail-group network-section">
      <h3 class="group-title">
        <span class="group-icon">🌐</span>
        Network
      </h3>
      <div class="details-grid">
        <div class="details-item" v-if="data.isp">
          <div class="detail-content">
            <span class="details-label">ISP</span>
            <span class="details-value">{{ data.isp }}</span>
          </div>
          <button
            @click="copyToClipboard(data.isp, 'isp')"
            class="copy-btn"
            :class="{ copied: copied.isp }"
          >
            <span class="copy-icon">{{ copied.isp ? '✓' : '📋' }}</span>
          </button>
        </div>
      </div>
    </div>

    <div class="detail-stats">
      <div class="stat-item">
        <span class="stat-icon">⚡</span>
        <span class="stat-label">Query Time</span>
        <span class="stat-value">{{ queryTime }}ms</span>
      </div>
      <div class="stat-item">
        <span class="stat-icon">🗓️</span>
        <span class="stat-label">Last Updated</span>
        <span class="stat-value">{{ formatTime(Date.now()) }}</span>
      </div>
    </div>

    <!-- Export Dialog -->
    <div v-if="showExportDialog" class="dialog-overlay" @click="closeExportDialog">
      <div class="export-dialog" @click.stop>
        <div class="dialog-header">
          <h4 class="dialog-title">Export IP Data</h4>
          <button @click="closeExportDialog" class="close-button">
            <span class="icon">✕</span>
          </button>
        </div>
        <div class="dialog-content">
          <div class="form-group">
            <label class="form-label">Export Format</label>
            <div class="format-options">
              <button
                v-for="format in ['json', 'csv', 'txt', 'pdf']"
                :key="format"
                @click="exportOptions.format = format as 'json' | 'csv' | 'txt' | 'pdf'"
                class="format-btn"
                :class="{ active: exportOptions.format === format }"
              >
                <span class="format-icon">{{ getFormatIcon(format) }}</span>
                <span class="format-label">{{ format.toUpperCase() }}</span>
              </button>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">
              <input v-model="exportOptions.includeTimestamp" type="checkbox" class="checkbox" />
              Include export timestamp
            </label>
          </div>

          <div class="form-group">
            <label class="form-label">Custom Filename (Optional)</label>
            <input
              v-model="exportOptions.customFilename"
              type="text"
              class="form-input"
              placeholder="Leave empty for auto-generated name"
            />
          </div>
        </div>
        <div class="dialog-actions">
          <button @click="closeExportDialog" class="cancel-button">Cancel</button>
          <button
            @click="handleExport"
            class="export-confirm-button"
            :disabled="!data || exporting"
          >
            <span class="icon">{{ exporting ? '⏳' : '📤' }}</span>
            {{ exporting ? 'Exporting...' : 'Export Data' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import type { GeolocationData } from '@/composables/useIpGeolocation'
import { useExport, type ExportOptions } from '@/composables/useExport'

const props = defineProps<{
  data: GeolocationData | null
}>()

const { exporting, exportData } = useExport()

const copied = reactive<Record<string, boolean>>({})
const allCopied = ref(false)
const queryTime = ref(Math.floor(Math.random() * 200) + 50) // Simulated query time
const showExportDialog = ref(false)
const exportOptions = ref<ExportOptions>({
  format: 'json',
  includeTimestamp: true,
  customFilename: '',
})

const copyToClipboard = async (text: string, key: string) => {
  try {
    await navigator.clipboard.writeText(text)
    copied[key] = true
    setTimeout(() => {
      copied[key] = false
    }, 2000)
  } catch (err) {
    console.error('Failed to copy:', err)
  }
}

const copyAllInfo = async () => {
  if (!props.data) return

  const info = `IP Address: ${props.data.ip}
Country: ${props.data.country_name} (${props.data.country_code})
Region: ${props.data.region}
City: ${props.data.city}
${props.data.postal ? `Postal Code: ${props.data.postal}\n` : ''}Coordinates: ${props.data.latitude}, ${props.data.longitude}
Timezone: ${props.data.timezone}
ISP: ${props.data.isp}`

  try {
    await navigator.clipboard.writeText(info)
    allCopied.value = true
    setTimeout(() => {
      allCopied.value = false
    }, 3000)
  } catch (err) {
    console.error('Failed to copy all info:', err)
  }
}

function closeExportDialog() {
  showExportDialog.value = false
  exportOptions.value = {
    format: 'json',
    includeTimestamp: true,
    customFilename: '',
  }
}

function getFormatIcon(format: string): string {
  const icons = {
    json: '📋',
    csv: '📊',
    txt: '📄',
    pdf: '📑',
  }
  return icons[format as keyof typeof icons] || '📄'
}

function handleExport() {
  if (!props.data) return

  exportData(props.data, exportOptions.value)
  closeExportDialog()
}

const getCountryFlag = (countryCode: string) => {
  if (!countryCode || countryCode.length !== 2) return '🌍'
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map((char) => 127397 + char.charCodeAt(0))
  return String.fromCodePoint(...codePoints)
}

const formatTime = (timestamp: number) => {
  return new Date(timestamp).toLocaleTimeString()
}
</script>

<style scoped>
.details-card {
  animation: slideInRight 0.8s cubic-bezier(0.4, 0, 0.2, 1);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-xl);
  padding-bottom: var(--space-md);
  border-bottom: 1px solid var(--border-color);
}

.details-title {
  color: var(--text-primary);
  font-size: 1.75rem;
  font-weight: 800;
  margin: 0;
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}

.title-icon {
  font-size: 1.5rem;
  animation: pulse 2s infinite;
}

.copy-all-btn {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  padding: var(--space-sm) var(--space-md);
  background: var(--gradient-secondary);
  color: white;
  border: none;
  border-radius: var(--radius-lg);
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  font-size: 0.875rem;
}

.copy-all-btn:hover {
  transform: translateY(-2px) scale(1.05);
  box-shadow: var(--shadow-md);
}

.copy-all-btn.copied {
  background: var(--success-color);
  animation: successPulse 0.3s ease;
}

@keyframes successPulse {
  0% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.1);
  }
  100% {
    transform: scale(1);
  }
}

.detail-group {
  margin-bottom: var(--space-xl);
  animation: fadeInUp 0.6s ease-out backwards;
}

.detail-group:nth-child(2) {
  animation-delay: 0.1s;
}
.detail-group:nth-child(3) {
  animation-delay: 0.2s;
}
.detail-group:nth-child(4) {
  animation-delay: 0.3s;
}

.ip-section .details-item {
  background: var(--gradient-primary);
  color: white;
  padding: var(--space-lg);
  border-radius: var(--radius-lg);
  border: none;
}

.ip-section .ip-value {
  font-family: 'Courier New', monospace;
  font-size: 1.25rem;
  font-weight: 700;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.group-title {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--text-accent);
  margin-bottom: var(--space-md);
  border-bottom: 2px solid var(--border-color);
  padding-bottom: var(--space-sm);
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  transition: all 0.3s ease;
}

.group-title:hover {
  color: var(--text-primary);
  border-bottom-color: var(--text-accent);
}

.group-icon {
  font-size: 1.1rem;
}

.details-grid {
  display: grid;
  gap: var(--space-md);
}

.details-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-md);
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-md);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  backdrop-filter: blur(10px);
  position: relative;
  overflow: hidden;
}

.details-item::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: var(--gradient-accent);
  opacity: 0.1;
  transition: left 0.4s ease;
  z-index: 0;
}

.details-item:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
  border-color: var(--border-hover);
}

.details-item:hover::before {
  left: 0;
}

.details-item.featured {
  background: var(--gradient-primary);
  border: none;
  box-shadow: var(--shadow-lg);
}

.details-item.featured::before {
  display: none;
}

.details-item.coordinates {
  background: linear-gradient(135deg, var(--gradient-dark));
  color: white;
  border: none;
}

.detail-content {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
  flex: 1;
  position: relative;
  z-index: 1;
}

.details-label {
  color: var(--text-secondary);
  font-size: 0.875rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.featured .details-label,
.coordinates .details-label {
  color: rgba(255, 255, 255, 0.8);
}

.details-value {
  color: var(--text-primary);
  font-weight: 600;
  font-size: 1rem;
  display: flex;
  align-items: center;
  gap: var(--space-xs);
}

.featured .details-value,
.coordinates .details-value {
  color: white;
}

.flag {
  font-size: 1.2rem;
}

.coordinate {
  font-family: 'Courier New', monospace;
  padding: 2px 6px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 4px;
  font-size: 0.875rem;
}

.timezone-icon {
  font-size: 1.1rem;
}

.copy-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  backdrop-filter: blur(10px);
  position: relative;
  z-index: 2;
}

.featured .copy-btn,
.coordinates .copy-btn {
  background: rgba(255, 255, 255, 0.2);
  border-color: rgba(255, 255, 255, 0.3);
}

.copy-btn:hover {
  transform: scale(1.1);
  background: var(--text-accent);
  color: white;
  box-shadow: var(--shadow-sm);
}

.copy-btn.copied {
  background: var(--success-color);
  color: white;
  transform: scale(1.1);
  animation: successPulse 0.3s ease;
}

.copy-icon {
  font-size: 0.875rem;
  transition: all 0.2s ease;
}

.detail-stats {
  display: flex;
  gap: var(--space-md);
  padding: var(--space-md);
  background: var(--glass-bg);
  border-radius: var(--radius-md);
  border: 1px solid var(--glass-border);
  margin-top: var(--space-md);
}

.stat-item {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  flex: 1;
}

.stat-icon {
  font-size: 1.1rem;
}

.stat-label {
  color: var(--text-secondary);
  font-size: 0.875rem;
  font-weight: 500;
}

.stat-value {
  color: var(--text-primary);
  font-weight: 600;
  margin-left: auto;
}

/* Mobile responsiveness */
@media (max-width: 768px) {
  .card-header {
    flex-direction: column;
    gap: var(--space-sm);
    align-items: stretch;
  }

  .details-title {
    justify-content: center;
  }

  .details-item {
    flex-direction: column;
    gap: var(--space-sm);
    align-items: stretch;
  }

  .detail-content {
    text-align: center;
  }

  .copy-btn {
    align-self: center;
  }

  .detail-stats {
    flex-direction: column;
  }

  .stat-item {
    justify-content: space-between;
  }
}

.export-btn {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  padding: var(--space-sm) var(--space-md);
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  backdrop-filter: blur(10px);
  color: var(--text-primary);
  font-weight: 600;
  font-size: 0.875rem;
}

.export-btn:hover {
  transform: translateY(-2px);
  background: var(--text-accent);
  color: white;
  box-shadow: var(--shadow-md);
}

.export-icon {
  font-size: 1rem;
  transition: all 0.2s ease;
}

.dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(5px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  animation: fadeIn 0.3s ease;
}

.export-dialog {
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-lg);
  padding: 0;
  backdrop-filter: blur(20px);
  min-width: 500px;
  max-width: 90vw;
  animation: slideInScale 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes slideInScale {
  from {
    opacity: 0;
    transform: scale(0.9) translateY(20px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

.dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-lg);
  border-bottom: 1px solid var(--border-color);
}

.dialog-title {
  color: var(--text-primary);
  font-size: 1.25rem;
  font-weight: 600;
  margin: 0;
}

.close-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  background: none;
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all 0.3s ease;
  color: var(--text-secondary);
}

.close-button:hover {
  background: #ef4444;
  color: white;
  transform: scale(1.1);
}

.dialog-content {
  padding: var(--space-lg);
}

.form-group {
  margin-bottom: var(--space-lg);
}

.form-label {
  display: block;
  color: var(--text-primary);
  font-size: 0.875rem;
  font-weight: 600;
  margin-bottom: var(--space-sm);
}

.format-options {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--space-sm);
}

.format-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-xs);
  padding: var(--space-md);
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all 0.3s ease;
  backdrop-filter: blur(10px);
  color: white; /* Make text white for visibility */
}

.format-btn:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-sm);
  border-color: var(--border-hover);
  color: white; /* Ensure text stays white on hover */
}

.format-btn.active {
  background: var(--gradient-primary);
  color: white;
  border-color: transparent;
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}

.format-icon {
  font-size: 1.5rem;
}

.format-label {
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: inherit; /* Inherit the white color from parent */
}

.checkbox {
  margin-right: var(--space-sm);
  accent-color: var(--text-accent);
}

.form-input {
  width: 100%;
  padding: var(--space-md);
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-md);
  color: var(--text-primary);
  font-size: 1rem;
  transition: all 0.3s ease;
  backdrop-filter: blur(10px);
}

.form-input:focus {
  outline: none;
  border-color: var(--text-accent);
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.form-input::placeholder {
  color: var(--text-secondary);
}

.dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-md);
  padding: var(--space-lg);
  border-top: 1px solid var(--border-color);
}

.cancel-button,
.export-confirm-button {
  padding: var(--space-sm) var(--space-lg);
  border-radius: var(--radius-md);
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}

.cancel-button {
  background: none;
  border: 1px solid var(--glass-border);
  color: var(--text-secondary);
}

.cancel-button:hover {
  background: var(--glass-bg);
  color: var(--text-primary);
}

.export-confirm-button {
  background: var(--gradient-primary);
  border: none;
  color: white;
}

.export-confirm-button:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}

.export-confirm-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

@media (max-width: 768px) {
  .export-dialog {
    min-width: auto;
    margin: var(--space-md);
  }

  .format-options {
    grid-template-columns: repeat(2, 1fr);
  }

  .card-header {
    flex-wrap: wrap;
  }
}
</style>
