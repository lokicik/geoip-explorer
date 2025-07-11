import { ref, computed } from 'vue'

export interface TimeData {
  localTime: string
  localDate: string
  targetTime: string
  targetDate: string
  timezone: string
  offset: string
  isDaytime: boolean
}

export function useTimezone() {
  const timeData = ref<TimeData | null>(null)
  const currentTime = ref(new Date())

  // Update current time every second
  setInterval(() => {
    currentTime.value = new Date()
    if (timeData.value) {
      updateTimeData(timeData.value.timezone)
    }
  }, 1000)

  const formattedLocalTime = computed(() => {
    return currentTime.value.toLocaleTimeString('en-US', {
      hour12: true,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  })

  const formattedLocalDate = computed(() => {
    return currentTime.value.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  })

  function updateTimeData(timezone: string) {
    try {
      const now = new Date()

      // Create time for target timezone
      const targetTime = new Date(now.toLocaleString('en-US', { timeZone: timezone }))

      // Get timezone offset
      const localOffset = now.getTimezoneOffset()
      const targetOffset = getTimezoneOffset(timezone)
      const offsetDiff = (targetOffset - localOffset) / 60

      // Determine if it's daytime (6 AM - 6 PM)
      const targetHour = targetTime.getHours()
      const isDaytime = targetHour >= 6 && targetHour < 18

      timeData.value = {
        localTime: now.toLocaleTimeString('en-US', {
          hour12: true,
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        }),
        localDate: now.toLocaleDateString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
        }),
        targetTime: targetTime.toLocaleTimeString('en-US', {
          hour12: true,
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        }),
        targetDate: targetTime.toLocaleDateString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
        }),
        timezone: timezone,
        offset: offsetDiff >= 0 ? `+${offsetDiff}h` : `${offsetDiff}h`,
        isDaytime,
      }
    } catch (error) {
      console.error('Error updating timezone data:', error)
      // Fallback to basic data
      timeData.value = {
        localTime: formattedLocalTime.value,
        localDate: formattedLocalDate.value,
        targetTime: formattedLocalTime.value,
        targetDate: formattedLocalDate.value,
        timezone: timezone || 'Unknown',
        offset: '0h',
        isDaytime: true,
      }
    }
  }

  function getTimezoneOffset(timezone: string): number {
    try {
      const now = new Date()
      const utc = new Date(now.getTime() + now.getTimezoneOffset() * 60000)
      const target = new Date(utc.toLocaleString('en-US', { timeZone: timezone }))
      return (target.getTime() - utc.getTime()) / 60000
    } catch {
      return 0
    }
  }

  function getTimezoneName(timezone: string): string {
    try {
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        timeZoneName: 'long',
      })
      const parts = formatter.formatToParts(new Date())
      const timeZonePart = parts.find((part) => part.type === 'timeZoneName')
      return timeZonePart?.value || timezone
    } catch {
      return timezone
    }
  }

  function getRelativeTime(targetTimezone: string): string {
    try {
      const now = new Date()
      const target = new Date(now.toLocaleString('en-US', { timeZone: targetTimezone }))
      const diffHours = (target.getTime() - now.getTime()) / (1000 * 60 * 60)

      if (Math.abs(diffHours) < 1) {
        const diffMinutes = Math.round((target.getTime() - now.getTime()) / (1000 * 60))
        if (diffMinutes === 0) return 'Same time'
        return diffMinutes > 0 ? `${diffMinutes}m ahead` : `${Math.abs(diffMinutes)}m behind`
      }

      const roundedHours = Math.round(diffHours)
      if (roundedHours === 0) return 'Same time'
      return roundedHours > 0 ? `${roundedHours}h ahead` : `${Math.abs(roundedHours)}h behind`
    } catch {
      return 'Unknown'
    }
  }

  return {
    timeData,
    currentTime,
    formattedLocalTime,
    formattedLocalDate,
    updateTimeData,
    getTimezoneName,
    getRelativeTime,
  }
}
