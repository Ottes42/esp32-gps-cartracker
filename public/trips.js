// Trips page functionality - StandardJS compliant
let currentPage = 0
const itemsPerPage = 20
let totalTrips = 0
let isLoading = false

// Chart.js reference (loaded globally)
const Chart = window.Chart

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  // Check if we have table-based trip view or card-based view
  const table = document.getElementById('tripTable')
  const moreBtn = document.getElementById('moreBtn')
  const chartCanvas = document.getElementById('tripChart')
  if (table && moreBtn && chartCanvas) {
    // Table-based view with chart
    initTripsTable(table, moreBtn, chartCanvas)
  } else {
    // Card-based view with pagination
    loadTrips()
    setupPagination()
    setupTripDetails()
  }
})

// Table-based trips view (original functionality)
async function initTripsTable (table, moreBtn, chartCanvas) {
  let offset = 0

  async function loadMore () {
    if (isLoading) return
    isLoading = true

    try {
      showButtonLoading(moreBtn, 'Loading...')
      const response = await window.api.get(`/api/trips?limit=20&offset=${offset}`)
      const trips = response.trips || response || []
      const tbody = table.querySelector('tbody')

      trips.forEach(trip => {
        const row = document.createElement('tr')
        row.innerHTML = `
          <td>${window.fmtDateTimeLocal(trip.start_ts)}</td>
          <td>${window.fmtDateTimeLocal(trip.end_ts)}</td>
          <td>${(trip.distance_km || 0).toFixed(1)} km</td>
          <td>${formatDuration(trip.duration_minutes)}</td>
        `
        row.onclick = () => loadTripChart(trip.start_ts)
        row.style.cursor = 'pointer'
        row.className = 'trip-row'
        tbody.appendChild(row)
      })

      offset += 20

      if (trips.length < 20) {
        moreBtn.disabled = true
        moreBtn.textContent = 'No more trips'
      }
    } catch (error) {
      showGlobalError('Failed to load trips: ' + error.message)
    } finally {
      hideButtonLoading(moreBtn, 'Load More')
      isLoading = false
    }
  }

  async function loadTripChart (startTs) {
    try {
      const chartContainer = chartCanvas.parentElement
      showLoading(chartContainer.id || 'chart-container')

      const data = await window.api.get(`/api/trip/${encodeURIComponent(startTs)}`)

      if (!data || data.length === 0) {
        showError(chartContainer.id, 'No trip data found')
        return
      }

      // Parse trip data for chart
      const points = Array.isArray(data) ? data : []
      const labels = points.map(d => d.ts || d.timestamp)
      const speed = points.map(d => d.spd_kmh || d.speed || 0)
      const temp = points.map(d => d.temp_c || d.temperature || 0)

      // Destroy existing chart
      if (window.tripChart) {
        window.tripChart.destroy()
      }

      // Create new chart
      window.tripChart = new Chart(chartCanvas, {
        type: 'line',
        data: {
          labels,
          datasets: [
            {
              label: 'Speed (km/h)',
              data: speed,
              yAxisID: 'y1',
              borderColor: '#ff8a00',
              backgroundColor: 'rgba(255, 138, 0, 0.1)',
              pointRadius: 0,
              tension: 0.1
            },
            {
              label: 'Temperature (°C)',
              data: temp,
              yAxisID: 'y2',
              borderColor: '#ffb74d',
              backgroundColor: 'rgba(255, 183, 77, 0.1)',
              pointRadius: 0,
              tension: 0.1
            }
          ]
        },
        options: {
          responsive: true,
          interaction: {
            mode: 'index',
            intersect: false
          },
          maintainAspectRatio: false,
          plugins: {
            legend: {
              labels: { color: '#e9eef2' }
            },
            tooltip: {
              callbacks: {
                title: (items) => {
                  if (items.length && items[0].label) {
                    return window.fmtDateTimeLocal(items[0].label)
                  }
                  return ''
                }
              }
            }
          },
          scales: {
            x: {
              display: false,
              grid: { color: '#2a2f36' }
            },
            y1: {
              type: 'linear',
              position: 'left',
              ticks: { color: '#e9eef2' },
              grid: { color: '#2a2f36' },
              title: {
                display: true,
                text: 'Speed (km/h)',
                color: '#ff8a00'
              }
            },
            y2: {
              type: 'linear',
              position: 'right',
              ticks: { color: '#e9eef2' },
              grid: { drawOnChartArea: false },
              title: {
                display: true,
                text: 'Temperature (°C)',
                color: '#ffb74d'
              }
            }
          }
        }
      })
    } catch (error) {
      console.error('Failed to load trip chart:', error)
      showError('chart-container', 'Failed to load trip chart: ' + error.message)
    }
  }

  // Set up click handler and load initial data
  moreBtn.onclick = loadMore
  await loadMore()
}

