/* global L */

window.addEventListener('DOMContentLoaded', async () => {
  // Map
  window.map = L.map('map').setView([50.2, 8.6], 11)
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(window.map)
  window.loadFuelMarkers(window.map, document.getElementById('status'))

  // Store current trip layer for cleanup
  window.currentTripLayer = null

  // Initialize pagination state
  window.tripsPage = 0
  window.fuelPage = 0
  window.itemsPerPage = 5

  // Initialize tabs
  initializeTabs()

  // Initialize pagination controls
  initializePaginationControls()

  // Monthly table
  try {
    const rows = await fetch('/api/fuel/months').then(r => r.json())
    const tbody = document.getElementById('monthBody')
    if (tbody) {
      rows.forEach(r => {
        const tr = document.createElement('tr')
        tr.innerHTML = `<td>${window.fmtMonthLocal(r.month)}</td>
                        <td>${window.fmtCurrencyEUR(r.cost)}</td>
                        <td>${window.fmtNumber(r.km / 1000, 1)} km</td>
                        <td>${window.fmtNumber(r.liters, 1)} L</td>`
        tbody.appendChild(tr)
      })
    }
  } catch (e) {
    const tbody = document.getElementById('monthBody')
    if (tbody) {
      tbody.innerHTML = '<tr><td colspan="4">Failed to load</td></tr>'
    }
  }

  // Load initial data
  loadTripsPage()
  loadFuelPage()
  loadStats()
})

// Tab system
function initializeTabs () {
  const tabBtns = document.querySelectorAll('.tab-btn')
  const tabPanes = document.querySelectorAll('.tab-pane')

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetTab = btn.dataset.tab

      // Remove active class from all tabs and panes
      tabBtns.forEach(b => b.classList.remove('active'))
      tabPanes.forEach(p => p.classList.remove('active'))

      // Add active class to clicked tab and corresponding pane
      btn.classList.add('active')
      document.getElementById(`${targetTab}-tab`).classList.add('active')
    })
  })
}

// Pagination controls
function initializePaginationControls () {
  // Trips pagination
  document.getElementById('trips-prev').addEventListener('click', () => {
    if (window.tripsPage > 0) {
      window.tripsPage--
      loadTripsPage()
    }
  })

  document.getElementById('trips-next').addEventListener('click', () => {
    window.tripsPage++
    loadTripsPage()
  })

  // Fuel pagination
  document.getElementById('fuel-prev').addEventListener('click', () => {
    if (window.fuelPage > 0) {
      window.fuelPage--
      loadFuelPage()
    }
  })

  document.getElementById('fuel-next').addEventListener('click', () => {
    window.fuelPage++
    loadFuelPage()
  })
}

// New pagination-based loading functions
async function loadTripsPage () {
  try {
    showLoading('recent-trips')
    const offset = window.tripsPage * window.itemsPerPage
    const data = await window.api.get(`/api/trips?limit=${window.itemsPerPage}&offset=${offset}`)

    renderRecentTrips(data || [])
    updateTripsNavigation(data?.length || 0)
  } catch (error) {
    console.error('Failed to load trips page:', error)
    showError('recent-trips', 'Failed to load trips: ' + error.message)
  }
}

async function loadFuelPage () {
  try {
    showLoading('recent-fuel')
    const offset = window.fuelPage * window.itemsPerPage
    const data = await window.api.get(`/api/fuel?limit=${window.itemsPerPage}&offset=${offset}`)

    renderRecentFuel(data || [])
    updateFuelNavigation(data?.length || 0)
  } catch (error) {
    console.error('Failed to load fuel page:', error)
    showError('recent-fuel', 'Failed to load fuel data: ' + error.message)
  }
}

// Navigation state updates
function updateTripsNavigation (itemsLoaded) {
  const prevBtn = document.getElementById('trips-prev')
  const nextBtn = document.getElementById('trips-next')
  const infoSpan = document.getElementById('trips-info')

  prevBtn.disabled = window.tripsPage === 0
  nextBtn.disabled = itemsLoaded < window.itemsPerPage

  const start = window.tripsPage * window.itemsPerPage + 1
  const end = start + itemsLoaded - 1
  infoSpan.textContent = itemsLoaded > 0 ? `${start}-${end}` : 'No trips'
}

function updateFuelNavigation (itemsLoaded) {
  const prevBtn = document.getElementById('fuel-prev')
  const nextBtn = document.getElementById('fuel-next')
  const infoSpan = document.getElementById('fuel-info')

  prevBtn.disabled = window.fuelPage === 0
  nextBtn.disabled = itemsLoaded < window.itemsPerPage

  const start = window.fuelPage * window.itemsPerPage + 1
  const end = start + itemsLoaded - 1
  infoSpan.textContent = itemsLoaded > 0 ? `${start}-${end}` : 'No fuel records'
}

