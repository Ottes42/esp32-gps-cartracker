import { loadFuelMarkers, fmtMonthLocal, fmtCurrencyEUR, fmtNumber } from './app.js'

/* global L */

window.addEventListener('DOMContentLoaded', async () => {
  // Map
  const map = L.map('map').setView([50.2, 8.6], 11)
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map)
  loadFuelMarkers(map, document.getElementById('status'))

  // Monthly table
  try {
    const rows = await fetch('/api/fuel/months').then(r => r.json())
    const tbody = document.getElementById('monthBody')
    rows.forEach(r => {
      const tr = document.createElement('tr')
      tr.innerHTML = `<td>${fmtMonthLocal(r.month)}</td>
                      <td>${fmtCurrencyEUR(r.cost)}</td>
                      <td>${fmtNumber(r.km / 1000, 1)} km</td>
                      <td>${fmtNumber(r.liters, 1)} L</td>`
      tbody.appendChild(tr)
    })
  } catch (e) {
    document.getElementById('monthBody').innerHTML = '<tr><td colspan="4">Failed to load</td></tr>'
  }

  // Dashboard functionality
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
        <span class="trip-date">${formatDate(trip.start_ts)}</span>
        <span class="trip-duration">${formatDuration(trip.duration_minutes)}</span>
      </div>
      <div class="trip-details">
        <span class="trip-distance">${(trip.distance_km || 0).toFixed(1)} km</span>
        <span class="trip-speed">${(trip.avg_speed_kmh || 0).toFixed(1)} km/h avg</span>
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
        <span class="fuel-date">${formatDate(record.timestamp)}</span>
        <span class="fuel-amount">${record.liters || 'Unknown'}L</span>
      </div>
      <div class="fuel-details">
        <span class="fuel-cost">€${record.amount_eur || 'Unknown'}</span>
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
        <span class="stat-value">${currentMonth.total_liters || 0}L</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">Total Cost</span>
        <span class="stat-value">€${currentMonth.total_amount || 0}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">Avg Price</span>
        <span class="stat-value">€${currentMonth.avg_price_per_liter || 0}/L</span>
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

function formatDate (timestamp) {
  if (!timestamp) return 'Unknown'
  return new Date(timestamp).toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
}

function formatDuration (minutes) {
  if (!minutes) return '0min'
  const hours = Math.floor(minutes / 60)
  const mins = Math.round(minutes % 60)
  return hours > 0 ? `${hours}h ${mins}min` : `${mins}min`
}
