/* global L */

window.addEventListener('DOMContentLoaded', async () => {
  // Map
  window.map = L.map('map').setView([50.2, 8.6], 11)
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(window.map)
  window.loadFuelMarkers(window.map, document.getElementById('status'))

  // Store current trip layer for cleanup
  window.currentTripLayer = null

  // Monthly table
  try {
    const rows = await fetch('/api/fuel/months').then(r => r.json())
    const tbody = document.getElementById('monthBody')
    rows.forEach(r => {
      const tr = document.createElement('tr')
      tr.innerHTML = `<td>${window.fmtMonthLocal(r.month)}</td>
                      <td>${window.fmtCurrencyEUR(r.cost)}</td>
                      <td>${window.fmtNumber(r.km / 1000, 1)} km</td>
                      <td>${window.fmtNumber(r.liters, 1)} L</td>`
      tbody.appendChild(tr)
    })
  } catch (e) {
    document.getElementById('monthBody').innerHTML = '<tr><td colspan="4">Failed to load</td></tr>'
  }

  // Dashboard functionality - no imports needed, uses global functions from app.js
  window.tripsOffset = 0
  window.fuelOffset = 0
  window.tripsLimit = 5
  window.fuelLimit = 5
  loadRecentTrips()
  loadRecentFuel()
  loadStats()
})

async function loadRecentTrips (append = false) {
  try {
    if (!append) {
      showLoading('recent-trips')
      window.tripsOffset = 0
    }
    const data = await window.api.get(`/api/trips?limit=${window.tripsLimit}&offset=${window.tripsOffset}`)
    renderRecentTrips(data || [], append)

    // Update offset for next load
    window.tripsOffset += data?.length || 0
  } catch (error) {
    console.error('Failed to load recent trips:', error)
    showError('recent-trips', 'Failed to load trips: ' + error.message)
  }
}

async function loadRecentFuel (append = false) {
  try {
    if (!append) {
      showLoading('recent-fuel')
      window.fuelOffset = 0
    }
    const data = await window.api.get(`/api/fuel?limit=${window.fuelLimit}&offset=${window.fuelOffset}`)
    renderRecentFuel(data || [], append)

    // Update offset for next load
    window.fuelOffset += data?.length || 0
  } catch (error) {
    console.error('Failed to load recent fuel:', error)
    showError('recent-fuel', 'Failed to load fuel data: ' + error.message)
  }
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

function renderRecentTrips (trips, append = false) {
  const container = document.getElementById('recent-trips')
  if (!container) return

  if (!trips || trips.length === 0) {
    if (!append) {
      container.innerHTML = '<p class="no-data">No trips found</p>'
    }
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

  if (append) {
    // Remove existing load more button
    const existingButton = container.querySelector('.load-more-btn')
    if (existingButton) existingButton.remove()

    // Append new trips
    const tempDiv = document.createElement('div')
    tempDiv.innerHTML = html
    while (tempDiv.firstChild) {
      container.appendChild(tempDiv.firstChild)
    }
  } else {
    container.innerHTML = html
  }

  // Add load more button if we got a full batch (suggests there might be more)
  if (trips.length === window.tripsLimit) {
    const loadMoreBtn = document.createElement('button')
    loadMoreBtn.className = 'load-more-btn'
    loadMoreBtn.textContent = 'Load more trips'
    loadMoreBtn.onclick = () => loadRecentTrips(true)
    container.appendChild(loadMoreBtn)
  }
}

function renderRecentFuel (fuelRecords, append = false) {
  const container = document.getElementById('recent-fuel')
  if (!container) return

  if (!fuelRecords || fuelRecords.length === 0) {
    if (!append) {
      container.innerHTML = '<p class="no-data">No fuel records found</p>'
    }
    return
  }

  const html = fuelRecords.map(record => `
    <div class="fuel-item">
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

  if (append) {
    // Remove existing load more button
    const existingButton = container.querySelector('.load-more-btn')
    if (existingButton) existingButton.remove()

    // Append new fuel records
    const tempDiv = document.createElement('div')
    tempDiv.innerHTML = html
    while (tempDiv.firstChild) {
      container.appendChild(tempDiv.firstChild)
    }
  } else {
    container.innerHTML = html
  }

  // Add load more button if we got a full batch (suggests there might be more)
  if (fuelRecords.length === window.fuelLimit) {
    const loadMoreBtn = document.createElement('button')
    loadMoreBtn.className = 'load-more-btn'
    loadMoreBtn.textContent = 'Load more fuel records'
    loadMoreBtn.onclick = () => loadRecentFuel(true)
    container.appendChild(loadMoreBtn)
  }
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

// Make function globally available
window.showTripOnMap = showTripOnMap
