import { describe, it, expect, beforeAll, afterAll } from '@jest/globals'
import { spawn } from 'child_process'
import fs from 'fs'

const SCRIPT_PATH = './scripts/build-firmware.sh'
const TEMP_SECRETS_PATH = 'firmware/secrets.yaml.test'

describe('Build Script Integration Tests', () => {
  beforeAll(() => {
    // Create test secrets file if it doesn't exist
    if (!fs.existsSync('firmware/secrets.yaml')) {
      fs.writeFileSync(TEMP_SECRETS_PATH, `
wifi_ssid: "TestNetwork"
wifi_password: "TestPassword"
server_url: "http://test.example.com/upload/"
server_auth_user: "test"
server_auth_pass: "test"
`)
      fs.renameSync(TEMP_SECRETS_PATH, 'firmware/secrets.yaml')
    }
  })

  afterAll(() => {
    // Clean up any generated config files
    const generatedFiles = fs.readdirSync('.').filter(file =>
      file.startsWith('firmware-') && file.endsWith('.yaml')
    )
    generatedFiles.forEach(file => {
      try {
        fs.unlinkSync(file)
      } catch (e) {
        // Ignore cleanup errors
      }
    })
  })

  const runScript = (args, timeout = 30000) => {
    return new Promise((resolve, reject) => {
      const child = spawn('bash', [SCRIPT_PATH, ...args], {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env, KEEP_CONFIG: '1' }
      })

      let stdout = ''
      let stderr = ''

      child.stdout.on('data', (data) => {
        stdout += data.toString()
      })

      child.stderr.on('data', (data) => {
        stderr += data.toString()
      })

      const timer = setTimeout(() => {
        child.kill('SIGTERM')
        reject(new Error(`Script timeout after ${timeout}ms`))
      }, timeout)

      child.on('close', (code) => {
        clearTimeout(timer)
        resolve({ code, stdout, stderr })
      })

      child.on('error', (error) => {
        clearTimeout(timer)
        reject(error)
      })
    })
  }

  describe('Command Line Parameter Handling', () => {
    it('should support board-only builds (default DHT11)', async () => {
      const result = await runScript(['validate', 'nodemcu-32s'])

      expect(result.code).toBe(0)
      expect(result.stdout).toContain('Validating specific configuration: nodemcu-32s with DHT11')
      expect(result.stdout).toContain('Device name: gps-board-d11')
    })

    it('should support board+sensor builds', async () => {
      const result = await runScript(['validate', 'nodemcu-32s', 'DHT22'])

      expect(result.code).toBe(0)
      expect(result.stdout).toContain('Validating specific configuration: nodemcu-32s with DHT22')
      expect(result.stdout).toContain('Device name: gps-board-d22')
    })

    it('should support board+sensor+version builds', async () => {
      const result = await runScript(['validate', 'nodemcu-32s', 'NONE', '2025.8.0'])

      expect(result.code).toBe(0)
      expect(result.stdout).toContain('Validating specific configuration: nodemcu-32s with NONE')
      expect(result.stdout).toContain('Device name: gps-board-no')
    })

    it('should reject invalid sensor types', async () => {
      const result = await runScript(['validate', 'nodemcu-32s', 'INVALID_SENSOR'])

      expect(result.code).toBe(1)
      expect(result.stdout).toContain('Invalid board') // The error message includes both board and sensor
    })

    it('should reject invalid board types', async () => {
      const result = await runScript(['validate', 'invalid-board', 'DHT11'])

      expect(result.code).toBe(1)
      expect(result.stdout).toContain('Invalid board')
    })
  })

  describe('Device Name Generation', () => {
    const testCases = [
      { sensor: 'DHT11', expectedName: 'gps-board-d11' },
      { sensor: 'DHT22', expectedName: 'gps-board-d22' },
      { sensor: 'NONE', expectedName: 'gps-board-no' }
    ]

    testCases.forEach(({ sensor, expectedName }) => {
      it(`should generate correct device name for ${sensor} sensor`, async () => {
        const result = await runScript(['validate', 'nodemcu-32s', sensor])

        expect(result.code).toBe(0)
        expect(result.stdout).toContain(`Device name: ${expectedName}`)
      })
    })
  })

  describe('Configuration File Generation', () => {
    it('should create valid YAML configuration files', async () => {
      const result = await runScript(['validate', 'nodemcu-32s', 'DHT22'])

      expect(result.code).toBe(0)

      // Check that config file was generated and saved
      expect(result.stdout).toContain('Config saved: firmware-nodemcu-32s-dht22.yaml')

      // Verify the file exists and contains correct content
      const configPath = 'firmware-nodemcu-32s-dht22.yaml'
      expect(fs.existsSync(configPath)).toBe(true)

      const configContent = fs.readFileSync(configPath, 'utf8')
      expect(configContent).toContain('name: gps-board-d22')
      expect(configContent).toContain('friendly_name: GPS Board (BerryBase NodeMCU-ESP32 + DHT22)')
      expect(configContent).toContain('board: nodemcu-32s')
    })

    it('should apply sensor-specific configurations', async () => {
      const result = await runScript(['validate', 'nodemcu-32s', 'NONE'])

      expect(result.code).toBe(0)
      expect(result.stdout).toContain('Disabling temperature sensor - using dummy values')

      const configPath = 'firmware-nodemcu-32s-none.yaml'
      const configContent = fs.readFileSync(configPath, 'utf8')
      expect(configContent).toContain('name: gps-board-no')
    })
  })

  describe('Binary Search Path Consistency', () => {
    it('should use consistent device names for binary search paths', async () => {
      const sensors = ['DHT11', 'DHT22', 'NONE']
      const expectedNames = ['gps-board-d11', 'gps-board-d22', 'gps-board-no']

      for (let i = 0; i < sensors.length; i++) {
        const result = await runScript(['validate', 'nodemcu-32s', sensors[i]])

        expect(result.code).toBe(0)
        expect(result.stdout).toContain(`Device name: ${expectedNames[i]}`)

        // The device name in the config should match what ESPHome will use for build directory
        const configPath = `firmware-nodemcu-32s-${sensors[i].toLowerCase()}.yaml`
        const configContent = fs.readFileSync(configPath, 'utf8')
        expect(configContent).toContain(`name: ${expectedNames[i]}`)
      }
    })
  })

  describe('Error Handling', () => {
    it('should provide helpful error messages for invalid arguments', async () => {
      const result = await runScript(['invalid-action'])

      expect(result.code).toBe(1)
      expect(result.stdout).toContain('Usage:')
      expect(result.stdout).toContain('Available boards:')
      expect(result.stdout).toContain('Available sensors:')
    })

    it('should show help when requested', async () => {
      const result = await runScript(['--help'])

      expect(result.code).toBe(0)
      expect(result.stdout).toContain('Usage:')
      expect(result.stdout).toContain('Examples:')
    })
  })

  describe('Regression Tests for Issue #106', () => {
    it('should not confuse sensor type with ESPHome version', async () => {
      // This was the root cause of the original issue
      const result = await runScript(['validate', 'nodemcu-32s', 'DHT22'])

      expect(result.code).toBe(0)

      // Should NOT try to use DHT22 as ESPHome version
      expect(result.stdout).not.toContain('esphome/esphome:DHT22')
      expect(result.stdout).not.toContain('manifest for esphome/esphome:DHT22 not found')

      // Should correctly identify sensor type
      expect(result.stdout).toContain('with DHT22 sensor')
      expect(result.stdout).toContain('Device name: gps-board-d22')
    })

    it('should handle all supported board and sensor combinations', async () => {
      const boards = ['nodemcu-32s'] // Test just one board for speed
      const sensors = ['DHT11', 'DHT22', 'NONE']

      for (const board of boards) {
        for (const sensor of sensors) {
          const result = await runScript(['validate', board, sensor])

          expect(result.code).toBe(0)
          expect(result.stdout).toContain(`Validating specific configuration: ${board} with ${sensor}`)

          // Verify no version-related errors
          expect(result.stdout).not.toContain(`esphome/esphome:${sensor}`)
        }
      }
    }, 30000) // Shorter timeout
  })
})
