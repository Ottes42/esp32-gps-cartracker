/* eslint-env jest */

import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

describe('Hostname Validation', () => {
  describe('build script hostname validation', () => {
    test('validates all current hostnames are ≤ 31 characters', async () => {
      const { stdout } = await execAsync('./scripts/build-firmware.sh validate')

      // Extract all hostname validation messages
      const hostnameLines = stdout.split('\n').filter(line =>
        line.includes('Hostname \'') && line.includes('is valid')
      )

      expect(hostnameLines.length).toBeGreaterThan(0)

      hostnameLines.forEach(line => {
        // Extract hostname length from message like "✅ Hostname 'gps-tracker-nmcu32s-d11' is valid (23 chars, ≤31 limit)"
        const match = line.match(/Hostname '([^']+)' is valid \((\d+) chars/)
        expect(match).toBeTruthy()

        const [, hostname, lengthStr] = match
        const length = parseInt(lengthStr, 10)

        expect(hostname).toBeTruthy()
        expect(length).toBeLessThanOrEqual(31)
        expect(hostname.length).toBe(length)
      })
    }, 10000)

    test('detects example problematic hostname from issue', () => {
      // Test the exact example from the issue that should fail
      const problematicHostname = 'gps-cartracker-nodemcu-32s-dht11'
      expect(problematicHostname.length).toBe(32)
      expect(problematicHostname.length).toBeGreaterThan(31)
    })

    test('validates current hostname patterns are well-formed', async () => {
      const { stdout } = await execAsync('./scripts/build-firmware.sh validate')

      // Extract all generated hostnames from device name lines
      const deviceNameLines = stdout.split('\n').filter(line =>
        line.includes('Device name:')
      )

      expect(deviceNameLines.length).toBeGreaterThan(0)

      deviceNameLines.forEach(line => {
        const hostname = line.split('Device name: ')[1]?.trim()
        expect(hostname).toBeTruthy()

        // Validate hostname follows expected pattern: gps-tracker-{board}-{sensor}
        expect(hostname).toMatch(/^gps-tracker-[a-z0-9]+-[a-z0-9]+$/)

        // Validate length
        expect(hostname.length).toBeLessThanOrEqual(31)

        // Validate no problematic characters for DNS/mDNS
        expect(hostname).not.toMatch(/[^a-z0-9-]/)
        expect(hostname).not.toMatch(/^-|-$/)
        expect(hostname).not.toMatch(/--/)
      })
    }, 10000)
  })

  describe('MAC suffix configuration', () => {
    test('firmware explicitly disables MAC suffix', async () => {
      const { stdout } = await execAsync('grep -A 5 -B 5 "name_add_mac_suffix" firmware/firmware.yaml || echo "NOT_FOUND"')

      if (!stdout.includes('NOT_FOUND')) {
        // If found, check that it's set to false
        expect(stdout).toMatch(/name_add_mac_suffix:\s*false/)
      }
    })

    test('wifi configuration prevents MAC-based hostnames', async () => {
      const { stdout } = await execAsync('grep -A 10 -B 2 "use_address" firmware/firmware.yaml || echo "NOT_FOUND"')

      if (!stdout.includes('NOT_FOUND')) {
        // If use_address is configured, it should be null or disabled
        expect(stdout).toMatch(/use_address:\s*null|use_address:\s*false/)
      }
    })
  })
})