async function loadStats () {
  try {
    showLoading('stats')
    const data = await window.api.get('/api/fuel/months')
    renderStats(data || [])
  } catch (error) {
    console.error('Failed to load stats:', error)
    showError('stats', 'Failed to load statistics: ' + error.message)
  }
}

function renderRecentTrips (trips) {
  const container = document.getElementById('recent-trips')
  if (!container) return

  if (!trips || trips.length === 0) {
    container.innerHTML = '<p class="no-data">No trips found</p>'
    return
  }

  const html = trips.map(trip => {
    const duration = trip.start_ts && trip.end_ts
      ? Math.round((new Date(trip.end_ts) - new Date(trip.start_ts)) / 1000 / 60)
      : 0

    return `
      <div class="trip-item" onclick="showTripOnMap('${trip.start_ts}', '${trip.device}')">
        <div class="trip-info">
          <span class="trip-date">${window.fmtDate(trip.start_ts)}</span>
          <span class="trip-device">${trip.device}</span>
        </div>
        <div class="trip-stats">
          <span class="trip-duration">${duration} min</span>
        </div>
      </div>
    `
  }).join('')

  container.innerHTML = html
}

function renderRecentFuel (fuelRecords) {
  const container = document.getElementById('recent-fuel')
  if (!container) return

  if (!fuelRecords || fuelRecords.length === 0) {
    container.innerHTML = '<p class="no-data">No fuel records found</p>'
    return
  }

  const html = fuelRecords.map(record => `
    <div class="fuel-item" onclick="showFuelPopup(${record.lat}, ${record.lon}, ${JSON.stringify(record).replace(/"/g, '&quot;')})">
      <div class="fuel-info">
        <span class="fuel-date">${window.fmtDate(record.ts)}</span>
        ${record.station_name ? `<span class="fuel-station">${record.station_name}</span>` : ''}
      </div>
      <div class="fuel-details">
        <span class="fuel-amount">${window.fmtLiters(record.liters)}</span>
        <span class="fuel-price-per-l">${window.fmtCurrencyEUR(record.price_per_l)}/L</span>
        <span class="fuel-cost">${window.fmtCurrencyEUR(record.amount_total)}</span>
      </div>
    </div>
  `).join('')

  container.innerHTML = html
}

function renderStats (monthsData) {
  const container = document.getElementById('stats')
  if (!container) return

  if (!monthsData || monthsData.length === 0) {
    container.innerHTML = '<p class="no-data">No statistics available</p>'
    return
  }

  // Get current month stats
  const currentMonth = monthsData[0] || {}
  const avgPricePerLiter = currentMonth.cost && currentMonth.liters
    ? currentMonth.cost / currentMonth.liters
    : 0

  const html = `
    <div class="stat-grid">
      <div class="stat-item">
        <span class="stat-label">This Month</span>
        <span class="stat-value">${window.fmtLiters(currentMonth.liters)}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">Total Cost</span>
        <span class="stat-value">${window.fmtCurrencyEUR(currentMonth.cost)}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">Avg Price</span>
        <span class="stat-value">${window.fmtCurrencyEUR(avgPricePerLiter)}/L</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">Distance</span>
        <span class="stat-value">${window.fmtNumber(currentMonth.km / 1000, 1)} km</span>
      </div>
    </div>
  `

  container.innerHTML = html
}

// Utility functions
function showLoading (elementId) {
  const element = document.getElementById(elementId)
  if (element) {
    element.innerHTML = '<div class="loading-spinner"><div class="spinner"></div><span>Loading...</span></div>'
  }
}

function showError (elementId, message) {
  const element = document.getElementById(elementId)
  if (element) {
    element.innerHTML = `<div class="error-message">${message}</div>`
  }
}

