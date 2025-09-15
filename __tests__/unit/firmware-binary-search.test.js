// Test to verify firmware binary naming and search logic
import { describe, it, expect } from '@jest/globals'

describe('Firmware Binary Search Debugging', () => {
  // Test the exact logic used in the GitHub workflow
  const generateDeviceName = (sensor) => {
    const sensorLower = sensor.toLowerCase()
    let sensorShort
    switch (sensorLower) {
      case 'dht11': sensorShort = 'd11'; break
      case 'dht22': sensorShort = 'd22'; break
      case 'none': sensorShort = 'no'; break
      default: sensorShort = sensorLower; break
    }
    return `gps-board-${sensorShort}`
  }

  const generateConfigName = (board, sensor) => {
    return `firmware-${board}-${sensor.toLowerCase()}.yaml`
  }

  const generateOutputName = (board, sensor) => {
    return `firmware-${board}-${sensor.toLowerCase()}`
  }

  const generateBinaryPath = (deviceName) => {
    return `.esphome/build/${deviceName}/*.bin`
  }

  it('should generate correct device names for all sensor types', () => {
    const testCases = [
      { sensor: 'DHT11', expected: 'gps-board-d11' },
      { sensor: 'DHT22', expected: 'gps-board-d22' },
      { sensor: 'NONE', expected: 'gps-board-no' }
    ]

    testCases.forEach(({ sensor, expected }) => {
      const deviceName = generateDeviceName(sensor)
      expect(deviceName).toBe(expected)
    })
  })

  it('should generate correct config names', () => {
    const board = 'nodemcu-32s'
    const testCases = [
      { sensor: 'DHT11', expected: 'firmware-nodemcu-32s-dht11.yaml' },
      { sensor: 'DHT22', expected: 'firmware-nodemcu-32s-dht22.yaml' },
      { sensor: 'NONE', expected: 'firmware-nodemcu-32s-none.yaml' }
    ]

    testCases.forEach(({ sensor, expected }) => {
      const configName = generateConfigName(board, sensor)
      expect(configName).toBe(expected)
    })
  })

  it('should generate correct output names', () => {
    const board = 'nodemcu-32s'
    const testCases = [
      { sensor: 'DHT11', expected: 'firmware-nodemcu-32s-dht11' },
      { sensor: 'DHT22', expected: 'firmware-nodemcu-32s-dht22' },
      { sensor: 'NONE', expected: 'firmware-nodemcu-32s-none' }
    ]

    testCases.forEach(({ sensor, expected }) => {
      const outputName = generateOutputName(board, sensor)
      expect(outputName).toBe(expected)
    })
  })

  it('should generate correct binary search paths', () => {
    const testCases = [
      { sensor: 'DHT11', deviceName: 'gps-board-d11', expectedPath: '.esphome/build/gps-board-d11/*.bin' },
      { sensor: 'DHT22', deviceName: 'gps-board-d22', expectedPath: '.esphome/build/gps-board-d22/*.bin' },
      { sensor: 'NONE', deviceName: 'gps-board-no', expectedPath: '.esphome/build/gps-board-no/*.bin' }
    ]

    testCases.forEach(({ sensor, deviceName, expectedPath }) => {
      const generatedDeviceName = generateDeviceName(sensor)
      expect(generatedDeviceName).toBe(deviceName)

      const binaryPath = generateBinaryPath(generatedDeviceName)
      expect(binaryPath).toBe(expectedPath)
    })
  })

  it('should match build script naming conventions', () => {
    // Simulate build script logic from scripts/build-firmware.sh
    const buildScriptDeviceName = (sensor) => {
      const sensorUpper = sensor.toUpperCase()
      let sensorShort
      switch (sensorUpper) {
        case 'DHT11': sensorShort = 'd11'; break
        case 'DHT22': sensorShort = 'd22'; break
        case 'NONE': sensorShort = 'no'; break
        default: sensorShort = sensor.toLowerCase(); break
      }
      return `gps-board-${sensorShort}`
    }

    const sensors = ['DHT11', 'DHT22', 'NONE']

    sensors.forEach(sensor => {
      const workflowName = generateDeviceName(sensor)
      const buildScriptName = buildScriptDeviceName(sensor)

      expect(workflowName).toBe(buildScriptName)
    })
  })

  it('should handle case sensitivity correctly', () => {
    const testCases = [
      { input: 'dht11', expected: 'gps-board-d11' },
      { input: 'DHT11', expected: 'gps-board-d11' },
      { input: 'Dht11', expected: 'gps-board-d11' },
      { input: 'dht22', expected: 'gps-board-d22' },
      { input: 'DHT22', expected: 'gps-board-d22' },
      { input: 'none', expected: 'gps-board-no' },
      { input: 'NONE', expected: 'gps-board-no' },
      { input: 'None', expected: 'gps-board-no' }
    ]

    testCases.forEach(({ input, expected }) => {
      const deviceName = generateDeviceName(input)
      expect(deviceName).toBe(expected)
    })
  })

  it('should maintain device name length limits', () => {
    const sensors = ['DHT11', 'DHT22', 'NONE']

    sensors.forEach(sensor => {
      const deviceName = generateDeviceName(sensor)

      // ESPHome hostname limit is 31 characters
      expect(deviceName.length).toBeLessThanOrEqual(31)
      expect(deviceName.length).toBeGreaterThan(0)

      // Should start with gps-board-
      expect(deviceName).toMatch(/^gps-board-/)
    })
  })

  it('should generate unique device names for different sensors', () => {
    const sensors = ['DHT11', 'DHT22', 'NONE']
    const deviceNames = sensors.map(sensor => generateDeviceName(sensor))

    // All device names should be unique
    const uniqueNames = new Set(deviceNames)
    expect(uniqueNames.size).toBe(sensors.length)
  })

  it('should be consistent across multiple calls', () => {
    const sensor = 'DHT11'
    const deviceName1 = generateDeviceName(sensor)
    const deviceName2 = generateDeviceName(sensor)

    expect(deviceName1).toBe(deviceName2)
    expect(deviceName1).toBe('gps-board-d11')
  })
})
