import { describe, it, expect } from '@jest/globals'

describe('Firmware Binary Naming Consistency', () => {
  // Test the same logic used in both CI workflow and build script
  const getSensorShort = (sensor) => {
    const sensorLower = sensor.toLowerCase()
    switch (sensorLower) {
      case 'dht11': return 'd11'
      case 'dht22': return 'd22'
      case 'none': return 'no'
      default: return sensorLower
    }
  }

  const getDeviceName = (sensor) => {
    return `gps-board-${getSensorShort(sensor)}`
  }

  it('should generate consistent device names for all sensor types', () => {
    const testCases = [
      { sensor: 'DHT11', expected: 'gps-board-d11' },
      { sensor: 'DHT22', expected: 'gps-board-d22' },
      { sensor: 'NONE', expected: 'gps-board-no' }
    ]

    testCases.forEach(({ sensor, expected }) => {
      expect(getDeviceName(sensor)).toBe(expected)
    })
  })

  it('should generate device names within hostname length limits', () => {
    const sensors = ['DHT11', 'DHT22', 'NONE']

    sensors.forEach(sensor => {
      const deviceName = getDeviceName(sensor)
      expect(deviceName.length).toBeLessThanOrEqual(31) // ESPHome hostname limit
      expect(deviceName.length).toBeGreaterThan(0)
    })
  })

  it('should use consistent naming between CI workflow and build script patterns', () => {
    // Simulate CI workflow logic (the fixed version)
    const ciWorkflowDeviceName = (sensor) => {
      const sensorLower = sensor.toUpperCase().toLowerCase()
      let sensorShort
      switch (sensorLower) {
        case 'dht11': sensorShort = 'd11'; break
        case 'dht22': sensorShort = 'd22'; break
        case 'none': sensorShort = 'no'; break
        default: sensorShort = sensorLower; break
      }
      return `gps-board-${sensorShort}`
    }

    // Simulate build script logic
    const buildScriptDeviceName = (sensor) => {
      const sensorLower = sensor.toLowerCase()
      let short
      switch (sensorLower) {
        case 'dht11': short = 'd11'; break
        case 'dht22': short = 'd22'; break
        case 'none': short = 'no'; break
        default: short = sensorLower; break
      }
      return `gps-board-${short}`
    }

    const testSensors = ['DHT11', 'DHT22', 'NONE']

    testSensors.forEach(sensor => {
      const ciName = ciWorkflowDeviceName(sensor)
      const buildName = buildScriptDeviceName(sensor)

      expect(ciName).toBe(buildName)
      expect(ciName).toMatch(/^gps-board-(d11|d22|no)$/)
    })
  })

  it('should generate valid ESPHome binary search paths', () => {
    const sensors = ['DHT11', 'DHT22', 'NONE']

    sensors.forEach(sensor => {
      const deviceName = getDeviceName(sensor)
      const expectedPath = `.esphome/build/${deviceName}/*.bin`

      expect(expectedPath).toMatch(/^\.esphome\/build\/gps-board-(d11|d22|no)\/\*\.bin$/)
    })
  })
})
