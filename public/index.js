/* global L */

window.addEventListener('DOMContentLoaded', async () => {
  // Map
  const map = L.map('map').setView([50.2, 8.6], 11)
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map)
  window.loadFuelMarkers(map, document.getElementById('status'))

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
  loadRecentTrips()
  loadRecentFuel()
  loadStats()
})

async function loadRecentTrips () {
  try {
    showLoading('recent-trips')
    const data = await window.api.get('/api/trips?limit=5&offset=0')
    renderRecentTrips(data.trips || [])
  } catch (error) {
    console.error('Failed to load recent trips:', error)
    showError('recent-trips', 'Failed to load trips: ' + error.message)
  }
}

async function loadRecentFuel () {
  try {
    showLoading('recent-fuel')
    const data = await window.api.get('/api/fuel?limit=5&offset=0')
    renderRecentFuel(data.records || [])
  } catch (error) {
    console.error('Failed to load recent fuel:', error)
    showError('recent-fuel', 'Failed to load fuel data: ' + error.message)
  }
}

async function loadStats () {
  try {
    showLoading('stats')
    const monthsData = await window.api.get('/api/fuel/months')
    renderStats(monthsData)
  } catch (error) {
    console.error('Failed to load statistics:', error)
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

  const html = trips.map(trip => `
    <div class="trip-item">
      <div class="trip-header">
        <span class="trip-date">${window.fmtDate(trip.start_ts)}</span>
        <span class="trip-duration">${window.fmtDuration(trip.duration_minutes)}</span>
      </div>
      <div class="trip-details">
        <span class="trip-distance">${window.fmtDistance(trip.distance_km)}</span>
        <span class="trip-speed">${window.fmtSpeed(trip.avg_speed_kmh)} avg</span>
      </div>
    </div>
  `).join('')

  container.innerHTML = html
}

function renderRecentFuel (records) {
  const container = document.getElementById('recent-fuel')
  if (!container) return

  if (!records || records.length === 0) {
    container.innerHTML = '<p class="no-data">No fuel records found</p>'
    return
  }

  const html = records.map(record => `
    <div class="fuel-item">
      <div class="fuel-header">
        <span class="fuel-date">${window.fmtDate(record.timestamp)}</span>
        <span class="fuel-amount">${window.fmtLiters(record.liters)}</span>
      </div>
      <div class="fuel-details">
        <span class="fuel-cost">${window.fmtCurrencyEUR(record.amount_eur)}</span>
        ${record.station_name ? `<span class="fuel-station">${record.station_name}</span>` : ''}
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
  const html = `
    <div class="stat-grid">
      <div class="stat-item">
        <span class="stat-label">This Month</span>
        <span class="stat-value">${window.fmtLiters(currentMonth.total_liters)}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">Total Cost</span>
        <span class="stat-value">${window.fmtCurrencyEUR(currentMonth.total_amount)}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">Avg Price</span>
        <span class="stat-value">${window.fmtCurrencyEUR(currentMonth.avg_price_per_liter)}/L</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">Fuel Stops</span>
        <span class="stat-value">${currentMonth.fuel_count || 0}</span>
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