// Trip visualization on map
async function showTripOnMap (startTs, device) {
  const statusEl = document.getElementById('status')

  try {
    // Clear existing trip layer
    if (window.currentTripLayer) {
      window.map.removeLayer(window.currentTripLayer)
    }

    statusEl.textContent = 'Loading trip data...'

    // Fetch trip GPS points with coordinates
    const gpsData = await window.api.get(`/api/trip/${startTs}`)

    if (!gpsData || gpsData.length === 0) {
      statusEl.textContent = 'No GPS data found for this trip'
      return
    }

    // Create polyline with speed-based coloring
    const polylines = []
    const markers = []

    for (let i = 0; i < gpsData.length - 1; i++) {
      const point = gpsData[i]
      const nextPoint = gpsData[i + 1]

      if (point.lat && point.lon && nextPoint.lat && nextPoint.lon) {
        const speed = point.spd_kmh || 0
        const color = getSpeedColor(speed)

        const polyline = L.polyline([
          [point.lat, point.lon],
          [nextPoint.lat, nextPoint.lon]
        ], {
          color,
          weight: 4,
          opacity: 0.8
        })

        polylines.push(polyline)
      }
    }

    // Add markers for start and end
    if (gpsData[0].lat && gpsData[0].lon) {
      const startMarker = L.marker([gpsData[0].lat, gpsData[0].lon], {
        icon: L.icon({
          iconUrl: 'data:image/svg+xml;base64,' + btoa(`
            <svg width="25" height="25" viewBox="0 0 25 25" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="12.5" cy="12.5" r="10" fill="#27ae60" stroke="white" stroke-width="3"/>
              <text x="12.5" y="17" text-anchor="middle" fill="white" font-size="12" font-weight="bold">S</text>
            </svg>
          `),
          iconSize: [25, 25],
          iconAnchor: [12, 12]
        })
      })
      startMarker.bindPopup(`Start: ${window.fmtDate(gpsData[0].ts)}`)
      markers.push(startMarker)
    }

    if (gpsData.length > 1) {
      const endPoint = gpsData[gpsData.length - 1]
      if (endPoint.lat && endPoint.lon) {
        const endMarker = L.marker([endPoint.lat, endPoint.lon], {
          icon: L.icon({
            iconUrl: 'data:image/svg+xml;base64,' + btoa(`
              <svg width="25" height="25" viewBox="0 0 25 25" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12.5" cy="12.5" r="10" fill="#e74c3c" stroke="white" stroke-width="3"/>
                <text x="12.5" y="17" text-anchor="middle" fill="white" font-size="12" font-weight="bold">E</text>
              </svg>
            `),
            iconSize: [25, 25],
            iconAnchor: [12, 12]
          })
        })
        endMarker.bindPopup(`End: ${window.fmtDate(endPoint.ts)}`)
        markers.push(endMarker)
      }
    }

    // Add clickable points along the route
    gpsData.forEach((point, index) => {
      if (point.lat && point.lon && index % 10 === 0) { // Show every 10th point to avoid clutter
        const pointMarker = L.circleMarker([point.lat, point.lon], {
          radius: 3,
          fillColor: getSpeedColor(point.spd_kmh || 0),
          color: 'white',
          weight: 1,
          opacity: 1,
          fillOpacity: 0.8
        })

        pointMarker.bindPopup(`
          <div>
            <strong>GPS Point</strong><br>
            Time: ${window.fmtDate(point.ts)}<br>
            Speed: ${(point.spd_kmh || 0).toFixed(1)} km/h<br>
            ${point.temp_c ? `Temperature: ${point.temp_c.toFixed(1)}°C<br>` : ''}
            ${point.alt_m ? `Altitude: ${point.alt_m.toFixed(1)}m<br>` : ''}
          </div>
        `)

        markers.push(pointMarker)
      }
    })

    // Create layer group and add to map
    window.currentTripLayer = L.layerGroup([...polylines, ...markers])
    window.currentTripLayer.addTo(window.map)

    // Fit map to show the entire trip
    const bounds = L.latLngBounds(gpsData.filter(p => p.lat && p.lon).map(p => [p.lat, p.lon]))
    window.map.fitBounds(bounds, { padding: [20, 20] })

    statusEl.textContent = `Showing trip: ${gpsData.length} GPS points, ${window.fmtDate(startTs)}`
  } catch (error) {
    console.error('Failed to load trip:', error)
    statusEl.textContent = 'Failed to load trip data'
  }
}

// Convert speed to color (green = slow, yellow = medium, red = fast)
function getSpeedColor (speed) {
  if (speed <= 30) return '#27ae60' // Green for slow
  if (speed <= 60) return '#f39c12' // Orange for medium
  if (speed <= 100) return '#e67e22' // Dark orange for fast
  return '#e74c3c' // Red for very fast
}

// Make functions globally available
window.showTripOnMap = showTripOnMap
window.showFuelPopup = showFuelPopup

// Show fuel popup when clicking fuel item
function showFuelPopup (lat, lon, record) {
  if (!lat || !lon) return

  // Pan map to location and open popup
  window.map.setView([lat, lon], 15)

  // Find the fuel marker and open its popup
  window.map.eachLayer(layer => {
    if (layer instanceof L.Marker && layer.getLatLng().lat === lat && layer.getLatLng().lng === lon) {
      layer.openPopup()
    }
  })
}
