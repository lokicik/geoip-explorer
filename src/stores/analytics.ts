import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import type { GeolocationData } from '@/composables/useIpGeolocation'

export interface SearchRecord {
  id: string
  ip: string
  timestamp: number
  location: {
    city: string
    country: string
    region: string
    latitude: number
    longitude: number
  }
  queryTime: number
}

export const useAnalyticsStore = defineStore('analytics', () => {
  const searchHistory = ref<SearchRecord[]>([])
  const sessionStartTime = ref(Date.now())

  // Computed analytics
  const totalSearches = computed(() => searchHistory.value.length)

  const searchesToday = computed(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return searchHistory.value.filter((record) => record.timestamp >= today.getTime()).length
  })

  const averageQueryTime = computed(() => {
    if (searchHistory.value.length === 0) return 0
    const total = searchHistory.value.reduce((sum, record) => sum + record.queryTime, 0)
    return Math.round(total / searchHistory.value.length)
  })

  const topCountries = computed(() => {
    const countryCounts = searchHistory.value.reduce(
      (acc, record) => {
        acc[record.location.country] = (acc[record.location.country] || 0) + 1
        return acc
      },
      {} as Record<string, number>,
    )

    return Object.entries(countryCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([country, count]) => ({ country, count }))
  })

  const topCities = computed(() => {
    const cityCounts = searchHistory.value.reduce(
      (acc, record) => {
        const key = `${record.location.city}, ${record.location.country}`
        acc[key] = (acc[key] || 0) + 1
        return acc
      },
      {} as Record<string, number>,
    )

    return Object.entries(cityCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([location, count]) => ({ location, count }))
  })

  const recentSearches = computed(() => {
    return searchHistory.value.slice(-10).reverse()
  })

  const searchTrends = computed(() => {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date()
      date.setDate(date.getDate() - i)
      date.setHours(0, 0, 0, 0)
      return {
        date: date.toLocaleDateString('en-US', { weekday: 'short' }),
        count: 0,
        timestamp: date.getTime(),
      }
    }).reverse()

    searchHistory.value.forEach((record) => {
      const recordDate = new Date(record.timestamp)
      recordDate.setHours(0, 0, 0, 0)
      const dayData = last7Days.find((day) => day.timestamp === recordDate.getTime())
      if (dayData) {
        dayData.count++
      }
    })

    return last7Days
  })

  function addSearchRecord(data: GeolocationData, queryTime: number) {
    const record: SearchRecord = {
      id: `search_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ip: data.ip,
      timestamp: Date.now(),
      location: {
        city: data.city,
        country: data.country_name,
        region: data.region,
        latitude: data.latitude,
        longitude: data.longitude,
      },
      queryTime,
    }

    searchHistory.value.push(record)

    // Keep only last 1000 searches to prevent excessive storage
    if (searchHistory.value.length > 1000) {
      searchHistory.value = searchHistory.value.slice(-1000)
    }

    saveAnalytics()
  }

  function clearAnalytics() {
    searchHistory.value = []
    sessionStartTime.value = Date.now()
    localStorage.removeItem('ipAnalytics')
  }

  function saveAnalytics() {
    const data = {
      searchHistory: searchHistory.value,
      sessionStartTime: sessionStartTime.value,
    }
    localStorage.setItem('ipAnalytics', JSON.stringify(data))
  }

  function loadAnalytics() {
    const stored = localStorage.getItem('ipAnalytics')
    if (stored) {
      try {
        const data = JSON.parse(stored)
        searchHistory.value = data.searchHistory || []
        sessionStartTime.value = data.sessionStartTime || Date.now()
      } catch (error) {
        console.error('Error loading analytics:', error)
        searchHistory.value = []
        sessionStartTime.value = Date.now()
      }
    }
  }

  return {
    searchHistory,
    sessionStartTime,
    totalSearches,
    searchesToday,
    averageQueryTime,
    topCountries,
    topCities,
    recentSearches,
    searchTrends,
    addSearchRecord,
    clearAnalytics,
    loadAnalytics,
  }
})
