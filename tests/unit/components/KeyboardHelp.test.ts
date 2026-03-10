import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import KeyboardHelp from '@/renderer/components/KeyboardHelp.vue'

describe('KeyboardHelp', () => {
    beforeEach(() => {
        document.body.innerHTML = ''
    })

    afterEach(() => {
        document.body.innerHTML = ''
    })

    it('does not render when modelValue is false', () => {
        mount(KeyboardHelp, {
            props: {
                modelValue: false
            }
        })

        expect(document.querySelector('.keyboard-help')).toBeNull()
    })

    it('renders as a dialog when modelValue is true', async () => {
        const wrapper = mount(KeyboardHelp, {
            props: {
                modelValue: true
            }
        })

        await wrapper.vm.$nextTick()

        const dialog = document.querySelector('.keyboard-help')
        expect(dialog).toBeTruthy()
        expect(dialog?.getAttribute('role')).toBe('dialog')
        expect(dialog?.getAttribute('aria-modal')).toBe('true')
    })

    it('includes the instrument shortcut in the popup', async () => {
        const wrapper = mount(KeyboardHelp, {
            props: {
                modelValue: true
            }
        })

        await wrapper.vm.$nextTick()

        const content = document.querySelector('.keyboard-help__content')
        expect(content?.textContent).toContain('Switch instrument')
        expect(content?.textContent).toContain('I')
    })

    it('emits close when clicking the overlay', async () => {
        const wrapper = mount(KeyboardHelp, {
            props: {
                modelValue: true
            }
        })

        await wrapper.vm.$nextTick()

        const overlay = document.querySelector('.keyboard-help') as HTMLDivElement
        overlay.click()
        await wrapper.vm.$nextTick()

        expect(wrapper.emitted('update:modelValue')).toBeTruthy()
        expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([false])
    })
})
