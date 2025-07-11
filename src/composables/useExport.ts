import { ref } from 'vue'
import type { GeolocationData } from '@/composables/useIpGeolocation'

export interface ExportOptions {
  format: 'json' | 'csv' | 'pdf' | 'txt'
  includeTimestamp?: boolean
  customFilename?: string
}

export function useExport() {
  const exporting = ref(false)
  const error = ref<string | null>(null)

  function downloadFile(content: string, filename: string, mimeType: string) {
    const blob = new Blob([content], { type: mimeType })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  function generateFilename(
    data: GeolocationData,
    format: string,
    customFilename?: string,
  ): string {
    if (customFilename) {
      return `${customFilename}.${format}`
    }

    const timestamp = new Date().toISOString().slice(0, 10)
    const location = `${data.city}_${data.country_code}`.replace(/\s+/g, '_')
    return `geoip_explorer_${data.ip}_${location}_${timestamp}.${format}`
  }

  function exportAsJSON(data: GeolocationData, options: ExportOptions = { format: 'json' }): void {
    try {
      exporting.value = true
      error.value = null

      const exportData = {
        ...(options.includeTimestamp && { exportedAt: new Date().toISOString() }),
        ipAddress: data.ip,
        location: {
          city: data.city,
          region: data.region,
          country: data.country_name,
          countryCode: data.country_code,
          coordinates: {
            latitude: data.latitude,
            longitude: data.longitude,
          },
        },
        network: {
          isp: data.org,
          ...(data.asn && { asn: data.asn }),
        },
        timezone: data.timezone,
        ...(data.postal && { postalCode: data.postal }),
      }

      const jsonString = JSON.stringify(exportData, null, 2)
      const filename = generateFilename(data, 'json', options.customFilename)

      downloadFile(jsonString, filename, 'application/json')
    } catch (err) {
      error.value = 'Failed to export JSON data'
      console.error('JSON export error:', err)
    } finally {
      exporting.value = false
    }
  }

  function exportAsCSV(data: GeolocationData, options: ExportOptions = { format: 'csv' }): void {
    try {
      exporting.value = true
      error.value = null

      const headers = [
        'IP Address',
        'City',
        'Region',
        'Country',
        'Country Code',
        'Latitude',
        'Longitude',
        'Timezone',
        'ISP',
        'ASN',
        'Postal Code',
        ...(options.includeTimestamp ? ['Export Date'] : []),
      ]

      const values = [
        data.ip,
        data.city,
        data.region,
        data.country_name,
        data.country_code,
        data.latitude.toString(),
        data.longitude.toString(),
        data.timezone,
        data.org,
        data.asn || '',
        data.postal || '',
        ...(options.includeTimestamp ? [new Date().toISOString()] : []),
      ]

      // Escape CSV values that contain commas or quotes
      const escapedValues = values.map((value) => {
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`
        }
        return value
      })

      const csvContent = [headers.join(','), escapedValues.join(',')].join('\n')

      const filename = generateFilename(data, 'csv', options.customFilename)
      downloadFile(csvContent, filename, 'text/csv')
    } catch (err) {
      error.value = 'Failed to export CSV data'
      console.error('CSV export error:', err)
    } finally {
      exporting.value = false
    }
  }

  function exportAsTXT(data: GeolocationData, options: ExportOptions = { format: 'txt' }): void {
    try {
      exporting.value = true
      error.value = null

      const txtContent = [
        '═══════════════════════════════════════',
        '         IP TRACKER REPORT',
        '═══════════════════════════════════════',
        '',
        `IP Address: ${data.ip}`,
        '',
        '📍 LOCATION INFORMATION',
        '───────────────────────────────────────',
        `City:           ${data.city}`,
        `Region:         ${data.region}`,
        `Country:        ${data.country_name}`,
        `Country Code:   ${data.country_code}`,
        `Coordinates:    ${data.latitude}, ${data.longitude}`,
        `Timezone:       ${data.timezone}`,
        ...(data.postal ? [`Postal Code:    ${data.postal}`] : []),
        '',
        '🌐 NETWORK INFORMATION',
        '───────────────────────────────────────',
        `ISP:            ${data.org}`,
        ...(data.asn ? [`ASN:            ${data.asn}`] : []),
        '',
        ...(options.includeTimestamp
          ? [
              '📅 EXPORT INFORMATION',
              '───────────────────────────────────────',
              `Export Date:    ${new Date().toLocaleString()}`,
              `Export Format:  Plain Text`,
              '',
            ]
          : []),
        '═══════════════════════════════════════',
        '   Generated by IP Tracker Application',
        '═══════════════════════════════════════',
      ].join('\n')

      const filename = generateFilename(data, 'txt', options.customFilename)
      downloadFile(txtContent, filename, 'text/plain')
    } catch (err) {
      error.value = 'Failed to export text data'
      console.error('TXT export error:', err)
    } finally {
      exporting.value = false
    }
  }

  function exportAsPDF(data: GeolocationData, options: ExportOptions = { format: 'pdf' }): void {
    try {
      exporting.value = true
      error.value = null

      // Create HTML content for PDF generation
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>IP Tracker Report</title>
          <style>
            body { 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 800px;
              margin: 0 auto;
              padding: 20px;
            }
            .header {
              text-align: center;
              border-bottom: 3px solid #667eea;
              padding-bottom: 20px;
              margin-bottom: 30px;
            }
            .title {
              color: #667eea;
              font-size: 2.5em;
              margin: 0;
              font-weight: 700;
            }
            .subtitle {
              color: #666;
              font-size: 1.1em;
              margin: 10px 0 0 0;
            }
            .section {
              margin: 30px 0;
              padding: 20px;
              border-left: 4px solid #667eea;
              background: #f8fafc;
            }
            .section h2 {
              color: #667eea;
              margin-top: 0;
              font-size: 1.5em;
            }
            .info-grid {
              display: grid;
              grid-template-columns: 200px 1fr;
              gap: 10px;
              margin: 15px 0;
            }
            .label {
              font-weight: 600;
              color: #4a5568;
            }
            .value {
              color: #2d3748;
              font-family: 'Courier New', monospace;
            }
            .ip-address {
              font-size: 1.3em;
              font-weight: 700;
              color: #667eea;
              text-align: center;
              padding: 15px;
              background: #edf2f7;
              border-radius: 8px;
              margin: 20px 0;
            }
            .coordinates {
              background: #e6fffa;
              padding: 10px;
              border-radius: 6px;
              border-left: 4px solid #38b2ac;
            }
            .footer {
              text-align: center;
              margin-top: 40px;
              padding-top: 20px;
              border-top: 1px solid #e2e8f0;
              font-size: 0.9em;
              color: #718096;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1 class="title">🌐 IP Tracker Report</h1>
            <p class="subtitle">Detailed geolocation information</p>
          </div>

          <div class="ip-address">
            ${data.ip}
          </div>

          <div class="section">
            <h2>📍 Location Information</h2>
            <div class="info-grid">
              <span class="label">City:</span>
              <span class="value">${data.city}</span>
              
              <span class="label">Region:</span>
              <span class="value">${data.region}</span>
              
              <span class="label">Country:</span>
              <span class="value">${data.country_name} (${data.country_code})</span>
              
              <span class="label">Timezone:</span>
              <span class="value">${data.timezone}</span>
              
              ${
                data.postal
                  ? `
                <span class="label">Postal Code:</span>
                <span class="value">${data.postal}</span>
              `
                  : ''
              }
            </div>
            
            <div class="coordinates">
              <strong>Coordinates:</strong> ${data.latitude}, ${data.longitude}
            </div>
          </div>

          <div class="section">
            <h2>🌐 Network Information</h2>
            <div class="info-grid">
              <span class="label">ISP:</span>
              <span class="value">${data.org}</span>
              
              ${
                data.asn
                  ? `
                <span class="label">ASN:</span>
                <span class="value">${data.asn}</span>
              `
                  : ''
              }
            </div>
          </div>

          ${
            options.includeTimestamp
              ? `
            <div class="section">
              <h2>📅 Export Information</h2>
              <div class="info-grid">
                <span class="label">Export Date:</span>
                <span class="value">${new Date().toLocaleString()}</span>
                
                <span class="label">Format:</span>
                <span class="value">PDF Report</span>
              </div>
            </div>
          `
              : ''
          }

          <div class="footer">
            Generated by IP Tracker Application<br>
            <small>Professional geolocation tracking and analysis</small>
          </div>
        </body>
        </html>
      `

      // Create a new window for PDF generation
      const printWindow = window.open('', '_blank')
      if (printWindow) {
        printWindow.document.write(htmlContent)
        printWindow.document.close()

        // Wait for content to load then trigger print
        printWindow.onload = () => {
          setTimeout(() => {
            printWindow.print()
            printWindow.close()
          }, 500)
        }
      } else {
        throw new Error('Unable to open print window. Please check popup blockers.')
      }
    } catch (err) {
      error.value = 'Failed to export PDF data'
      console.error('PDF export error:', err)
    } finally {
      exporting.value = false
    }
  }

  function exportData(data: GeolocationData, options: ExportOptions): void {
    switch (options.format) {
      case 'json':
        exportAsJSON(data, options)
        break
      case 'csv':
        exportAsCSV(data, options)
        break
      case 'txt':
        exportAsTXT(data, options)
        break
      case 'pdf':
        exportAsPDF(data, options)
        break
      default:
        error.value = 'Unsupported export format'
    }
  }

  return {
    exporting,
    error,
    exportData,
    exportAsJSON,
    exportAsCSV,
    exportAsTXT,
    exportAsPDF,
  }
}
