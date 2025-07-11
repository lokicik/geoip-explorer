import { ref } from 'vue'
import axios from 'axios'

export interface WeatherData {
  temperature: number
  feelsLike: number
  humidity: number
  pressure: number
  description: string
  icon: string
  windSpeed: number
  windDirection: number
  visibility: number
  uvIndex?: number
  city: string
  country: string
  timezone: number
  sunrise: number
  sunset: number
}

export function useWeather() {
  const weatherData = ref<WeatherData | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchWeather(lat: number, lon: number, cityName?: string) {
    loading.value = true
    error.value = null
    weatherData.value = null

    try {
      // Using free OpenWeatherMap API - no key required for basic current weather
      // Alternative: wttr.in API which is completely free
      const response = await axios.get(`https://wttr.in/${lat},${lon}?format=j1`)

      const data = response.data
      const current = data.current_condition[0]
      const area = data.nearest_area[0]

      weatherData.value = {
        temperature: parseInt(current.temp_C),
        feelsLike: parseInt(current.FeelsLikeC),
        humidity: parseInt(current.humidity),
        pressure: parseInt(current.pressure),
        description: current.weatherDesc[0].value,
        icon: getWeatherIcon(current.weatherCode),
        windSpeed: parseInt(current.windspeedKmph),
        windDirection: parseInt(current.winddirDegree),
        visibility: parseInt(current.visibility),
        city: cityName || area.areaName[0].value,
        country: area.country[0].value,
        timezone: 0, // wttr.in doesn't provide timezone directly
        sunrise: 0, // Not available in wttr.in
        sunset: 0, // Not available in wttr.in
      }
    } catch {
      // Fallback to a simulated weather API if wttr.in fails
      try {
        const fallbackResponse = await axios.get(
          `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&hourly=temperature_2m,relative_humidity_2m,wind_speed_10m`,
        )

        const current = fallbackResponse.data.current_weather

        weatherData.value = {
          temperature: Math.round(current.temperature),
          feelsLike: Math.round(current.temperature),
          humidity: 50, // Open-meteo doesn't provide current humidity directly
          pressure: 1013,
          description: getWeatherDescription(current.weathercode),
          icon: getWeatherIconFromCode(current.weathercode),
          windSpeed: Math.round(current.windspeed),
          windDirection: Math.round(current.winddirection),
          visibility: 10,
          city: cityName || 'Unknown City',
          country: 'Unknown Country',
          timezone: 0,
          sunrise: 0,
          sunset: 0,
        }
      } catch (fallbackErr) {
        error.value = 'Unable to fetch weather data'
        console.error('Weather fetch error:', fallbackErr)
      }
    } finally {
      loading.value = false
    }
  }

  function getWeatherIcon(weatherCode: string): string {
    const code = parseInt(weatherCode)

    // Map weather codes to emoji icons
    if (code >= 200 && code < 300) return '⛈️' // Thunderstorm
    if (code >= 300 && code < 400) return '🌦️' // Drizzle
    if (code >= 500 && code < 600) return '🌧️' // Rain
    if (code >= 600 && code < 700) return '🌨️' // Snow
    if (code >= 700 && code < 800) return '🌫️' // Atmosphere
    if (code === 800) return '☀️' // Clear
    if (code > 800) return '☁️' // Clouds

    return '🌤️' // Default
  }

  function getWeatherIconFromCode(code: number): string {
    // Open-meteo weather codes
    if (code === 0) return '☀️' // Clear sky
    if (code <= 3) return '⛅' // Partly cloudy
    if (code <= 48) return '🌫️' // Fog
    if (code <= 67) return '🌧️' // Rain
    if (code <= 77) return '🌨️' // Snow
    if (code <= 82) return '🌦️' // Rain showers
    if (code <= 86) return '🌨️' // Snow showers
    if (code <= 99) return '⛈️' // Thunderstorm

    return '🌤️' // Default
  }

  function getWeatherDescription(code: number): string {
    // Open-meteo weather codes
    if (code === 0) return 'Clear sky'
    if (code <= 3) return 'Partly cloudy'
    if (code <= 48) return 'Foggy'
    if (code <= 67) return 'Rainy'
    if (code <= 77) return 'Snowy'
    if (code <= 82) return 'Rain showers'
    if (code <= 86) return 'Snow showers'
    if (code <= 99) return 'Thunderstorm'

    return 'Unknown'
  }

  return {
    weatherData,
    loading,
    error,
    fetchWeather,
  }
}
