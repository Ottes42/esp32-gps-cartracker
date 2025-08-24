// Shared helpers for all pages

/* global L */

export function qs (sel, root = document) { return root.querySelector(sel) }
export function qsa (sel, root = document) { return Array.from(root.querySelectorAll(sel)) }

export async function fetchJSON (url, opts = {}) {
  const r = await fetch(url, opts)
  if (!r.ok) throw new Error(`HTTP ${r.status}`)
  return await r.json()
}

// ---- time formatting helpers (local) ----
export function fmtDateTimeLocal (iso, opts = {}) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  const df = new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    ...opts
  })
  return df.format(d)
}

export function fmtMonthLocal (ym) {
  try {
    const d = new Date(ym + '-01T00:00:00Z')
    const df = new Intl.DateTimeFormat(undefined, { year: 'numeric', month: 'long' })
    return df.format(d)
  } catch { return ym }
}

export function fmtNumber (v, d = 1) { if (v == null || Number.isNaN(+v)) return '—'; return (+v).toFixed(d) }
export function fmtCurrencyEUR (v) { if (v == null) return '—'; return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'EUR' }).format(+v) }

// Leaflet fuel markers
export async function loadFuelMarkers (map, statusEl) {
  statusEl.textContent = 'Loading fuel markers…'
  let fuels = []
  try {
    fuels = await fetchJSON('/api/fuel?limit=500&offset=0')
  } catch (e) {
    statusEl.textContent = 'Failed to load fuel data.'
    return
  }
  let count = 0
  fuels.forEach(f => {
    if (f.lat == null || f.lon == null) return
    const m = L.marker([f.lat, f.lon]).addTo(map)
    const text = fuelPopupHTML(f)
    m.bindPopup(text)
    m.on('mouseover', () => { statusEl.innerHTML = text })
    m.on('mouseout', () => { statusEl.textContent = 'Hover over a fuel marker to see details' })
    count++
  })
  statusEl.innerHTML = count ? `Loaded ${count} fuel markers. Hover a marker for details.` : 'No geocoded fuel stops yet.'
}

function fuelPopupHTML (f) {
  const date = fmtDateTimeLocal(f.ts)
  const price = f.price_per_l != null ? `${fmtNumber(f.price_per_l, 3)} €/L` : '—'
  const liters = f.liters != null ? `${fmtNumber(f.liters, 1)} L` : '—'
  const total = fmtCurrencyEUR(f.amount_total)
  const addr = [f.station_name, f.station_address, f.station_zip, f.station_city].filter(Boolean).join(', ')
  const err = f.ocr_error ? '<div class="badge err">OCR error</div>' : ''
  return `<div>
    <div><strong>${addr || 'Fuel stop'}</strong></div>
    <div class="small">${date}</div>
    <div class="small">Price: ${price} • Amount: ${liters} • Total: ${total}</div>
    ${err}
  </div>`
}

// Global API helper with automatic auth header for development
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

    return response.json()
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
      // Remove Content-Type for FormData - browser sets it with boundary
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

// Development mode indicator
if (window.api.isLocalhost) {
  console.log('🔧 Development mode: X-Auth-User header automatically set to "development"')
  console.log('🚨 Production deployments require Nginx proxy with Basic Auth')

  // Add visual indicator
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
