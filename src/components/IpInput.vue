<template>
  <div class="ip-input-container">
    <form @submit.prevent="handleSubmit" class="search-form">
      <input
        v-model="ip"
        type="text"
        placeholder="Enter IP address (e.g., 8.8.8.8, 1.1.1.1)"
        class="search-input"
        :class="{ error: error }"
      />
      <button type="submit" class="search-button">🔍 Track IP</button>
    </form>

    <!-- Quick test buttons - now horizontal and compact -->
    <div class="quick-test">
      <span class="quick-test-label">Quick test:</span>
      <div class="quick-buttons">
        <button @click="testIP('8.8.8.8')" class="quick-button">Google DNS</button>
        <button @click="testIP('1.1.1.1')" class="quick-button">Cloudflare DNS</button>
        <button @click="testIP('208.67.222.222')" class="quick-button">OpenDNS</button>
      </div>
    </div>

    <p v-if="error" class="error-message">{{ error }}</p>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const emit = defineEmits(['search'])
const ip = ref('')
const error = ref('')

function isValidIP(value: string) {
  // IPv4 regex
  const ipv4 =
    /^((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/
  // Basic IPv6 regex
  const ipv6 = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^::1$|^::$/
  return ipv4.test(value) || ipv6.test(value)
}

function handleSubmit() {
  const trimmedIP = ip.value.trim()

  if (!trimmedIP) {
    error.value = 'Please enter an IP address'
    return
  }

  if (!isValidIP(trimmedIP)) {
    error.value = 'Please enter a valid IP address (IPv4 or IPv6)'
    return
  }

  error.value = ''
  emit('search', trimmedIP)
  ip.value = ''
}

function testIP(testIp: string) {
  ip.value = testIp
  error.value = ''
  emit('search', testIp)
  ip.value = ''
}
</script>

<style scoped>
.ip-input-container {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  flex-wrap: wrap;
}

.search-form {
  display: flex;
  gap: var(--space-sm);
  align-items: center;
}

.search-input {
  flex: 1;
  padding: var(--space-sm) var(--space-md);
  background: var(--tactical-bg);
  border: 2px solid var(--tactical-border-dim);
  color: var(--text-primary);
  font-size: 0.875rem;
  border-radius: var(--radius-sm);
  transition: all 0.3s ease;
  font-family: 'Courier New', monospace;
  min-width: 280px;
}

.search-input:focus {
  outline: none;
  border-color: var(--tactical-border);
  box-shadow: 0 0 10px rgba(0, 255, 0, 0.2);
}

.search-input.error {
  border-color: var(--danger-color);
}

.search-button {
  padding: var(--space-sm) var(--space-md);
  background: var(--tactical-bg);
  border: 2px solid var(--tactical-border-dim);
  color: var(--text-primary);
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  border-radius: var(--radius-sm);
  font-family: 'Courier New', monospace;
  text-transform: uppercase;
  letter-spacing: 1px;
  white-space: nowrap;
}

.search-button:hover {
  border-color: var(--tactical-border);
  background: var(--tactical-hover);
  color: var(--tactical-border);
  box-shadow: 0 0 10px rgba(0, 255, 0, 0.2);
}

.quick-test {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
}

.quick-test-label {
  font-size: 0.75rem;
  color: var(--text-secondary);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 1px;
  font-family: 'Courier New', monospace;
  white-space: nowrap;
}

.quick-buttons {
  display: flex;
  gap: var(--space-xs);
}

.quick-button {
  padding: var(--space-xs) var(--space-sm);
  background: var(--tactical-bg);
  border: 1px solid var(--tactical-border-dim);
  font-size: 0.75rem;
  cursor: pointer;
  transition: all 0.2s ease;
  color: var(--text-secondary);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  font-family: 'Courier New', monospace;
  border-radius: var(--radius-xs);
  white-space: nowrap;
}

.quick-button:hover {
  background: var(--tactical-hover);
  border-color: var(--tactical-border);
  color: var(--tactical-border);
  box-shadow: 0 0 8px rgba(0, 255, 0, 0.2);
}

.error-message {
  color: var(--danger-color);
  font-size: 0.75rem;
  margin: 0;
  font-family: 'Courier New', monospace;
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .ip-input-container {
    width: 100%;
  }

  .search-form {
    flex-direction: column;
    width: 100%;
  }

  .search-input {
    min-width: auto;
    width: 100%;
  }

  .quick-test {
    justify-content: center;
  }
}
</style>
