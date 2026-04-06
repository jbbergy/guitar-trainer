/**
 * Chord definitions for the 12 supported chords in v1
 * All chords use standard guitar notation from low E (string 6) to high E (string 1)
 */

import type { Chord, Instrument, TinWhistleNote, NoteOrChord, WhistleKey, ChordDifficulty } from '@/types/chord'
import { noteNameToPitchClass, pitchClassToNoteName, toPitchClass } from '@/utils/music/pitchClass'
import type { NoteName } from '@/utils/music/pitchClass'

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

// ---------------------------------------------------------------------------
// Tin Whistle — chromatic fingering factory
//
// The 6 holes are indexed [0..5] top to bottom (0 = top, closest to mouth).
// All tin whistles share the same RELATIVE fingering pattern regardless of key.
// What changes between keys is only the absolute note name each pattern produces.
//
// Convention  (physical / visual):
//   1   = hole covered   (finger on  → light appearance in diagram)
//   0   = hole open      (finger off → dark appearance in diagram, looking into the bore)
//   0.5 = half-covered   (half-hole technique for accidentals)
//
// The 13 relative chromatic steps (0 = root, 1 = root+1 semitone, …)
// plus the very-high octave root:
// ---------------------------------------------------------------------------

type RelativeNote = {
  semitones: number           // interval from root (0–11)
  holes: (0 | 0.5 | 1)[]
  octave: 0 | 1 | 2
  difficulty: ChordDifficulty
}

// Low octave (octave 0) — verified against D-whistle reference chart
const LOW_OCTAVE: RelativeNote[] = [
  { semitones:  0, holes: [1, 1, 1, 1, 1, 1],   octave: 0, difficulty: 'beginner'     }, // root          (d)
  { semitones:  1, holes: [1, 1, 1, 1, 1, 0.5], octave: 0, difficulty: 'intermediate' }, // root+1  half  (d#)
  { semitones:  2, holes: [1, 1, 1, 1, 1, 0],   octave: 0, difficulty: 'beginner'     }, // root+2        (e)
  { semitones:  3, holes: [1, 1, 1, 1, 0, 1],   octave: 0, difficulty: 'intermediate' }, // root+3  cross (f)
  { semitones:  4, holes: [1, 1, 1, 1, 0, 0],   octave: 0, difficulty: 'beginner'     }, // root+4        (f#)
  { semitones:  5, holes: [1, 1, 1, 0, 0, 0],   octave: 0, difficulty: 'beginner'     }, // root+5        (g)
  { semitones:  6, holes: [1, 1, 0, 1, 0, 0],   octave: 0, difficulty: 'intermediate' }, // root+6  cross (g#)
  { semitones:  7, holes: [1, 1, 0, 0, 0, 0],   octave: 0, difficulty: 'beginner'     }, // root+7        (a)
  { semitones:  8, holes: [1, 0, 1, 0, 0, 0],   octave: 0, difficulty: 'intermediate' }, // root+8  cross (a#)
  { semitones:  9, holes: [1, 0, 0, 0, 0, 0],   octave: 0, difficulty: 'beginner'     }, // root+9        (b)
  { semitones: 10, holes: [0, 1, 1, 0, 0, 0],   octave: 0, difficulty: 'intermediate' }, // root+10 cross (c)
  { semitones: 11, holes: [0, 0, 0, 0, 0, 0],   octave: 0, difficulty: 'beginner'     }, // root+11       (c#)
]

// High octave (octave 1) — same fingerings, stronger breath
const HIGH_OCTAVE: RelativeNote[] = LOW_OCTAVE.map(n => ({ ...n, octave: 1 as const, difficulty: n.difficulty }))

// Very-high root (octave 2) — advanced technique
const VERY_HIGH: RelativeNote[] = [
  { semitones: 0, holes: [1, 1, 1, 0, 0, 0], octave: 2, difficulty: 'advanced' },
]

const ALL_RELATIVE: RelativeNote[] = [...LOW_OCTAVE, ...HIGH_OCTAVE, ...VERY_HIGH]

/**
 * Generate the complete TinWhistleNote array for any whistle key.
 * The fingering patterns are identical; only the note names differ.
 */
export function generateTinWhistleNotes(whistleKey: WhistleKey): TinWhistleNote[] {
  const rootPc = noteNameToPitchClass(whistleKey as NoteName)
  // Prefer sharps for keys with #, flats for keys with b
  const preference = whistleKey.includes('b') ? 'flats' : 'sharps'

  return ALL_RELATIVE.map(rel => ({
    name: pitchClassToNoteName(toPitchClass(rootPc + rel.semitones), preference),
    holes: rel.holes,
    octave: rel.octave,
    difficulty: rel.difficulty,
    whistleKey,
  }))
}

// Pre-built collections for the most common keys
export const TIN_WHISTLE_NOTES_D  = generateTinWhistleNotes('D')
export const TIN_WHISTLE_NOTES_C  = generateTinWhistleNotes('C')
export const TIN_WHISTLE_NOTES_Bb = generateTinWhistleNotes('Bb')
export const TIN_WHISTLE_NOTES_G  = generateTinWhistleNotes('G')
export const TIN_WHISTLE_NOTES_F  = generateTinWhistleNotes('F')

/** Default: D-whistle (most common for beginners) */
export const TIN_WHISTLE_NOTES = TIN_WHISTLE_NOTES_D

/** @deprecated use TIN_WHISTLE_NOTES */
export const TIN_WHISTLE_CHORDS = TIN_WHISTLE_NOTES

type InstrumentCollection = {
  guitar: Chord[]
  ukulele: Chord[]
  tinWhistle: TinWhistleNote[]
}

const CHORD_COLLECTIONS: InstrumentCollection = {
  guitar: CHORDS,
  ukulele: UKULELE_CHORDS,
  tinWhistle: TIN_WHISTLE_NOTES
}

export function getChordsByInstrument(instrument: 'guitar' | 'ukulele'): Chord[]
export function getChordsByInstrument(instrument: 'tinWhistle', whistleKey?: WhistleKey): TinWhistleNote[]
export function getChordsByInstrument(instrument: Instrument, whistleKey?: WhistleKey): NoteOrChord[]
export function getChordsByInstrument(instrument: Instrument, whistleKey: WhistleKey = 'D'): NoteOrChord[] {
  if (instrument === 'tinWhistle') {
    return generateTinWhistleNotes(whistleKey)
  }
  return CHORD_COLLECTIONS[instrument as 'guitar' | 'ukulele']
}

export default CHORDS
