/**
 * Random chord selection utility
 * Provides uniform random distribution across all available chords
 */

import type { Chord } from '@/types/chord'
import type { Instrument } from '@/types/chord'
import type { DifficultyFilter } from '@/types/chord'
import { getChordsByInstrument } from '@/data/chords'

const DIFFICULTY_RANK: Record<DifficultyFilter, number> = {
  beginner: 1,
  intermediate: 2,
  advanced: 3
}

const filterByDifficulty = (chords: Chord[], difficulty: DifficultyFilter): Chord[] => {
  const selectedRank = DIFFICULTY_RANK[difficulty]
  return chords.filter(chord => DIFFICULTY_RANK[chord.difficulty] <= selectedRank)
}

/**
 * Select a random chord from the available chord list
 * Uses uniform random distribution
 * @param excludeChord Optional chord to exclude from selection (avoid repeating same chord)
 * @returns A randomly selected Chord object
 */
export function getRandomChord(
  excludeChord?: Chord,
  instrument: Instrument = 'guitar',
  difficulty: DifficultyFilter = 'advanced'
): Chord {
  const chords = filterByDifficulty(getChordsByInstrument(instrument), difficulty)
  const availableChordPool = chords.length > 0 ? chords : getChordsByInstrument(instrument)

  // If we need to exclude a chord and there are multiple chords available
  if (excludeChord && availableChordPool.length > 1) {
    const availableChords = availableChordPool.filter(
      chord => chord.name !== excludeChord.name
    )
    const randomIndex = Math.floor(Math.random() * availableChords.length)
    return availableChords[randomIndex]
  }

  const randomIndex = Math.floor(Math.random() * availableChordPool.length)
  return availableChordPool[randomIndex]
}

/**
 * Get all available chords
 * @returns Array of all Chord objects
 */
export function getAllChords(instrument: Instrument = 'guitar', difficulty: DifficultyFilter = 'advanced'): Chord[] {
  return filterByDifficulty(getChordsByInstrument(instrument), difficulty)
}

export default {
  getRandomChord,
  getAllChords
}
