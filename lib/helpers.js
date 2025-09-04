import fs from 'fs'
import fetch from 'node-fetch'
import path from 'path'
import { logInfo, logError, logDebug } from './logger.js'

export const createHelpers = (config) => {
  const { UPLOAD_DIR, GEMINI_KEY, GEMINI_MODEL, GEOCACHE } = config

  // Load geocache
  let geocache = {}
  if (!fs.existsSync(GEOCACHE)) {
    try {
      const fd = fs.openSync(GEOCACHE, fs.constants.O_CREAT | fs.constants.O_EXCL | fs.constants.O_RDWR, 0o600)
      fs.writeFileSync(fd, '{}', 'utf8')
      fs.closeSync(fd)
      geocache = JSON.parse(fs.readFileSync(GEOCACHE, 'utf8'))
    } catch (e) {
      // file existed
      try {
        geocache = JSON.parse(fs.readFileSync(GEOCACHE, 'utf8'))
      } catch (parseError) {
        logError('Failed to parse geocache file', { error: parseError.message })
        geocache = {}
      }
    }
  } else {
    try {
      geocache = JSON.parse(fs.readFileSync(GEOCACHE, 'utf8'))
    } catch (e) {
      logError('Failed to load geocache', { error: e.message })
      geocache = {}
    }
  }

  const parseReceipt = async (filePath) => {
    if (!GEMINI_KEY) throw new Error('GEMINI_API_KEY missing')

    let resolvedPath

    // Handle different path scenarios:
    // 1. If absolute path is provided (like in tests), use it directly
    // 2. If relative path, resolve within UPLOAD_DIR (like in uploads)
    if (path.isAbsolute(filePath)) {
      // For absolute paths, resolve to canonical form and verify it's within UPLOAD_DIR
      resolvedPath = fs.realpathSync(filePath)
      const canonicalUploadDir = fs.realpathSync(UPLOAD_DIR)
      if (!resolvedPath.startsWith(canonicalUploadDir + path.sep)) {
        throw new Error('Invalid file path')
      }
    } else {
      // For relative paths, sanitize and resolve within UPLOAD_DIR
      resolvedPath = fs.realpathSync(path.resolve(UPLOAD_DIR, path.basename(filePath)))
      const canonicalUploadDir = fs.realpathSync(UPLOAD_DIR)
      if (!resolvedPath.startsWith(canonicalUploadDir + path.sep)) {
        throw new Error('Invalid file path')
      }
    }

    const imageBuffer = fs.readFileSync(resolvedPath)
    const base64Image = imageBuffer.toString('base64')
    const mimeType = resolvedPath.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg'

    logInfo('Sending image to Gemini API for OCR processing')

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: 'Extract data from this fuel receipt. Return ONLY a JSON object with fields: ts (ISO datetime), liters (number), price_per_l (number), amount_fuel (number), amount_total (number), station_name (string), station_zip (string), station_city (string), station_address (string). If a field cannot be extracted, use null. Do not include any text before or after the JSON.' },
            { inline_data: { mime_type: mimeType, data: base64Image } }
          ]
        }],
        generation_config: { temperature: 0.1 }
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Gemini API error: ${response.status} ${errorText}`)
    }

    const data = await response.json()
    const content = data?.candidates?.[0]?.content?.parts?.[0]?.text
    if (!content) throw new Error('No content in Gemini response')

    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('No JSON found in Gemini response')

    const parsed = JSON.parse(jsonMatch[0])
    logDebug('Parsed receipt data', { parsed })

    if (!parsed.ts && !parsed.amount_total) {
      throw new Error('Critical fields missing from receipt')
    }

    return parsed
  }

  const geocodeAddress = async (addr) => {
    if (!addr?.trim()) return null
    const key = addr.toLowerCase().trim()
    if (geocache[key]) return geocache[key]

    logInfo('Geocoding address', { address: addr })
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(addr)}&limit=1&countrycodes=de`)
      const data = await response.json()
      if (data?.[0]) {
        const result = { lat: +data[0].lat, lon: +data[0].lon }
        geocache[key] = result
        fs.writeFileSync(GEOCACHE, JSON.stringify(geocache, null, 2))
        logDebug('Geocoding successful', { address: addr, result })
        return result
      }
    } catch (e) {
      logError('Geocoding error', { address: addr, error: e.message })
    }
    return null
  }

  const distanceKm = (lat1, lon1, lat2, lon2) => {
    const toRad = x => x * Math.PI / 180
    const R = 6371
    const dLat = toRad(lat2 - lat1)
    const dLon = toRad(lon2 - lon1)
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c
  }

  return {
    parseReceipt,
    geocodeAddress,
    distanceKm
  }
}
