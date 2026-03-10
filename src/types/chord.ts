/**
 * Chord type definition for guitar chords
 * Represents finger positions on a 6-string guitar
 */

export type Instrument = 'guitar' | 'ukulele'

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
}
