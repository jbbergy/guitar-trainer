/**
 * Chord definitions for the 12 supported chords in v1
 * All chords use standard guitar notation from low E (string 6) to high E (string 1)
 */

import type { Chord, Instrument } from '@/types/chord'

export const CHORDS: Chord[] = [
  // --- A ---
  {
    name: 'A',
    frets: ['X', 0, 2, 2, 2, 0],
    fingers: [0, 0, 1, 2, 3, 0],
    baseFret: 0,
    difficulty: 'beginner'
  },
  {
    name: 'Am',
    frets: ['X', 0, 2, 2, 1, 0],
    fingers: [0, 0, 2, 3, 1, 0],
    baseFret: 0,
    difficulty: 'beginner'
  },
  {
    name: 'A7',
    frets: ['X', 0, 2, 0, 2, 0],
    fingers: [0, 0, 2, 0, 3, 0],
    baseFret: 0,
    difficulty: 'beginner'
  },
  // --- B ---
  {
    name: 'B',
    frets: ['X', 2, 4, 4, 4, 2],
    fingers: [0, 1, 2, 3, 4, 1],
    baseFret: 0,
    difficulty: 'advanced'
  },
  {
    name: 'Bm',
    frets: ['X', 2, 4, 4, 3, 2],
    fingers: [0, 1, 3, 4, 2, 1],
    baseFret: 0,
    difficulty: 'advanced'
  },
  {
    name: 'B7',
    frets: ['X', 2, 1, 2, 0, 2],
    fingers: [0, 2, 1, 3, 0, 4],
    baseFret: 0,
    difficulty: 'intermediate'
  },
  // --- C ---
  {
    name: 'C',
    frets: ['X', 3, 2, 0, 1, 0],
    fingers: [0, 3, 2, 0, 1, 0],
    baseFret: 0,
    difficulty: 'beginner'
  },
  {
    name: 'Cm',
    frets: ['X', 3, 5, 5, 4, 3],
    fingers: [0, 1, 3, 4, 2, 1],
    baseFret: 0,
    difficulty: 'advanced'
  },
  {
    name: 'C7',
    frets: ['X', 3, 2, 3, 1, 0],
    fingers: [0, 3, 2, 4, 1, 0],
    baseFret: 0,
    difficulty: 'beginner'
  },
  // --- D ---
  {
    name: 'D',
    frets: ['X', 'X', 0, 2, 3, 2],
    fingers: [0, 0, 0, 1, 3, 2],
    baseFret: 0,
    difficulty: 'beginner'
  },
  {
    name: 'Dm',
    frets: ['X', 'X', 0, 2, 3, 1],
    fingers: [0, 0, 0, 2, 3, 1],
    baseFret: 0,
    difficulty: 'beginner'
  },
  {
    name: 'D7',
    frets: ['X', 'X', 0, 2, 1, 2],
    fingers: [0, 0, 0, 2, 1, 3],
    baseFret: 0,
    difficulty: 'beginner'
  },
  // --- E ---
  {
    name: 'E',
    frets: [0, 2, 2, 1, 0, 0],
    fingers: [0, 2, 3, 1, 0, 0],
    baseFret: 0,
    difficulty: 'beginner'
  },
  {
    name: 'Em',
    frets: [0, 2, 2, 0, 0, 0],
    fingers: [0, 2, 3, 0, 0, 0],
    baseFret: 0,
    difficulty: 'beginner'
  },
  {
    name: 'E7',
    frets: [0, 2, 0, 1, 0, 0],
    fingers: [0, 2, 0, 1, 0, 0],
    baseFret: 0,
    difficulty: 'beginner'
  },
  // --- F ---
  {
    name: 'F',
    frets: [1, 3, 3, 2, 1, 1],
    fingers: [1, 3, 4, 2, 1, 1],
    baseFret: 0,
    difficulty: 'intermediate'
  },
  {
    name: 'Fm',
    frets: [1, 3, 3, 1, 1, 1],
    fingers: [1, 3, 4, 1, 1, 1],
    baseFret: 0,
    difficulty: 'advanced'
  },
  {
    name: 'F7',
    frets: [1, 3, 1, 2, 1, 1],
    fingers: [1, 3, 1, 2, 1, 1],
    baseFret: 0,
    difficulty: 'intermediate'
  },
  // --- G ---
  {
    name: 'G',
    frets: [3, 2, 0, 0, 0, 3],
    fingers: [3, 2, 0, 0, 0, 4],
    baseFret: 0,
    difficulty: 'beginner'
  },
  {
    name: 'Gm',
    frets: [3, 5, 5, 3, 3, 3],
    fingers: [1, 3, 4, 1, 1, 1],
    baseFret: 0,
    difficulty: 'advanced'
  },
  {
    name: 'G7',
    frets: [3, 2, 0, 0, 0, 1],
    fingers: [3, 2, 0, 0, 0, 1],
    baseFret: 0,
    difficulty: 'beginner'
  }
]

