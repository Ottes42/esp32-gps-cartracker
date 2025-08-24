import { fmtDateTimeLocal, fmtNumber, fmtCurrencyEUR } from './app.js'

const tbody = document.querySelector('#fuelTable tbody')
const moreBtn = document.getElementById('moreBtn')

let offset = 0

async function load () {
  const rows = await fetch(`/api/fuel?limit=20&offset=${offset}`).then(r => r.json())
  rows.forEach(r => {
    const tr = document.createElement('tr')
    const station = [r.station_name, r.station_address, r.station_zip, r.station_city].filter(Boolean).join(', ')
    const status = r.ocr_error ? `<span class="badge err" title="${r.ocr_error}">OCR error</span>` : '<span class="badge ok">OK</span>'
    const action = r.ocr_error ? `<button data-id="${r.id}" class="retry">Retry OCR</button>` : ''
    tr.innerHTML = `
      <td>${fmtDateTimeLocal(r.ts)}</td>
      <td>${station || '—'}</td>
      <td>${fmtNumber(r.liters, 1)} L</td>
      <td>${fmtCurrencyEUR(r.amount_total)}</td>
      <td>${status}</td>
      <td>${action}</td>
    `
    tbody.appendChild(tr)
  })
  offset += 20
}

tbody.addEventListener('click', async (e) => {
  const btn = e.target.closest('button.retry')
  if (!btn) return
  const id = btn.getAttribute('data-id')
  btn.disabled = true; btn.textContent = 'Retrying…'
  try {
    const r = await fetch(`/retryReceipt/${id}`, { method: 'POST' })
    const j = await r.json()
    if (j.ok) {
      btn.closest('tr').querySelector('td:nth-child(5)').innerHTML = '<span class="badge ok">OK</span>'
      btn.remove()
    } else {
      btn.disabled = false; btn.textContent = 'Retry OCR'
      alert('Retry failed: ' + (j.error || 'unknown'))
    }
  } catch (err) {
    btn.disabled = false; btn.textContent = 'Retry OCR'
    alert('Retry failed: ' + err.message)
  }
})

moreBtn.addEventListener('click', load)
window.addEventListener('DOMContentLoaded', load)
