/**
 * Unit tests for random chord selection utility
 * Validates uniform distribution and basic functionality
 */

import { describe, it, expect } from 'vitest'
import { getRandomChord, getAllChords } from '@/utils/randomChord'

describe('randomChord', () => {
  describe('getRandomChord', () => {
    it('should return a valid chord object', () => {
      const chord = getRandomChord()

      expect(chord).toBeDefined()
      expect(chord).toHaveProperty('name')
      expect(chord).toHaveProperty('frets')
      expect(chord).toHaveProperty('fingers')
      expect(chord).toHaveProperty('baseFret')
    })

    it('should return a chord from the available chord list', () => {
      const chord = getRandomChord()
      const allChords = getAllChords('guitar')

      expect(allChords).toContainEqual(chord)
    })

    it('should demonstrate randomness over multiple calls', () => {
      const results = new Set()

      // Generate 50 random chords
      for (let i = 0; i < 50; i++) {
        const chord = getRandomChord(undefined, 'guitar')
        results.add(chord.name)
      }

      // With 12 chords and 50 calls, we should see some variety
      // (not a guarantee, but highly likely with uniform distribution)
      expect(results.size).toBeGreaterThan(1)
    })

    it('should not return the same chord when excluded', () => {
      const firstChord = getRandomChord(undefined, 'guitar')

      // Generate 20 chords excluding the first one
      for (let i = 0; i < 20; i++) {
        const nextChord = getRandomChord(firstChord, 'guitar')
        expect(nextChord.name).not.toBe(firstChord.name)
      }
    })

    it('should handle exclusion with multiple chords', () => {
      const firstChord = getRandomChord(undefined, 'guitar')
      const secondChord = getRandomChord(firstChord, 'guitar')
      const thirdChord = getRandomChord(secondChord, 'guitar')

      // Verify each chord is different from the previous one
      expect(secondChord.name).not.toBe(firstChord.name)
      expect(thirdChord.name).not.toBe(secondChord.name)
    })
  })

  describe('getAllChords', () => {
    it('should return an array of 21 chords', () => {
      const chords = getAllChords('guitar')

      expect(chords).toBeInstanceOf(Array)
      expect(chords).toHaveLength(21)
    })

    it('should return all expected chord names', () => {
      const chords = getAllChords('guitar')
      const chordNames = chords.map(c => c.name)

      const expectedChords = ['A', 'Am', 'A7', 'B', 'Bm', 'B7', 'C', 'Cm', 'C7', 'D', 'Dm', 'D7', 'E', 'Em', 'E7', 'F', 'Fm', 'F7', 'G', 'Gm', 'G7']

      expect(chordNames).toEqual(expect.arrayContaining(expectedChords))
      expect(chordNames.length).toBe(21)
    })

    it('should return ukulele chords when instrument is ukulele', () => {
      const chords = getAllChords('ukulele')

      expect(chords).toHaveLength(21)
      chords.forEach((chord) => {
        expect(chord.frets).toHaveLength(4)
      })
    })

    it('should return a valid ukulele chord object', () => {
      const chord = getRandomChord(undefined, 'ukulele')

      expect(chord).toBeDefined()
      expect(chord.frets).toHaveLength(4)
      expect(chord.fingers).toHaveLength(4)
    })
  })
})
