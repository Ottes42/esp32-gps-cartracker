import { describe, it, expect, beforeEach, afterEach } from '@jest/globals'
import fs from 'fs'
import path from 'path'

// Simulate the firmware binary search process to test Issue #118 fix
describe('Binary Search Simulation (Issue #118 Fix)', () => {
  const testDir = 'test-esphome-build'
  const buildDir = path.join(testDir, '.esphome', 'build')

  beforeEach(() => {
    // Create test directory structure
    fs.mkdirSync(buildDir, { recursive: true })
  })

  afterEach(() => {
    // Clean up test directory
    fs.rmSync(testDir, { recursive: true, force: true })
  })

  const createTestBinary = (deviceName, binaryName = 'firmware.bin') => {
    const deviceDir = path.join(buildDir, deviceName)
    fs.mkdirSync(deviceDir, { recursive: true })
    const binaryPath = path.join(deviceDir, binaryName)
    fs.writeFileSync(binaryPath, 'mock firmware binary data')
    return binaryPath
  }

  const searchForBinary = (hostname) => {
    const deviceDir = path.join(buildDir, hostname)

    if (!fs.existsSync(deviceDir)) {
      return null
    }

    const files = fs.readdirSync(deviceDir)
    const binFiles = files.filter(file => file.endsWith('.bin'))

    if (binFiles.length === 0) {
      return null
    }

    return path.join(deviceDir, binFiles[0])
  }

  it('should find binary with correct device name mapping (DHT11)', () => {
    // Simulate ESPHome creating build directory with correct device name
    const deviceName = 'gps-board-d11'
    const binaryPath = createTestBinary(deviceName)

    // Simulate build script looking for binary
    const foundBinary = searchForBinary(deviceName)

    expect(foundBinary).toBeTruthy()
    expect(foundBinary).toBe(binaryPath)
    expect(fs.existsSync(foundBinary)).toBe(true)
  })

  it('should find binary with correct device name mapping (DHT22)', () => {
    const deviceName = 'gps-board-d22'
    const binaryPath = createTestBinary(deviceName)

    const foundBinary = searchForBinary(deviceName)

    expect(foundBinary).toBeTruthy()
    expect(foundBinary).toBe(binaryPath)
    expect(fs.existsSync(foundBinary)).toBe(true)
  })

  it('should find binary with correct device name mapping (NONE)', () => {
    const deviceName = 'gps-board-no'
    const binaryPath = createTestBinary(deviceName)

    const foundBinary = searchForBinary(deviceName)

    expect(foundBinary).toBeTruthy()
    expect(foundBinary).toBe(binaryPath)
    expect(fs.existsSync(foundBinary)).toBe(true)
  })

  it('should return null when binary not found (wrong device name)', () => {
    // Create binary with one name
    createTestBinary('gps-board-d11')

    // Look for binary with different name (simulates the bug scenario)
    const foundBinary = searchForBinary('gps-board-wrong')

    expect(foundBinary).toBeNull()
  })

  it('should return null when device directory does not exist', () => {
    // Don't create any directories
    const foundBinary = searchForBinary('gps-board-d11')

    expect(foundBinary).toBeNull()
  })

  it('should return null when device directory exists but no binaries', () => {
    const deviceName = 'gps-board-d11'
    const deviceDir = path.join(buildDir, deviceName)
    fs.mkdirSync(deviceDir, { recursive: true })

    // Create non-binary files
    fs.writeFileSync(path.join(deviceDir, 'config.txt'), 'config data')
    fs.writeFileSync(path.join(deviceDir, 'log.txt'), 'log data')

    const foundBinary = searchForBinary(deviceName)

    expect(foundBinary).toBeNull()
  })

  it('should simulate the exact Issue #118 scenario: wrong device name prevents binary discovery', () => {
    // Scenario: ESPHome creates build directory with correct name based on YAML
    const correctDeviceName = 'gps-board-d22'
    createTestBinary(correctDeviceName)

    // But build script looks for binary with wrong name (the bug scenario)
    // This could happen if the sed pattern didn't work correctly
    const wrongDeviceName = 'gps-board-dht22' // config filename based
    const foundWithWrongName = searchForBinary(wrongDeviceName)

    // Should NOT find binary with wrong name
    expect(foundWithWrongName).toBeNull()

    // But SHOULD find binary with correct name
    const foundWithCorrectName = searchForBinary(correctDeviceName)
    expect(foundWithCorrectName).toBeTruthy()
    expect(fs.existsSync(foundWithCorrectName)).toBe(true)

    // This test proves that device name consistency is critical
  })

  it('should provide debugging information for troubleshooting', () => {
    // Create some test directories to simulate various scenarios
    createTestBinary('gps-board-d11')
    createTestBinary('gps-board-d22')
    createTestBinary('other-device')

    // Simulate debugging output generation
    const debugInfo = {
      buildDirExists: fs.existsSync(buildDir),
      availableDeviceDirs: [],
      searchedFor: 'gps-board-missing'
    }

    if (debugInfo.buildDirExists) {
      const dirs = fs.readdirSync(buildDir)
      debugInfo.availableDeviceDirs = dirs.filter(dir => {
        const dirPath = path.join(buildDir, dir)
        return fs.statSync(dirPath).isDirectory()
      })
    }

    expect(debugInfo.buildDirExists).toBe(true)
    expect(debugInfo.availableDeviceDirs).toEqual(['gps-board-d11', 'gps-board-d22', 'other-device'])
    expect(debugInfo.availableDeviceDirs).toContain('gps-board-d11')
    expect(debugInfo.availableDeviceDirs).toContain('gps-board-d22')
    expect(debugInfo.availableDeviceDirs).not.toContain('gps-board-missing')

    // This kind of debugging information is what our enhanced error messages provide
  })
})
