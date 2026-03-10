/**
 * Random chord selection utility
 * Provides uniform random distribution across all available chords
 */

import type { Chord } from '@/types/chord'
import type { Instrument } from '@/types/chord'
import { getChordsByInstrument } from '@/data/chords'

/**
 * Select a random chord from the available chord list
 * Uses uniform random distribution
 * @param excludeChord Optional chord to exclude from selection (avoid repeating same chord)
 * @returns A randomly selected Chord object
 */
export function getRandomChord(excludeChord?: Chord, instrument: Instrument = 'guitar'): Chord {
  const chords = getChordsByInstrument(instrument)

  // If we need to exclude a chord and there are multiple chords available
  if (excludeChord && chords.length > 1) {
    const availableChords = chords.filter(
      chord => chord.name !== excludeChord.name
    )
    const randomIndex = Math.floor(Math.random() * availableChords.length)
    return availableChords[randomIndex]
  }

  const randomIndex = Math.floor(Math.random() * chords.length)
  return chords[randomIndex]
}

/**
 * Get all available chords
 * @returns Array of all Chord objects
 */
export function getAllChords(instrument: Instrument = 'guitar'): Chord[] {
  return getChordsByInstrument(instrument)
}

export default {
  getRandomChord,
  getAllChords
}
