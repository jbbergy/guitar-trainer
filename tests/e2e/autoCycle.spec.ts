import { test, expect, _electron as electron, ElectronApplication, Page } from '@playwright/test'

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
  
  // Wait for app to be ready
  await page.waitForSelector('.app', { timeout: 10000 })
})

test.afterAll(async () => {
  await electronApp.close()
})

test.describe('Auto-Cycle Feature', () => {
  test('displays auto-cycle controls on startup', async () => {
    const controls = await page.locator('.auto-cycle-controls')
    await expect(controls).toBeVisible()
    
    const toggleButton = await page.locator('.auto-cycle-controls__toggle')
    await expect(toggleButton).toBeVisible()
    await expect(toggleButton).toContainText('Auto')
    
    const bpmInput = await page.locator('.auto-cycle-controls__bpm-input')
    await expect(bpmInput).toBeVisible()
    await expect(bpmInput).toHaveValue('60')
  })

  test('starts auto-cycle when toggle button is clicked', async () => {
    const toggleButton = await page.locator('.auto-cycle-controls__toggle')
    const initialChord = await page.locator('.chord-name__text').textContent()
    
    // Start auto-cycle
    await toggleButton.click()
    await expect(toggleButton).toContainText('Stop')
    await expect(toggleButton).toHaveClass(/auto-cycle-controls__toggle--active/)
    
    // Wait for chord to change (60 BPM = 1 chord per second)
    await page.waitForTimeout(1100)
    
    const newChord = await page.locator('.chord-name__text').textContent()
    expect(newChord).not.toBe(initialChord)
  })

  test('stops auto-cycle when toggle button is clicked again', async () => {
    const toggleButton = await page.locator('.auto-cycle-controls__toggle')
    
    // Start auto-cycle
    await toggleButton.click()
    await expect(toggleButton).toContainText('Stop')
    
    // Wait for a chord change
    await page.waitForTimeout(1100)
    
    // Stop auto-cycle
    await toggleButton.click()
    await expect(toggleButton).toContainText('Auto')
    await expect(toggleButton).not.toHaveClass(/auto-cycle-controls__toggle--active/)
    
    const chordAfterStop = await page.locator('.chord-name__text').textContent()
    
    // Wait and verify chord doesn't change
    await page.waitForTimeout(1200)
    const chordAfterWait = await page.locator('.chord-name__text').textContent()
    expect(chordAfterWait).toBe(chordAfterStop)
  })

  test('increments BPM when + button is clicked', async () => {
    const bpmInput = await page.locator('.auto-cycle-controls__bpm-input')
    const initialBpm = await bpmInput.inputValue()
    
    const incrementButton = await page.locator('.auto-cycle-controls__bpm-button').nth(1)
    await incrementButton.click()
    
    const newBpm = await bpmInput.inputValue()
    expect(parseInt(newBpm)).toBe(parseInt(initialBpm) + 5)
  })

  test('decrements BPM when - button is clicked', async () => {
    const bpmInput = await page.locator('.auto-cycle-controls__bpm-input')
    const initialBpm = await bpmInput.inputValue()
    
    const decrementButton = await page.locator('.auto-cycle-controls__bpm-button').nth(0)
    await decrementButton.click()
    
    const newBpm = await bpmInput.inputValue()
    expect(parseInt(newBpm)).toBe(parseInt(initialBpm) - 5)
  })

  test('changes chord faster when BPM is increased', async () => {
    const toggleButton = await page.locator('.auto-cycle-controls__toggle')
    const bpmInput = await page.locator('.auto-cycle-controls__bpm-input')
    
    // Set BPM to 120 (500ms per chord)
    await bpmInput.fill('120')
    await bpmInput.press('Enter')
    
    // Start auto-cycle
    await toggleButton.click()
    
    const initialChord = await page.locator('.chord-name__text').textContent()
    
    // Wait for 600ms (slightly more than one beat at 120 BPM)
    await page.waitForTimeout(600)
    
    const newChord = await page.locator('.chord-name__text').textContent()
    expect(newChord).not.toBe(initialChord)
    
    // Stop auto-cycle
    await toggleButton.click()
  })

  test('allows manual BPM input', async () => {
    const bpmInput = await page.locator('.auto-cycle-controls__bpm-input')
    
    await bpmInput.fill('90')
    await bpmInput.press('Enter')
    
    await expect(bpmInput).toHaveValue('90')
  })

  test('clamps BPM to minimum of 20', async () => {
    const bpmInput = await page.locator('.auto-cycle-controls__bpm-input')
    
    await bpmInput.fill('10')
    await bpmInput.press('Enter')
    
    await expect(bpmInput).toHaveValue('20')
  })

  test('clamps BPM to maximum of 240', async () => {
    const bpmInput = await page.locator('.auto-cycle-controls__bpm-input')
    
    await bpmInput.fill('300')
    await bpmInput.press('Enter')
    
    await expect(bpmInput).toHaveValue('240')
  })

  test('spacebar stops auto-cycle when running', async () => {
    const toggleButton = await page.locator('.auto-cycle-controls__toggle')
    
    // Start auto-cycle
    await toggleButton.click()
    await expect(toggleButton).toContainText('Stop')
    
    // Press spacebar
    await page.keyboard.press('Space')
    
    // Verify auto-cycle stopped
    await expect(toggleButton).toContainText('Auto')
    await expect(toggleButton).not.toHaveClass(/auto-cycle-controls__toggle--active/)
  })

  test('updates hint text when auto-cycle is active', async () => {
    const toggleButton = await page.locator('.auto-cycle-controls__toggle')
    const hint = await page.locator('.app__hint')
    
    // Initial hint
    await expect(hint).toContainText('for next chord')
    
    // Start auto-cycle
    await toggleButton.click()
    await expect(hint).toContainText('to pause')
    
    // Stop auto-cycle
    await toggleButton.click()
    await expect(hint).toContainText('for next chord')
  })

  test('disables BPM controls visually when auto-cycle is off', async () => {
    const toggleButton = await page.locator('.auto-cycle-controls__toggle')
    const bpmSection = await page.locator('.auto-cycle-controls__bpm')
    
    // Ensure auto-cycle is off
    const isActive = await toggleButton.evaluate(el => el.classList.contains('auto-cycle-controls__toggle--active'))
    if (isActive) {
      await toggleButton.click()
    }
    
    // BPM section should have disabled class
    await expect(bpmSection).toHaveClass(/auto-cycle-controls__bpm--disabled/)
  })

  test('works with keyboard shortcuts in library view', async () => {
    const toggleButton = await page.locator('.auto-cycle-controls__toggle')
    
    // Start auto-cycle
    await toggleButton.click()
    
    // Open library with L key
    await page.keyboard.press('l')
    
    const library = await page.locator('.chord-library')
    await expect(library).toBeVisible()
    
    // Auto-cycle should still be running
    await expect(toggleButton).toContainText('Stop')
    
    // Close library with Escape
    await page.keyboard.press('Escape')
    await expect(library).not.toBeVisible()
    
    // Stop auto-cycle
    await toggleButton.click()
  })
})
