<template>
  <button
    @click="toggleTheme"
    class="theme-toggle"
    :title="isDark ? 'Switch to light mode' : 'Switch to dark mode'"
  >
    <div class="toggle-track">
      <div class="toggle-thumb" :class="{ 'is-dark': isDark }">
        <span class="toggle-icon">{{ isDark ? '🌙' : '☀️' }}</span>
      </div>
    </div>
  </button>
</template>

<script setup lang="ts">
import { useThemeStore } from '@/stores/theme'

const themeStore = useThemeStore()
const { isDark, toggleTheme } = themeStore
</script>

<style scoped>
.theme-toggle {
  background: none;
  border: none;
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 12px;
  transition: all 0.3s ease;
}

.theme-toggle:hover {
  background: rgba(255, 255, 255, 0.1);
}

.toggle-track {
  width: 60px;
  height: 30px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 15px;
  position: relative;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.3);
}

.toggle-thumb {
  width: 26px;
  height: 26px;
  background: white;
  border-radius: 50%;
  position: absolute;
  top: 2px;
  left: 2px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

.toggle-thumb.is-dark {
  transform: translateX(30px);
  background: #1e293b;
}

.toggle-icon {
  font-size: 14px;
  transition: all 0.3s ease;
}

:global(.dark) .toggle-track {
  background: rgba(0, 0, 0, 0.3);
  border-color: rgba(255, 255, 255, 0.2);
}
</style>