// Card-based trips view (fallback)
function setupPagination () {
  const prevBtn = document.getElementById('prev-page')
  const nextBtn = document.getElementById('next-page')

  if (!prevBtn || !nextBtn) return

  prevBtn.addEventListener('click', () => {
    if (currentPage > 0) {
      currentPage--
      loadTrips()
    }
  })

  nextBtn.addEventListener('click', () => {
    if ((currentPage + 1) * itemsPerPage < totalTrips) {
      currentPage++
      loadTrips()
    }
  })
}

function setupTripDetails () {
  const closeBtn = document.getElementById('close-details')
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      const detailsEl = document.getElementById('trip-details')
      if (detailsEl) {
        detailsEl.style.display = 'none'
      }
    })
  }
}

async function loadTrips () {
  try {
    showLoading('trips-list')
    const offset = currentPage * itemsPerPage
    const data = await window.api.get(`/api/trips?limit=${itemsPerPage}&offset=${offset}`)

    totalTrips = data.total || 0
    renderTrips(data.trips || [])
    updatePagination()
  } catch (error) {
    console.error('Failed to load trips:', error)
    showError('trips-list', 'Failed to load trips: ' + error.message)
  }
}

function renderTrips (trips) {
  const container = document.getElementById('trips-list')
  if (!container) return

  if (!trips || trips.length === 0) {
    container.innerHTML = '<p class="no-data">No trips found</p>'
    return
  }

  const html = trips.map(trip => `
    <div class="trip-card" onclick="loadTripDetails('${trip.start_ts}')">
      <div class="trip-header">
        <h3>${formatDate(trip.start_ts)}</h3>
        <span class="trip-duration">${formatDuration(trip.duration_minutes)}</span>
      </div>
      <div class="trip-stats">
        <div class="stat">
          <span class="label">Distance</span>
          <span class="value">${(trip.distance_km || 0).toFixed(1)} km</span>
        </div>
        <div class="stat">
          <span class="label">Avg Speed</span>
          <span class="value">${(trip.avg_speed_kmh || 0).toFixed(1)} km/h</span>
        </div>
        <div class="stat">
          <span class="label">Max Speed</span>
          <span class="value">${(trip.max_speed_kmh || 0).toFixed(1)} km/h</span>
        </div>
        <div class="stat">
          <span class="label">Points</span>
          <span class="value">${trip.point_count || 0}</span>
        </div>
      </div>
    </div>
  `).join('')

  container.innerHTML = html
}

window.loadTripDetails = async function (startTimestamp) {
  try {
    showLoading('trip-details-content')
    const data = await window.api.get(`/api/trip/${encodeURIComponent(startTimestamp)}`)
    renderTripDetails(data)
    const detailsEl = document.getElementById('trip-details')
    if (detailsEl) {
      detailsEl.style.display = 'block'
    }
  } catch (error) {
    console.error('Failed to load trip details:', error)
    showError('trip-details-content', 'Failed to load trip details: ' + error.message)
  }
}

