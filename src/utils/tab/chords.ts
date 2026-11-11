import { CHORDS, UKULELE_CHORDS } from '@/data/chords'
import type { TabTuning } from '@/types/tablature'

export interface TabChordShape {
    name: string
    /** One entry per string, lowest tab line first; 'X' = string not played */
    frets: (number | 'X')[]
}

/**
 * Chord shapes that can be stamped into a tablature written for this tuning.
 * The baritone ukulele uses the four high strings of the guitar shapes.
 */
export function chordShapesForTuning(tuning: TabTuning): TabChordShape[] {
    switch (tuning.id) {
        case 'guitar-standard':
            return CHORDS.map((chord) => ({ name: chord.name, frets: [...chord.frets] }))
        case 'ukulele-standard':
        case 'ukulele-low-g':
            return UKULELE_CHORDS.map((chord) => ({ name: chord.name, frets: [...chord.frets] }))
        case 'ukulele-baritone':
            return CHORDS.map((chord) => ({ name: chord.name, frets: chord.frets.slice(2) }))
        default:
            return []
    }
}
