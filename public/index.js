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
    renderRecentTrips(data || [])
  } catch (error) {
    console.error('Failed to load recent trips:', error)
    showError('recent-trips', 'Failed to load trips: ' + error.message)
  }
}

async function loadRecentFuel () {
  try {
    showLoading('recent-fuel')
    const data = await window.api.get('/api/fuel?limit=5&offset=0')
    renderRecentFuel(data || [])
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
      <div class="trip-item">
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
    <div class="fuel-item">
      <div class="fuel-info">
        <span class="fuel-date">${window.fmtDate(record.ts)}</span>
        ${record.station_name ? `<span class="fuel-station">${record.station_name}</span>` : ''}
      </div>
      <div class="fuel-details">
        <span class="fuel-amount">${window.fmtLiters(record.liters)}</span>
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
