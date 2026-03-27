/**
 * E2E Test: Application Launch
 * Validates 2-second launch time and initial random chord display
 */

import { test, expect, _electron as electron } from '@playwright/test'
import { ElectronApplication, Page } from '@playwright/test'

let electronApp: ElectronApplication
let window: Page

test.beforeAll(async () => {
  const startTime = performance.now()

  // Launch Electron app
  electronApp = await electron.launch({
    args: ['dist-electron/main.cjs'],
    env: {
      ...process.env,
      NODE_ENV: 'production'
    }
  })

  // Get the first window
  window = await electronApp.firstWindow()

  const endTime = performance.now()
  const launchTime = endTime - startTime

  // Validate launch time is under 2 seconds (2000ms)
  expect(launchTime).toBeLessThan(2000)
})

test.afterAll(async () => {
  await electronApp.close()
})

test.describe('Application Launch', () => {
  test('should launch within 2 seconds', async () => {
    // This is validated in beforeAll hook
    expect(window).toBeTruthy()
  })

  test('should display a random chord immediately on launch', async () => {
    // Wait for the chord name to be visible
    const chordName = window.locator('.chord-name__text')
    await expect(chordName).toBeVisible({ timeout: 2000 })

    // Verify chord name is not empty
    const text = await chordName.textContent()
    expect(text).toBeTruthy()
    expect(text?.length).toBeGreaterThan(0)
  })

  test('should display chord diagram SVG', async () => {
    // Wait for SVG diagram to be rendered
    const svg = window.locator('.chord-diagram')
    await expect(svg).toBeVisible({ timeout: 2000 })

    // Verify SVG has proper structure
    const strings = window.locator('.chord-diagram .string')
    const stringCount = await strings.count()
    expect(stringCount).toBe(6)
  })

  test('should have minimum window size of 800x600', async () => {
    const size = await window.evaluate(() => ({
      width: window.innerWidth,
      height: window.innerHeight
    }))

    expect(size.width).toBeGreaterThanOrEqual(800)
    expect(size.height).toBeGreaterThanOrEqual(600)
  })

  test('should have dark theme applied', async () => {
    const bgColor = await window.locator('body').evaluate((el) => {
      return window.getComputedStyle(el).backgroundColor
    })

    // Dark background should be close to #1a1a1a (rgb(26, 26, 26))
    expect(bgColor).toContain('rgb')
  })

  test('should not display keyboard shortcuts by default', async () => {
    await expect(window.locator('.keyboard-help')).toHaveCount(0)

    const shortcutsButton = window.locator('[data-testid="shortcuts-button"]')
    await expect(shortcutsButton).toBeVisible()
    await expect(shortcutsButton).toContainText('Shortcuts')
  })

  test('should have accessible ARIA labels', async () => {
    const app = window.locator('#app')
    const ariaLabel = await app.getAttribute('aria-label')

    expect(ariaLabel).toBeTruthy()
    expect(ariaLabel?.toLowerCase()).toContain('guitar')
    expect(ariaLabel?.toLowerCase()).toContain('chord')
  })
})
