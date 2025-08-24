import { fmtDateTimeLocal } from './app.js'

// Load Chart.js library
const Chart = window.Chart

// Trips page functionality
let currentPage = 0
const itemsPerPage = 20
let totalTrips = 0

async function initTripsTable (table, moreBtn, chartCanvas) {
  let offset = 0

  async function load () {
    const trips = await fetch(`/api/trips?limit=20&offset=${offset}`).then(r => r.json())
    const tbody = table.querySelector('tbody')
    trips.forEach(tr => {
      const trEl = document.createElement('tr')
      trEl.innerHTML = `<td>${fmtDateTimeLocal(tr.start_ts)}</td><td>${fmtDateTimeLocal(tr.end_ts)}</td>`
      trEl.onclick = () => loadTripChart(tr.start_ts)
      tbody.appendChild(trEl)
    })
    offset += 20
  }

  async function loadTripChart (startTs) {
    const data = await fetch(`/api/trip/${startTs}`).then(r => r.json())
    const labels = data.map(d => d.ts)
    const speed = data.map(d => d.spd_kmh)
    const temp = data.map(d => d.temp_c)

    if (window.tripChart) window.tripChart.destroy()

    window.tripChart = new Chart(chartCanvas, {
      type: 'line',
      data: {
        labels,
        datasets: [
          { label: 'km/h', data: speed, yAxisID: 'y1', borderColor: '#ff8a00', pointRadius: 0 },
          { label: '°C', data: temp, yAxisID: 'y2', borderColor: '#ffb74d', pointRadius: 0 }
        ]
      },
      options: {
        interaction: { mode: 'index', intersect: false },
        maintainAspectRatio: false,
        plugins: {
          legend: { labels: { color: '#e9eef2' } },
          tooltip: {
            callbacks: { title: (items) => items.length ? fmtDateTimeLocal(items[0].label) : '' }
          },
          zoom: {
            zoom: { wheel: { enabled: true }, pinch: { enabled: true }, mode: 'x' },
            pan: { enabled: true, mode: 'x' }
          }
        },
        scales: {
          x: { display: false, grid: { color: '#2a2f36' } },
          y1: { position: 'left', ticks: { color: '#e9eef2' }, grid: { color: '#2a2f36' } },
          y2: { position: 'right', ticks: { color: '#e9eef2' }, grid: { drawOnChartArea: false } }
        }
      }
    })
  }

  moreBtn.onclick = load
  await load()
}

window.addEventListener('DOMContentLoaded', () => {
  initTripsTable(
    document.getElementById('tripTable'),
    document.getElementById('moreBtn'),
    document.getElementById('tripChart')
  )
})

// Pagination and trip details functionality
document.addEventListener('DOMContentLoaded', () => {
  loadTrips()
  setupPagination()
  setupTripDetails()
})

function setupPagination () {
  document.getElementById('prev-page').addEventListener('click', () => {
    if (currentPage > 0) {
      currentPage--
      loadTrips()
    }
  })

  document.getElementById('next-page').addEventListener('click', () => {
    if ((currentPage + 1) * itemsPerPage < totalTrips) {
      currentPage++
      loadTrips()
    }
  })
}

function setupTripDetails () {
  document.getElementById('close-details').addEventListener('click', () => {
    document.getElementById('trip-details').style.display = 'none'
  })
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
    document.getElementById('trips-list').innerHTML =
      `<p class="error">Failed to load trips: ${error.message}</p>`
  }
}

function renderTrips (trips) {
  const container = document.getElementById('trips-list')

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

function updatePagination () {
  const prevBtn = document.getElementById('prev-page')
  const nextBtn = document.getElementById('next-page')
  const pageInfo = document.getElementById('page-info')

  prevBtn.disabled = currentPage === 0
  nextBtn.disabled = (currentPage + 1) * itemsPerPage >= totalTrips

  const totalPages = Math.ceil(totalTrips / itemsPerPage)
  pageInfo.textContent = `Page ${currentPage + 1} of ${totalPages}`
}

function showLoading (elementId) {
  document.getElementById(elementId).innerHTML = '<div class="loading">Loading...</div>'
}

function formatDate (timestamp) {
  if (!timestamp) return 'Unknown'
  return new Date(timestamp).toLocaleDateString('de-DE', {
    weekday: 'short',
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
