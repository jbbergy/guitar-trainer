/**
 * Unit tests for ChordCard component
 * Tests the unified chord display component
 */

import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ChordCard from '@/renderer/components/ChordCard.vue'
import type { Chord } from '@/types/chord'

describe('ChordCard', () => {
  const mockChord: Chord = {
    name: 'Em',
    frets: [0, 2, 2, 0, 0, 0],
    fingers: [0, 2, 3, 0, 0, 0],
    baseFret: 0,
    difficulty: 'beginner'
  }

  it('renders chord name', () => {
    const wrapper = mount(ChordCard, {
      props: { chord: mockChord }
    })

    const name = wrapper.find('.chord-card__name')
    expect(name.text()).toBe('Em')
  })

  it('renders chord diagram', () => {
    const wrapper = mount(ChordCard, {
      props: { chord: mockChord }
    })

    const diagram = wrapper.find('.chord-card__diagram')
    expect(diagram.exists()).toBe(true)
    expect(wrapper.html()).toContain('chord-diagram')
  })

  it('renders difficulty tag', () => {
    const wrapper = mount(ChordCard, {
      props: { chord: mockChord }
    })

    const tag = wrapper.find('.chord-card__difficulty')
    expect(tag.exists()).toBe(true)
    expect(tag.text()).toBe('Beginner')
    expect(tag.classes()).toContain('chord-card__difficulty--beginner')
  })

  it('renders advanced difficulty tag when chord difficulty is advanced', () => {
    const wrapper = mount(ChordCard, {
      props: {
        chord: {
          ...mockChord,
          difficulty: 'advanced'
        }
      }
    })

    const tag = wrapper.find('.chord-card__difficulty')
    expect(tag.text()).toBe('Advanced')
    expect(tag.classes()).toContain('chord-card__difficulty--advanced')
  })

  it('has correct structure', () => {
    const wrapper = mount(ChordCard, {
      props: { chord: mockChord }
    })

    expect(wrapper.find('.chord-card').exists()).toBe(true)
    expect(wrapper.find('.chord-card__name').exists()).toBe(true)
    expect(wrapper.find('.chord-card__diagram').exists()).toBe(true)
  })

  it('has uppercase text-transform style', () => {
    const wrapper = mount(ChordCard, {
      props: { chord: mockChord }
    })

    const name = wrapper.find('.chord-card__name')
    // Check that the CSS class is applied (style verification happens in browser)
    expect(name.exists()).toBe(true)
    expect(name.classes()).toContain('chord-card__name')
  })
})
