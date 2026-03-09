/**
 * Random chord selection utility
 * Provides uniform random distribution across all available chords
 */

import type { Chord } from '@/types/chord'
import CHORDS from '@/data/chords'

/**
 * Select a random chord from the available chord list
 * Uses uniform random distribution
 * @param excludeChord Optional chord to exclude from selection (avoid repeating same chord)
 * @returns A randomly selected Chord object
 */
export function getRandomChord(excludeChord?: Chord): Chord {
  // If we need to exclude a chord and there are multiple chords available
  if (excludeChord && CHORDS.length > 1) {
    const availableChords = CHORDS.filter(
      chord => chord.name !== excludeChord.name
    )
    const randomIndex = Math.floor(Math.random() * availableChords.length)
    return availableChords[randomIndex]
  }
  
  const randomIndex = Math.floor(Math.random() * CHORDS.length)
  return CHORDS[randomIndex]
}

/**
 * Get all available chords
 * @returns Array of all Chord objects
 */
export function getAllChords(): Chord[] {
  return CHORDS
}

export default {
  getRandomChord,
  getAllChords
}
