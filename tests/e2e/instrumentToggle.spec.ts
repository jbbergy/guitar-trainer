/**
 * E2E tests for instrument switching between guitar and ukulele.
 */

import { test, expect, _electron as electron } from '@playwright/test'

test.describe('Instrument Toggle', () => {
    test('switches diagram from 6 to 4 strings and back', async () => {
        const electronApp = await electron.launch({
            args: ['.'],
            env: { ...process.env, NODE_ENV: 'test' }
        })

        const window = await electronApp.firstWindow()
        await window.waitForLoadState('domcontentloaded')

        const toggle = window.locator('[data-testid="instrument-toggle"]')
        await expect(toggle).toBeVisible()

        const guitarBtn = toggle.locator('button').nth(0)
        const ukuleleBtn = toggle.locator('button').nth(1)

        // Guitar active by default
        await expect(guitarBtn).toHaveAttribute('aria-pressed', 'true')
        await expect(window.locator('.chord-diagram .string')).toHaveCount(6)

        // Switch to Ukulele
        await ukuleleBtn.click()
        await expect(ukuleleBtn).toHaveAttribute('aria-pressed', 'true')
        await expect(window.locator('.chord-diagram .string')).toHaveCount(4)

        // Switch back to Guitar
        await guitarBtn.click()
        await expect(guitarBtn).toHaveAttribute('aria-pressed', 'true')
        await expect(window.locator('.chord-diagram .string')).toHaveCount(6)

        await electronApp.close()
    })

    test('updates chord library to selected instrument', async () => {
        const electronApp = await electron.launch({
            args: ['.'],
            env: { ...process.env, NODE_ENV: 'test' }
        })

        const window = await electronApp.firstWindow()
        await window.waitForLoadState('domcontentloaded')

        const toggle = window.locator('[data-testid="instrument-toggle"]')
        // Click the Ukulele button directly
        await toggle.locator('button').nth(1).click()

        const libraryButton = window.locator('.app__library-button')
        await libraryButton.click()

        await expect(window.locator('.chord-library__title')).toHaveText('Ukulele Chords')
        await expect(window.locator('.chord-library__item')).toHaveCount(21)

        await window.locator('.chord-library__close').click()
        await expect(window.locator('.chord-library-overlay')).not.toBeVisible()

        await electronApp.close()
    })

    test('switches instrument with the I keyboard shortcut', async () => {
        const electronApp = await electron.launch({
            args: ['.'],
            env: { ...process.env, NODE_ENV: 'test' }
        })

        const window = await electronApp.firstWindow()
        await window.waitForLoadState('domcontentloaded')

        const toggle = window.locator('[data-testid="instrument-toggle"]')
        await expect(toggle.locator('button').nth(0)).toHaveAttribute('aria-pressed', 'true')

        await window.keyboard.press('i')
        await expect(toggle.locator('button').nth(1)).toHaveAttribute('aria-pressed', 'true')

        await window.keyboard.press('i')
        await expect(toggle.locator('button').nth(2)).toHaveAttribute('aria-pressed', 'true')

        await electronApp.close()
    })
})
