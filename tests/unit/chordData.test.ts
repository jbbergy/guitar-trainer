/**
 * Unit tests for chord data validation
 * Ensures all 12 chords have required fields and valid data
 */

import { describe, it, expect } from 'vitest'
import CHORDS, { UKULELE_CHORDS } from '@/data/chords'

describe('chordData', () => {
  it('should have exactly 21 chords', () => {
    expect(CHORDS).toHaveLength(21)
  })

  it('should have exactly 21 ukulele chords', () => {
    expect(UKULELE_CHORDS).toHaveLength(21)
  })

  it('should include all expected chord names', () => {
    const chordNames = CHORDS.map(c => c.name)
    const expectedChords = ['A', 'Am', 'A7', 'B', 'Bm', 'B7', 'C', 'Cm', 'C7', 'D', 'Dm', 'D7', 'E', 'Em', 'E7', 'F', 'Fm', 'F7', 'G', 'Gm', 'G7']

    expect(chordNames).toEqual(expect.arrayContaining(expectedChords))
  })

  describe('chord structure validation', () => {
    CHORDS.forEach((chord) => {
      describe(`${chord.name}`, () => {
        it('should have a name', () => {
          expect(chord.name).toBeDefined()
          expect(typeof chord.name).toBe('string')
          expect(chord.name.length).toBeGreaterThan(0)
        })

        it('should have 6 fret positions (one per string)', () => {
          expect(chord.frets).toBeDefined()
          expect(chord.frets).toHaveLength(6)
        })

        it('should have valid fret values', () => {
          chord.frets.forEach((fret, index) => {
            expect(
              typeof fret === 'number' || fret === 'X',
              `String ${index + 1} has invalid fret value: ${fret}`
            ).toBe(true)

            if (typeof fret === 'number') {
              expect(fret).toBeGreaterThanOrEqual(0)
              expect(fret).toBeLessThanOrEqual(12)
            }
          })
        })

        it('should have 6 finger positions', () => {
          expect(chord.fingers).toBeDefined()
          expect(chord.fingers).toHaveLength(6)
        })

        it('should have valid finger values (0-4)', () => {
          chord.fingers.forEach((finger) => {
            expect(finger).toBeGreaterThanOrEqual(0)
            expect(finger).toBeLessThanOrEqual(4)
          })
        })

        it('should have a baseFret number', () => {
          expect(chord.baseFret).toBeDefined()
          expect(typeof chord.baseFret).toBe('number')
          expect(chord.baseFret).toBeGreaterThanOrEqual(0)
        })

        it('should have a valid difficulty', () => {
          expect(['beginner', 'intermediate', 'advanced']).toContain(chord.difficulty)
        })
      })
    })
  })

  describe('ukulele chord structure validation', () => {
    UKULELE_CHORDS.forEach((chord) => {
      describe(`${chord.name}`, () => {
        it('should have 4 fret positions (one per string)', () => {
          expect(chord.frets).toBeDefined()
          expect(chord.frets).toHaveLength(4)
        })

        it('should have 4 finger positions', () => {
          expect(chord.fingers).toBeDefined()
          expect(chord.fingers).toHaveLength(4)
        })

        it('should have valid fret and finger values', () => {
          chord.frets.forEach((fret) => {
            expect(typeof fret === 'number' || fret === 'X').toBe(true)
          })

          chord.fingers.forEach((finger) => {
            expect(finger).toBeGreaterThanOrEqual(0)
            expect(finger).toBeLessThanOrEqual(4)
          })
        })

        it('should have a valid difficulty', () => {
          expect(['beginner', 'intermediate', 'advanced']).toContain(chord.difficulty)
        })
      })
    })
  })
})
