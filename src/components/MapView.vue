<template>
  <div class="map-wrapper">
    <div ref="mapContainer" class="map-container" :class="{ 'map-loading': isLoading }">
      <div v-if="isLoading" class="map-loader">
        <div class="map-spinner"></div>
        <span class="loading-text">Loading map...</span>
      </div>
      <div class="map-overlay">
        <!-- Map Mode Selector -->
        <div
          class="map-mode-selector"
          :style="{
            background: getBackgroundColor(),
            border: `1px solid ${getBorderColor()}`,
            color: getTextColor(),
          }"
        >
          <button
            v-for="(mode, key) in mapModes"
            :key="key"
            @click.stop="switchMapMode(key)"
            :class="['mode-btn', { active: currentMapMode === key }]"
            :title="mode.name"
          >
            {{ mode.icon }}
          </button>
        </div>

        <!-- Coordinates Display -->
        <div
          class="coordinates-display"
          :style="{
            background: getBackgroundColor(),
            border: `1px solid ${getBorderColor()}`,
            color: getTextColor(),
          }"
        >
          <span class="coord-label">📍</span>
          <span class="coord-value">{{ lat.toFixed(4) }}, {{ lon.toFixed(4) }}</span>
        </div>

        <!-- Measurement Controls (Restored) -->
        <div
          class="measurement-controls"
          :style="{
            background: getBackgroundColor(),
            border: `1px solid ${getBorderColor()}`,
            color: getTextColor(),
          }"
        >
          <button
            @click.stop="toggleMeasurement"
            :class="['measure-btn', { active: isMeasuring }]"
            title="Measure Distance"
          >
            📏 {{ isMeasuring ? 'Stop' : 'Measure' }}
          </button>
          <button
            @click.stop="toggleMarkerMode"
            :class="['marker-mode-btn', { active: isMarkerMode }]"
            title="Marker Mode"
          >
            📍 {{ isMarkerMode ? 'Stop' : 'Mark' }}
          </button>
          <button
            v-if="getMeasurementMarkers().length > 0"
            @click.stop="clearMeasurements"
            class="clear-btn"
            title="Clear Measurements"
          >
            🗑️ Clear Measurements
          </button>
          <button
            v-if="getCustomMarkers().length > 0"
            @click.stop="clearCustomMarkers"
            class="clear-btn"
            title="Clear Custom Markers"
          >
            🗑️ Clear Markers
          </button>
          <button
            @click.stop="toggleCoordinateLabels"
            :class="['coord-labels-btn', { active: showCoordinateLabels }]"
            title="Toggle Coordinate Labels"
          >
            🏷️ {{ showCoordinateLabels ? 'Hide' : 'Show' }} Coords
          </button>
          <div v-if="manualTotalDistance > 0" class="total-distance">
            Path: {{ formatDistance(manualTotalDistance) }}
          </div>
          <div v-if="getCustomMarkers().length > 0" class="marker-count">
            {{ getCustomMarkers().length }} Custom Marker{{
              getCustomMarkers().length !== 1 ? 's' : ''
            }}
          </div>
        </div>

        <!-- IP Marker Controls -->
        <div
          v-if="getIpMarkers().length > 0"
          class="ip-controls"
          :style="{
            background: getBackgroundColor(),
            border: `1px solid ${getBorderColor()}`,
            color: getTextColor(),
          }"
        >
          <div class="ip-stats">
            <span class="ip-count">
              📍 {{ getIpMarkers().length }} IP{{ getIpMarkers().length !== 1 ? 's' : '' }} Tracked
            </span>
            <span v-if="getSelectedIpMarkers().length > 0" class="selected-count">
              ({{ getSelectedIpMarkers().length }} selected)
            </span>
            <div v-if="selectedIpTotalDistance > 0" class="total-distance">
              Total Distance: {{ formatDistance(selectedIpTotalDistance) }}
            </div>
          </div>
          <div class="marker-controls">
            <button
              @click.stop="clearAllIpMarkers"
              class="clear-all-btn"
              title="Clear All IP Markers"
            >
              🗑️ Clear All IPs
            </button>
          </div>
        </div>

        <!-- Marker Management Panel -->
        <div
          v-if="allMarkers.length > 0"
          class="marker-management"
          :style="{
            background: getBackgroundColor(),
            border: `1px solid ${getBorderColor()}`,
            color: getTextColor(),
          }"
        >
          <div class="management-header">
            <span class="management-title">📋 All Markers</span>
            <button
              @click.stop="clearAllMarkers"
              class="clear-all-btn small"
              title="Clear All Markers"
            >
              🗑️ Clear All
            </button>
          </div>
          <div class="marker-list">
            <div
              v-for="marker in allMarkers"
              :key="marker.id"
              class="marker-item"
              :class="{ selected: marker.isSelected }"
              @click.stop="handleMarkerClick(marker)"
            >
              <div class="marker-info">
                <span class="marker-type">
                  {{ marker.type === 'ip' ? '🌐' : '📏' }}
                </span>
                <div class="marker-details">
                  <div class="marker-primary">
                    {{ marker.type === 'ip' ? marker.ip : `Point ${marker.number}` }}
                  </div>
                  <div class="marker-coords">
                    {{ marker.lat.toFixed(4) }}, {{ marker.lon.toFixed(4) }}
                  </div>
                </div>
              </div>
              <button
                @click.stop="removeUnifiedMarker(marker.id)"
                class="remove-marker-btn"
                title="Remove Marker"
              >
                ❌
              </button>
            </div>
          </div>
        </div>

        <!-- Map Controls -->
        <div class="map-controls">
          <button @click.stop="zoomIn" class="map-control-btn" title="Zoom In">
            <span>🔍+</span>
          </button>
          <button @click.stop="zoomOut" class="map-control-btn" title="Zoom Out">
            <span>🔍-</span>
          </button>
          <button @click.stop="centerMap" class="map-control-btn" title="Center">
            <span>🎯</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { Map, TileLayer, Marker, Icon, Circle, Polyline, LatLng, Layer } from 'leaflet'
import 'leaflet/dist/leaflet.css'

// New unified marker interface
interface UnifiedMarker {
  id: string
  type: 'ip' | 'measurement' | 'custom'
  lat: number
  lon: number
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  marker: any // Leaflet marker instance
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  coordinateLabel?: any // Coordinate label overlay
  timestamp: Date
  // IP-specific properties
  ip?: string
  city?: string
  country?: string
  // Measurement-specific properties
  number?: number
  isSelected?: boolean
}

const props = defineProps<{
  lat: number
  lon: number
  ip?: string
  city?: string
  country?: string
}>()

const mapContainer = ref<HTMLElement>()
const isLoading = ref(true)
const currentMapMode = ref<string>('dark')

// Unified marker system
const allMarkers = ref<UnifiedMarker[]>([])
const selectedMarkers = ref<UnifiedMarker[]>([])
const showCoordinateLabels = ref(true)

// State for Manual Measurement
const isMeasuring = ref(false)
const measurementLines = ref<Polyline[]>([])
const manualTotalDistance = ref(0)

// State for Marker Mode
const isMarkerMode = ref(false)
const markerCounter = ref(1)

// State for IP-based Measurement
const ipDistanceLines = ref<Polyline[]>([])
const selectedIpTotalDistance = ref(0)

// Legacy arrays for backward compatibility (will be removed)
const measurementMarkers = ref<Marker[]>([])

let map: Map | null = null
let accuracyCircle: Circle | null = null

// Map modes configuration
interface MapMode {
  name: string
  icon: string
  url: string
  attribution: string
}

