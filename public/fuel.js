import { fmtDateTimeLocal, fmtCurrencyEUR, fmtNumber } from './app.js'

const form = document.getElementById('fuelForm')
const result = document.getElementById('result')

form.addEventListener('submit', async (e) => {
  e.preventDefault()
  const file = document.getElementById('photo').files[0]
  if (!file) { result.textContent = 'Please choose a file.'; return }
  const fd = new FormData()
  fd.append('photo', file)
  fd.append('full_tank', document.getElementById('full').checked ? '1' : '0')

  result.textContent = 'Uploading…'
  try {
    const r = await fetch('/uploadReceipt', { method: 'POST', body: fd })
    const j = await r.json()
    if (!r.ok) { throw new Error(j.error || r.statusText) }
    renderResult(j)
  } catch (err) {
    result.innerHTML = `<span class="badge err">Error</span> ${err.message}`
  }
})

function renderResult ({ ok, parsed, error, consumption }) {
  if (!ok) {
    result.innerHTML = `<div class="badge warn">Stored photo but OCR failed</div><div class="small">${error || ''}</div>`
    return
  }
  const addr = [parsed.station_name, parsed.station_address, parsed.station_zip, parsed.station_city].filter(Boolean).join(', ')
  const html = `
    <div class="badge ok">Parsed</div>
    <div class="mt-8"><strong>${addr}</strong></div>
    <div class="small">${fmtDateTimeLocal(parsed.ts)}</div>
    <div class="mt-8 small">
      Price: ${fmtNumber(parsed.price_per_l, 3)} €/L • Amount: ${fmtNumber(parsed.liters, 1)} L • Total: ${fmtCurrencyEUR(parsed.amount_total)}
    </div>
    ${consumption ? `<div class="mt-8">Since previous full tank: <strong>${fmtNumber(consumption, 1)} L/100km</strong></div>` : ''}
  `
  result.innerHTML = html
}
