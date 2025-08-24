// Global API helper with automatic auth header for development
/* global L */
class API {
  constructor () {
    this.baseURL = window.location.origin
    this.isLocalhost = ['localhost', '127.0.0.1'].includes(window.location.hostname)
  }

  getHeaders () {
    const headers = {
      'Content-Type': 'application/json'
    }

    // Add X-Auth-User header only for localhost development
    if (this.isLocalhost) {
      headers['X-Auth-User'] = 'development'
    }

    return headers
  }

  async handleResponse (response) {
    if (!response.ok) {
      if (response.status === 401) {
        const error = await response.json().catch(() => ({ error: 'Authentication failed' }))
        if (this.isLocalhost) {
          throw new Error(`Development auth failed: ${error.error}`)
        } else {
          throw new Error('Authentication required - access via proxy with Basic Auth')
        }
      }
      throw new Error(`API Error: ${response.status} ${response.statusText}`)
    }

    const contentType = response.headers.get('content-type')
    if (contentType && contentType.includes('application/json')) {
      return response.json()
    }
    return response.text()
  }

  async get (endpoint) {
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      method: 'GET',
      headers: this.getHeaders()
    })

    return this.handleResponse(response)
  }

  async post (endpoint, data) {
    const headers = this.getHeaders()
    let body

    if (data instanceof FormData) {
      delete headers['Content-Type']
      body = data
    } else {
      body = JSON.stringify(data)
    }

    const response = await fetch(`${this.baseURL}${endpoint}`, {
      method: 'POST',
      headers,
      body
    })

    return this.handleResponse(response)
  }
}

// Global API instance
window.api = new API()

// Global utility functions for formatting
window.fmtDateTimeLocal = function (isoString) {
  if (!isoString) return 'Unknown'
  try {
    return new Date(isoString).toLocaleString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  } catch (e) {
    return 'Invalid Date'
  }
}

window.fmtDate = function (isoString) {
  if (!isoString) return 'Unknown'
  try {
    return new Date(isoString).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  } catch (e) {
    return 'Invalid Date'
  }
}

window.fmtCurrencyEUR = function (amount) {
  if (!amount || isNaN(amount)) return '€0.00'
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR'
  }).format(amount)
}

window.fmtDuration = function (minutes) {
  if (!minutes || isNaN(minutes)) return '0min'
  const hours = Math.floor(minutes / 60)
  const mins = Math.round(minutes % 60)
  return hours > 0 ? `${hours}h ${mins}min` : `${mins}min`
}

window.fmtDistance = function (km) {
  if (!km || isNaN(km)) return '0.0 km'
  return `${km.toFixed(1)} km`
}

window.fmtSpeed = function (kmh) {
  if (!kmh || isNaN(kmh)) return '0 km/h'
  return `${Math.round(kmh)} km/h`
}

window.fmtLiters = function (liters) {
  if (!liters || isNaN(liters)) return '0.0L'
  return `${liters.toFixed(1)}L`
}

window.fmtNumber = function (value, decimals = 0) {
  if (!value || isNaN(value)) return '0'
  return Number(value).toFixed(decimals)
}

window.fmtMonthLocal = function (monthString) {
  if (!monthString) return 'Unknown'
  try {
    // monthString is in format "2024-08"
    const [year, month] = monthString.split('-')
    const date = new Date(parseInt(year), parseInt(month) - 1)
    return date.toLocaleDateString('de-DE', {
      year: 'numeric',
      month: 'long'
    })
  } catch (e) {
    return monthString
  }
}

window.loadFuelMarkers = async function (map, statusEl) {
  try {
    if (statusEl) statusEl.textContent = 'Loading fuel markers...'
    const fuelData = await window.api.get('/api/fuel?limit=100')

    fuelData.forEach(record => {
      if (record.lat && record.lon) {
        const marker = L.marker([record.lat, record.lon])
          .bindPopup(`
            <div>
              <strong>${record.station_name || 'Fuel Station'}</strong><br>
              ${record.station_address ? `${record.station_address}<br>` : ''}
              ${record.station_zip ? `${record.station_zip} ${record.station_city}<br>` : ''}
              <br>
              <strong>${window.fmtDate(record.ts)}</strong><br>
              <strong>${window.fmtLiters(record.liters)}</strong> @ <strong>${window.fmtCurrencyEUR(record.price_per_l)}/L</strong><br>
              Fuel: ${window.fmtCurrencyEUR(record.amount_fuel || record.amount_total)}<br>
              ${record.amount_total !== record.amount_fuel ? `Total: <strong>${window.fmtCurrencyEUR(record.amount_total)}</strong><br>` : ''}
              ${record.full_tank ? '<em>Full tank</em>' : '<em>Partial fill</em>'}
            </div>
          `)
        marker.addTo(map)
      }
    })

    if (statusEl) statusEl.textContent = `Loaded ${fuelData.length} fuel markers`
  } catch (error) {
    console.error('Failed to load fuel markers:', error)
    if (statusEl) statusEl.textContent = 'Failed to load fuel markers'
  }
}

// Development mode indicator
if (window.api.isLocalhost) {
  console.log('🔧 Development mode: X-Auth-User header automatically set to "development"')
  console.log('🚨 Production deployments require Nginx proxy with Basic Auth')

  document.addEventListener('DOMContentLoaded', () => {
    const devIndicator = document.createElement('div')
    devIndicator.style.cssText = `
      position: fixed;
      top: 0;
      right: 0;
      background: #ff6b35;
      color: white;
      padding: 4px 8px;
      font-size: 11px;
      font-family: monospace;
      z-index: 9999;
      border-bottom-left-radius: 4px;
    `
    devIndicator.textContent = 'DEV MODE'
    devIndicator.title = 'Development mode: localhost only'
    document.body.appendChild(devIndicator)
  })
} else {
  console.log('🔒 Production mode: Authentication via Nginx proxy Basic Auth')
}
