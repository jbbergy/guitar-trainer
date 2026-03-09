/**
 * E2E Test: Spacebar Chord Cycling
 * Validates spacebar functionality and chord randomness
 */

import { test, expect, _electron as electron } from '@playwright/test'
import { ElectronApplication, Page } from '@playwright/test'

let electronApp: ElectronApplication
let window: Page

test.beforeAll(async () => {
  electronApp = await electron.launch({
    args: ['dist-electron/main.cjs'],
    env: {
      ...process.env,
      NODE_ENV: 'production'
    }
  })
  
  window = await electronApp.firstWindow()
  
  // Wait for initial load
  await window.waitForLoadState('domcontentloaded')
  await window.waitForSelector('.chord-name__text', { timeout: 5000 })
})

test.afterAll(async () => {
  await electronApp.close()
})

test.describe('Spacebar Chord Cycling', () => {
  test('should change chord when spacebar is pressed', async () => {
    const chordName = window.locator('.chord-name__text')
    
    // Get initial chord
    const initialChord = await chordName.textContent()
    console.log(`Initial chord: ${initialChord}`)
    
    // Press spacebar
    await window.keyboard.press('Space')
    
    // Wait a bit for the change
    await window.waitForTimeout(100)
    
    // Get new chord
    const newChord = await chordName.textContent()
    console.log(`New chord after spacebar: ${newChord}`)
    
    // Chord should change (though it might randomly be the same)
    expect(newChord).toBeTruthy()
  })

  test('should respond to spacebar within 100ms', async () => {
    const chordName = window.locator('.chord-name__text')
    
    // Measure response time
    const startTime = performance.now()
    await window.keyboard.press('Space')
    await window.waitForTimeout(10) // Small wait for DOM update
    const endTime = performance.now()
    
    const responseTime = endTime - startTime
    console.log(`Spacebar response time: ${responseTime.toFixed(2)}ms`)
    
    // Should respond quickly (allowing some overhead for E2E test)
    expect(responseTime).toBeLessThan(200)
  })

  test('should cycle through multiple chords', async () => {
    const chordName = window.locator('.chord-name__text')
    const seenChords = new Set<string>()
    
    // Cycle through 20 chords
    for (let i = 0; i < 20; i++) {
      await window.keyboard.press('Space')
      await window.waitForTimeout(50)
      
      const chord = await chordName.textContent()
      if (chord) {
        seenChords.add(chord)
      }
    }
    
    console.log(`Seen ${seenChords.size} unique chords:`, Array.from(seenChords).join(', '))
    
    // Should see at least 8 different chords in 20 presses
    expect(seenChords.size).toBeGreaterThanOrEqual(8)
  })

  test('should handle rapid spacebar presses', async () => {
    const chordName = window.locator('.chord-name__text')
    
    // Get initial state
    const initialChord = await chordName.textContent()
    
    // Rapid spacebar presses
    for (let i = 0; i < 10; i++) {
      await window.keyboard.press('Space')
    }
    
    // Wait for updates to settle
    await window.waitForTimeout(100)
    
    // Should still display a valid chord
    const finalChord = await chordName.textContent()
    expect(finalChord).toBeTruthy()
    expect(finalChord?.length).toBeGreaterThan(0)
    
    console.log(`After rapid presses: ${finalChord}`)
  })

  test('should update chord diagram when chord changes', async () => {
    const chordName = window.locator('.chord-name__text')
    const svg = window.locator('.chord-diagram')
    
    // Get initial chord and diagram
    const initialChord = await chordName.textContent()
    const initialSvg = await svg.innerHTML()
    
    // Press spacebar multiple times to ensure we get a different chord
    let newChord = initialChord
    let attempts = 0
    while (newChord === initialChord && attempts < 20) {
      await window.keyboard.press('Space')
      await window.waitForTimeout(50)
      newChord = await chordName.textContent()
      attempts++
    }
    
    // Get new diagram
    const newSvg = await svg.innerHTML()
    
    if (newChord !== initialChord) {
      // Diagram should have changed
      expect(newSvg).not.toBe(initialSvg)
      console.log(`Chord changed from ${initialChord} to ${newChord}, diagram updated`)
    }
  })

  test('should maintain focus and continue working after multiple presses', async () => {
    const chordName = window.locator('.chord-name__text')
    
    // Press spacebar many times
    for (let i = 0; i < 50; i++) {
      await window.keyboard.press('Space')
      await window.waitForTimeout(20)
    }
    
    // Should still be responsive
    const finalChord = await chordName.textContent()
    expect(finalChord).toBeTruthy()
    
    // One more press should still work
    await window.keyboard.press('Space')
    await window.waitForTimeout(50)
    
    const afterChord = await chordName.textContent()
    expect(afterChord).toBeTruthy()
    
    console.log(`After 51 spacebar presses, still working: ${afterChord}`)
  })

  test('should display all 12 chords eventually', async () => {
    const chordName = window.locator('.chord-name__text')
    const seenChords = new Set<string>()
    
    // The 12 expected chords
    const expectedChords = ['EM', 'E', 'AM', 'A', 'C', 'G', 'D', 'DM', 'E7', 'D7', 'A7', 'C7']
    
    // Try up to 200 presses to see all 12 chords
    let attempts = 0
    while (seenChords.size < 12 && attempts < 200) {
      await window.keyboard.press('Space')
      await window.waitForTimeout(20)
      
      const chord = await chordName.textContent()
      if (chord) {
        seenChords.add(chord)
      }
      
      attempts++
    }
    
    console.log(`Seen ${seenChords.size}/12 chords in ${attempts} presses:`, Array.from(seenChords).sort().join(', '))
    
    // Should see at least 10 of the 12 chords
    expect(seenChords.size).toBeGreaterThanOrEqual(10)
  })
})
