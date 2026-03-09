/**
 * E2E tests for Chord Library feature
 * Tests the chord library panel functionality
 */

import { test, expect, _electron as electron } from '@playwright/test'
import path from 'path'

test.describe('Chord Library', () => {
  test('opens and closes chord library with button click', async () => {
    const electronApp = await electron.launch({
      args: [path.join(__dirname, '../../dist-electron/main.cjs')],
      env: { ...process.env, NODE_ENV: 'test' }
    })

    const window = await electronApp.firstWindow()
    await window.waitForLoadState('domcontentloaded')
    
    // Verify library is not visible initially
    const libraryOverlay = window.locator('.chord-library-overlay')
    await expect(libraryOverlay).not.toBeVisible()

    // Click the library button
    const libraryButton = window.locator('.app__library-button')
    await expect(libraryButton).toBeVisible()
    await libraryButton.click()

    // Verify library opens
    await expect(libraryOverlay).toBeVisible()
    
    // Verify title is displayed
    const title = window.locator('.chord-library__title')
    await expect(title).toHaveText('Available Chords')

    // Verify all 12 chords are displayed
    const chordItems = window.locator('.chord-library__item')
    await expect(chordItems).toHaveCount(12)

    // Close library with close button
    const closeButton = window.locator('.chord-library__close')
    await closeButton.click()

    // Verify library is closed
    await expect(libraryOverlay).not.toBeVisible()

    await electronApp.close()
  })

  test('opens and closes chord library with L key', async () => {
    const electronApp = await electron.launch({
      args: [path.join(__dirname, '../../dist-electron/main.cjs')],
      env: { ...process.env, NODE_ENV: 'test' }
    })

    const window = await electronApp.firstWindow()
    await window.waitForLoadState('domcontentloaded')
    
    const libraryOverlay = window.locator('.chord-library-overlay')
    
    // Open with L key
    await window.keyboard.press('l')
    await expect(libraryOverlay).toBeVisible()

    // Close with L key again (toggle)
    await window.keyboard.press('l')
    await expect(libraryOverlay).not.toBeVisible()

    await electronApp.close()
  })

  test('closes chord library with Escape key', async () => {
    const electronApp = await electron.launch({
      args: [path.join(__dirname, '../../dist-electron/main.cjs')],
      env: { ...process.env, NODE_ENV: 'test' }
    })

    const window = await electronApp.firstWindow()
    await window.waitForLoadState('domcontentloaded')
    
    const libraryOverlay = window.locator('.chord-library-overlay')
    
    // Open with L key
    await window.keyboard.press('l')
    await expect(libraryOverlay).toBeVisible()

    // Close with Escape
    await window.keyboard.press('Escape')
    await expect(libraryOverlay).not.toBeVisible()

    await electronApp.close()
  })

  test('closes chord library when clicking overlay background', async () => {
    const electronApp = await electron.launch({
      args: [path.join(__dirname, '../../dist-electron/main.cjs')],
      env: { ...process.env, NODE_ENV: 'test' }
    })

    const window = await electronApp.firstWindow()
    await window.waitForLoadState('domcontentloaded')
    
    const libraryOverlay = window.locator('.chord-library-overlay')
    
    // Open library
    await window.keyboard.press('l')
    await expect(libraryOverlay).toBeVisible()

    // Click on overlay (not on the modal content)
    await libraryOverlay.click({ position: { x: 10, y: 10 } })
    
    // Verify library is closed
    await expect(libraryOverlay).not.toBeVisible()

    await electronApp.close()
  })

  test('displays all chord names correctly', async () => {
    const electronApp = await electron.launch({
      args: [path.join(__dirname, '../../dist-electron/main.cjs')],
      env: { ...process.env, NODE_ENV: 'test' }
    })

    const window = await electronApp.firstWindow()
    await window.waitForLoadState('domcontentloaded')
    
    // Open library
    await window.keyboard.press('l')

    // Expected chord names
    const expectedChords = ['Em', 'E', 'Am', 'A', 'C', 'G', 'D', 'Dm', 'E7', 'D7', 'A7', 'C7']

    // Verify each chord name is present
    for (const chordName of expectedChords) {
      const chordElement = window.locator('.chord-library__chord-name', { hasText: chordName })
      await expect(chordElement).toBeVisible()
    }

    await electronApp.close()
  })

  test('library button has correct accessibility attributes', async () => {
    const electronApp = await electron.launch({
      args: [path.join(__dirname, '../../dist-electron/main.cjs')],
      env: { ...process.env, NODE_ENV: 'test' }
    })

    const window = await electronApp.firstWindow()
    await window.waitForLoadState('domcontentloaded')
    
    const libraryButton = window.locator('.app__library-button')
    
    // Check aria-label
    await expect(libraryButton).toHaveAttribute('aria-label', 'Show chord library')
    
    // Check title
    await expect(libraryButton).toHaveAttribute('title', 'Show all chords')

    await electronApp.close()
  })
})
