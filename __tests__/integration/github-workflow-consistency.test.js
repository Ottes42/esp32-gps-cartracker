import { describe, it, expect, beforeAll, afterAll } from '@jest/globals'
import fs from 'fs'
import { spawn } from 'child_process'

/**
 * Test consistency between build script device naming and GitHub workflow device naming
 * This prevents the issue where binaries are built with one device name but searched with another
 */
describe('GitHub Workflow Consistency', () => {
  const TEMP_SECRETS_PATH = 'firmware/secrets.yaml.test'

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
      (file.startsWith('firmware-') && file.endsWith('.yaml')) ||
      (file.startsWith('test-') && file.endsWith('.yaml'))
    )
    generatedFiles.forEach(file => {
      try {
        fs.unlinkSync(file)
      } catch (e) {
        // Ignore cleanup errors
      }
    })
  })

  /**
   * Helper function to get device name using GitHub workflow logic
   */
  function getGitHubWorkflowDeviceName (sensor) {
    let sensorShort
    switch (sensor.toLowerCase()) {
      case 'dht11': sensorShort = 'd11'; break
      case 'dht22': sensorShort = 'd22'; break
      case 'none': sensorShort = 'no'; break
      default: sensorShort = sensor.toLowerCase(); break
    }
    return `gps-board-${sensorShort}`
  }

  /**
   * Helper function to get device name from build script validation output
   */
  async function getBuildScriptDeviceName (board, sensor) {
    return new Promise((resolve, reject) => {
      const child = spawn('./scripts/build-firmware.sh', ['validate', board, sensor], {
        env: { ...process.env, KEEP_CONFIG: '0' }
      })

      let stdout = ''
      let stderr = ''

      child.stdout.on('data', (data) => {
        stdout += data.toString()
      })

      child.stderr.on('data', (data) => {
        stderr += data.toString()
      })

      child.on('close', (code) => {
        if (code === 0) {
          // Extract device name from output like "Device name: gps-board-d11"
          const match = stdout.match(/Device name:\s+([^\s\n]+)/)
          if (match) {
            resolve(match[1])
          } else {
            reject(new Error(`Could not extract device name from output: ${stdout}`))
          }
        } else {
          reject(new Error(`Build script failed with code ${code}: ${stderr}`))
        }
      })

      child.on('error', (error) => {
        reject(error)
      })
    })
  }

  describe('Device Name Consistency', () => {
    const testCases = [
      { board: 'nodemcu-32s', sensor: 'DHT11' },
      { board: 'nodemcu-32s', sensor: 'DHT22' },
      { board: 'nodemcu-32s', sensor: 'NONE' },
      { board: 'esp32dev', sensor: 'DHT11' },
      { board: 'esp32dev', sensor: 'DHT22' },
      { board: 'esp32dev', sensor: 'NONE' }
    ]

    testCases.forEach(({ board, sensor }) => {
      it(`should generate consistent device names for ${board} with ${sensor} sensor`, async () => {
        const githubDeviceName = getGitHubWorkflowDeviceName(sensor)
        const buildScriptDeviceName = await getBuildScriptDeviceName(board, sensor)

        expect(buildScriptDeviceName).toBe(githubDeviceName)
      }, 10000) // 10 second timeout for build script execution
    })
  })

  describe('Config File Device Name Setting', () => {
    it('should correctly set device name in config file using GitHub workflow logic', () => {
      const board = 'nodemcu-32s'
      const sensor = 'DHT22'
      const configName = `test-github-workflow-${board}-${sensor.toLowerCase()}.yaml`

      // Copy base config
      fs.copyFileSync('firmware/firmware.yaml', configName)

      // Apply GitHub workflow logic (with the FIXED sed pattern)
      const deviceName = getGitHubWorkflowDeviceName(sensor)

      // Read original content to verify the starting state
      let configContent = fs.readFileSync(configName, 'utf8')
      expect(configContent).toContain('  name: gps-board-d11') // Original name

      // Apply the corrected sed pattern (simulating the GitHub workflow fix)
      configContent = configContent.replace(/^(\s*)name: gps-board-.*/m, `$1name: ${deviceName}`)
      fs.writeFileSync(configName, configContent)

      // Verify the device name was correctly updated
      const updatedContent = fs.readFileSync(configName, 'utf8')
      expect(updatedContent).toContain(`  name: ${deviceName}`)
      expect(updatedContent).toContain('  name: gps-board-d22') // Expected for DHT22
      expect(updatedContent).not.toContain('  name: gps-board-d11') // Should be replaced

      // Clean up
      fs.unlinkSync(configName)
    })
  })

  describe('Binary Search Path Consistency', () => {
    it('should use consistent binary search paths', () => {
      const sensors = ['DHT11', 'DHT22', 'NONE']
      const expectedPaths = ['gps-board-d11', 'gps-board-d22', 'gps-board-no']

      sensors.forEach((sensor, index) => {
        const deviceName = getGitHubWorkflowDeviceName(sensor)
        const expectedPath = `.esphome/build/${deviceName}/*.bin`
        const expectedDeviceName = expectedPaths[index]

        expect(deviceName).toBe(expectedDeviceName)
        expect(expectedPath).toBe(`.esphome/build/${expectedDeviceName}/*.bin`)
      })
    })
  })
})