export const UKULELE_CHORDS: Chord[] = [
  { name: 'A', frets: [2, 1, 0, 0], fingers: [2, 1, 0, 0], baseFret: 0, difficulty: 'beginner' },
  { name: 'Am', frets: [2, 0, 0, 0], fingers: [2, 0, 0, 0], baseFret: 0, difficulty: 'beginner' },
  { name: 'A7', frets: [0, 1, 0, 0], fingers: [0, 1, 0, 0], baseFret: 0, difficulty: 'beginner' },
  { name: 'B', frets: [4, 3, 2, 2], fingers: [3, 2, 1, 1], baseFret: 0, difficulty: 'advanced' },
  { name: 'Bm', frets: [4, 2, 2, 2], fingers: [3, 1, 1, 1], baseFret: 0, difficulty: 'advanced' },
  { name: 'B7', frets: [2, 3, 2, 2], fingers: [1, 2, 1, 1], baseFret: 0, difficulty: 'intermediate' },
  { name: 'C', frets: [0, 0, 0, 3], fingers: [0, 0, 0, 3], baseFret: 0, difficulty: 'beginner' },
  { name: 'Cm', frets: [0, 3, 3, 3], fingers: [0, 1, 2, 3], baseFret: 0, difficulty: 'advanced' },
  { name: 'C7', frets: [0, 0, 0, 1], fingers: [0, 0, 0, 1], baseFret: 0, difficulty: 'beginner' },
  { name: 'D', frets: [2, 2, 2, 0], fingers: [1, 2, 3, 0], baseFret: 0, difficulty: 'beginner' },
  { name: 'Dm', frets: [2, 2, 1, 0], fingers: [2, 3, 1, 0], baseFret: 0, difficulty: 'beginner' },
  { name: 'D7', frets: [2, 2, 2, 3], fingers: [1, 1, 1, 2], baseFret: 0, difficulty: 'beginner' },
  { name: 'E', frets: [1, 4, 0, 2], fingers: [1, 4, 0, 2], baseFret: 0, difficulty: 'beginner' },
  { name: 'Em', frets: [0, 4, 3, 2], fingers: [0, 3, 2, 1], baseFret: 0, difficulty: 'beginner' },
  { name: 'E7', frets: [1, 2, 0, 2], fingers: [1, 2, 0, 3], baseFret: 0, difficulty: 'beginner' },
  { name: 'F', frets: [2, 0, 1, 0], fingers: [2, 0, 1, 0], baseFret: 0, difficulty: 'intermediate' },
  { name: 'Fm', frets: [1, 0, 1, 3], fingers: [1, 0, 2, 3], baseFret: 0, difficulty: 'advanced' },
  { name: 'F7', frets: [2, 3, 1, 3], fingers: [2, 3, 1, 4], baseFret: 0, difficulty: 'intermediate' },
  { name: 'G', frets: [0, 2, 3, 2], fingers: [0, 1, 3, 2], baseFret: 0, difficulty: 'beginner' },
  { name: 'Gm', frets: [0, 2, 3, 1], fingers: [0, 2, 3, 1], baseFret: 0, difficulty: 'advanced' },
  { name: 'G7', frets: [0, 2, 1, 2], fingers: [0, 2, 1, 3], baseFret: 0, difficulty: 'beginner' }
]

const CHORD_COLLECTIONS: Record<Instrument, Chord[]> = {
  guitar: CHORDS,
  ukulele: UKULELE_CHORDS
}

export function getChordsByInstrument(instrument: Instrument): Chord[] {
  return CHORD_COLLECTIONS[instrument]
}

export default CHORDS
