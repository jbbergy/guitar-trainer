/**
 * Unit tests for ChordLibrary component
 * Tests:
 * - Renders all chords from CHORDS data
 * - Shows/hides based on modelValue prop
 * - Emits update:modelValue when closed
 * - Displays chord names correctly
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import ChordLibrary from '@/renderer/components/ChordLibrary.vue'
import { CHORDS } from '@/data/chords'

describe('ChordLibrary', () => {
  let container: HTMLDivElement

  beforeEach(() => {
    // Create a container for teleport
    container = document.createElement('div')
    container.id = 'modal-root'
    document.body.appendChild(container)
  })

  afterEach(() => {
    // Clean up
    document.body.innerHTML = ''
  })

  it('renders when modelValue is true', async () => {
    const wrapper = mount(ChordLibrary, {
      props: {
        modelValue: true
      }
    })

    await wrapper.vm.$nextTick()
    
    // Find in document body since it uses Teleport
    const overlay = document.querySelector('.chord-library-overlay')
    expect(overlay).toBeTruthy()
    
    const library = document.querySelector('.chord-library')
    expect(library).toBeTruthy()
    
    wrapper.unmount()
  })

  it('does not render when modelValue is false', () => {
    const wrapper = mount(ChordLibrary, {
      props: {
        modelValue: false
      }
    })

    const overlay = document.querySelector('.chord-library-overlay')
    expect(overlay).toBeNull()
    
    wrapper.unmount()
  })

  it('displays all available chords', async () => {
    const wrapper = mount(ChordLibrary, {
      props: {
        modelValue: true
      }
    })

    await wrapper.vm.$nextTick()
    
    const chordItems = document.querySelectorAll('.chord-library__item')
    expect(chordItems.length).toBe(CHORDS.length)
    
    wrapper.unmount()
  })

  it('displays chord names correctly', async () => {
    const wrapper = mount(ChordLibrary, {
      props: {
        modelValue: true
      }
    })

    await wrapper.vm.$nextTick()
    
    const chordNames = document.querySelectorAll('.chord-library__chord-name')
    const expectedNames = CHORDS.map(chord => chord.name)
    
    chordNames.forEach((nameElement, index) => {
      expect(nameElement.textContent?.trim()).toBe(expectedNames[index])
    })
    
    wrapper.unmount()
  })

  it('emits update:modelValue with false when close button is clicked', async () => {
    const wrapper = mount(ChordLibrary, {
      props: {
        modelValue: true
      }
    })

    await wrapper.vm.$nextTick()
    
    const closeButton = document.querySelector('.chord-library__close') as HTMLButtonElement
    expect(closeButton).toBeTruthy()
    
    closeButton?.click()
    await wrapper.vm.$nextTick()

    expect(wrapper.emitted('update:modelValue')).toBeTruthy()
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([false])
    
    wrapper.unmount()
  })

  it('emits update:modelValue when clicking overlay background', async () => {
    const wrapper = mount(ChordLibrary, {
      props: {
        modelValue: true
      }
    })

    await wrapper.vm.$nextTick()
    
    const overlay = document.querySelector('.chord-library-overlay') as HTMLDivElement
    expect(overlay).toBeTruthy()
    
    // Simulate click on overlay (not on child elements)
    const event = new MouseEvent('click', { bubbles: true })
    Object.defineProperty(event, 'target', { value: overlay, enumerable: true })
    overlay?.dispatchEvent(event)
    await wrapper.vm.$nextTick()

    expect(wrapper.emitted('update:modelValue')).toBeTruthy()
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([false])
    
    wrapper.unmount()
  })

  it('has proper accessibility attributes', async () => {
    const wrapper = mount(ChordLibrary, {
      props: {
        modelValue: true
      }
    })

    await wrapper.vm.$nextTick()
    
    const overlay = document.querySelector('.chord-library-overlay')
    expect(overlay).toBeTruthy()
    expect(overlay?.getAttribute('role')).toBe('dialog')
    expect(overlay?.getAttribute('aria-modal')).toBe('true')
    expect(overlay?.getAttribute('aria-labelledby')).toBe('chord-library-title')

    const title = document.querySelector('#chord-library-title')
    expect(title).toBeTruthy()

    const closeButton = document.querySelector('.chord-library__close')
    expect(closeButton?.getAttribute('aria-label')).toBe('Close chord library')
    
    wrapper.unmount()
  })

  it('displays title correctly', async () => {
    const wrapper = mount(ChordLibrary, {
      props: {
        modelValue: true
      }
    })

    await wrapper.vm.$nextTick()
    
    const title = document.querySelector('.chord-library__title')
    expect(title?.textContent?.trim()).toBe('Available Chords')
    
    wrapper.unmount()
  })
})
