import { ref } from 'vue'
import axios from 'axios'

// Define a consistent interface for the geolocation data
// This helps ensure type safety and consistent data structure
export interface GeolocationData {
  ip: string
  latitude: number
  longitude: number
  city: string
  country_name: string
  country_code: string
  region: string
  postal: string
  timezone: string
  org: string
  isp: string
  asn?: string
  currency: {
    code: string
    name: string
    symbol: string
  }
}

// API response interfaces
interface IpApiResponse {
  ip: string
  city: string
  region: string
  country: string
  country_name: string
  country_code: string
  continent_code: string
  postal: string
  latitude: number
  longitude: number
  timezone: string
  utc_offset: string
  country_calling_code: string
  currency: string
  currency_name: string
  languages: string
  asn: string
  org: string
}

interface IpGeolocationResponse {
  ip: string
  city: string
  state_prov: string
  country_name: string
  country_code2: string
  zipcode: string
  latitude: string
  longitude: string
  time_zone: {
    name: string
  }
  organization: string
  isp: string
  asn: string
  currency: {
    code: string
    name: string
    symbol: string
  }
}

interface IpWhoisResponse {
  ip: string
  city: string
  region: string
  country: string
  country_code: string
  postal: string
  latitude: number
  longitude: number
  timezone: {
    id: string
  }
  connection: {
    org: string
    isp: string
    asn: number
  }
  currency: {
    code: string
    name: string
    symbol: string
  }
}

export function useIpGeolocation() {
  const data = ref<GeolocationData | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  // Multiple API endpoints for fallback - using CORS-friendly APIs
  const apiEndpoints = [
    {
      name: 'ipapi',
      url: (ip: string) => `https://ipapi.co/${ip}/json/`,
      transform: (response: IpApiResponse) => ({
        ip: response.ip,
        latitude: response.latitude,
        longitude: response.longitude,
        city: response.city || 'Unknown',
        country_name: response.country_name || response.country || 'Unknown',
        country_code: response.country_code || 'Unknown',
        region: response.region || 'Unknown',
        postal: response.postal || '',
        timezone: response.timezone || 'Unknown',
        org: response.org || 'Unknown',
        isp: response.org || 'Unknown',
        asn: response.asn || '',
        currency: {
          code: response.currency || 'USD',
          name: response.currency_name || 'US Dollar',
          symbol: '$',
        },
      }),
    },
    {
      name: 'ipgeolocation',
      url: (ip: string) => `https://api.ipgeolocation.io/ipgeo?apiKey=&ip=${ip}`,
      transform: (response: IpGeolocationResponse) => ({
        ip: response.ip,
        latitude: parseFloat(response.latitude) || 0,
        longitude: parseFloat(response.longitude) || 0,
        city: response.city || 'Unknown',
        country_name: response.country_name || 'Unknown',
        country_code: response.country_code2 || 'Unknown',
        region: response.state_prov || 'Unknown',
        postal: response.zipcode || '',
        timezone: response.time_zone?.name || 'Unknown',
        org: response.organization || 'Unknown',
        isp: response.isp || 'Unknown',
        asn: response.asn || '',
        currency: {
          code: response.currency?.code || 'USD',
          name: response.currency?.name || 'US Dollar',
          symbol: response.currency?.symbol || '$',
        },
      }),
    },
    {
      name: 'ipwhois',
      url: (ip: string) => `https://ipwho.is/${ip}`,
      transform: (response: IpWhoisResponse) => ({
        ip: response.ip,
        latitude: response.latitude || 0,
        longitude: response.longitude || 0,
        city: response.city || 'Unknown',
        country_name: response.country || 'Unknown',
        country_code: response.country_code || 'Unknown',
        region: response.region || 'Unknown',
        postal: response.postal || '',
        timezone: response.timezone?.id || 'Unknown',
        org: response.connection?.org || 'Unknown',
        isp: response.connection?.isp || 'Unknown',
        asn: response.connection?.asn?.toString() || '',
        currency: {
          code: response.currency?.code || 'USD',
          name: response.currency?.name || 'US Dollar',
          symbol: response.currency?.symbol || '$',
        },
      }),
    },
  ]

  const fetchGeolocation = async (ip: string = '') => {
    loading.value = true
    error.value = null
    data.value = null // Clear previous data on new search

    let lastError = null

    // Try each API endpoint until one succeeds
    for (const endpoint of apiEndpoints) {
      try {
        console.log(`Trying ${endpoint.name} API...`)

        const response = await axios.get(endpoint.url(ip), {
          timeout: 10000, // 10 second timeout
          headers: {
            Accept: 'application/json',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          },
        })

        // Check if the response indicates an error
        if (
          response.data.error ||
          response.data.status === 'fail' ||
          response.data.success === false
        ) {
          throw new Error(
            response.data.message || response.data.error || 'API returned error status',
          )
        }

        // Transform the response to our consistent format
        data.value = endpoint.transform(response.data)

        console.log(`Successfully fetched data from ${endpoint.name}`)
        loading.value = false
        return // Success! Exit the function
      } catch (err: unknown) {
        console.warn(`${endpoint.name} API failed:`, err)
        lastError = err

        // Continue to next API endpoint
        continue
      }
    }

    // If we get here, all APIs failed
    if (axios.isAxiosError(lastError)) {
      if (lastError.response) {
        error.value = `All geolocation services failed. Last error: ${lastError.response.status} - ${lastError.response.data?.message || 'Service unavailable'}`
      } else if (lastError.request) {
        error.value =
          'Network error: Could not connect to any geolocation service. Please check your internet connection.'
      } else {
        error.value = lastError.message || 'Request setup error'
      }
    } else if (lastError instanceof Error) {
      error.value = lastError.message
    } else {
      error.value = 'All geolocation services are currently unavailable. Please try again later.'
    }

    console.error('All geolocation APIs failed:', lastError)
    data.value = null
    loading.value = false
  }

  return { data, loading, error, fetchGeolocation }
}
