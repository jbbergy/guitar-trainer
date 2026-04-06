/**
 * Chord type definition for guitar chords
 * Represents finger positions on a 6-string guitar
 */

export type Instrument = 'guitar' | 'ukulele' | 'tinWhistle'
export type ChordDifficulty = 'beginner' | 'intermediate' | 'advanced'
export type DifficultyFilter = ChordDifficulty

/**
 * Keys available for tin whistles.
 * The most common are D and C; others are less frequent.
 */
export type WhistleKey = 'D' | 'C' | 'Bb' | 'G' | 'F' | 'E' | 'Eb'

export interface Chord {
  /** Chord name (e.g., "Em", "C7") */
  name: string

  /** Fret positions for each of the 6 strings (low E to high E)
   * - number (0-12): fret to press
   * - 'X': muted string (don't play)
   * - 0: open string (play without fretting)
   */
  frets: (number | 'X')[]

  /** Finger numbers for each string position
   * - 0: open string or muted
   * - 1: index finger
   * - 2: middle finger
   * - 3: ring finger
   * - 4: pinky finger
   */
  fingers: number[]

  /** Base fret number for the chord diagram display
   * For open chords this is 0, for barre chords it's the starting fret
   */
  baseFret: number

  /** Difficulty level of the chord */
  difficulty: ChordDifficulty
}

/**
 * Tin Whistle note — individual note with hole fingering.
 * The tin whistle has no chords, only single notes.
 */
export interface TinWhistleNote {
  /** Absolute note name (e.g., "D", "F#", "A#") */
  name: string

  /** Hole states for each of the 6 holes, top to bottom (top = closest to mouthpiece)
   * - 0:   open hole (finger off)
   * - 0.5: half-covered (half-hole technique for accidentals)
   * - 1:   fully covered (finger on)
   */
  holes: (0 | 0.5 | 1)[]

  /** Octave register
   * - 0: low octave  — normal breath
   * - 1: high octave — stronger breath / overblow
   * - 2: very high   — advanced technique
   */
  octave: 0 | 1 | 2

  /** Difficulty level */
  difficulty: ChordDifficulty

  /** Which tin whistle this note is for (determines absolute pitch) */
  whistleKey: WhistleKey
}

/** Union of all playable items across instruments */
export type NoteOrChord = Chord | TinWhistleNote

/** Type guard — returns true when value is a TinWhistleNote */
export function isTinWhistleNote(value: NoteOrChord): value is TinWhistleNote {
  return 'holes' in value
}