function renderTripDetails (trip) {
  const container = document.getElementById('trip-details-content')
  if (!container) return

  const html = `
    <div class="trip-detail-grid">
      <div class="detail-section">
        <h4>Trip Overview</h4>
        <div class="detail-stats">
          <div class="detail-stat">
            <span class="label">Start Time</span>
            <span class="value">${formatDateTime(trip.start_ts)}</span>
          </div>
          <div class="detail-stat">
            <span class="label">End Time</span>
            <span class="value">${formatDateTime(trip.end_ts)}</span>
          </div>
          <div class="detail-stat">
            <span class="label">Duration</span>
            <span class="value">${formatDuration(trip.duration_minutes)}</span>
          </div>
        </div>
      </div>
      
      <div class="detail-section">
        <h4>Distance & Speed</h4>
        <div class="detail-stats">
          <div class="detail-stat">
            <span class="label">Total Distance</span>
            <span class="value">${(trip.distance_km || 0).toFixed(1)} km</span>
          </div>
          <div class="detail-stat">
            <span class="label">Average Speed</span>
            <span class="value">${(trip.avg_speed_kmh || 0).toFixed(1)} km/h</span>
          </div>
          <div class="detail-stat">
            <span class="label">Maximum Speed</span>
            <span class="value">${(trip.max_speed_kmh || 0).toFixed(1)} km/h</span>
          </div>
        </div>
      </div>
      
      <div class="detail-section">
        <h4>GPS Data</h4>
        <div class="detail-stats">
          <div class="detail-stat">
            <span class="label">Data Points</span>
            <span class="value">${trip.point_count || 0}</span>
          </div>
          <div class="detail-stat">
            <span class="label">Average HDOP</span>
            <span class="value">${(trip.avg_hdop || 0).toFixed(1)}</span>
          </div>
          <div class="detail-stat">
            <span class="label">Average Satellites</span>
            <span class="value">${Math.round(trip.avg_sats || 0)}</span>
          </div>
        </div>
      </div>
    </div>
  `

  container.innerHTML = html
}

function updatePagination () {
  const prevBtn = document.getElementById('prev-page')
  const nextBtn = document.getElementById('next-page')
  const pageInfo = document.getElementById('page-info')

  if (!prevBtn || !nextBtn || !pageInfo) return

  prevBtn.disabled = currentPage === 0
  nextBtn.disabled = (currentPage + 1) * itemsPerPage >= totalTrips

  const totalPages = Math.ceil(totalTrips / itemsPerPage) || 1
  pageInfo.textContent = `Page ${currentPage + 1} of ${totalPages}`
}

// Utility functions - all properly defined
function showLoading (elementId) {
  const element = document.getElementById(elementId)
  if (element) {
    element.innerHTML = '<div class="loading-spinner"><div class="spinner"></div><span>Loading...</span></div>'
  }
}

function showButtonLoading (button, text) {
  if (!button) return
  button.disabled = true
  button.innerHTML = `<div class="button-spinner"></div>${text}`
}

function hideButtonLoading (button, text) {
  if (!button) return
  button.disabled = false
  button.innerHTML = text
}

function showError (elementId, message) {
  const element = document.getElementById(elementId)
  if (element) {
    element.innerHTML = `<div class="error-message">${message}</div>`
  }
}

function showGlobalError (message) {
  console.error(message)
  // Could show toast notification or modal here
  window.alert(message)
}

function formatDate (timestamp) {
  if (!timestamp) return 'Unknown'
  try {
    return new Date(timestamp).toLocaleDateString('de-DE', {
      weekday: 'short',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  } catch (e) {
    return 'Invalid Date'
  }
}

function formatDateTime (timestamp) {
  if (!timestamp) return 'Unknown'
  try {
    return new Date(timestamp).toLocaleString('de-DE')
  } catch (e) {
    return 'Invalid Date'
  }
}

function formatDuration (minutes) {
  if (!minutes || isNaN(minutes)) return '0min'
  const hours = Math.floor(minutes / 60)
  const mins = Math.round(minutes % 60)
  return hours > 0 ? `${hours}h ${mins}min` : `${mins}min`
}
