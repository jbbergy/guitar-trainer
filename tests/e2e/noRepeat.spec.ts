/**
 * E2E Test: No Repeat Chord
 * Verifies that the same chord cannot appear twice in a row
 */

import { test, expect, _electron as electron } from '@playwright/test'
import { ElectronApplication, Page } from '@playwright/test'

test.describe('No Repeat Chord', () => {
  let electronApp: ElectronApplication
  let page: Page

  test.beforeAll(async () => {
    electronApp = await electron.launch({
      args: ['.'],
      env: {
        ...process.env,
        NODE_ENV: 'test'
      }
    })
    page = await electronApp.firstWindow()
    await page.waitForLoadState('domcontentloaded')
  })

  test.afterAll(async () => {
    await electronApp.close()
  })

  test('should not show the same chord twice in a row when pressing spacebar', async () => {
    // Get initial chord
    const initialChordName = await page.locator('.chord-name').textContent()
    expect(initialChordName).toBeTruthy()

    // Press spacebar multiple times and verify chord changes each time
    for (let i = 0; i < 10; i++) {
      const previousChord = await page.locator('.chord-name').textContent()
      
      // Press spacebar
      await page.keyboard.press('Space')
      await page.waitForTimeout(50) // Small delay for state update
      
      const newChord = await page.locator('.chord-name').textContent()
      
      // Verify the chord is different
      expect(newChord).not.toBe(previousChord)
    }
  })

  test('should not show the same chord twice in a row with auto-cycle', async () => {
    // Enable auto-cycle at high speed (240 BPM)
    await page.locator('[data-testid="auto-cycle-toggle"]').click()
    
    // Set to maximum BPM for faster testing
    const bpmInput = page.locator('[data-testid="bpm-input"]')
    await bpmInput.fill('240')
    
    // Wait for auto-cycle to start
    await page.waitForTimeout(100)
    
    // Monitor chord changes for several cycles
    const chordHistory: string[] = []
    const iterations = 15
    
    for (let i = 0; i < iterations; i++) {
      const chordName = await page.locator('.chord-name').textContent()
      chordHistory.push(chordName || '')
      await page.waitForTimeout(250) // 240 BPM = ~250ms per beat
    }
    
    // Verify no consecutive duplicates
    for (let i = 1; i < chordHistory.length; i++) {
      expect(chordHistory[i]).not.toBe(chordHistory[i - 1])
    }
    
    // Disable auto-cycle
    await page.locator('[data-testid="auto-cycle-toggle"]').click()
  })

  test('should not repeat when switching between manual and auto-cycle', async () => {
    // Get current chord
    const chord1 = await page.locator('.chord-name').textContent()
    
    // Press spacebar (manual)
    await page.keyboard.press('Space')
    await page.waitForTimeout(50)
    const chord2 = await page.locator('.chord-name').textContent()
    expect(chord2).not.toBe(chord1)
    
    // Enable auto-cycle
    await page.locator('[data-testid="auto-cycle-toggle"]').click()
    await page.waitForTimeout(300)
    const chord3 = await page.locator('.chord-name').textContent()
    expect(chord3).not.toBe(chord2)
    
    // Disable auto-cycle
    await page.locator('[data-testid="auto-cycle-toggle"]').click()
    
    // Press spacebar again
    await page.keyboard.press('Space')
    await page.waitForTimeout(50)
    const chord4 = await page.locator('.chord-name').textContent()
    expect(chord4).not.toBe(chord3)
  })
})