const mapModes: Record<string, MapMode> = {
  dark: {
    name: 'Dark',
    icon: '🌙',
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
  },
  satellite: {
    name: 'Satellite',
    icon: '🛰️',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution:
      'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
  },
  terrain: {
    name: 'Terrain',
    icon: '🏔️',
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    attribution:
      'Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, <a href="http://viewfinderpanoramas.org">SRTM</a> | Map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a> (<a href="https://creativecommons.org/licenses/by-sa/3.0/">CC-BY-SA</a>)',
  },
  light: {
    name: 'Light',
    icon: '☀️',
    url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
  },
  street: {
    name: 'Street',
    icon: '🗺️',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  },
}

let currentTileLayer: TileLayer | null = null

// IP marker icon
const createIpIcon = (ip: string, isSelected: boolean = false) => {
  const color = isSelected ? '#d4af37' : '#8b9a8b'
  const borderColor = isSelected ? '#ffffff' : '#d4af37'

  return new Icon({
    iconUrl:
      'data:image/svg+xml;base64,' +
      btoa(`
      <svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="2" dy="4" stdDeviation="3" flood-color="rgba(0,0,0,0.3)"/>
          </filter>
        </defs>
        <circle cx="20" cy="20" r="18" fill="${color}" filter="url(#shadow)" stroke="${borderColor}" stroke-width="2"/>
        <circle cx="20" cy="20" r="12" fill="white" opacity="0.9"/>
        <circle cx="20" cy="20" r="6" fill="${color}"/>
        <text x="20" y="25" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="8" font-weight="bold">IP</text>
      </svg>
    `),
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    popupAnchor: [0, -20],
    className: isSelected ? 'ip-marker selected' : 'ip-marker',
  })
}

// Measurement marker icon (Restored)
const createMeasurementIcon = (number: number) => {
  return new Icon({
    iconUrl:
      'data:image/svg+xml;base64,' +
      btoa(`
      <svg width="30" height="30" viewBox="0 0 30 30" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="1" dy="2" stdDeviation="2" flood-color="rgba(0,0,0,0.4)"/>
          </filter>
        </defs>
        <circle cx="15" cy="15" r="14" fill="#d4af37" filter="url(#shadow)" stroke="#8b9a8b" stroke-width="2"/>
        <text x="15" y="19" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="12" font-weight="bold">${number}</text>
      </svg>
    `),
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    popupAnchor: [0, -15],
    className: 'measurement-marker',
  })
}

// Custom marker icon for marker mode
const createCustomMarkerIcon = (number: number) => {
  return new Icon({
    iconUrl:
      'data:image/svg+xml;base64,' +
      btoa(`
      <svg width="35" height="35" viewBox="0 0 35 35" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="2" dy="4" stdDeviation="3" flood-color="rgba(0,0,0,0.3)"/>
          </filter>
        </defs>
        <circle cx="17.5" cy="17.5" r="16" fill="#4a90e2" filter="url(#shadow)" stroke="#ffffff" stroke-width="2"/>
        <circle cx="17.5" cy="17.5" r="10" fill="white" opacity="0.9"/>
        <text x="17.5" y="22" text-anchor="middle" fill="#4a90e2" font-family="Arial, sans-serif" font-size="10" font-weight="bold">${number}</text>
      </svg>
    `),
    iconSize: [35, 35],
    iconAnchor: [17.5, 17.5],
    popupAnchor: [0, -17.5],
    className: 'custom-marker',
  })
}

// Create coordinate label overlay
const createCoordinateLabel = (
  lat: number,
  lon: number,
  markerType: 'ip' | 'measurement' | 'custom',
) => {
  const labelClass =
    markerType === 'ip'
      ? 'ip-coordinate-label'
      : markerType === 'measurement'
        ? 'measurement-coordinate-label'
        : 'custom-coordinate-label'

  return new Marker([lat, lon], {
    icon: new Icon({
      iconUrl:
        'data:image/svg+xml;base64,' +
        btoa(`
        <svg width="120" height="24" viewBox="0 0 120 24" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
              <feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="rgba(0,0,0,0.3)"/>
            </filter>
          </defs>
          <rect x="2" y="2" width="116" height="20" rx="10" fill="rgba(0,0,0,0.8)" filter="url(#shadow)"/>
          <text x="60" y="15" text-anchor="middle" fill="white" font-family="Courier New, monospace" font-size="9" font-weight="bold">
            ${lat.toFixed(4)}, ${lon.toFixed(4)}
          </text>
        </svg>
      `),
      iconSize: [120, 24],
      iconAnchor: [60, 40], // Position above marker
      className: labelClass,
    }),
    interactive: false, // Labels are not clickable
    zIndexOffset: 1000, // Always on top
  })
}

