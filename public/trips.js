import { fmtDateTimeLocal } from './app.js'

async function loadTrips (table, moreBtn, chartCanvas) {
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

  async function loadTripChart (start_ts) {
    const data = await fetch(`/api/trip/${start_ts}`).then(r => r.json())
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
  loadTrips(
    document.getElementById('tripTable'),
    document.getElementById('moreBtn'),
    document.getElementById('tripChart')
  )
})
