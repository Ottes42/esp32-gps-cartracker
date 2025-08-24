// Shared helpers for all pages

export function qs (sel, root = document) { return root.querySelector(sel) }
export function qsa (sel, root = document) { return Array.from(root.querySelectorAll(sel)) }

export async function fetchJSON (url, opts = {}) {
  const r = await fetch(url, opts)
  if (!r.ok) throw new Error(`HTTP ${r.status}`)
  return await r.json()
}

// ---- time formatting helpers (local) ----
export function fmtDateTimeLocal (iso, opts = {}) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  const df = new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    ...opts
  })
  return df.format(d)
}

export function fmtMonthLocal (ym) {
  try {
    const d = new Date(ym + '-01T00:00:00Z')
    const df = new Intl.DateTimeFormat(undefined, { year: 'numeric', month: 'long' })
    return df.format(d)
  } catch { return ym }
}

export function fmtNumber (v, d = 1) { if (v == null || Number.isNaN(+v)) return '—'; return (+v).toFixed(d) }
export function fmtCurrencyEUR (v) { if (v == null) return '—'; return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'EUR' }).format(+v) }

// Leaflet fuel markers
export async function loadFuelMarkers (map, statusEl) {
  statusEl.textContent = 'Loading fuel markers…'
  let fuels = []
  try {
    fuels = await fetchJSON('/api/fuel?limit=500&offset=0')
  } catch (e) {
    statusEl.textContent = 'Failed to load fuel data.'
    return
  }
  let count = 0
  fuels.forEach(f => {
    if (f.lat == null || f.lon == null) return
    const m = L.marker([f.lat, f.lon]).addTo(map)
    const text = fuelPopupHTML(f)
    m.bindPopup(text)
    m.on('mouseover', () => { statusEl.innerHTML = text })
    m.on('mouseout', () => { statusEl.textContent = 'Hover over a fuel marker to see details' })
    count++
  })
  statusEl.innerHTML = count ? `Loaded ${count} fuel markers. Hover a marker for details.` : 'No geocoded fuel stops yet.'
}

function fuelPopupHTML (f) {
  const date = fmtDateTimeLocal(f.ts)
  const price = f.price_per_l != null ? `${fmtNumber(f.price_per_l, 3)} €/L` : '—'
  const liters = f.liters != null ? `${fmtNumber(f.liters, 1)} L` : '—'
  const total = fmtCurrencyEUR(f.amount_total)
  const addr = [f.station_name, f.station_address, f.station_zip, f.station_city].filter(Boolean).join(', ')
  const err = f.ocr_error ? '<div class="badge err">OCR error</div>' : ''
  return `<div>
    <div><strong>${addr || 'Fuel stop'}</strong></div>
    <div class="small">${date}</div>
    <div class="small">Price: ${price} • Amount: ${liters} • Total: ${total}</div>
    ${err}
  </div>`
}