// Create unified marker
const createUnifiedMarker = (
  lat: number,
  lon: number,
  type: 'ip' | 'measurement' | 'custom',
  options: {
    ip?: string
    city?: string
    country?: string
    number?: number
  } = {},
): UnifiedMarker => {
  const id = `${type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

  let icon
  if (type === 'ip') {
    icon = createIpIcon(options.ip || 'IP')
  } else if (type === 'measurement') {
    icon = createMeasurementIcon(options.number || 1)
  } else {
    icon = createCustomMarkerIcon(options.number || 1)
  }

  // Create the main marker
  const marker = new Marker([lat, lon], {
    icon,
    riseOnHover: true,
    draggable: false,
  })

  // Create coordinate label if enabled
  const coordinateLabel = showCoordinateLabels.value
    ? createCoordinateLabel(lat, lon, type)
    : undefined

  const unifiedMarker: UnifiedMarker = {
    id,
    type,
    lat,
    lon,
    marker,
    coordinateLabel,
    timestamp: new Date(),
    isSelected: false,
    ...options,
  }

  // Add click handler
  marker.on('click', (e) => {
    e.originalEvent?.stopPropagation()
    handleMarkerClick(unifiedMarker)
  })

  // Add to map
  if (map) {
    marker.addTo(map)
    if (coordinateLabel) {
      coordinateLabel.addTo(map)
    }
  }

  return unifiedMarker
}

// Handle marker click (unified)
const handleMarkerClick = (unifiedMarker: UnifiedMarker) => {
  if (unifiedMarker.type === 'ip') {
    toggleIpMarkerSelection(unifiedMarker)
  } else {
    showMarkerInfo(unifiedMarker)
  }

  // Update popup
  updateMarkerPopup(unifiedMarker)
}

// Show marker info for measurement and custom markers
const showMarkerInfo = (unifiedMarker: UnifiedMarker) => {
  const markerType = unifiedMarker.type === 'measurement' ? 'Measurement' : 'Custom'
  console.log(
    `${markerType} marker ${unifiedMarker.number} clicked at ${unifiedMarker.lat}, ${unifiedMarker.lon}`,
  )
}

// Toggle marker mode
const toggleMarkerMode = () => {
  isMarkerMode.value = !isMarkerMode.value
  console.log(`Marker mode: ${isMarkerMode.value ? 'ON' : 'OFF'}`)

  // Turn off measurement mode if marker mode is enabled
  if (isMarkerMode.value && isMeasuring.value) {
    isMeasuring.value = false
  }
}

// Get custom markers
const getCustomMarkers = () => {
  return allMarkers.value.filter((marker) => marker.type === 'custom')
}

// Clear all custom markers
const clearCustomMarkers = () => {
  const customMarkersToRemove = allMarkers.value.filter((marker) => marker.type === 'custom')

  customMarkersToRemove.forEach((marker) => {
    if (map) {
      map.removeLayer(marker.marker)
      if (marker.coordinateLabel) {
        map.removeLayer(marker.coordinateLabel)
      }
    }
  })

  // Remove custom markers from unified array
  allMarkers.value = allMarkers.value.filter((marker) => marker.type !== 'custom')

  // Reset counter
  markerCounter.value = 1

  console.log('All custom markers cleared')
}

// Toggle IP marker selection
const toggleIpMarkerSelection = (unifiedMarker: UnifiedMarker) => {
  if (!map || unifiedMarker.type !== 'ip') return

  const isCurrentlySelected = unifiedMarker.isSelected

  if (isCurrentlySelected) {
    // Deselect
    unifiedMarker.isSelected = false
    unifiedMarker.marker.setIcon(createIpIcon(unifiedMarker.ip || 'IP', false))
    const index = selectedMarkers.value.findIndex((m) => m.id === unifiedMarker.id)
    if (index !== -1) {
      selectedMarkers.value.splice(index, 1)
    }
  } else {
    // Select
    unifiedMarker.isSelected = true
    unifiedMarker.marker.setIcon(createIpIcon(unifiedMarker.ip || 'IP', true))
    selectedMarkers.value.push(unifiedMarker)
  }

  updateIpDistanceLines()
  console.log(`IP marker ${unifiedMarker.ip} ${isCurrentlySelected ? 'deselected' : 'selected'}`)
}

// Update marker popup content
const updateMarkerPopup = (unifiedMarker: UnifiedMarker) => {
  let popupContent = ''

  if (unifiedMarker.type === 'ip') {
    const isSelected = unifiedMarker.isSelected
    const selectionStatus = isSelected ? 'SELECTED' : 'CLICK TO SELECT'
    const selectionClass = isSelected ? 'selected' : ''

    popupContent = `
      <div class="ip-popup ${selectionClass}">
        <div class="popup-header">
          <span class="popup-icon">🌐</span>
          <h4>IP Location</h4>
        </div>
        <div class="popup-content">
          <div class="popup-row">
            <span class="popup-label">IP Address:</span>
            <span class="popup-value">${unifiedMarker.ip || 'Unknown'}</span>
          </div>
          <div class="popup-row">
            <span class="popup-label">Location:</span>
            <span class="popup-value">${unifiedMarker.city || 'Unknown'}, ${unifiedMarker.country || 'Unknown'}</span>
          </div>
          <div class="popup-row">
            <span class="popup-label">Coordinates:</span>
            <span class="popup-value">${unifiedMarker.lat.toFixed(6)}, ${unifiedMarker.lon.toFixed(6)}</span>
          </div>
          <div class="popup-row">
            <span class="popup-label">Status:</span>
            <span class="popup-value status-${isSelected ? 'active' : 'inactive'}">${selectionStatus}</span>
          </div>
          <div class="popup-row">
            <span class="popup-label">Added:</span>
            <span class="popup-value">${unifiedMarker.timestamp.toLocaleTimeString()}</span>
          </div>
        </div>
        <div class="popup-actions">
          <button onclick="window.copyCoordinates('${unifiedMarker.lat}, ${unifiedMarker.lon}')" class="popup-btn copy-btn">
            📋 Copy
          </button>
          <button onclick="window.removeUnifiedMarker('${unifiedMarker.id}')" class="popup-btn remove-btn">
            🗑️ Remove
          </button>
        </div>
      </div>
    `
  } else if (unifiedMarker.type === 'measurement') {
    popupContent = `
      <div class="measurement-popup">
        <div class="popup-header">
          <span class="popup-icon">📏</span>
          <h4>Measurement Point ${unifiedMarker.number}</h4>
        </div>
        <div class="popup-content">
          <div class="popup-row">
            <span class="popup-label">Coordinates:</span>
            <span class="popup-value">${unifiedMarker.lat.toFixed(6)}, ${unifiedMarker.lon.toFixed(6)}</span>
          </div>
          <div class="popup-row">
            <span class="popup-label">Point Number:</span>
            <span class="popup-value">${unifiedMarker.number}</span>
          </div>
          <div class="popup-row">
            <span class="popup-label">Added:</span>
            <span class="popup-value">${unifiedMarker.timestamp.toLocaleTimeString()}</span>
          </div>
        </div>
        <div class="popup-actions">
          <button onclick="window.copyCoordinates('${unifiedMarker.lat}, ${unifiedMarker.lon}')" class="popup-btn copy-btn">
            📋 Copy
          </button>
          <button onclick="window.removeUnifiedMarker('${unifiedMarker.id}')" class="popup-btn remove-btn">
            🗑️ Remove
          </button>
        </div>
      </div>
    `
  } else {
    // custom marker
    popupContent = `
      <div class="custom-popup">
        <div class="popup-header">
          <span class="popup-icon">📍</span>
          <h4>Custom Marker ${unifiedMarker.number}</h4>
        </div>
        <div class="popup-content">
          <div class="popup-row">
            <span class="popup-label">Coordinates:</span>
            <span class="popup-value">${unifiedMarker.lat.toFixed(6)}, ${unifiedMarker.lon.toFixed(6)}</span>
          </div>
          <div class="popup-row">
            <span class="popup-label">Marker Number:</span>
            <span class="popup-value">${unifiedMarker.number}</span>
          </div>
          <div class="popup-row">
            <span class="popup-label">Added:</span>
            <span class="popup-value">${unifiedMarker.timestamp.toLocaleTimeString()}</span>
          </div>
        </div>
        <div class="popup-actions">
          <button onclick="window.copyCoordinates('${unifiedMarker.lat}, ${unifiedMarker.lon}')" class="popup-btn copy-btn">
            📋 Copy
          </button>
          <button onclick="window.removeUnifiedMarker('${unifiedMarker.id}')" class="popup-btn remove-btn">
            🗑️ Remove
          </button>
        </div>
      </div>
    `
  }

  unifiedMarker.marker.setPopupContent(popupContent)
}

// Remove unified marker
const removeUnifiedMarker = (markerId: string) => {
  const markerIndex = allMarkers.value.findIndex((m) => m.id === markerId)
  if (markerIndex === -1) return

  const markerToRemove = allMarkers.value[markerIndex]

  // Remove from map
  if (map) {
    map.removeLayer(markerToRemove.marker)
    if (markerToRemove.coordinateLabel) {
      map.removeLayer(markerToRemove.coordinateLabel)
    }
  }

  // Remove from selected markers if selected
  if (markerToRemove.isSelected) {
    const selectedIndex = selectedMarkers.value.findIndex((m) => m.id === markerId)
    if (selectedIndex !== -1) {
      selectedMarkers.value.splice(selectedIndex, 1)
    }
  }

  // Remove from main array
  allMarkers.value.splice(markerIndex, 1)

  // Update related systems
  if (markerToRemove.type === 'ip') {
    updateIpDistanceLines()
  } else {
    updateMeasurementSystem()
  }

  console.log(`Removed ${markerToRemove.type} marker ${markerId}`)
}

// Toggle coordinate labels visibility
const toggleCoordinateLabels = () => {
  showCoordinateLabels.value = !showCoordinateLabels.value

  allMarkers.value.forEach((unifiedMarker) => {
    if (showCoordinateLabels.value && !unifiedMarker.coordinateLabel) {
      // Add coordinate label
      unifiedMarker.coordinateLabel = createCoordinateLabel(
        unifiedMarker.lat,
        unifiedMarker.lon,
        unifiedMarker.type,
      )
      if (map) {
        unifiedMarker.coordinateLabel.addTo(map)
      }
    } else if (!showCoordinateLabels.value && unifiedMarker.coordinateLabel) {
      // Remove coordinate label
      if (map) {
        map.removeLayer(unifiedMarker.coordinateLabel)
      }
      unifiedMarker.coordinateLabel = undefined
    }
  })

  // Synchronize labels after toggle to ensure proper positioning
  if (showCoordinateLabels.value) {
    setTimeout(() => {
      syncCoordinateLabels()
    }, 50)
  }
}

// Helper function to synchronize coordinate labels with markers
const syncCoordinateLabels = () => {
  allMarkers.value.forEach((unifiedMarker) => {
    if (unifiedMarker.coordinateLabel && map && map.hasLayer(unifiedMarker.coordinateLabel)) {
      // Ensure coordinate label is positioned exactly at marker location
      unifiedMarker.coordinateLabel.setLatLng([unifiedMarker.lat, unifiedMarker.lon])
    }
  })
}

// Getter functions for template
const getIpMarkers = () => {
  return allMarkers.value.filter((marker) => marker.type === 'ip')
}

const getMeasurementMarkers = () => {
  return allMarkers.value.filter((marker) => marker.type === 'measurement')
}

const getSelectedIpMarkers = () => {
  return selectedMarkers.value.filter((marker) => marker.type === 'ip')
}

const switchMapMode = (mode: string) => {
  if (!map || !mapModes[mode]) return

  currentMapMode.value = mode

  // Remove current tile layer
  if (currentTileLayer) {
    map.removeLayer(currentTileLayer)
  }

  // Add new tile layer
  const modeConfig = mapModes[mode]
  currentTileLayer = new TileLayer(modeConfig.url, {
    attribution: modeConfig.attribution,
    maxZoom: 18,
  })

  currentTileLayer.addTo(map)

  // Force reactivity update for control styles
  // This ensures text colors update when switching map modes
}

const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371 // Earth's radius in kilometers
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

const formatDistance = (distance: number): string => {
  if (distance < 1) {
    return `${(distance * 1000).toFixed(0)}m`
  }
  return `${distance.toFixed(2)}km`
}

const addOrUpdateIpMarker = () => {
  if (!map) {
    console.log('Cannot create marker - map not ready')
    return
  }

  if (!props.ip || !props.lat || !props.lon) {
    console.log('Cannot create marker - missing IP or coordinates:', {
      ip: props.ip,
      lat: props.lat,
      lon: props.lon,
    })
    return
  }

  // Store coordinates with maximum precision to prevent drift
  const lat = parseFloat(props.lat.toString())
  const lon = parseFloat(props.lon.toString())

  console.log(`[MARKER] Processing IP ${props.ip} at coordinates: ${lat}, ${lon}`)
  console.log(`[MARKER] Current markers in array: ${allMarkers.value.length}`)

  // Check if marker already exists for this IP using unified system
  const existingMarkerIndex = allMarkers.value.findIndex(
    (m) => m.type === 'ip' && m.ip === props.ip,
  )

  if (existingMarkerIndex !== -1) {
    // Update existing marker
    const existingMarker = allMarkers.value[existingMarkerIndex]

    console.log(
      `[MARKER] Found existing marker for ${props.ip} at position ${existingMarker.lat}, ${existingMarker.lon}`,
    )

    // Check if coordinates actually changed
    const latChanged = Math.abs(existingMarker.lat - lat) > 0.0001
    const lonChanged = Math.abs(existingMarker.lon - lon) > 0.0001

    if (latChanged || lonChanged) {
      console.log(`[MARKER] Updating position for existing marker ${props.ip}`)

      // Remove old marker and coordinate label
      if (map.hasLayer(existingMarker.marker)) {
        map.removeLayer(existingMarker.marker)
      }
      if (existingMarker.coordinateLabel && map.hasLayer(existingMarker.coordinateLabel)) {
        map.removeLayer(existingMarker.coordinateLabel)
      }

      // Update marker data
      existingMarker.lat = lat
      existingMarker.lon = lon
      existingMarker.city = props.city || 'Unknown'
      existingMarker.country = props.country || 'Unknown'
      existingMarker.timestamp = new Date()

      // Create new marker with precise coordinates
      const newMarker = new Marker([lat, lon], {
        icon: createIpIcon(existingMarker.ip!, existingMarker.isSelected),
        riseOnHover: true,
        draggable: false,
      })

      // Create new coordinate label if enabled
      const newCoordinateLabel = showCoordinateLabels.value
        ? createCoordinateLabel(lat, lon, 'ip')
        : undefined

      // Update marker references
      existingMarker.marker = newMarker
      existingMarker.coordinateLabel = newCoordinateLabel

      // Add event handler
      newMarker.on('click', (e) => {
        e.originalEvent?.stopPropagation()
        handleMarkerClick(existingMarker)
      })

      // Add to map
      newMarker.addTo(map)
      if (newCoordinateLabel) {
        newCoordinateLabel.addTo(map)
      }

      // Update popup
      updateMarkerPopup(existingMarker)
    } else {
      console.log(
        `[MARKER] Marker for ${props.ip} already exists at correct position - no update needed`,
      )

      // Ensure marker is still precisely positioned (fix zoom drift)
      if (map.hasLayer(existingMarker.marker)) {
        existingMarker.marker.setLatLng([lat, lon])
      }
      if (existingMarker.coordinateLabel && map.hasLayer(existingMarker.coordinateLabel)) {
        existingMarker.coordinateLabel.setLatLng([lat, lon])
      }
    }

    return
  }

  // Create new IP marker using unified system
  console.log(`[MARKER] Creating brand new marker for IP ${props.ip}`)

  const newUnifiedMarker = createUnifiedMarker(lat, lon, 'ip', {
    ip: props.ip,
    city: props.city || 'Unknown',
    country: props.country || 'Unknown',
  })

  // Add to unified markers array
  allMarkers.value.push(newUnifiedMarker)

  // Update popup
  updateMarkerPopup(newUnifiedMarker)

  console.log(
    `[MARKER] Successfully added new IP marker for ${props.ip}. Total markers: ${allMarkers.value.length}`,
  )
}

// Legacy functions removed - using unified marker system

const updateIpDistanceLines = () => {
  if (!map) return

  // Clear existing IP distance lines
  ipDistanceLines.value.forEach((line) => {
    map!.removeLayer(line as unknown as Layer)
  })
  ipDistanceLines.value = []
  selectedIpTotalDistance.value = 0 // Reset distance

  const selectedIpMarkers = selectedMarkers.value.filter((marker) => marker.type === 'ip')

  if (selectedIpMarkers.length < 2) {
    return
  }

  let totalDist = 0

  // Draw lines connecting selected markers in order of selection
  for (let i = 0; i < selectedIpMarkers.length - 1; i++) {
    const startMarker = selectedIpMarkers[i]
    const endMarker = selectedIpMarkers[i + 1]

    const line = new Polyline(
      [new LatLng(startMarker.lat, startMarker.lon), new LatLng(endMarker.lat, endMarker.lon)],
      {
        color: '#d4af37', // Golden color for visibility
        weight: 4,
        opacity: 0.9,
        dashArray: '10, 5',
      },
    )

    const distance = calculateDistance(
      startMarker.lat,
      startMarker.lon,
      endMarker.lat,
      endMarker.lon,
    )
    totalDist += distance // Accumulate distance

    line.bindPopup(
      `
      <div class="distance-popup">
        <strong>Distance</strong><br>
        ${startMarker.ip} ↔ ${endMarker.ip}<br>
        <strong>${formatDistance(distance)}</strong>
      </div>
    `,
    )

    line.addTo(map)
    ipDistanceLines.value.push(line)
  }
  selectedIpTotalDistance.value = totalDist
}

// Watch for changes in selected markers to update distance lines
watch(selectedMarkers, updateIpDistanceLines, { deep: true })

const clearAllIpMarkers = () => {
  // Get all IP markers
  const ipMarkersToRemove = allMarkers.value.filter((marker) => marker.type === 'ip')

  ipMarkersToRemove.forEach((ipMarker) => {
    if (map) {
      // Remove marker and coordinate label from map
      map.removeLayer(ipMarker.marker)
      if (ipMarker.coordinateLabel) {
        map.removeLayer(ipMarker.coordinateLabel)
      }
    }
  })

  // Remove IP markers from unified array
  allMarkers.value = allMarkers.value.filter((marker) => marker.type !== 'ip')

  // Clear selected markers
  selectedMarkers.value = selectedMarkers.value.filter((marker) => marker.type !== 'ip')

  // Clear distance lines
  updateIpDistanceLines()
}

// Clear all markers (unified)
const clearAllMarkers = () => {
  allMarkers.value.forEach((marker) => {
    if (map) {
      // Remove marker and coordinate label from map
      map.removeLayer(marker.marker)
      if (marker.coordinateLabel) {
        map.removeLayer(marker.coordinateLabel)
      }
    }
  })

  // Clear all arrays
  allMarkers.value = []
  selectedMarkers.value = []

  // Clear measurement lines and distance lines
  measurementLines.value.forEach((line) => map!.removeLayer(line as unknown as Layer))
  measurementLines.value = []
  ipDistanceLines.value.forEach((line) => map!.removeLayer(line as unknown as Layer))
  ipDistanceLines.value = []

  // Reset distances
  manualTotalDistance.value = 0
  selectedIpTotalDistance.value = 0

  console.log('All markers cleared')
}

const zoomIn = () => {
  if (map) map.zoomIn()
}

const zoomOut = () => {
  if (map) map.zoomOut()
}

const centerMap = () => {
  if (map) {
    map.flyTo([props.lat, props.lon], 13, {
      animate: true,
      duration: 1,
    })
  }
}

// Update text colors based on map mode
const getTextColor = () => {
  return currentMapMode.value === 'light' || currentMapMode.value === 'satellite'
    ? '#2f3e2f'
    : '#ffffff'
}

const getBorderColor = () => {
  return currentMapMode.value === 'light' || currentMapMode.value === 'satellite'
    ? 'rgba(47, 62, 47, 0.8)'
    : 'rgba(139, 154, 139, 0.4)'
}

const getBackgroundColor = () => {
  return currentMapMode.value === 'light' || currentMapMode.value === 'satellite'
    ? 'rgba(255, 255, 255, 0.95)'
    : 'rgba(139, 154, 139, 0.08)'
}

// Global functions for popup buttons
declare global {
  interface Window {
    copyCoordinates: (coords: string) => void
    removeUnifiedMarker: (markerId: string) => void
    removeMeasurementMarker: (markerIndex: number) => void
  }
}

window.copyCoordinates = (coords: string) => {
  navigator.clipboard.writeText(coords)
}

window.removeUnifiedMarker = removeUnifiedMarker

window.removeMeasurementMarker = (markerIndex: number) => {
  removeMeasurementMarker(markerIndex)
}

// Function to remove individual measurement marker
const removeMeasurementMarker = (markerIndex: number) => {
  if (!map || markerIndex < 0 || markerIndex >= measurementMarkers.value.length) return

  const markerToRemove = measurementMarkers.value[markerIndex]

  // Remove the marker from the map
  map.removeLayer(markerToRemove as unknown as Layer)

  // Remove from the array
  measurementMarkers.value.splice(markerIndex, 1)

  // Recalculate measurement lines and total distance
  recalculateMeasurementLines()
}

// Function to recalculate measurement lines after removing a marker
const recalculateMeasurementLines = () => {
  if (!map) return

  // Clear existing measurement lines
  measurementLines.value.forEach((line) => map!.removeLayer(line as unknown as Layer))
  measurementLines.value = []
  manualTotalDistance.value = 0

  // Recreate lines between remaining markers
  if (measurementMarkers.value.length > 1) {
    let totalDist = 0

    for (let i = 0; i < measurementMarkers.value.length - 1; i++) {
      const currentMarker = measurementMarkers.value[i]
      const nextMarker = measurementMarkers.value[i + 1]

      const currentLatLng = currentMarker.getLatLng()
      const nextLatLng = nextMarker.getLatLng()

      const line = new Polyline([currentLatLng, nextLatLng], {
        color: '#d4af37',
        weight: 3,
        opacity: 0.8,
        dashArray: '10, 5',
      })

      const segmentDistance = calculateDistance(
        currentLatLng.lat,
        currentLatLng.lng,
        nextLatLng.lat,
        nextLatLng.lng,
      )
      totalDist += segmentDistance

      line.bindPopup(`
        <div class="distance-popup">
          <strong>Distance</strong><br>
          Point ${i + 1} ↔ Point ${i + 2}<br>
          <strong>${formatDistance(segmentDistance)}</strong>
        </div>
      `)

      line.addTo(map)
      measurementLines.value.push(line)
    }

    manualTotalDistance.value = totalDist
  }

  // Update marker numbers after removal
  updateMeasurementMarkerNumbers()
}

// Function to update marker numbers and popups after changes
const updateMeasurementMarkerNumbers = () => {
  measurementMarkers.value.forEach((marker, index) => {
    const markerNumber = index + 1
    const latLng = marker.getLatLng()

    // Update icon with new number
    marker.setIcon(createMeasurementIcon(markerNumber))

    // Update popup content
    const popupContent = `
      <div class="measurement-popup">
        <div class="popup-header">
          <span class="popup-icon">📏</span>
          <h4>Measurement Point ${markerNumber}</h4>
        </div>
        <div class="popup-content">
          <div class="popup-row">
            <span class="popup-label">Coordinates:</span>
            <span class="popup-value">${latLng.lat.toFixed(6)}, ${latLng.lng.toFixed(6)}</span>
          </div>
          <div class="popup-row">
            <span class="popup-label">Point Number:</span>
            <span class="popup-value">${markerNumber}</span>
          </div>
        </div>
        <div class="popup-actions">
          <button onclick="window.copyCoordinates('${latLng.lat}, ${latLng.lng}')" class="popup-btn copy-btn">
            📋 Copy
          </button>
          <button onclick="window.removeMeasurementMarker(${index})" class="popup-btn remove-btn">
            🗑️ Remove
          </button>
        </div>
      </div>
    `

    marker.setPopupContent(popupContent)
  })
}

// Manual Measurement Functions (Restored)
const toggleMeasurement = () => {
  isMeasuring.value = !isMeasuring.value
  console.log(`Measurement mode: ${isMeasuring.value ? 'ON' : 'OFF'}`)
  if (!isMeasuring.value) {
    // Optionally clear measurements when toggling off
    clearMeasurements()
  }
}

const clearMeasurements = () => {
  if (!map) return
  measurementMarkers.value.forEach((marker) => map!.removeLayer(marker as unknown as Layer))
  measurementMarkers.value = []
  measurementLines.value.forEach((line) => map!.removeLayer(line as unknown as Layer))
  measurementLines.value = []
  manualTotalDistance.value = 0
}

const updateMeasurementSystem = () => {
  if (!map) return

  // Clear existing measurement lines
  measurementLines.value.forEach((line) => map!.removeLayer(line as unknown as Layer))
  measurementLines.value = []
  manualTotalDistance.value = 0

  // Recreate lines between remaining markers
  if (measurementMarkers.value.length > 1) {
    let totalDist = 0

    for (let i = 0; i < measurementMarkers.value.length - 1; i++) {
      const currentMarker = measurementMarkers.value[i]
      const nextMarker = measurementMarkers.value[i + 1]

      const currentLatLng = currentMarker.getLatLng()
      const nextLatLng = nextMarker.getLatLng()

      const line = new Polyline([currentLatLng, nextLatLng], {
        color: '#d4af37',
        weight: 3,
        opacity: 0.8,
        dashArray: '10, 5',
      })

      const segmentDistance = calculateDistance(
        currentLatLng.lat,
        currentLatLng.lng,
        nextLatLng.lat,
        nextLatLng.lng,
      )
      totalDist += segmentDistance

      line.bindPopup(`
        <div class="distance-popup">
          <strong>Distance</strong><br>
          Point ${i + 1} ↔ Point ${i + 2}<br>
          <strong>${formatDistance(segmentDistance)}</strong>
        </div>
      `)

      line.addTo(map)
      measurementLines.value.push(line)
    }

    manualTotalDistance.value = totalDist
  }

  // Update marker numbers after removal
  updateMeasurementMarkerNumbers()
}

const initMap = () => {
  if (!mapContainer.value) return

  isLoading.value = true

  // Initialize map with smooth animations
  map = new Map(mapContainer.value, {
    center: [props.lat, props.lon],
    zoom: 13,
    zoomControl: false,
    attributionControl: true,
    fadeAnimation: true,
    zoomAnimation: true,
    markerZoomAnimation: true,
  })

  // Add initial tile layer
  switchMapMode(currentMapMode.value)

  // Add accuracy circle with animation
  accuracyCircle = new Circle([props.lat, props.lon], {
    radius: 1000,
    fillColor: '#8b9a8b',
    fillOpacity: 0.1,
    color: '#8b9a8b',
    weight: 2,
    opacity: 0.6,
  })

  accuracyCircle.addTo(map)

  // Map loaded event
  map.whenReady(() => {
    isLoading.value = false
    console.log('Map is ready')
  })

  // Add zoom event handlers to prevent marker drift
  map.on('zoomstart', () => {
    console.log('Zoom started - preparing to maintain marker positions')
  })

  map.on('zoomend', () => {
    console.log('Zoom ended - repositioning markers to prevent drift')
    // Re-position all unified markers and their coordinate labels to their precise coordinates
    allMarkers.value.forEach((unifiedMarker) => {
      if (map!.hasLayer(unifiedMarker.marker as unknown as Layer)) {
        unifiedMarker.marker.setLatLng([unifiedMarker.lat, unifiedMarker.lon])
      }
    })

    // Synchronize coordinate labels with markers
    syncCoordinateLabels()

    // Re-position all legacy measurement markers
    measurementMarkers.value.forEach((marker) => {
      if (map!.hasLayer(marker as unknown as Layer)) {
        const currentLatLng = marker.getLatLng()
        marker.setLatLng([currentLatLng.lat, currentLatLng.lng])
      }
    })
  })

  // Add pan event handlers to maintain coordinate label positions
  map.on('moveend', () => {
    console.log('Map movement ended - synchronizing coordinate labels')
    syncCoordinateLabels()
  })

  // Add map click handlers for measurement and marker modes
  map.on('click', (e) => {
    // Handle measurement mode
    if (isMeasuring.value) {
      e.originalEvent?.stopPropagation()

      const { lat, lng } = e.latlng
      const markerNumber = measurementMarkers.value.length + 1

      const measurementMarker = new Marker([lat, lng], {
        icon: createMeasurementIcon(markerNumber),
      })

      // Add popup with coordinates and remove button
      const popupContent = `
        <div class="measurement-popup">
          <div class="popup-header">
            <span class="popup-icon">📏</span>
            <h4>Measurement Point ${markerNumber}</h4>
          </div>
          <div class="popup-content">
            <div class="popup-row">
              <span class="popup-label">Coordinates:</span>
              <span class="popup-value">${lat.toFixed(6)}, ${lng.toFixed(6)}</span>
            </div>
            <div class="popup-row">
              <span class="popup-label">Point Number:</span>
              <span class="popup-value">${markerNumber}</span>
            </div>
          </div>
          <div class="popup-actions">
            <button onclick="window.copyCoordinates('${lat}, ${lng}')" class="popup-btn copy-btn">
              📋 Copy
            </button>
            <button onclick="window.removeMeasurementMarker(${measurementMarkers.value.length})" class="popup-btn remove-btn">
              🗑️ Remove
            </button>
          </div>
        </div>
      `

      measurementMarker.setPopupContent(popupContent)
      measurementMarker.addTo(map!)
      measurementMarkers.value.push(measurementMarker)

      if (measurementMarkers.value.length > 1) {
        const prevMarker = measurementMarkers.value[measurementMarkers.value.length - 2]
        const prevLatLng = prevMarker.getLatLng()

        const line = new Polyline([prevLatLng, new LatLng(lat, lng)], {
          color: '#d4af37',
          weight: 3,
          opacity: 0.8,
          dashArray: '10, 5',
        })

        const segmentDistance = calculateDistance(prevLatLng.lat, prevLatLng.lng, lat, lng)

        line.bindPopup(`
          <div class="distance-popup">
            <strong>Distance</strong><br>
            Point ${markerNumber - 1} ↔ Point ${markerNumber}<br>
            <strong>${formatDistance(segmentDistance)}</strong>
          </div>
        `)

        line.addTo(map!)
        measurementLines.value.push(line)
        manualTotalDistance.value += segmentDistance
      }
      return
    }

    // Handle marker mode
    if (isMarkerMode.value) {
      e.originalEvent?.stopPropagation()

      const { lat, lng } = e.latlng

      // Create custom marker using unified system
      const customMarker = createUnifiedMarker(lat, lng, 'custom', {
        number: markerCounter.value,
      })

      // Add to unified markers array
      allMarkers.value.push(customMarker)

      // Update popup
      updateMarkerPopup(customMarker)

      // Increment counter
      markerCounter.value++

      console.log(
        `Custom marker ${customMarker.number} placed at ${lat.toFixed(6)}, ${lng.toFixed(6)}`,
      )
      return
    }
  })
}

const updateMap = () => {
  if (!map || !accuracyCircle) return

  const newLatLng: [number, number] = [props.lat, props.lon]

  console.log(`Updating map view to ${props.lat}, ${props.lon} for IP ${props.ip}`)

  // Update map view
  map.setView(newLatLng, map.getZoom(), {
    animate: true,
  })

  // Update accuracy circle position
  accuracyCircle.setLatLng(newLatLng)

  // Synchronize coordinate labels after map update
  setTimeout(() => {
    syncCoordinateLabels()
  }, 100)
}

// Watch for prop changes and handle marker persistence
watch(
  [() => props.lat, () => props.lon, () => props.ip],
  ([newLat, newLon, newIp], [oldLat, oldLon, oldIp]) => {
    console.log(`[WATCH] Props changed:`)
    console.log(`[WATCH] - IP: ${oldIp} → ${newIp}`)
    console.log(`[WATCH] - Lat: ${oldLat} → ${newLat}`)
    console.log(`[WATCH] - Lon: ${oldLon} → ${newLon}`)
    console.log(`[WATCH] - Map ready: ${!!map}`)

    if (!newLat || !newLon || !newIp) {
      console.log('[WATCH] Skipping update - missing required data:', { newLat, newLon, newIp })
      return
    }

    if (!map) {
      console.log('[WATCH] Skipping update - map not ready')
      return
    }

    // Always update map position first
    updateMap()

    // Always try to add/update the IP marker
    addOrUpdateIpMarker()
  },
  { immediate: false },
)

onMounted(() => {
  // Initialize map first
  setTimeout(() => {
    initMap()

    // After map is initialized and if we have initial props, create the marker
    setTimeout(() => {
      if (props.ip && props.lat && props.lon && map) {
        console.log('Creating initial marker from onMounted')
        addOrUpdateIpMarker()
      }
    }, 200)
  }, 100)
})

onUnmounted(() => {
  if (map) {
    map.remove()
    map = null
  }
})
</script>

<style scoped>
.map-wrapper {
  height: 100%;
  animation: fadeInUp 0.8s cubic-bezier(0.4, 0, 0.2, 1);
}

.map-control-btn {
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
  font-size: 0.875rem;
}

.map-control-btn:hover {
  background: var(--text-accent);
  color: white;
  transform: scale(1.1);
  box-shadow: var(--shadow-sm);
}

.map-container {
  position: relative;
  height: 100%;
  border-radius: 0 0 var(--radius-xl) var(--radius-xl);
  overflow: hidden;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.map-container.map-loading {
  background: var(--glass-bg);
}

.map-loader {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: var(--glass-bg);
  backdrop-filter: blur(10px);
  z-index: 1000;
  gap: var(--space-md);
}

.map-spinner {
  width: 50px;
  height: 50px;
  border: 4px solid transparent;
  border-top: 4px solid var(--text-accent);
  border-radius: 50%;
  animation: spin 1s cubic-bezier(0.68, -0.55, 0.265, 1.55) infinite;
}

.loading-text {
  color: var(--text-secondary);
  font-weight: 600;
  font-size: 0.875rem;
}

.map-overlay {
  position: absolute;
  top: var(--space-md);
  right: var(--space-md);
  z-index: 1000;
  pointer-events: none;
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
  align-items: flex-end;
}

.map-mode-selector {
  display: flex;
  gap: var(--space-xs);
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-lg);
  backdrop-filter: blur(15px);
  padding: var(--space-sm);
  margin-bottom: var(--space-md);
  pointer-events: auto;
}

.mode-btn {
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
  font-size: 0.875rem;
}

.mode-btn:hover {
  background: var(--text-accent);
  color: white;
  transform: scale(1.1);
  box-shadow: var(--shadow-sm);
}

.mode-btn.active {
  background: var(--text-accent);
  color: white;
  transform: scale(1.1);
  box-shadow: var(--shadow-sm);
}

.coordinates-display {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  padding: var(--space-sm) var(--space-md);
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-lg);
  backdrop-filter: blur(15px);
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--text-primary);
  animation: slideInRight 0.8s ease-out 0.5s both;
}

.measurement-controls {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-lg);
  backdrop-filter: blur(15px);
  padding: var(--space-sm);
  margin-bottom: var(--space-md);
  pointer-events: auto;
}

.measure-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  padding: var(--space-sm) var(--space-md);
  background: var(--tactical-bg);
  border: 2px solid var(--tactical-border-dim);
  color: var(--text-primary);
  border-radius: var(--radius-sm);
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  font-family: 'Courier New', monospace;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.measure-btn:hover {
  border-color: var(--tactical-border);
  background: var(--tactical-hover);
  color: var(--tactical-border);
  text-shadow: 0 0 5px currentColor;
}

.measure-btn.active {
  background: var(--tactical-border);
  color: var(--bg-primary);
  border-color: var(--tactical-border);
  text-shadow: none;
}

.marker-mode-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  padding: var(--space-sm) var(--space-md);
  background: var(--tactical-bg);
  border: 2px solid var(--tactical-border-dim);
  color: var(--text-primary);
  border-radius: var(--radius-sm);
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  font-family: 'Courier New', monospace;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.marker-mode-btn:hover {
  border-color: var(--tactical-border);
  background: var(--tactical-hover);
  color: var(--tactical-border);
  text-shadow: 0 0 5px currentColor;
}

.marker-mode-btn.active {
  background: var(--tactical-border);
  color: var(--bg-primary);
  border-color: var(--tactical-border);
  text-shadow: none;
}

.clear-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  padding: var(--space-sm) var(--space-md);
  background: var(--tactical-bg);
  border: 2px solid var(--danger-color);
  color: var(--danger-color);
  border-radius: var(--radius-sm);
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  font-family: 'Courier New', monospace;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.clear-btn:hover {
  background: var(--danger-color);
  color: var(--bg-primary);
  text-shadow: none;
}

.total-distance {
  text-align: center;
  font-size: 0.875rem;
  color: var(--text-secondary);
  margin-top: var(--space-xs);
}

.marker-count {
  text-align: center;
  font-size: 0.875rem;
  color: var(--text-secondary);
  margin-top: var(--space-xs);
}

.ip-controls {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-lg);
  backdrop-filter: blur(15px);
  padding: var(--space-sm);
  margin-bottom: var(--space-md);
  pointer-events: auto;
}

.ip-stats {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-xs);
  margin-bottom: var(--space-xs);
}

.marker-controls {
  display: flex;
  gap: var(--space-xs);
  width: 100%;
}

.marker-controls .clear-all-btn {
  flex: 1;
  min-width: 0;
}

.ip-count {
  font-size: 0.875rem;
  color: var(--text-primary);
  font-weight: 600;
  font-family: 'Courier New', monospace;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.selected-count {
  font-size: 0.75rem;
  color: var(--text-secondary);
  font-family: 'Courier New', monospace;
}

.clear-all-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  padding: var(--space-sm) var(--space-md);
  background: var(--tactical-bg);
  border: 2px solid var(--warning-color);
  color: var(--warning-color);
  border-radius: var(--radius-sm);
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  font-family: 'Courier New', monospace;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.clear-all-btn:hover {
  background: var(--warning-color);
  color: var(--bg-primary);
  text-shadow: none;
}

.map-controls {
  display: flex;
  gap: var(--space-xs);
  pointer-events: auto;
}

.coord-label {
  font-size: 1rem;
}

.coord-value {
  font-family: 'Courier New', monospace;
}

/* Coordinate labels button styling is defined below */

/* Mobile responsiveness */
@media (max-width: 768px) {
  .map-control-btn {
    width: 32px;
    height: 32px;
    font-size: 0.8rem;
  }

  .map-overlay {
    position: absolute;
    top: var(--space-sm);
    right: var(--space-sm);
    left: var(--space-sm);
    align-items: center;
  }

  .map-mode-selector {
    width: 100%;
    justify-content: center;
    margin-bottom: var(--space-sm);
  }

  .coordinates-display {
    width: 100%;
    justify-content: center;
    margin-bottom: var(--space-sm);
  }

  .measurement-controls {
    width: 100%;
    align-items: center;
    margin-bottom: var(--space-sm);
  }

  .map-controls {
    justify-content: center;
  }
}
</style>

<style>
/* Global styles for Leaflet customization - animation removed */
.leaflet-popup-content-wrapper {
  background: rgba(30, 30, 30, 0.85);
  color: #f0f0f0;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(5px);
}

/* Leaflet attribution styling */
.leaflet-control-attribution {
  background: var(--glass-bg) !important;
  backdrop-filter: blur(10px) !important;
  border: 1px solid var(--glass-border) !important;
  border-radius: var(--radius-sm) !important;
  color: var(--text-secondary) !important;
  font-size: 0.75rem !important;
}

.leaflet-control-attribution a {
  color: var(--text-accent) !important;
}

/* Measurement popup styles */
.distance-popup {
  text-align: center;
  color: var(--text-primary);
  font-family: 'Courier New', monospace;
  font-weight: 600;
  font-size: 0.875rem;
}

.measurement-popup {
  text-align: center;
  color: var(--text-primary);
  font-family: 'Courier New', monospace;
  font-weight: 600;
  font-size: 0.875rem;
  line-height: 1.4;
}

/* IP marker popup styles */
.ip-popup {
  min-width: 280px;
  color: var(--text-primary);
  font-family: 'Courier New', monospace;
}

.ip-popup.selected {
  border: 2px solid var(--tactical-border);
}

.ip-popup .popup-header {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  margin-bottom: var(--space-sm);
  padding-bottom: var(--space-sm);
  border-bottom: 1px solid var(--tactical-border-dim);
}

.ip-popup .popup-icon {
  font-size: 1.2rem;
}

.ip-popup h4 {
  margin: 0;
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--tactical-border);
  text-transform: uppercase;
  letter-spacing: 1px;
}

.ip-popup .popup-content {
  margin-bottom: var(--space-md);
}

.ip-popup .popup-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-xs);
  font-size: 0.875rem;
}

.ip-popup .popup-label {
  font-weight: 600;
  color: var(--text-secondary);
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.ip-popup .popup-value {
  font-weight: 700;
  color: var(--text-primary);
  font-family: 'Courier New', monospace;
}

.ip-popup .popup-actions {
  display: flex;
  gap: var(--space-sm);
}

.ip-popup .copy-btn {
  flex: 1;
  background: var(--tactical-bg);
  border: 2px solid var(--tactical-border-dim);
  color: var(--tactical-border);
  padding: var(--space-sm);
  border-radius: var(--radius-sm);
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  font-family: 'Courier New', monospace;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.ip-popup .copy-btn:hover {
  background: var(--tactical-border);
  color: var(--bg-primary);
}

.ip-popup .remove-btn {
  flex: 1;
  background: var(--tactical-bg);
  border: 2px solid var(--danger-color);
  color: var(--danger-color);
  padding: var(--space-sm);
  border-radius: var(--radius-sm);
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  font-family: 'Courier New', monospace;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.ip-popup .remove-btn:hover {
  background: var(--danger-color);
  color: var(--bg-primary);
}

/* Measurement marker popup styles */
.measurement-popup {
  min-width: 280px;
  color: var(--text-primary);
  font-family: 'Courier New', monospace;
}

.measurement-popup .popup-header {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  margin-bottom: var(--space-sm);
  padding-bottom: var(--space-sm);
  border-bottom: 1px solid var(--tactical-border-dim);
}

.measurement-popup .popup-icon {
  font-size: 1.2rem;
}

.measurement-popup h4 {
  margin: 0;
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--tactical-border);
  text-transform: uppercase;
  letter-spacing: 1px;
}

.measurement-popup .popup-content {
  margin-bottom: var(--space-md);
}

.measurement-popup .popup-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-xs);
  font-size: 0.875rem;
}

.measurement-popup .popup-label {
  font-weight: 600;
  color: var(--text-secondary);
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.measurement-popup .popup-value {
  font-weight: 700;
  color: var(--text-primary);
  font-family: 'Courier New', monospace;
}

.measurement-popup .popup-actions {
  display: flex;
  gap: var(--space-sm);
}

.measurement-popup .copy-btn {
  flex: 1;
  background: var(--tactical-bg);
  border: 2px solid var(--tactical-border-dim);
  color: var(--tactical-border);
  padding: var(--space-sm);
  border-radius: var(--radius-sm);
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  font-family: 'Courier New', monospace;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.measurement-popup .copy-btn:hover {
  background: var(--tactical-border);
  color: var(--bg-primary);
}

.measurement-popup .remove-btn {
  flex: 1;
  background: var(--tactical-bg);
  border: 2px solid var(--danger-color);
  color: var(--danger-color);
  padding: var(--space-sm);
  border-radius: var(--radius-sm);
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  font-family: 'Courier New', monospace;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.measurement-popup .remove-btn:hover {
  background: var(--danger-color);
  color: var(--bg-primary);
}

/* Custom marker popup styles */
.custom-popup {
  min-width: 280px;
  color: var(--text-primary);
  font-family: 'Courier New', monospace;
}

.custom-popup .popup-header {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  margin-bottom: var(--space-sm);
  padding-bottom: var(--space-sm);
  border-bottom: 1px solid var(--tactical-border-dim);
}

.custom-popup .popup-icon {
  font-size: 1.2rem;
}

.custom-popup h4 {
  margin: 0;
  font-size: 0.9rem;
  font-weight: 600;
  color: #4a90e2;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.custom-popup .popup-content {
  margin-bottom: var(--space-md);
}

.custom-popup .popup-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-xs);
  font-size: 0.875rem;
}

.custom-popup .popup-label {
  font-weight: 600;
  color: var(--text-secondary);
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.custom-popup .popup-value {
  font-weight: 700;
  color: var(--text-primary);
  font-family: 'Courier New', monospace;
}

.custom-popup .popup-actions {
  display: flex;
  gap: var(--space-sm);
}

.custom-popup .copy-btn {
  flex: 1;
  background: var(--tactical-bg);
  border: 2px solid #4a90e2;
  color: #4a90e2;
  padding: var(--space-sm);
  border-radius: var(--radius-sm);
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  font-family: 'Courier New', monospace;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.custom-popup .copy-btn:hover {
  background: #4a90e2;
  color: var(--bg-primary);
}

.custom-popup .remove-btn {
  flex: 1;
  background: var(--tactical-bg);
  border: 2px solid var(--danger-color);
  color: var(--danger-color);
  padding: var(--space-sm);
  border-radius: var(--radius-sm);
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  font-family: 'Courier New', monospace;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.custom-popup .remove-btn:hover {
  background: var(--danger-color);
  color: var(--bg-primary);
}

/* Common popup button styles */
.popup-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-xs);
  min-height: 32px;
  white-space: nowrap;
}

/* Coordinate label styles */
.ip-coordinate-label {
  z-index: 1000 !important;
  pointer-events: none !important;
}

.measurement-coordinate-label {
  z-index: 1000 !important;
  pointer-events: none !important;
}

.custom-coordinate-label {
  z-index: 1000 !important;
  pointer-events: none !important;
}

/* Enhanced coordinate label visibility */
.leaflet-marker-icon.ip-coordinate-label,
.leaflet-marker-icon.measurement-coordinate-label,
.leaflet-marker-icon.custom-coordinate-label {
  border: none !important;
  background: transparent !important;
  box-shadow: none !important;
}

/* Coordinate labels button styling */
.coord-labels-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-sm) var(--space-md);
  background: var(--tactical-bg);
  border: 2px solid var(--tactical-border-dim);
  color: var(--tactical-border);
  border-radius: var(--radius-sm);
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  font-family: 'Courier New', monospace;
  text-transform: uppercase;
  letter-spacing: 1px;
  white-space: nowrap;
  min-width: 120px;
}

.coord-labels-btn:hover {
  background: var(--tactical-border);
  color: var(--bg-primary);
  text-shadow: none;
}

.coord-labels-btn.active {
  background: var(--tactical-border);
  color: var(--bg-primary);
  border-color: var(--tactical-border);
  text-shadow: none;
}

/* Marker Management Panel */
.marker-management {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-lg);
  backdrop-filter: blur(15px);
  padding: var(--space-sm);
  margin-bottom: var(--space-md);
  pointer-events: auto;
  max-height: 300px;
  overflow-y: auto;
}

.management-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: var(--space-sm);
  border-bottom: 1px solid var(--tactical-border-dim);
  margin-bottom: var(--space-sm);
}

.management-title {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--tactical-border);
  font-family: 'Courier New', monospace;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.clear-all-btn.small {
  padding: var(--space-xs) var(--space-sm);
  font-size: 0.7rem;
  min-width: auto;
}

.marker-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.marker-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-sm);
  background: var(--tactical-bg);
  border: 1px solid var(--tactical-border-dim);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all 0.3s ease;
  font-family: 'Courier New', monospace;
}

.marker-item:hover {
  background: var(--tactical-hover);
  border-color: var(--tactical-border);
}

.marker-item.selected {
  background: var(--tactical-border);
  color: var(--bg-primary);
  border-color: var(--tactical-border);
}

.marker-info {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  flex: 1;
}

.marker-type {
  font-size: 1rem;
  width: 20px;
  text-align: center;
}

.marker-details {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.marker-primary {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--text-primary);
}

.marker-item.selected .marker-primary {
  color: var(--bg-primary);
}

.marker-coords {
  font-size: 0.75rem;
  color: var(--text-secondary);
  font-family: 'Courier New', monospace;
}

.marker-item.selected .marker-coords {
  color: rgba(255, 255, 255, 0.8);
}

.remove-marker-btn {
  background: none;
  border: none;
  font-size: 0.875rem;
  cursor: pointer;
  padding: var(--space-xs);
  border-radius: var(--radius-sm);
  transition: all 0.3s ease;
  opacity: 0.7;
}

.remove-marker-btn:hover {
  background: var(--danger-color);
  opacity: 1;
  transform: scale(1.1);
}

.status-active {
  color: var(--tactical-border);
  font-weight: 700;
  text-shadow: 0 0 3px currentColor;
}

.status-inactive {
  color: var(--text-secondary);
}
</style>
