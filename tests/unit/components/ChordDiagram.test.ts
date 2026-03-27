/**
 * ChordDiagram Component Tests
 * Validates SVG rendering for all 12 chords with correct structure
 */

import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ChordDiagram from '@/renderer/components/ChordDiagram.vue'
import { CHORDS, UKULELE_CHORDS } from '@/data/chords'

describe('ChordDiagram.vue', () => {
  describe('Basic Structure', () => {
    it('should render SVG element with correct viewBox', () => {
      const wrapper = mount(ChordDiagram, {
        props: { chord: CHORDS[0] }
      })

      const svg = wrapper.find('svg')
      expect(svg.exists()).toBe(true)
      expect(svg.attributes('role')).toBe('img')
      expect(svg.attributes('viewBox')).toBeDefined()
      expect(svg.attributes('viewBox')).toContain('0 0')
    })

    it('should have accessible aria-label', () => {
      const chord = CHORDS[0] // Em
      const wrapper = mount(ChordDiagram, {
        props: { chord }
      })

      const svg = wrapper.find('svg')
      expect(svg.attributes('aria-label')).toContain(chord.name)
      expect(svg.attributes('aria-label')).toContain('Guitar chord diagram')
    })

    it('should expose ukulele aria-label when instrument is ukulele', () => {
      const chord = UKULELE_CHORDS[0]
      const wrapper = mount(ChordDiagram, {
        props: { chord, instrument: 'ukulele' }
      })

      expect(wrapper.find('svg').attributes('aria-label')).toContain('Ukulele chord diagram')
    })
  })

  describe('String Rendering', () => {
    it('should render 6 vertical strings for guitar', () => {
      const wrapper = mount(ChordDiagram, {
        props: { chord: CHORDS[0] }
      })

      const strings = wrapper.findAll('.string')
      expect(strings).toHaveLength(6)
    })

    it('should render 4 vertical strings for ukulele', () => {
      const wrapper = mount(ChordDiagram, {
        props: { chord: UKULELE_CHORDS[0], instrument: 'ukulele' }
      })

      const strings = wrapper.findAll('.string')
      expect(strings).toHaveLength(4)
    })

    it('should render X/O markers for muted/open strings', () => {
      const chord = CHORDS[0] // Em has open strings
      const wrapper = mount(ChordDiagram, {
        props: { chord }
      })

      const markers = wrapper.findAll('.string-marker')
      expect(markers.length).toBeGreaterThan(0)

      // Check that markers contain X or O
      const markerTexts = markers.map(m => m.text())
      const hasXOrO = markerTexts.some(text => text === 'X' || text === 'O')
      expect(hasXOrO).toBe(true)
    })
  })

  describe('Fret Rendering', () => {
    it('should render 6 horizontal frets (5 spaces + nut)', () => {
      const wrapper = mount(ChordDiagram, {
        props: { chord: CHORDS[0] }
      })

      const frets = wrapper.findAll('.fret')
      expect(frets).toHaveLength(6) // 5 frets + 1 nut
    })

    it('should show fret position indicator for barre chords', () => {
      const barreChord = CHORDS.find(c => c.baseFret > 1)
      if (barreChord) {
        const wrapper = mount(ChordDiagram, {
          props: { chord: barreChord }
        })

        const indicator = wrapper.find('.fret-indicator')
        expect(indicator.exists()).toBe(true)
        expect(indicator.text()).toContain('fr')
      }
    })
  })

  describe('Finger Position Rendering', () => {
    it('should render finger dots for pressed strings', () => {
      const wrapper = mount(ChordDiagram, {
        props: { chord: CHORDS[0] }
      })

      const dots = wrapper.findAll('.finger-dot')
      const chord = CHORDS[0]

      // Count how many frets are pressed (not X, not 0)
      const pressedFrets = chord.frets.filter(f => typeof f === 'number' && f > 0)
      expect(dots.length).toBe(pressedFrets.length)
    })

    it('should render finger numbers inside dots', () => {
      const wrapper = mount(ChordDiagram, {
        props: { chord: CHORDS[0] }
      })

      const numbers = wrapper.findAll('.finger-number')
      expect(numbers.length).toBeGreaterThan(0)

      // Check that numbers are 1-4 or empty
      numbers.forEach(num => {
        const text = num.text()
        if (text) {
          const value = parseInt(text)
          expect(value).toBeGreaterThanOrEqual(1)
          expect(value).toBeLessThanOrEqual(4)
        }
      })
    })
  })

  describe('All 12 Chords Rendering', () => {
    CHORDS.forEach(chord => {
      it(`should render ${chord.name} chord correctly`, () => {
        const wrapper = mount(ChordDiagram, {
          props: { chord }
        })

        // Verify basic structure
        expect(wrapper.find('svg').exists()).toBe(true)
        expect(wrapper.findAll('.string')).toHaveLength(chord.frets.length)
        expect(wrapper.findAll('.fret').length).toBeGreaterThan(0)

        // Verify aria-label contains chord name
        expect(wrapper.find('svg').attributes('aria-label')).toContain(chord.name)

        // Verify finger positions match chord data
        const dots = wrapper.findAll('.finger-dot')
        const pressedFrets = chord.frets.filter(f => typeof f === 'number' && f > 0)
        expect(dots.length).toBe(pressedFrets.length)
      })
    })
  })

  describe('Accessibility & Contrast', () => {
    it('should use semantic SVG elements with classes', () => {
      const wrapper = mount(ChordDiagram, {
        props: { chord: CHORDS[0] }
      })

      // Check for semantic grouping
      const groups = wrapper.findAll('g')
      expect(groups.length).toBeGreaterThan(0)

      // Check for descriptive classes
      expect(wrapper.find('.strings').exists()).toBe(true)
      expect(wrapper.find('.frets').exists()).toBe(true)
      expect(wrapper.find('.finger-positions').exists()).toBe(true)
    })

    it('should provide text alternatives via aria-label', () => {
      const chord = CHORDS[0]
      const wrapper = mount(ChordDiagram, {
        props: { chord }
      })

      const svg = wrapper.find('svg')
      const ariaLabel = svg.attributes('aria-label')

      expect(ariaLabel).toBeTruthy()
      expect(ariaLabel).toContain(chord.name)
      expect(ariaLabel?.toLowerCase()).toContain('chord')
    })
  })

  describe('Responsive Behavior', () => {
    it('should scale viewBox based on layout constants', () => {
      const wrapper = mount(ChordDiagram, {
        props: { chord: CHORDS[0] }
      })

      const svg = wrapper.find('svg')
      const viewBox = svg.attributes('viewBox')

      expect(viewBox).toBeDefined()

      // Should have reasonable dimensions (not negative, not zero)
      const [, , width, height] = viewBox!.split(' ').map(Number)
      expect(width).toBeGreaterThan(0)
      expect(height).toBeGreaterThan(0)
    })
  })
})
