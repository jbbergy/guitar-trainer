/**
 * Chord definitions for the 12 supported chords in v1
 * All chords use standard guitar notation from low E (string 6) to high E (string 1)
 */

import type { Chord } from '@/types/chord'

export const CHORDS: Chord[] = [
  // --- A ---
  {
    name: 'A',
    frets: ['X', 0, 2, 2, 2, 0],
    fingers: [0, 0, 1, 2, 3, 0],
    baseFret: 0
  },
  {
    name: 'Am',
    frets: ['X', 0, 2, 2, 1, 0],
    fingers: [0, 0, 2, 3, 1, 0],
    baseFret: 0
  },
  {
    name: 'A7',
    frets: ['X', 0, 2, 0, 2, 0],
    fingers: [0, 0, 2, 0, 3, 0],
    baseFret: 0
  },
  // --- B ---
  {
    name: 'B',
    frets: ['X', 2, 4, 4, 4, 2],
    fingers: [0, 1, 2, 3, 4, 1],
    baseFret: 0
  },
  {
    name: 'Bm',
    frets: ['X', 2, 4, 4, 3, 2],
    fingers: [0, 1, 3, 4, 2, 1],
    baseFret: 0
  },
  {
    name: 'B7',
    frets: ['X', 2, 1, 2, 0, 2],
    fingers: [0, 2, 1, 3, 0, 4],
    baseFret: 0
  },
  // --- C ---
  {
    name: 'C',
    frets: ['X', 3, 2, 0, 1, 0],
    fingers: [0, 3, 2, 0, 1, 0],
    baseFret: 0
  },
  {
    name: 'Cm',
    frets: ['X', 3, 5, 5, 4, 3],
    fingers: [0, 1, 3, 4, 2, 1],
    baseFret: 0
  },
  {
    name: 'C7',
    frets: ['X', 3, 2, 3, 1, 0],
    fingers: [0, 3, 2, 4, 1, 0],
    baseFret: 0
  },
  // --- D ---
  {
    name: 'D',
    frets: ['X', 'X', 0, 2, 3, 2],
    fingers: [0, 0, 0, 1, 3, 2],
    baseFret: 0
  },
  {
    name: 'Dm',
    frets: ['X', 'X', 0, 2, 3, 1],
    fingers: [0, 0, 0, 2, 3, 1],
    baseFret: 0
  },
  {
    name: 'D7',
    frets: ['X', 'X', 0, 2, 1, 2],
    fingers: [0, 0, 0, 2, 1, 3],
    baseFret: 0
  },
  // --- E ---
  {
    name: 'E',
    frets: [0, 2, 2, 1, 0, 0],
    fingers: [0, 2, 3, 1, 0, 0],
    baseFret: 0
  },
  {
    name: 'Em',
    frets: [0, 2, 2, 0, 0, 0],
    fingers: [0, 2, 3, 0, 0, 0],
    baseFret: 0
  },
  {
    name: 'E7',
    frets: [0, 2, 0, 1, 0, 0],
    fingers: [0, 2, 0, 1, 0, 0],
    baseFret: 0
  },
  // --- F ---
  {
    name: 'F',
    frets: [1, 3, 3, 2, 1, 1],
    fingers: [1, 3, 4, 2, 1, 1],
    baseFret: 0
  },
  {
    name: 'Fm',
    frets: [1, 3, 3, 1, 1, 1],
    fingers: [1, 3, 4, 1, 1, 1],
    baseFret: 0
  },
  {
    name: 'F7',
    frets: [1, 3, 1, 2, 1, 1],
    fingers: [1, 3, 1, 2, 1, 1],
    baseFret: 0
  },
  // --- G ---
  {
    name: 'G',
    frets: [3, 2, 0, 0, 0, 3],
    fingers: [3, 2, 0, 0, 0, 4],
    baseFret: 0
  },
  {
    name: 'Gm',
    frets: [3, 5, 5, 3, 3, 3],
    fingers: [1, 3, 4, 1, 1, 1],
    baseFret: 0
  },
  {
    name: 'G7',
    frets: [3, 2, 0, 0, 0, 1],
    fingers: [3, 2, 0, 0, 0, 1],
    baseFret: 0
  }
]

export default CHORDS
