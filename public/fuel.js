// Fuel page functionality
let currentPage = 0
const itemsPerPage = 20
let totalRecords = 0
let isUploading = false

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
    <div class="small">${window.fmtDateTimeLocal(parsed.ts)}</div>
    <div class="mt-8 small">
      Price: ${window.fmtNumber(parsed.price_per_l, 3)} €/L • Amount: ${window.fmtNumber(parsed.liters, 1)} L • Total: ${window.fmtCurrencyEUR(parsed.amount_total)}
    </div>
    ${consumption ? `<div class="mt-8">Since previous full tank: <strong>${window.fmtNumber(consumption, 1)} L/100km</strong></div>` : ''}
  `
  result.innerHTML = html
}

document.addEventListener('DOMContentLoaded', () => {
  loadFuelRecords()
  setupPagination()
  setupUpload()
})

function setupPagination () {
  const prevBtn = document.getElementById('prev-page')
  const nextBtn = document.getElementById('next-page')

  if (!prevBtn || !nextBtn) return

  prevBtn.addEventListener('click', () => {
    if (currentPage > 0) {
      currentPage--
      loadFuelRecords()
    }
  })

  nextBtn.addEventListener('click', () => {
    if ((currentPage + 1) * itemsPerPage < totalRecords) {
      currentPage++
      loadFuelRecords()
    }
  })
}

function setupUpload () {
  const uploadBtn = document.getElementById('upload-btn')
  const fileInput = document.getElementById('receipt-upload')

  if (uploadBtn) {
    uploadBtn.addEventListener('click', uploadReceipt)
  }

  if (fileInput) {
    fileInput.addEventListener('change', (e) => {
      const file = e.target.files[0]
      if (file) {
        const maxSize = 50 * 1024 * 1024 // 50MB for phone camera photos
        if (file.size > maxSize) {
          showError('File too large. Maximum size is 50MB.')
          e.target.value = ''
        }
      }
    })
  }
}

async function loadFuelRecords () {
  try {
    showLoading('fuel-records')
    const offset = currentPage * itemsPerPage
    const data = await window.api.get(`/api/fuel?limit=${itemsPerPage}&offset=${offset}`)

    totalRecords = data.total || 0
    renderFuelRecords(data.records || [])
    updatePagination()
  } catch (error) {
    console.error('Failed to load fuel records:', error)
    showError('fuel-records', 'Failed to load fuel records: ' + error.message)
  }
}

function renderFuelRecords (records) {
  const container = document.getElementById('fuel-records')
  if (!container) return

  if (!records || records.length === 0) {
    container.innerHTML = '<p class="no-data">No fuel records found</p>'
    return
  }

  const html = records.map(record => `
    <div class="fuel-card">
      <div class="fuel-header">
        <h3>${window.fmtDateTimeLocal(record.timestamp)}</h3>
        <div class="fuel-actions">
          ${record.ocr_error ? `<button class="retry-btn" onclick="retryReceipt(${record.id})">Retry OCR</button>` : ''}
        </div>
      </div>
      <div class="fuel-details">
        <div class="fuel-amount">
          <span class="label">Amount</span>
          <span class="value">${window.fmtLiters(record.liters)}</span>
        </div>
        <div class="fuel-cost">
          <span class="label">Total Cost</span>
          <span class="value">${window.fmtCurrencyEUR(record.amount_eur)}</span>
        </div>
        <div class="fuel-price">
          <span class="label">Price per Liter</span>
          <span class="value">${window.fmtCurrencyEUR(record.price_per_liter)}</span>
        </div>
        ${record.station_name
          ? `
          <div class="fuel-station">
            <span class="label">Station</span>
            <span class="value">${record.station_name}</span>
          </div>
        `
          : ''}
        ${record.station_address
          ? `
          <div class="fuel-address">
            <span class="label">Address</span>
            <span class="value">${record.station_address}</span>
          </div>
        `
          : ''}
        ${record.ocr_error
          ? `
          <div class="ocr-error">
            <span class="label">OCR Error</span>
            <span class="error-text">${record.ocr_error}</span>
          </div>
        `
          : ''}
      </div>
    </div>
  `).join('')

  container.innerHTML = html
}

async function uploadReceipt () {
  if (isUploading) return

  const fileInput = document.getElementById('receipt-upload')
  const file = fileInput.files[0]

  if (!file) {
    showError('Please select a receipt photo')
    return
  }

  isUploading = true
  const uploadBtn = document.getElementById('upload-btn')

  try {
    const formData = new FormData()
    formData.append('photo', file)

    showButtonLoading(uploadBtn, 'Processing...')
    showUploadStatus('Uploading and processing receipt (may take 30-60s)...', 'info')

    await window.api.post('/uploadReceipt', formData)

    showUploadStatus('Receipt processed successfully!', 'success')
    fileInput.value = '' // Clear input
    loadFuelRecords() // Refresh list
  } catch (error) {
    console.error('Failed to upload receipt:', error)
    showUploadStatus('Upload failed: ' + error.message, 'error')
  } finally {
    hideButtonLoading(uploadBtn, 'Upload Receipt')
    isUploading = false
  }
}

window.retryReceipt = async function (recordId) {
  try {
    showUploadStatus('Retrying OCR processing...', 'info')
    await window.api.post(`/retryReceipt/${recordId}`)
    showUploadStatus('OCR retry completed!', 'success')
    loadFuelRecords() // Refresh list
  } catch (error) {
    console.error('Failed to retry OCR:', error)
    showUploadStatus('OCR retry failed: ' + error.message, 'error')
  }
}

function updatePagination () {
  const prevBtn = document.getElementById('prev-page')
  const nextBtn = document.getElementById('next-page')
  const pageInfo = document.getElementById('page-info')

  if (!prevBtn || !nextBtn || !pageInfo) return

  prevBtn.disabled = currentPage === 0
  nextBtn.disabled = (currentPage + 1) * itemsPerPage >= totalRecords

  const totalPages = Math.ceil(totalRecords / itemsPerPage) || 1
  pageInfo.textContent = `Page ${currentPage + 1} of ${totalPages}`
}

// Utility functions
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

function showError (elementIdOrMessage, message) {
  if (message) {
    // elementIdOrMessage is elementId
    const element = document.getElementById(elementIdOrMessage)
    if (element) {
      element.innerHTML = `<div class="error-message">${message}</div>`
    }
  } else {
    // elementIdOrMessage is message
    console.error(elementIdOrMessage)
    showUploadStatus(elementIdOrMessage, 'error')
  }
}

function showUploadStatus (message, type = 'info') {
  const statusEl = document.getElementById('upload-status')
  if (!statusEl) return

  statusEl.className = `upload-status ${type}`
  statusEl.textContent = message
  statusEl.style.display = 'block'

  // Auto-hide success/info messages
  if (type === 'success' || type === 'info') {
    setTimeout(() => {
      statusEl.style.display = 'none'
    }, 5000)
  }
}
