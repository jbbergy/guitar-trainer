import type { NoteOrChord, WhistleKey } from '@/types/chord'
import type { Instrument } from '@/types/chord'
import type { DifficultyFilter } from '@/types/chord'
import { getChordsByInstrument } from '@/data/chords'

const DIFFICULTY_RANK: Record<DifficultyFilter, number> = {
  beginner: 1,
  intermediate: 2,
  advanced: 3
}

const filterByDifficulty = (items: NoteOrChord[], difficulty: DifficultyFilter): NoteOrChord[] => {
  const selectedRank = DIFFICULTY_RANK[difficulty]
  return items.filter(item => DIFFICULTY_RANK[item.difficulty] <= selectedRank)
}

/**
 * Select a random chord/note from the available list
 * Uses uniform random distribution
 * @param excludeItem Optional item to exclude from selection (avoid repeating same item)
 * @returns A randomly selected Chord or TinWhistleNote
 */
export function getRandomChord(
  excludeItem?: NoteOrChord,
  instrument: Instrument = 'guitar',
  difficulty: DifficultyFilter = 'advanced',
  whistleKey: WhistleKey = 'D'
): NoteOrChord {
  const items = filterByDifficulty(getChordsByInstrument(instrument, whistleKey), difficulty)
  const availablePool = items.length > 0 ? items : getChordsByInstrument(instrument, whistleKey)

  // If we need to exclude an item and there are multiple available
  if (excludeItem && availablePool.length > 1) {
    const available = availablePool.filter(item => item.name !== excludeItem.name)
    const randomIndex = Math.floor(Math.random() * available.length)
    return available[randomIndex]
  }

  const randomIndex = Math.floor(Math.random() * availablePool.length)
  return availablePool[randomIndex]
}

/**
 * Get all available chords/notes for an instrument
 */
export function getAllChords(instrument: Instrument = 'guitar', difficulty: DifficultyFilter = 'advanced', whistleKey: WhistleKey = 'D'): NoteOrChord[] {
  return filterByDifficulty(getChordsByInstrument(instrument, whistleKey), difficulty)
}

export default {
  getRandomChord,
  getAllChords
}
